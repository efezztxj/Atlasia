/**
 * firestore.rules envanteri — yayın öncesi kontrol.
 *
 * Amaç: Console'a yapıştırılacak dosyanın **hangi blokları** içerdiğini tek
 * komutla görmek. Böylece "hangi blok canlıda var/yok" sorusu tahminle değil,
 * dosyadan üretilen listeyle yanıtlanır.
 *
 * Kural dosyası yorumlanmaz (Firestore derleyicisi değil): yalnız `match`
 * blokları, doğrudan içlerindeki `allow` satırları ve kısa yetki özeti çıkarılır.
 * Davranış testleri emülatörde (`tests/firestore.rules.test.ts`).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MATCH = /^(\s*)match\s+(\S+)\s*\{\s*$/;
const ALLOW = /^(\s*)allow\s+([a-z,\s]+?)\s*:\s*if\s+(.*)$/;
const DEFAULT_RULES = fileURLToPath(new URL("../firestore.rules", import.meta.url));

const ROOT_SELECTOR = "/databases/{database}/documents";

/** `allow …` koşulunu insan diline indirger (kaba ama kararlı özet). */
export function describeCondition(condition) {
  const text = condition
    .replace(/\/\/.*$/gm, "")
    .replace(/;\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text === "true") return "herkes";
  if (text === "false") return "kapalı";
  if (text === "signedIn()") return "giriş";
  const parts = [];
  if (/signedIn\(\)/.test(text)) parts.push("giriş");
  else if (/request\.auth\s*==\s*null/.test(text)) parts.push("anonim");
  const limit = /boundedList\((\d+)\)/.exec(text);
  if (limit) parts.push(`≤${limit[1]}`);
  if (/request\.auth\.uid\s*==\s*(uid|resource\.data\.(uid|authorUid)|request\.resource\.data\.(uid|authorUid))/.test(text)
    || /(resource\.data\.(uid|authorUid)|\buid)\s*==\s*request\.auth\.uid/.test(text)) {
    parts.push("sahip");
  }
  if (parts.length === 0) parts.push("koşullu");
  return parts.join(" ");
}

/**
 * Kural kaynağını bloklara ayırır.
 * `parent` alanı, iç içe bloklarda üst yolun tamamını verir (ör. posts/replies).
 */
export function parseRules(source) {
  // A7: Windows'ta `git checkout` (autocrlf) dosyayı CRLF'e çevirebilir. O zaman
  // satır sonunda kalan `\r`, başlık/`allow` kalıplarını sessizce kaçırıyordu.
  // Ayrıştırma platformdan bağımsız olmalı: hem LF hem CRLF.
  const lines = source.split(/\r?\n/);
  const stack = [];
  const blocks = [];
  let pendingAllow = null;

  const flushAllow = () => {
    if (!pendingAllow) return;
    const top = stack[stack.length - 1];
    if (top) {
      for (const op of pendingAllow.ops) {
        top.allows.set(op.trim(), pendingAllow.condition);
      }
    }
    pendingAllow = null;
  };

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (pendingAllow) {
      pendingAllow.condition += ` ${line.trim()}`;
      if (line.includes(";")) flushAllow();
      return;
    }

    const match = MATCH.exec(line);
    if (match) {
      const indent = match[1].length;
      const path = match[2];
      // Kök sarmalayıcı (`/databases/{database}/documents`) üst blok sayılmaz:
      // gerçek iç içe bloklar posts/replies, groups/messages gibi olanlardır.
      const ancestors = stack.filter((item) => item.indent < indent && item.path !== ROOT_SELECTOR);
      const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1].path : null;
      stack.push({
        indent,
        path,
        line: lineNo,
        parent,
        allows: new Map(),
      });
      return;
    }

    const allow = ALLOW.exec(line);
    if (allow && stack.length > 0 && allow[1].length > stack[stack.length - 1].indent) {
      pendingAllow = {
        indent: allow[1].length,
        ops: allow[2].split(",").map((item) => item.trim()).filter(Boolean),
        condition: allow[3],
      };
      if (line.includes(";")) flushAllow();
      return;
    }

    const closing = /^(\s*)\}/.exec(line);
    if (closing && stack.length > 0 && closing[1].length === stack[stack.length - 1].indent) {
      const done = stack.pop();
      blocks.push(done);
    }
  });

  // Kapanmamış blok varsa yol gösterici hata: dosya bozuk demektir.
  if (stack.length > 0) {
    throw new Error(`Kapanmayan match bloğu: ${stack.map((item) => item.path).join(" > ")}`);
  }

  return blocks.sort((a, b) => a.line - b.line);
}

/** Blok listesinden yayın kontrolü için özet çıkarır. */
export function summarize(blocks) {
  const ops = ["get", "list", "create", "update", "delete"];
  const openBlocks = blocks
    .filter((block) => [...block.allows.values()].some((condition) => describeCondition(condition) === "herkes"))
    .map((block) => block.path);
  const collectionGroups = blocks.filter((block) => block.path.includes("{path=**}")
    || block.path.includes("{document=**}")).map((block) => block.path);
  const missingAllow = blocks
    .filter((block) => block.allows.size === 0 && block.path !== ROOT_SELECTOR)
    .map((block) => block.path);
  return {
    total: blocks.length,
    nested: blocks.filter((block) => block.parent !== null).length,
    openBlocks,
    collectionGroups,
    missingAllow,
    rows: blocks.map((block) => ({
      path: block.parent ? `${block.parent} → ${block.path}` : block.path,
      line: block.line,
      cells: ops.map((op) => {
        const condition = block.allows.get(op);
        return condition === undefined ? "—" : describeCondition(condition);
      }),
    })),
  };
}

export function toMarkdown(blocks) {
  const summary = summarize(blocks);
  const header = ["Blok", "Satır", "get", "list", "create", "update", "delete"];
  const rows = summary.rows.map((row) => `| \`${row.path}\` | ${row.line} | ${row.cells.join(" | ")} |`);
  return [
    `Toplam **${summary.total}** match bloğu (${summary.nested} iç içe).`,
    "",
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows,
    "",
    `- \`if true\` (girişsiz erişim) blokları: ${summary.openBlocks.map((path) => `\`${path}\``).join(", ") || "yok"}`,
    `- Collection-group / joker bloklar: ${summary.collectionGroups.map((path) => `\`${path}\``).join(", ") || "yok"}`,
    `- Hiç \`allow\` içermeyen blok: ${summary.missingAllow.map((path) => `\`${path}\``).join(", ") || "yok"}`,
  ].join("\n");
}

function main() {
  const target = process.argv[2] ?? DEFAULT_RULES;
  const source = readFileSync(target, "utf8");
  const blocks = parseRules(source);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(summarize(blocks), null, 2));
    return;
  }
  console.log(toMarkdown(blocks));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
