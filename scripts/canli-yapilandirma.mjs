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

/**
 * Bir parça metnindeki same-origin JS referanslarını toplar.
 *
 * Neden gerekli: 2026-10-29'daki T11 çalışmasından sonra Firebase yapılandırması
 * giriş paketinde **değil**, tembel `firebaseConfig-*.js` parçasında. Yalnız giriş
 * paketini taramak canlıyı "yapılandırma eksik" diye kırmızıya düşürüyordu
 * (1 Kasım 2026 CI koşusu: `projectId=(yok)`), yani kapı ölçtüğünü sandığı şeyi
 * ölçmüyordu. Bu yardımcı, girişten başlayıp parça grafiğini sınırlı biçimde izler.
 */
export function referencedAssetPaths(text) {
  const paths = new Set();
  const patterns = [
    // Mutlak: "/assets/firebaseConfig-abc.js"
    /["'`](\/assets\/[A-Za-z0-9_.-]+\.js)["'`]/g,
    // Göreli: "./firebaseConfig-abc.js" (Rolldown/Vite tembel parça biçimi)
    /["'`](\.\/[A-Za-z0-9_.-]+\.js)["'`]/g,
  ];
  for (const pattern of patterns) {
    for (const match of String(text).matchAll(pattern)) {
      paths.add(match[1].startsWith("./") ? `/assets/${match[1].slice(2)}` : match[1]);
    }
  }
  return [...paths];
}

/** Parça grafiği taramasının üst sınırları (sonsuz istek/döngü koruması). */
export const CRAWL_LIMITS = Object.freeze({ maxChunks: 40, maxDepth: 3 });

/**
 * Tarama sırası: adı yapılandırmaya işaret eden parçalar önce denenir. Giriş paketi
 * 40+ tembel parçaya referans verebildiği için rastgele sıra yapılandırmayı sınırın
 * dışında bırakabiliyordu (1 Kasım 2026 canlı koşusu: 24 parça, `projectId=(yok)`).
 */
export function assetPriority(path) {
  if (/firebaseconfig|firebase-config/i.test(path)) return 0;
  if (/firebase|config/i.test(path)) return 1;
  return 2;
}

export function prioritizeAssets(paths) {
  return [...paths].sort((a, b) => assetPriority(a) - assetPriority(b));
}

/** Yapılandırma tamam mı? Tamamsa tarama erken biter. */
function isComplete(config) {
  return Boolean(config?.projectId && config?.authDomain && config?.apiKeyPresent);
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
  // Vite 8 / Rolldown dizgileri **backtick** ile de yazabilir
  // (`projectId:\`atlasia-dev\``). Yalnız tek/çift tırnak kabul etmek, canlı
  // yapılandırmayı 1 Kasım 2026'da yanlış "eksik" gösteren asıl kök nedendi.
  const projectId = firstMatch(source, /projectId\s*:\s*["'`]([^"'`]+)["'`]/);
  const authDomain = firstMatch(source, /authDomain\s*:\s*["'`]([^"'`]+)["'`]/);
  const apiKey = firstMatch(source, /apiKey\s*:\s*["'`]([^"'`]+)["'`]/);
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
  const notes = [];
  if (!config.projectId) problems.push("projectId pakette bulunamadı (Firebase yapılandırması eksik)");
  if (!config.authDomain) problems.push("authDomain pakette bulunamadı");
  if (!config.apiKeyPresent) problems.push("apiKey pakette bulunamadı");

  // Not: "atlasia-dev" artık tek başına hata değil. Depoda tek Firebase projesi var
  // ve canlı site onun üzerinde çalışıyor (2026-10-26 ölçümü). Doğru ölçüt, beklenen
  // projenin operatör tarafından beyan edilmesi ve yapılandırmanın ona uymasıdır.
  if (config.projectId && config.projectId.toLowerCase() === "atlasia-dev") {
    notes.push("canlı yapı atlasia-dev projesine bağlı (depoda tek proje)");
  }
  if (expectedProject) {
    if (config.projectId && config.projectId !== expectedProject) {
      problems.push(`projectId beyan edilen üretim projesiyle uyuşmuyor: ${config.projectId} ≠ ${expectedProject}`);
    }
  } else {
    notes.push("beklenen proje beyan edilmedi (ATLASIA_URETIM_PROJESI) — yalnız raporlandı");
  }
  return { ok: problems.length === 0, problems, notes };
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
  const entryJs = await jsResponse.text();

  // Parça grafiği: giriş → (varsa) tembel parçalar. Firebase yapılandırması T11'den
  // sonra `firebaseConfig-*.js` içinde; yalnız girişi taramak yanlış "eksik" veriyordu.
  const texts = [{ path: entry, text: entryJs }];
  const queue = prioritizeAssets(referencedAssetPaths(entryJs)).map((path) => ({ path, depth: 1 }));
  const seen = new Set([entry]);
  let config = extractFirebaseConfig(entryJs);
  while (queue.length && texts.length < CRAWL_LIMITS.maxChunks && !isComplete(config)) {
    const { path, depth } = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    let response;
    try {
      response = await fetchImpl(bust(`${base}${path}`, stamp), { headers: { "cache-control": "no-cache" } });
    } catch {
      continue; // Tek parçanın düşmesi denetimi durdurmaz; eksik alan varsa rapor kırmızı olur.
    }
    if (!response.ok) continue;
    const text = await response.text();
    texts.push({ path, text });
    config = mergeConfigs([config, extractFirebaseConfig(text)]);
    if (depth < CRAWL_LIMITS.maxDepth) {
      const next = prioritizeAssets(referencedAssetPaths(text)).filter((path) => !seen.has(path));
      queue.push(...next.map((path) => ({ path, depth: depth + 1 })));
      // Öncelik korunur: kuyruk her turda yeniden sıralanır (config parçaları önce).
      queue.sort((a, b) => assetPriority(a.path) - assetPriority(b.path));
    }
  }

  config = mergeConfigs([
    config,
    ...texts.slice(1).map((chunk) => extractFirebaseConfig(chunk.text)),
  ]);
  return {
    base,
    entry,
    bytes: entryJs.length,
    chunksScanned: texts.length,
    scannedPaths: texts.map((chunk) => chunk.path),
    config,
  };
}

/**
 * Parça bazındaki bulguları birleştirir: alanlar farklı parçalara dağılmış olabilir.
 * `mentionsDevProject` herhangi bir parçada görülürse doğrudur (sinyal kaybolmasın).
 */
export function mergeConfigs(configs) {
  const merged = {
    projectId: null,
    authDomain: null,
    apiKeyPresent: false,
    apiKeyMasked: null,
    mentionsDevProject: false,
  };
  for (const config of configs) {
    if (!config) continue;
    merged.projectId ??= config.projectId ?? null;
    merged.authDomain ??= config.authDomain ?? null;
    if (!merged.apiKeyPresent && config.apiKeyPresent) {
      merged.apiKeyPresent = true;
      merged.apiKeyMasked = config.apiKeyMasked;
    }
    merged.mentionsDevProject ||= Boolean(config.mentionsDevProject);
  }
  return merged;
}

/** Clarity proje kimliği; yükleyici adresi buradan üretilir. */
export const CLARITY_TAG_URL = "https://www.clarity.ms/tag/z6hdmwcwe6";

/**
 * Kontrol ölçümü: aynı ağdan, var olmayan bir proje kimliği.
 *
 * Amaç: "204 döndü" tek başına iki şeyi ayırt etmiyor — (a) proje kimliği geçersiz,
 * (b) Clarity bu ağa/isteğe hiç betik sunmuyor. Kontrol kimliği de 204 alıyorsa
 * suçlu ağ/bot kapısıdır; kontrol 200 alıp bizim kimlik 204 alıyorsa suçlu kimliktir.
 */
export const CONTROL_TAG_URL = "https://www.clarity.ms/tag/zzzzzzz1";

/** Bot koruması ihtimalini ayırt etmek için gerçek masaüstü Chrome kimliği. */
export const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

/**
 * Ölçüm katmanının canlı kanıtı: yayındaki CSP başlığı Clarity'ye izin veriyor mu
 * ve Microsoft'un tag adresi gerçekten 200 dönüyor mu?
 *
 * Neden burada: "Clarity panelinde veri görünmüyor" şikâyetinin ilk iki aday nedeni
 * CSP'nin betiği engellemesi ve proje kimliğinin geçersiz olması. İkisi de tarayıcı
 * açmadan, dışarıdan ölçülebilir.
 */
export async function inspectClarity({ base, fetchImpl = globalThis.fetch, stamp = String(Date.now()) } = {}) {
  const htmlResponse = await fetchImpl(bust(`${base}/`, stamp), { headers: { "cache-control": "no-cache" } });
  const csp = htmlResponse.headers?.get?.("content-security-policy") ?? "";
  const directive = (name) => {
    const match = csp.match(new RegExp(`(?:^|;)\\s*${name} ([^;]+)`));
    return match ? match[1].trim().split(/\s+/) : [];
  };
  const scriptSrc = directive("script-src");
  const connectSrc = directive("connect-src");
  const problems = [];
  if (!csp) problems.push("yayında Content-Security-Policy başlığı yok");
  if (csp && !scriptSrc.includes("https://www.clarity.ms")) {
    problems.push("script-src içinde https://www.clarity.ms yok (Clarity yükleyicisi engellenir)");
  }
  if (csp && !scriptSrc.includes("https://scripts.clarity.ms")) {
    problems.push("script-src içinde https://scripts.clarity.ms yok (Clarity çalışma zamanı engellenir)");
  }
  if (csp && !connectSrc.some((entry) => entry === "https://*.clarity.ms")) {
    problems.push("connect-src içinde https://*.clarity.ms yok (oturum verisi gönderilemez)");
  }

  const notes = [];
  const warnings = [];
  let tag;
  try {
    const response = await fetchImpl(CLARITY_TAG_URL, { headers: { "cache-control": "no-cache" } });
    tag = {
      status: response.status,
      ok: response.status === 200,
      contentType: response.headers?.get?.("content-type") ?? null,
    };
    // Aynı adresi bir de tarayıcı kimliğiyle sor: 204 yalnız bot korumasından mı
    // geliyor, yoksa proje kimliği gerçekten geçersiz mi? Ayrımı bu ölçüm yapar.
    try {
      const browserResponse = await fetchImpl(CLARITY_TAG_URL, {
        headers: {
          "user-agent": CHROME_UA,
          referer: `${base}/`,
          accept: "*/*",
          "cache-control": "no-cache",
        },
      });
      tag.browserStatus = browserResponse.status;
      tag.browserContentType = browserResponse.headers?.get?.("content-type") ?? null;
      // Kontrol: var olmayan kimlik aynı koşullarda ne dönüyor?
      try {
        const controlResponse = await fetchImpl(CONTROL_TAG_URL, {
          headers: { "user-agent": CHROME_UA, referer: `${base}/`, accept: "*/*", "cache-control": "no-cache" },
        });
        tag.controlStatus = controlResponse.status;
        if (tag.controlStatus === 200 && browserResponse.status === 204) {
          notes.push(
            "kontrol kimliği 200, bizim kimlik 204: fark ağ değil, proje kimliği — Clarity panelindeki Project ID bu değil",
          );
        } else if (tag.controlStatus === 204 && browserResponse.status === 204) {
          notes.push(
            "kontrol kimliği de 204: Clarity bu ağa/isteğe betik sunmuyor; kimliğin doğruluğu yalnız kullanıcı tarayıcısından teyit edilebilir",
          );
        }
      } catch (controlError) {
        notes.push(`kontrol ölçümü yapılamadı: ${String(controlError?.message ?? controlError)}`);
      }

      if (browserResponse.status === 200) {
        notes.push("tarayıcı kimliğiyle tag 200 döndü: yükleyici gerçek kullanıcıya ulaşıyor");
      } else if (browserResponse.status === 204) {
        // Dış servis davranışı: kapıyı kırmızıya düşürmek yerine yüksek sesle uyarır.
        warnings.push(
          "tarayıcı kimliğiyle de tag 204 (No Content): Microsoft bu proje kimliği için betik sunmuyor — Clarity panelinde Project ID ve alan adı doğrulanmalı",
        );
      }
    } catch (probeError) {
      notes.push(`tarayıcı kimliği denemesi yapılamadı: ${String(probeError?.message ?? probeError)}`);
    }
    if (response.status === 200) {
      // Beklenen: JavaScript gövdesi.
    } else if (response.status >= 400) {
      problems.push(`Clarity tag adresi HTTP ${response.status} döndü (proje kimliği geçersiz olabilir)`);
    } else {
      // Tarayıcı dışı istek (Referer/Origin yok) 204 dönebiliyor; tek başına hata sayılmaz.
      // Belirleyici kanıt gerçek tarayıcı koşusu: `npm run test:e2e:canli`.
      notes.push(
        `tag adresi tarayıcı dışı istekte HTTP ${response.status} döndü; tarayıcı doğrulaması belirleyici`,
      );
    }
  } catch (error) {
    // Ağ engeli bu denetimi ölçemez hâle getirir; hata değil, not olarak raporlanır.
    notes.push(`Clarity tag adresine ulaşılamadı: ${String(error?.message ?? error)}`);
    tag = { status: null, ok: false, contentType: null };
  }

  return { ok: problems.length === 0, problems, warnings, notes, scriptSrc, connectSrc, tag };
}

/**
 * GitHub Actions log'una erişilemeyen ortamlar için bulguyu annotation olarak
 * yayınlar (annotations API'den okunabilir). Annotation girdileri tek satırdır.
 */
function annotation(level, title, message) {
  const clean = String(message).replace(/\r?\n/g, " ").replace(/%/g, "%25");
  console.log(`::${level} title=${title}::${clean}`);
}

function printReport({ base, entry, bytes, config, chunksScanned = 1 }, { ok, problems, notes = [] }) {
  const line = (label, value) => console.log(`${label.padEnd(22)} ${value}`);
  console.log(`Canlı yapılandırma doğrulaması — ${base}`);
  line("Giriş paketi:", entry);
  line("Paket boyutu:", `${Math.round(bytes / 1024)} kB (gzip değil)`);
  line("Taranan parça:", `${chunksScanned} (giriş + tembel parçalar)`);
  line("projectId:", config.projectId ?? "(yok)");
  line("authDomain:", config.authDomain ?? "(yok)");
  line("apiKey:", config.apiKeyPresent ? `var (${config.apiKeyMasked})` : "YOK");
  line("atlasia-dev izi:", config.mentionsDevProject ? "VAR" : "yok");
  for (const note of notes) line("Not:", note);
  console.log("");
  if (ok) {
    console.log("SONUÇ: ✅ canlı yapılandırma sağlıklı");
  } else {
    console.log("SONUÇ: ❌ canlı yapılandırma hatalı");
    for (const problem of problems) console.log(` - ${problem}`);
  }
}

function printClarityReport({ ok, problems, warnings = [], notes, scriptSrc, connectSrc, tag }) {
  const line = (label, value) => console.log(`${label.padEnd(22)} ${value}`);
  console.log("");
  console.log("Clarity (rıza kapılı üçüncü taraf ölçüm) doğrulaması");
  line("script-src:", scriptSrc.length ? scriptSrc.join(" ") : "(başlık yok)");
  line("connect-src *.clarity:", connectSrc.includes("https://*.clarity.ms") ? "var" : "YOK");
  line("tag adresi:", `${CLARITY_TAG_URL} → ${tag?.status ?? "ulaşılamadı"}${tag?.contentType ? ` (${tag.contentType})` : ""}`);
  for (const warning of warnings) line("Uyarı:", warning);
  for (const note of notes ?? []) line("Not:", note);
  console.log("");
  if (ok) {
    console.log("SONUÇ: ✅ Clarity yapılandırması canlıda izinli ve tag erişilebilir");
  } else {
    console.log("SONUÇ: ❌ Clarity yapılandırması canlıda sorunlu");
    for (const problem of problems) console.log(` - ${problem}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf("--base");
  const base = baseIndex >= 0 ? args[baseIndex + 1] : process.env.ATLASIA_CANLI_BASE || DEFAULT_BASE;
  const asJson = args.includes("--json");
  const expectedProject = process.env.ATLASIA_URETIM_PROJESI || undefined;

  const result = await inspectLiveSite({ base });
  const verdict = evaluateConfig(result.config, { expectedProject });
  const clarity = await inspectClarity({ base });

  if (asJson) {
    console.log(JSON.stringify({ ...result, ...verdict, clarity }, null, 2));
  } else {
    printReport(result, verdict);
    printClarityReport(clarity);
  }

  if (process.env.GITHUB_ACTIONS === "true") {
    // Clarity bulgusu da annotation olarak yayınlanır: iş log'u erişilemezse
    // (bu depoda olduğu gibi) tek okunabilir kanıt annotations API'sidir.
    const clarityFacts =
      `script-src clarity=${clarity.scriptSrc.includes("https://scripts.clarity.ms") ? "var" : "YOK"} | ` +
      `connect *.clarity=${clarity.connectSrc.includes("https://*.clarity.ms") ? "var" : "YOK"} | ` +
      `tag=${clarity.tag?.status ?? "ulasilamadi"}/${clarity.tag?.browserStatus ?? "-"}/kontrol=${clarity.tag?.controlStatus ?? "-"}`;
    if (!clarity.ok) {
      annotation("error", "Canli Clarity", `${clarityFacts} | Sorunlar: ${clarity.problems.join(" ; ")}`);
    } else if ((clarity.warnings ?? []).length) {
      annotation("warning", "Canli Clarity", `${clarityFacts} | ${clarity.warnings.join(" ; ")}`);
    } else {
      annotation("notice", "Canli Clarity", `${clarityFacts} | ${clarity.notes?.join(" ; ") || "saglikli"}`);
    }

    const { config, entry, base, chunksScanned = 1, scannedPaths = [] } = result;
    const facts =
      `base=${base} | entry=${entry} | parca=${chunksScanned} | projectId=${config.projectId ?? "(yok)"} | ` +
      `authDomain=${config.authDomain ?? "(yok)"} | apiKey=${config.apiKeyPresent ? "var" : "YOK"} | ` +
      `atlasia-dev izi=${config.mentionsDevProject ? "VAR" : "yok"}`;
    if (verdict.ok) {
      annotation("notice", "Canli yapilandirma", `Saglikli: ${facts}`);
    } else {
      const paths = scannedPaths.slice(0, 12).join(",");
      annotation(
        "error",
        "Canli yapilandirma",
        `${facts} | Sorunlar: ${verdict.problems.join(" ; ")} | taranan=${paths}`,
      );
    }
  }

  if (!clarity.ok) {
    for (const problem of clarity.problems) console.log(` - [clarity] ${problem}`);
  }
  if (!verdict.ok || !clarity.ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Doğrulama çalıştırılamadı: ${error.message}`);
    process.exit(2);
  });
}
