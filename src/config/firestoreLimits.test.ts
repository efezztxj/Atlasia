/**
 * Atlasia — istemci `limit()` ↔ kural `boundedList()` tutarlılık bekçisi.
 *
 * NEDEN VAR: `boundedList(n)` kuralı `request.query.limit != null &&
 * request.query.limit <= n` demek. Yani istemcideki limit kural sınırını BİR
 * bile aşsa sorgu `permission-denied` döner — hata mesajı "Missing or
 * insufficient permissions" olur ve gerçek neden (limit) mesajda görünmez.
 *
 * KANITLANAN ÖRNEK: `users/{uid}/groups` liste kuralı boundedList(20) iken
 * hesap silme yolu `limit(50)` kullanıyordu. Sorgu her zaman reddedildi; hata
 * `deleteUserData`'daki ortak catch'e düştüğü için grup indeksi ve BİLDİRİMLER
 * de hiç silinmiyordu. Bu test o sınıfı otomatik yakalar.
 *
 * Test Java/emülatör istemez; doğrudan `firestore.rules` metnini ve `src/`
 * kaynaklarını ayrıştırır. Yeni bir liste sorgusu eklenirse tablo elle
 * güncellenmek zorunda DEĞİLDİR — sorgu otomatik bulunur.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RULES_PATH = "firestore.rules";

// ─────────────────────────── kural tarafı ───────────────────────────

interface RuleBound {
  /** Koleksiyon yolu (belge kimliği segmenti atılmış), örn. /users/{uid}/groups */
  collectionPath: string;
  /** boundedList(n) değeri; `list: if false` için 0 */
  bound: number;
  line: number;
}

/**
 * İç içe match bloklarını tam yola açarak `allow list` sınırlarını çıkarır.
 *
 * DİKKAT: Yalnız `match` satırlarını saymak YETMEZ. Kurallar `match` bloğunun
 * içinde `function friendshipAfter() { ... }` gibi yardımcılar barındırır; o
 * fonksiyonun kapanış süslü parantezi match'i erken düşürür ve yol boş kalır.
 * Bu yüzden TÜM süslü parantezlerle bir derinlik sayacı tutulur ve bir match
 * yalnız derinlik onun açılış seviyesinin altına inince çıkarılır.
 */
function parseRuleListBounds(source: string): RuleBound[] {
  const lines = source.split("\n");
  const stack: Array<{ depth: number; path: string }> = [];
  const out: RuleBound[] = [];
  let depth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const withoutComment = line.replace(/\/\/.*$/, "");
    const matchDeclaration = /^\s*match\s+(\/\S+)\s*\{/.exec(withoutComment);
    if (matchDeclaration) {
      const opens = (withoutComment.match(/\{/g) || []).length;
      const closes = (withoutComment.match(/\}/g) || []).length;
      // Yolun kendisi de süslü parantez içerir: /users/{uid}/friendships/{pairId}
      depth += opens - closes;
      stack.push({ depth, path: matchDeclaration[1]! });
      continue;
    }

    // `allow list` birkaç satıra yayılabilir; boundedList'i bulana kadar ilerle.
    if (/allow\s+list\s*:/.test(withoutComment)) {
      let condition = withoutComment;
      let cursor = index;
      while (!/boundedList\(\d+\)|if\s+false|;/.test(condition) && cursor + 1 < lines.length) {
        cursor += 1;
        condition += " " + lines[cursor]!.replace(/\/\/.*$/, "");
      }
      const fullPath = stack
        .map((entry) => entry.path)
        .filter((path) => path !== "/databases/{database}/documents")
        .join("");
      const boundMatch = /boundedList\((\d+)\)/.exec(condition);
      const denied = /allow\s+list\s*:\s*if\s+false/.test(condition);
      out.push({
        // Son segment belge kimliğidir; liste sorgusu koleksiyona yapılır.
        collectionPath: fullPath.replace(/\/\{[^/]+\}$/, ""),
        bound: denied ? 0 : Number(boundMatch ? boundMatch[1] : NaN),
        line: index + 1,
      });
    }

    const opens = (withoutComment.match(/\{/g) || []).length;
    const closes = (withoutComment.match(/\}/g) || []).length;
    depth += opens - closes;
    // Yalnız bu satırda KAPANAN derinliğin altına inen match'leri düşür.
    // İç içe bir `function` gövdesi kapandığında derinlik match'in açılış
    // seviyesine eşit kalır, dolayısıyla match düşmez.
    while (stack.length > 0 && stack[stack.length - 1]!.depth > depth) stack.pop();
  }
  return out;
}

