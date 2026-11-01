/**
 * Atlasia — canlı durum dokümanı üreteci (F0-5).
 *
 * NEDEN VAR: tarihli raporlardaki sayılar kayıyor. İki somut örnek (2026-11-01):
 * `docs/mvp-denetimi-2026-10-27.md` "152 dosya / 1.233 test" diyor (bugün 176 /
 * 1.346), `ROADMAP.md` `App.tsx` için "58 satır" diyor (bugün 88). Tarihli
 * raporlar **dondurulmuş kesittir** ve düzeltilmemeli; ama tek bir "bugün ne
 * durumdayız" dosyası olmalı. Bu betik onu üretir.
 *
 * TASARIM KARARI: buraya yalnız **yapısal** sayılar girinir (dosya sayıları,
 * kural blokları, kapı listesi). Satır sayısı (LOC) ve toplam test sayısı
 * bilinçli olarak **yoktur**: her commit'te değişen sayı, dokümanı günlük
 * angaryaya çevirir ve bayatlama sorununu çözmez, taşır. Test sayısı CI
 * koşusunda ölçülür; bu dosya ona sayı uydurmaz.
 *
 * KULLANIM:
 *   node scripts/state-doc.mjs           # docs/DURUM.md dosyasını yazar
 *   node scripts/state-doc.mjs --check   # bayatsa çıkış kodu 1 (CI kapısı)
 *
 * `src/config/stateDoc.test.ts` bu betiği `--check` ile çağırır; yani dosyanın
 * bayatlaması test kırmızısıdır.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DOC_PATH = "docs/DURUM.md";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_FILE = /\.(?:ts|tsx)$/;
const TEST_FILE = /\.test\.(?:ts|tsx)$/;

function walk(relativeDir) {
  const absolute = path.join(ROOT, relativeDir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return [relativePath];
  });
}

/** Tarama gerçekten dosya görüyor mu? Boş küme yeşil sayılmasın (policyGate deseni). */
export function collectState() {
  const srcFiles = walk("src").filter((file) => SOURCE_FILE.test(file));
  const testFiles = srcFiles.filter((file) => TEST_FILE.test(file));
  const sourceOnly = srcFiles.filter((file) => !TEST_FILE.test(file));
  const componentFiles = sourceOnly.filter((file) => file.startsWith("src/components/") && file.endsWith(".tsx"));
  const hookFiles = sourceOnly.filter((file) => file.startsWith("src/hooks/") && /\.tsx?$/.test(file));
  const libFiles = sourceOnly.filter((file) => file.startsWith("src/lib/") && file.endsWith(".ts"));
  const docsFiles = walk("docs").filter((file) => file.endsWith(".md"));

  const rules = readFileSync(path.join(ROOT, "firestore.rules"), "utf8");
  const rulesLines = rules.split("\n").length - (rules.endsWith("\n") ? 1 : 0);
  const ruleBlocks = rules.match(/^\s*match\s+\S+\s*\{\s*$/gm)?.length ?? 0;
  const allowLines = rules.match(/^\s*allow\s+[a-z,\s]+:\s*if\s+/gm)?.length ?? 0;

  const indexes = JSON.parse(readFileSync(path.join(ROOT, "firestore.indexes.json"), "utf8"));
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));

  return {
    sourceFiles: sourceOnly.length,
    testFiles: testFiles.length,
    components: componentFiles.length,
    hooks: hookFiles.length,
    libModules: libFiles.length,
    docsFiles: docsFiles.length,
    rulesLines,
    ruleBlocks,
    allowLines,
    indexCount: Array.isArray(indexes.indexes) ? indexes.indexes.length : 0,
    engines: pkg.engines?.node ?? "(tanımsız)",
    packageManager: pkg.packageManager ?? "(tanımsız)",
    srcFileCount: srcFiles.length,
  };
}

const GATES = [
  ["Tip denetimi", "`npm run typecheck`"],
  ["Lint (0 uyarı)", "`npm run lint`"],
  ["Birim/IO/UI testleri + kapsam eşiği", "`npm run test:cov`"],
  ["Betik testleri", "`npm run test:scripts`"],
  ["Firestore kuralları (emülatör)", "`npm run test:rules:emulator`"],
  ["Üretim derlemesi + bütçe (gzip/brotli)", "`npm run build`"],
  ["SW kabuğu kapsamı", "`npm run verify:sw-shell`"],
  ["Sosyal meta veri", "`npm run verify:social-metadata`"],
  ["Bağımlılık denetimi (üretim)", "`npm run audit:check`"],
  ["Doküman tazeliği (bu dosya)", "`npm run state:doc -- --check`"],
];

