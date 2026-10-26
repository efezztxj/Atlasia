/**
 * Atlasia — Canlı yapılandırma doğrulaması (dışarıdan, panel gerektirmeden)
 *
 * Neden var: Cloudflare Pages ortam değişkenleri yalnız panelde görünür ve
 * build log'una API'den erişilemiyor. Vite bu değişkenleri istemci paketine
 * gömdüğü için, yayınlanan paketin kendisi "üretimde hangi yapılandırma
 * gerçekten çalışıyor" sorusunun tek doğru kaynağıdır.
 *
 * GÜVENLİK: API anahtarı asla yazdırılmaz (yalnız "var/yok" ve maskeli son 4).
 * projectId ve authDomain gizli değildir (Firebase web kimlikleri herkese açıktır).
 *
 * Kullanım:
 *   node scripts/canli-yapilandirma.mjs [--base https://atlasia.pages.dev] [--json]
 * Çıkış kodu: 1 → canlı yapılandırma hatalı (geliştirme projesine bağlı ya da eksik).
 */

const DEFAULT_BASE = "https://atlasia.pages.dev";

/** HTML içinden same-origin `/assets/*.js` yollarını çıkarır (SPA kabuğu). */
export function mainAssetPaths(html) {
  const paths = new Set();
  const pattern = /["']((?:\.\/|\/)?assets\/[A-Za-z0-9_.-]+\.js)["']/g;
  for (const match of String(html).matchAll(pattern)) {
    const raw = match[1];
    paths.add(raw.startsWith("/") ? raw : `/${raw.replace(/^\.\//, "")}`);
  }
  return [...paths];
}

/** HTML'deki entry (module) betiğini işaretler; yoksa ilk asset döner. */
export function entryAssetPath(html) {
  const module = String(html).match(/<script[^>]+type=["']module["'][^>]*src=["']([^"']+\.js)["']/);
  if (module) {
    const src = module[1];
    return src.startsWith("/") ? src : `/${src.replace(/^\.\//, "")}`;
  }
  const assets = mainAssetPaths(html);
  return assets.length ? assets[0] : null;
}

function firstMatch(text, source) {
  const match = String(text).match(source);
  return match ? match[1] : null;
}

/**
 * Minify edilmiş paketten Firebase yapılandırma izlerini toplar.
 * Terser nesne anahtarlarını bozmadığı için `projectId:"..."` güvenilirdir.
 */
export function extractFirebaseConfig(text) {
  const source = String(text);
  const projectId = firstMatch(source, /projectId\s*:\s*["']([^"']+)["']/);
  const authDomain = firstMatch(source, /authDomain\s*:\s*["']([^"']+)["']/);
  const apiKey = firstMatch(source, /apiKey\s*:\s*["']([^"']+)["']/);
  // Ham anahtar hiçbir çıktıya girmesin: yalnız "var mı" ve maskeli biçim döner.
  return {
    projectId,
    authDomain,
    apiKeyPresent: Boolean(apiKey),
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}` : null,
    // Üretim paketinde geliştirme projesi adının izi (yedek sinyal).
    // NOT: App Check debug token kancası ayrıca aranmaz; firebase/app-check SDK'sı
    // `FIREBASE_APPCHECK_DEBUG_TOKEN` adını kendi içinde de kullandığı için bu
    // arama yanlış alarm üretiyordu (ölçüldü: firebase-vendor paketinde geçiyor).
    // "atlasia-device-accounts-v1" gibi yerel depolama adları yanlış alarm vermesin.
    mentionsDevProject: /atlasia-dev(?![\w-])/.test(source),
  };
}

/**
 * Bulguları değerlendirir. `expectedProject` verilmezse yalnız "dev projeye
 * bağlı olmamalı" kuralı uygulanır.
 */
export function evaluateConfig(config, { expectedProject } = {}) {
  const problems = [];
  if (!config.projectId) problems.push("projectId pakette bulunamadı (Firebase yapılandırması eksik)");
  if (!config.authDomain) problems.push("authDomain pakette bulunamadı");
  if (!config.apiKeyPresent) problems.push("apiKey pakette bulunamadı");
  if (config.projectId && config.projectId.toLowerCase() === "atlasia-dev") {
    problems.push("canlı yapı GELİŞTİRME Firebase projesine (atlasia-dev) bağlı");
  }
  if (expectedProject && config.projectId && config.projectId !== expectedProject) {
    problems.push(`projectId beklenen değerle uyuşmuyor: ${config.projectId} ≠ ${expectedProject}`);
  }
  return { ok: problems.length === 0, problems };
}

/** Cache ve SW'yi atlatmak için her isteğe tekil sorgu ekler. */
function bust(url, stamp) {
  const parsed = new URL(url);
  parsed.searchParams.set("dogrula", stamp);
  return parsed.toString();
}

export async function inspectLiveSite({
  base = DEFAULT_BASE,
  fetchImpl = globalThis.fetch,
  stamp = String(Date.now()),
} = {}) {
  const htmlResponse = await fetchImpl(bust(`${base}/`, stamp), { headers: { "cache-control": "no-cache" } });
  if (!htmlResponse.ok) throw new Error(`Canlı site HTML alınamadı: HTTP ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  const entry = entryAssetPath(html);
  if (!entry) throw new Error("HTML içinde assets/*.js giriş paketi bulunamadı");

  const jsResponse = await fetchImpl(bust(`${base}${entry}`, stamp), { headers: { "cache-control": "no-cache" } });
  if (!jsResponse.ok) throw new Error(`Giriş paketi alınamadı (${entry}): HTTP ${jsResponse.status}`);
  const js = await jsResponse.text();

  const config = extractFirebaseConfig(js);
  return { base, entry, bytes: js.length, config };
}

function printReport({ base, entry, bytes, config }, { ok, problems }) {
  const line = (label, value) => console.log(`${label.padEnd(22)} ${value}`);
  console.log(`Canlı yapılandırma doğrulaması — ${base}`);
  line("Giriş paketi:", entry);
  line("Paket boyutu:", `${Math.round(bytes / 1024)} kB (gzip değil)`);
  line("projectId:", config.projectId ?? "(yok)");
  line("authDomain:", config.authDomain ?? "(yok)");
  line("apiKey:", config.apiKeyPresent ? `var (${config.apiKeyMasked})` : "YOK");
  line("atlasia-dev izi:", config.mentionsDevProject ? "VAR" : "yok");
  console.log("");
  if (ok) {
    console.log("SONUÇ: ✅ canlı yapılandırma sağlıklı");
  } else {
    console.log("SONUÇ: ❌ canlı yapılandırma hatalı");
    for (const problem of problems) console.log(` - ${problem}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf("--base");
  const base = baseIndex >= 0 ? args[baseIndex + 1] : process.env.ATLASIA_CANLI_BASE || DEFAULT_BASE;
  const asJson = args.includes("--json");
  const expectedProject = process.env.ATLASIA_BEKLEYEN_PROJE || undefined;

  const result = await inspectLiveSite({ base });
  const verdict = evaluateConfig(result.config, { expectedProject });

  if (asJson) {
    console.log(JSON.stringify({ ...result, ...verdict }, null, 2));
  } else {
    printReport(result, verdict);
  }
  if (!verdict.ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Doğrulama çalıştırılamadı: ${error.message}`);
    process.exit(2);
  });
}