// ─────────────────────────── istemci tarafı ───────────────────────────

interface ClientQuery {
  file: string;
  line: number;
  /** Ham koleksiyon ifadesi, örn. `users/${uid}/groups` */
  rawPath: string;
  /** Çözümlenmiş limit değeri */
  limit: number;
  limitSource: string;
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Dengeli parantezle `query(...)` gövdesini çıkarır. */
function extractQueryBodies(source: string): Array<{ body: string; startLine: number }> {
  const results: Array<{ body: string; startLine: number }> = [];
  const pattern = /\bquery\s*\(/g;
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(source)) !== null) {
    let depth = 0;
    let end = found.index + found.length - 1;
    for (let i = end; i < source.length; i += 1) {
      if (source[i] === "(") depth += 1;
      else if (source[i] === ")") {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    results.push({
      body: source.slice(found.index, end + 1),
      startLine: source.slice(0, found.index).split("\n").length,
    });
  }
  return results;
}

const CONSTANTS = new Map<string, number>();

/** Tüm src/ içindeki sayısal sabitleri toplar (yerel ve export edilen). */
function collectConstants(files: string[]): void {
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const pattern = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*(\d+)/g;
    let found: RegExpExecArray | null;
    while ((found = pattern.exec(source)) !== null) {
      CONSTANTS.set(found[1]!, Number(found[2]));
    }
  }
}

function resolveLimit(expr: string): number | null {
  const trimmed = expr.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (CONSTANTS.has(trimmed)) return CONSTANTS.get(trimmed)!;
  return null;
}

/** İstemci yolunu kural yolu biçimine çevirir: `users/{*}/groups` → `/users/{*}/groups` */
function normalizePath(rawPath: string): string | null {
  // Hem `${uid}` (şablon) hem `{*}` (önceden dönüştürülmüş) biçimini kabul eder.
  const normalized = rawPath.replace(/\$\{[^}]+\}/g, "{*}").replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized ? "/" + normalized : null;
}

/** Kural yolundaki `{anything}` ile istemcideki `{*}` eşleşir. */
function pathsMatch(clientPath: string, rulePath: string): boolean {
  const a = clientPath.split("/");
  const b = rulePath.split("/");
  if (a.length !== b.length) return false;
  return a.every((segment, i) => segment === b[i] || (segment === "{*}" && /^\{[^}]+\}$/.test(b[i]!)));
}