export function renderState(state) {
  const lines = [
    "# Atlasia — canlı durum (üretilen dosya)",
    "",
    "> **Bu dosya ELLE DÜZENLENMEZ.** `npm run state:doc` ile üretilir;",
    "> `src/config/stateDoc.test.ts` bayatlamasını kırmızıya çevirir.",
    "> Tarihli denetim/teslimat raporları **dondurulmuş kesittir**; buradaki",
    "> sayılarla çelişebilirler ve bu yüzden düzeltilmezler — güncel sayı buradadır.",
    "> Satır sayısı (LOC) ve toplam test sayısı bilinçli olarak yoktur (bkz. betik başlığı).",
    "",
    "## 1. Depo ölçeği",
    "",
    "| Ölçüm | Değer |",
    "|---|---|",
    `| Kaynak dosya (test hariç) | **${state.sourceFiles}** |`,
    `| Test dosyası | **${state.testFiles}** |`,
    `| Bileşen (\`src/components/*.tsx\`) | ${state.components} |`,
    `| Hook (\`src/hooks/*.ts\`) | ${state.hooks} |`,
    `| Kütüphane modülü (\`src/lib/*.ts\`) | ${state.libModules} |`,
    `| Doküman dosyası (\`docs/**/*.md\`) | ${state.docsFiles} |`,
    "",
    "## 2. Güvenlik yüzeyi",
    "",
    "| Ölçüm | Değer |",
    "|---|---|",
    `| \`firestore.rules\` satır | ${state.rulesLines} |`,
    `| Kural \`match\` bloğu | ${state.ruleBlocks} |`,
    `| Kural \`allow\` satırı | ${state.allowLines} |`,
    `| Bileşik indeks | ${state.indexCount} |`,
    "",
    "## 3. Çalışma zamanı",
    "",
    "| Ölçüm | Değer |",
    "|---|---|",
    `| \`engines.node\` | \`${state.engines}\` |`,
    `| \`packageManager\` | \`${state.packageManager}\` |`,
    "",
    "## 4. Zorunlu kapılar",
    "",
    "| Kapı | Komut |",
    "|---|---|",
    ...GATES.map(([name, command]) => `| ${name} | ${command} |`),
    "",
    "## 5. Ölçülmeyenler (dürüstlük notu)",
    "",
    "- **Toplam test sayısı**: CI koşusunda ölçülür; bu dosyaya yazılmaz (kayan sayı kaynağıydı).",
    "- **Core Web Vitals (LCP/CLS/INP)**: gerçek alan verisi telemetri kapalıyken yoktur.",
    "- **Gerçek ekran okuyucu turu**: insan işidir, otomatik kapı değildir.",
    "",
  ];
  return lines.join("\n");
}

export function run({ check = false, log = console.log, errorLog = console.error, docPath = DOC_PATH } = {}) {
  const state = collectState();
  if (state.sourceFiles < 50 || state.ruleBlocks < 20) {
    errorLog("Durum taraması eksik görünüyor (kaynak dosya veya kural bloğu sayısı beklenenin altında).");
    return { ok: false, reason: "tarama-eksik" };
  }

  const rendered = renderState(state);
  const absolute = path.join(ROOT, docPath);

  if (check) {
    const current = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
    if (current !== rendered) {
      errorLog(`Bayat doküman: ${docPath}. Düzeltmek için: npm run state:doc`);
      return { ok: false, reason: "bayat", state };
    }
    log(`Durum dokümanı güncel: ${docPath}`);
    return { ok: true, state };
  }

  writeFileSync(absolute, rendered, "utf8");
  log(`Yazıldı: ${docPath}`);
  return { ok: true, state };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // `ATLASIA_STATE_DOC` yalnız testte kullanılır: gerçek dosyaya dokunmadan
  // "bayat dosya kırmızı olur mu" sorusu sınanabilsin.
  const docPath = process.env.ATLASIA_STATE_DOC || DOC_PATH;
  const result = run({ check: process.argv.includes("--check"), docPath });
  if (!result.ok) process.exitCode = 1;
}