/** Üst düzey virgüllerle ayırır; tırnak ve iç içe parantezleri korur. */
function splitTopLevelArgs(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";
  for (const char of args) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") { quote = char; current += char; continue; }
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth -= 1;
    if (char === "," && depth === 0) { out.push(current.trim()); current = ""; continue; }
    current += char;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * `collection(...)` yolunu TÜM segmentleriyle çıkarır.
 *
 * NEDEN ÖNEMLİ: `collection(db, "groups", groupId, "messages")` çağrısında
 * yalnız ilk string'i almak yolu `groups` gösterir; oysa gerçek hedef
 * `groups/{groupId}/messages` alt koleksiyonudur. Kök `/groups` koleksiyonu
 * kurallarda `list: if false` olduğundan bu yanlış okuma sahte bir ihlal üretir.
 * Değişken segmentler `{*}` olarak işaretlenir.
 */
function extractCollectionPath(body: string): string | null {
  const start = /\bcollection\s*\(/.exec(body);
  if (!start) return null;
  let depth = 0;
  let end = start.index + start[0].length - 1;
  for (let i = end; i < body.length; i += 1) {
    if (body[i] === "(") depth += 1;
    else if (body[i] === ")") { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  const args = splitTopLevelArgs(body.slice(start.index + start[0].length, end));
  if (args.length < 2) return null;
  // İlk argüman db/firestore örneğidir, yol segmenti değildir.
  const segments = args.slice(1).map((arg) => {
    const literal = /^["'`](.*)["'`]$/s.exec(arg);
    return literal ? literal[1]!.replace(/\$\{[^}]+\}/g, "{*}") : "{*}";
  });
  const joined = segments.join("/").replace(/\/+/g, "/");
  // Tamamen değişken yol statik çözülemez (deleteOwnedCollection gibi).
  return joined.split("/").every((segment) => segment === "{*}") ? null : joined;
}

function collectClientQueries(files: string[]): ClientQuery[] {
  const queries: ClientQuery[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const { body, startLine } of extractQueryBodies(source)) {
      const rawPath = extractCollectionPath(body);
      const limitMatch = /\blimit\(\s*([^)]+?)\s*\)/.exec(body);
      // limitsiz sorgu: boundedList zaten reddeder — ayrı bir dava, burada atlanır.
      if (!limitMatch || !rawPath) continue;
      const limit = resolveLimit(limitMatch[1]!);
      queries.push({
        file,
        line: startLine,
        rawPath,
        limit: limit ?? Number.NaN,
        limitSource: limitMatch[1]!.trim(),
      });
    }
  }
  return queries;
}

/**
 * Koleksiyon adı VE limit'i fonksiyon parametresi olan sorgular kaynak içinde
 * statik çözülemez. `deleteOwnSubcollection(uid, subcollection, pageLimit)` tam
 * bu biçimdeydi ve hesap silme hatasının kaynağıydı; bu yüzden çağıran yerler
 * taranıp her çağrı SOMUT bir sorguya dönüştürülür. Böylece parametreli yol da
 * gerçekten denetlenmiş olur, "çözülemedi" diye atlanmaz.
 */
function expandParameterizedQueries(files: string[]): ClientQuery[] {
  const expanded: ClientQuery[] = [];
  const callPattern = /deleteOwnSubcollection\(\s*[^,]+,\s*"([^"]+)"\s*,\s*([A-Za-z0-9_]+)\s*\)/g;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    let found: RegExpExecArray | null;
    while ((found = callPattern.exec(source)) !== null) {
      const subcollection = found[1]!;
      const limit = resolveLimit(found[2]!);
      expanded.push({
        file,
        line: source.slice(0, found.index).split("\n").length,
        rawPath: `users/\${uid}/${subcollection}`,
        limit: limit ?? Number.NaN,
        limitSource: found[2]!,
      });
    }
  }
  return expanded;
}

// ─────────────────────────── veri ───────────────────────────

const rulesSource = readFileSync(RULES_PATH, "utf8");
const ruleBounds = parseRuleListBounds(rulesSource);
const sourceFiles = listSourceFiles("src");
collectConstants(sourceFiles);
const clientQueries = collectClientQueries(sourceFiles);
const parameterizedQueries = expandParameterizedQueries(sourceFiles);
/** Ana denetime giren tüm sorgular: doğrudan bulunanlar + çağrı yerinden somutlaştırılanlar. */
const allQueries = [...clientQueries, ...parameterizedQueries];

/**
 * Koleksiyon adı değişkenle verilen sorgular (`deleteOwnedCollection`) statik
 * çözülemez; çağıranların gerçek değerleri burada açıkça denetlenir.
 */
const DYNAMIC_QUERIES: Array<{ collectionName: string; limit: number; caller: string }> = [
  { collectionName: "places", limit: 50, caller: "deleteOwnedPlaces" },
  { collectionName: "posts", limit: 50, caller: "deleteOwnedPosts" },
  { collectionName: "stories", limit: 50, caller: "deleteOwnedStories" },
  { collectionName: "reports", limit: 50, caller: "deleteOwnedReports" },
];

describe("firestore.rules — boundedList sınırları ayrıştırılabiliyor", () => {
  it("beklenen koleksiyonların hepsi listede", () => {
    const paths = ruleBounds.map((entry) => entry.collectionPath);
    for (const expected of [
      "/users/{uid}/groups",
      "/users/{uid}/notifications",
      "/users/{uid}/friendships",
      "/users/{uid}/savedPlaces",
      "/users/{uid}/savedRoutes",
      "/groups/{groupId}/messages",
      "/routes",
      "/tracks",
      "/blocks",
      "/reports",
      "/verifications",
    ]) {
      expect(paths, `${expected} kuralı bulunamadı`).toContain(expected);
    }
  });

  it("boundedList değeri her liste kuralında sayısal olarak çözüldü", () => {
    for (const entry of ruleBounds) {
      expect(Number.isNaN(entry.bound), `${entry.collectionPath} (satır ${entry.line}) çözülemedi`).toBe(false);
    }
  });

  it("friendships kök koleksiyonu listelemeye kapalı (enumeration yok)", () => {
    const friendships = ruleBounds.find((entry) => entry.collectionPath === "/friendships");
    expect(friendships).toBeDefined();
    expect(friendships!.bound).toBe(0);
  });
});

describe("istemci limit() hiçbir kural sınırını aşmaz", () => {
  it("en az bir liste sorgusu bulundu (ayrıştırıcı gerçekten çalışıyor)", () => {
    // Ayrıştırıcı sessizce boş dönerse test "başarılı" görünürdü; bu bekçi onu engeller.
    expect(clientQueries.length).toBeGreaterThan(10);
  });

  it("her sorgunun limiti sayısal olarak çözülebildi", () => {
    // Koleksiyon adı VE limiti fonksiyon parametresi olan sorgular burada
    // çözülemez; onlar expandParameterizedQueries ile çağrı yerinden
    // somutlaştırılıp ayrı bir testte denetlenir. Sessizce atlanmazlar.
    // Biçim: `users/{*}/{*}` — son segment dinamik koleksiyon adıdır.
    const isParameterized = (rawPath: string): boolean => rawPath.split("/").pop() === "{*}";
    const unresolved = clientQueries
      .filter((entry) => !isParameterized(entry.rawPath))
      .filter((entry) => Number.isNaN(entry.limit))
      .map((entry) => `${entry.file}:${entry.line} limit(${entry.limitSource})`);
    expect(unresolved, `çözülemeyen limitler: ${unresolved.join(", ")}`).toEqual([]);
  });

  it("hiçbir limit kendi boundedList sınırını aşmaz (permission-denied bekçisi)", () => {
    const violations: string[] = [];
    for (const entry of allQueries) {
      if (Number.isNaN(entry.limit)) continue;
      const clientPath = normalizePath(entry.rawPath);
      if (!clientPath) continue;
      const rule = ruleBounds.find((candidate) => pathsMatch(clientPath, candidate.collectionPath));
      if (!rule) continue; // bu koleksiyon için liste kuralı yok → başka bir dava
      if (entry.limit > rule.bound) {
        violations.push(
          `${entry.file}:${entry.line} ${entry.rawPath} limit(${entry.limitSource}=${entry.limit})`
          + ` > ${rule.collectionPath} boundedList(${rule.bound}) [rules satır ${rule.line}]`,
        );
      }
    }
    expect(violations, `LİMİT AŞIMI:\n${violations.join("\n")}`).toEqual([]);
  });

  it("list: false olan hiçbir koleksiyon istemciden sorgulanmaz", () => {
    const closedPaths = ruleBounds.filter((entry) => entry.bound === 0).map((entry) => entry.collectionPath);
    const hits = allQueries.filter((entry) => {
      const clientPath = normalizePath(entry.rawPath);
      return clientPath ? closedPaths.some((closed) => pathsMatch(clientPath, closed)) : false;
    });
    expect(hits.map((entry) => `${entry.file}:${entry.line} ${entry.rawPath}`)).toEqual([]);
  });

  it("parametreli alt koleksiyon sorguları çağrı yerlerinden somutlaştırıldı", () => {
    // Bu bekçi olmazsa ayrıştırıcı sessizce 0 çağrı bulup test "geçmiş" görünürdü.
    // Gerçek hata tam bu yoldaydı: deleteOwnSubcollection(uid,"groups",50).
    expect(parameterizedQueries.length).toBeGreaterThanOrEqual(2);
    const names = parameterizedQueries.map((entry) => entry.rawPath.split("/").pop());
    expect(names).toContain("groups");
    expect(names).toContain("notifications");
    for (const entry of parameterizedQueries) {
      expect(Number.isNaN(entry.limit), `${entry.rawPath} limiti çözülemedi`).toBe(false);
    }
  });

  it("parametreli sorguların her biri kendi kural sınırına uyar", () => {
    const violations: string[] = [];
    for (const entry of parameterizedQueries) {
      const clientPath = normalizePath(entry.rawPath);
      const rule = clientPath
        ? ruleBounds.find((candidate) => pathsMatch(clientPath, candidate.collectionPath))
        : undefined;
      expect(rule, `${entry.rawPath} için liste kuralı bulunamadı`).toBeDefined();
      if (rule && entry.limit > rule.bound) {
        violations.push(
          `${entry.file}:${entry.line} ${entry.rawPath} limit(${entry.limitSource}=${entry.limit})`
          + ` > boundedList(${rule.bound})`,
        );
      }
    }
    expect(violations, `PARAMETRELİ LİMİT AŞIMI:\n${violations.join("\n")}`).toEqual([]);
  });

  it("dinamik koleksiyon adlı silme sorguları da sınırları aşmaz", () => {
    const violations: string[] = [];
    for (const entry of DYNAMIC_QUERIES) {
      const rule = ruleBounds.find((candidate) => candidate.collectionPath === `/${entry.collectionName}`);
      expect(rule, `${entry.collectionName} için liste kuralı yok`).toBeDefined();
      if (rule && entry.limit > rule.bound) {
        violations.push(
          `${entry.caller}: ${entry.collectionName} limit(${entry.limit}) > boundedList(${rule.bound})`,
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("bilinen sınır değerleri — regresyon kilidi", () => {
  it("grup indeksi 20'dir ve istemci bunu aşmaz", () => {
    // Bu çift, hesap silme yolundaki gerçek hataydı: kural 20, istemci 50.
    const rule = ruleBounds.find((entry) => entry.collectionPath === "/users/{uid}/groups");
    expect(rule!.bound).toBe(20);
    expect(CONSTANTS.get("GROUPS_LIMIT")).toBe(20);
    const groupQueries = clientQueries.filter((entry) => normalizePath(entry.rawPath) === "/users/{*}/groups");
    expect(groupQueries.length).toBeGreaterThan(0);
    for (const entry of groupQueries) expect(entry.limit).toBeLessThanOrEqual(20);
  });

  it("kayıtlı yer/rota sayfaları 100'dür (SAVED_PAGE_SIZE kurala tam oturur)", () => {
    expect(CONSTANTS.get("SAVED_PAGE_SIZE")).toBe(100);
    for (const path of ["/users/{uid}/savedPlaces", "/users/{uid}/savedRoutes"]) {
      const rule = ruleBounds.find((entry) => entry.collectionPath === path);
      expect(rule!.bound).toBe(100);
    }
  });

  it("rota keşif sayfası 40'tır (ROUTE_PAGE_SIZE kurala tam oturur)", () => {
    expect(CONSTANTS.get("ROUTE_PAGE_SIZE")).toBe(40);
    const rule = ruleBounds.find((entry) => entry.collectionPath === "/routes");
    expect(rule!.bound).toBe(40);
  });
});
