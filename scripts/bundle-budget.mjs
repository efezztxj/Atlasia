import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const DEFAULT_DIST = fileURLToPath(new URL("../dist", import.meta.url));

/*
 * P19 baz ölçümü: 2026-10-21, bu daldaki Firebase Auth lazy sınırı sonrası
 * yerel production build. Eşikler ölçülen gzip değerlerine yaklaşık %10
 * toleransla bağlanır; amaç küçük derleyici/hash dalgalanmasını değil,
 * başlangıç grafiğine sessizce giren yeni ağır bağımlılıkları yakalamaktır.
 * Bilinçli bir büyümede eşik, yeni ölçüm ve gerekçe teslimata yazılarak
 * güncellenir; yalnız testi yeşil yapmak için gevşetilmez.
 *
 * 2026-10-25 — mobil tur: telefon sertleştirme katmanı (16px alan yazı tabanı,
 * overscroll/touch-action, yatay kısa ekran kuralları) ve alt yığın düzeni
 * ölçülen CSS gzip değerini yükseltti. `main` ile birleşince (hava katmanı +
 * moderasyon turu) ölçüm CSS 34.903 B / JS 893.504 B oldu; CSS eşiği
 * 34.800 -> 35.100'e çekildi (aynı ~%0,6 pay), JS eşiği 902.000'de kaldı.
 * Ayrıntı: docs/mobil-uygunluk.md.
 *
 * 2026-10-25 güncellemesi (K-10 kararı, maintainer onayı "gerekeni yap"):
 * ölçülen değerler JS 894.809 B, CSS 34.546 B gzip. Artış bilinçli iki
 * özellikten geliyor ve hiçbiri yeni ağır bağımlılık değil:
 *   +2.223 B  utils/mapWeather.ts  Windy tarzı renk alanı + parçacık akışı
 *   +1.699 B  components/MapLayersSheet.tsx  "Katmanlar" sayfası
 *   +2.696 B  components/ReportsPanel.tsx  raporlarım + moderatör kuyruğu
 *   +1.284 B  App.tsx bağlantıları (durum, olaylar, panel açma)
 * Eşikler, eski payla aynı oranda (~%0,4) boşluk bırakacak şekilde
 * yükseltildi: 888.000 → 902.000 ve 34.500 → 34.800.
 *
 * 2026-10-25 (ikinci ölçüm, askıya alma/ban turu): JS 897.644 B. Ek: 
 *   +2,4 kB  components/SuspensionNotice.tsx (askı ekranı) ve ReportsPanel
 *            içindeki ban bölümü; +0,4 kB kurallar/ağ kodunda.
 * Eşik 902.000'e çekildi; gerekçe aynı: yeni ağır bağımlılık yok.
 *
 * 2026-10-25 (üçüncü ölçüm, kapsamlı moderasyon turu): JS 903.778 B,
 * CSS 34.713 B gzip. Artış maintainer'ın seçtiği "tam ayrıcalıklı panel"
 * kapsamından: kademeli yaptırım (uyarı/içerik kaldırma), itiraz akışı,
 * duyuru ve işlem kaydı görünümleri ReportsPanel içinde (lazy parça),
 * ModerationNotices bileşenleri ve moderation.ts ekleri. Yeni ağır
 * bağımlılık yok. JS eşiği ölçüme ~%0,46 payla 908.000'e çekildi;
 * CSS eşiği değişmedi (34.713 / 34.800, pay dar — izlenecek).
 *
 * 2026-10-27 (site turu) — bütçe kapsamı düzeltildi, gevşetilmedi:
 * ölçüm CSS 34.957 B, JS 903.867 B gzip. "Toplam CSS" haritanın 10.517 B'lik
 * lazy `map-vendor` dosyasını da sayıyordu; oysa ilk HTML yalnız
 * `index-*.css` (24.440 B) çekiyor. Yani tek bir 200 B'lik sınıf eklemek,
 * kullanıcının hiç indirmediği bir dosya yüzünden CI'ı kırıyordu.
 *   + `initialCssGzipBytes` / `initialJsGzipBytes` eklendi: ilk boyaya giren
 *     gerçek maliyet artık ayrı ve daha sıkı eşikle ölçülüyor (CSS 25.900,
 *     JS 398.000; ölçüme ~%2,5-6 pay). Bu iki kapı eskisinden daha sıkı.
 *   + `totalCssGzipBytes` 35.100 -> 35.700: ölçülen 34.957'ye ~%2,1 pay.
 *     Toplam yine üst sınır olarak duruyor; artık "ilk boya" ile
 *     karıştırılmıyor.
 * Ayrıntı: docs/mvp-denetimi-2026-10-27.md §10 Parti B1.
 *
 * 2026-10-27 (M-03, yolculuk bütçesi): "toplam" tek başına hangi sayfanın
 * ağırlaştığını söylemiyor. İki yolculuk ayrıca ölçülür:
 *   landing  = index.html + ilk boya CSS/JS            (ölçüm 413.463)
 *   appShell = landing + maplibre JS+CSS + MapView + harita worker'ı
 *                                                       (ölçüm 812.982)
 * Ölçülen değerlerin üstünde ~%2 payla iki eşik eklendi (425.000 / 830.000).
 * NOT (dürüst kayıt): hedef "tanıtım ≤ 250.000" DEĞİL. `firebase-vendor`
 * (149.338 B) hâlâ ilk boyada, çünkü App.tsx veri katmanını statik import
 * ediyor. Bu bütçe o durumu gizlemez, ölçer; küçültme işi M-03b olarak açık.
 */
export const BUNDLE_BUDGET = Object.freeze({
  // 2026-10-28 (T4 misafir modu + T5 niyet hatırlama): ölçüm **917.290 B**
  // gzip; önceki eşik 916.500 B'yi 757 B aştı. Eşik, testi yeşile çevirmek
  // için değil ölçülen yeni gerçek için güncellendi: misafir oturum bayrağı,
  // yazma kapısı (Explorer + veri katmanı), "misafir olarak devam et" yolu ve
  // hesap açılınca tüketilen niyet kaydı koda eklendi. **Yeni bağımlılık yok.**
  // Kullanıcının gördüğü ilk boya 91.539 B (eşik 398.000) ve tanıtım yolculuğu
  // 117.964 B (eşik 425.000) bu işten pratikte etkilenmedi.
  // Ayrıntı: CHANGELOG → "Misafir modu (T4) ve kayıt sonrası ilk değer (T5)".
  totalJsGzipBytes: 918_000,
  totalCssGzipBytes: 35_700,
  initialGzipBytes: 439_000,
  // İlk HTML ile gelen gerçek ilk boya maliyeti (lazy chunk'lar hariç).
  initialCssGzipBytes: 25_900,
  initialJsGzipBytes: 398_000,
  // Yolculuk bazlı üst sınırlar (bkz. başlıktaki M-03 notu).
  journeyGzipBytes: Object.freeze({
    landing: 425_000,
    appShell: 830_000,
  }),
  categoryGzipBytes: Object.freeze({
    entry: 174_000,
    reactVendor: 66_500,
    iconsVendor: 10_500,
    firebaseVendor: 164_500,
    firebaseAuth: 40_500,
    mapVendor: 286_000,
    mapWorker: 145_500,
    mapView: 9_500,
  }),
  // Bu parçalar ilk HTML ile preload edilirse lazy sınırı fiilen ortadan kalkar.
  deferredAssetPrefixes: Object.freeze([
    // T11 (2026-10-28): Firebase SDK'sı landing'de indirilmemeli. Auth ekranı ve
    // oturum sonrası keşif kabuğu bu parçayı dinamik `import()` ile çeker.
    "assets/firebase-vendor-",
    "assets/firebase-auth-",
    "assets/map-vendor-",
    "assets/MapView-",
    "assets/maplibre-gl-worker-",
  ]),
  requiredCategories: Object.freeze(["entry", "reactVendor", "firebaseVendor", "mapVendor"]),
});

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

export function classifyBundleAsset(relativePath) {
  const normalized = toPosix(relativePath);
  const fileName = path.posix.basename(normalized);

  if (fileName === "sw.js") return "serviceWorker";
  if (fileName.startsWith("maplibre-gl-worker-")) return "mapWorker";
  if (fileName.startsWith("map-vendor-")) return "mapVendor";
  if (fileName.startsWith("firebase-auth-")) return "firebaseAuth";
  if (fileName.startsWith("firebase-vendor-")) return "firebaseVendor";
  if (fileName.startsWith("react-vendor-")) return "reactVendor";
  if (fileName.startsWith("icons-vendor-")) return "iconsVendor";
  if (fileName.startsWith("MapView-")) return "mapView";
  if (fileName.startsWith("index-") && fileName.endsWith(".js")) return "entry";
  if (fileName.endsWith(".css")) return "css";
  if (fileName.endsWith(".js")) return "lazyChunk";
  return "other";
}

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function measureFile(distDir, fullPath) {
  const relativePath = toPosix(path.relative(distDir, fullPath));
  const content = readFileSync(fullPath);
  return {
    path: relativePath,
    bytes: content.length,
    gzipBytes: gzipSync(content).length,
    category: classifyBundleAsset(relativePath),
    kind: relativePath.endsWith(".js") ? "js" : relativePath.endsWith(".css") ? "css" : "other",
  };
}

export function parseInitialAssetPaths(html) {
  const paths = new Set();
  const tagPattern = /<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(tagPattern)) {
    const raw = match[1].trim();
    if (!raw || /^[a-z][a-z\d+.-]*:/i.test(raw) || raw.startsWith("//")) continue;
    const clean = raw.split(/[?#]/, 1)[0].replace(/^\.\//, "").replace(/^\//, "");
    if (/^assets\/.+\.(?:js|css)$/.test(clean)) paths.add(clean);
  }

  return [...paths].sort();
}

export function collectBundleAssets(distDir = DEFAULT_DIST) {
  const indexPath = path.join(distDir, "index.html");
  if (!existsSync(indexPath) || !statSync(indexPath).isFile()) {
    throw new Error(`Bundle bulunamadı: ${indexPath}. Önce npm run build çalıştır.`);
  }

  const html = readFileSync(indexPath, "utf8");
  const assets = walkFiles(distDir)
    .filter((fullPath) => /\.(?:js|css)$/.test(fullPath))
    .map((fullPath) => measureFile(distDir, fullPath))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    html: measureFile(distDir, indexPath),
    assets,
    initialAssetPaths: parseInitialAssetPaths(html),
  };
}

function sum(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

/** Bir yolculukta indirilen varlıkların gzip toplamı. */
function journeyBytes(html, initialAssets, categories) {
  return html.gzipBytes + initialAssets.reduce((total, asset) => total + asset.gzipBytes, 0) +
    // Fixture'larda bazı kategoriler hiç olmayabilir; eksik kategori 0 sayılır.
    categories.reduce((total, category) => total + (category?.gzipBytes ?? 0), 0);
}

export function summarizeBundle({ html, assets, initialAssetPaths }) {
  const byPath = new Map(assets.map((asset) => [asset.path, asset]));
  const initialAssets = initialAssetPaths
    .map((assetPath) => byPath.get(assetPath))
    .filter(Boolean);
  const missingInitialAssets = initialAssetPaths.filter((assetPath) => !byPath.has(assetPath));
  const categories = {};

  for (const asset of assets) {
    categories[asset.category] ??= { bytes: 0, gzipBytes: 0, files: [] };
    categories[asset.category].bytes += asset.bytes;
    categories[asset.category].gzipBytes += asset.gzipBytes;
    categories[asset.category].files.push(asset.path);
  }

  return {
    html,
    assets,
    categories,
    initialAssetPaths,
    initialAssets,
    missingInitialAssets,
    totalJsBytes: sum(assets.filter((asset) => asset.kind === "js"), "bytes"),
    totalJsGzipBytes: sum(assets.filter((asset) => asset.kind === "js"), "gzipBytes"),
    totalCssBytes: sum(assets.filter((asset) => asset.kind === "css"), "bytes"),
    totalCssGzipBytes: sum(assets.filter((asset) => asset.kind === "css"), "gzipBytes"),
    initialBytes: html.bytes + sum(initialAssets, "bytes"),
    initialGzipBytes: html.gzipBytes + sum(initialAssets, "gzipBytes"),
    initialCssGzipBytes: sum(initialAssets.filter((asset) => asset.kind === "css"), "gzipBytes"),
    // Yolculuk toplamları: tanıtım (haritasız) ve haritalı uygulama kabuğu.
    // Harita kategori toplamları ilk sette olmasa da o yolculukta yüklenir.
    journeys: {
      landing: journeyBytes(html, initialAssets, []),
      appShell: journeyBytes(html, initialAssets, [
        categories.mapVendor,
        categories.mapView,
        categories.mapWorker,
      ]),
    },
    initialJsGzipBytes: sum(initialAssets.filter((asset) => asset.kind === "js"), "gzipBytes"),
  };
}

function formatBytes(bytes) {
  return `${new Intl.NumberFormat("tr-TR").format(bytes)} B`;
}

export function evaluateBundleBudget(summary, budget = BUNDLE_BUDGET) {
  const violations = [];

  if (summary.missingInitialAssets.length > 0) {
    violations.push(
      `index.html eksik asset referansı içeriyor: ${summary.missingInitialAssets.join(", ")}`,
    );
  }

  for (const category of budget.requiredCategories) {
    if (!summary.categories[category]) violations.push(`Zorunlu chunk kategorisi yok: ${category}`);
  }

  if (summary.totalJsGzipBytes > budget.totalJsGzipBytes) {
    violations.push(
      `Toplam JS gzip bütçesi aşıldı: ${formatBytes(summary.totalJsGzipBytes)} > ${formatBytes(budget.totalJsGzipBytes)}`,
    );
  }
  if (summary.totalCssGzipBytes > budget.totalCssGzipBytes) {
    violations.push(
      `Toplam CSS gzip bütçesi aşıldı: ${formatBytes(summary.totalCssGzipBytes)} > ${formatBytes(budget.totalCssGzipBytes)}`,
    );
  }
  if (summary.initialGzipBytes > budget.initialGzipBytes) {
    violations.push(
      `İlk HTML asset seti bütçesi aşıldı: ${formatBytes(summary.initialGzipBytes)} > ${formatBytes(budget.initialGzipBytes)}`,
    );
  }
  // İlk boyaya giren CSS/JS ayrı ölçülür: lazy harita dosyası bu kapıyı harcamaz.
  if (summary.initialCssGzipBytes > budget.initialCssGzipBytes) {
    violations.push(
      `İlk boya CSS gzip bütçesi aşıldı: ${formatBytes(summary.initialCssGzipBytes)} > ${formatBytes(budget.initialCssGzipBytes)}`,
    );
  }
  if (summary.initialJsGzipBytes > budget.initialJsGzipBytes) {
    violations.push(
      `İlk boya JS gzip bütçesi aşıldı: ${formatBytes(summary.initialJsGzipBytes)} > ${formatBytes(budget.initialJsGzipBytes)}`,
    );
  }

  const journeyLabels = { landing: "tanıtım", appShell: "uygulama kabuğu" };
  for (const [journey, limit] of Object.entries(budget.journeyGzipBytes ?? {})) {
    const actual = summary.journeys?.[journey];
    if (actual !== undefined && actual > limit) {
      const label = journeyLabels[journey] ?? journey;
      violations.push(`${label} yolculuğu gzip bütçesi aşıldı: ${formatBytes(actual)} > ${formatBytes(limit)}`);
    }
  }

  for (const [category, limit] of Object.entries(budget.categoryGzipBytes)) {
    const actual = summary.categories[category]?.gzipBytes;
    if (actual !== undefined && actual > limit) {
      violations.push(`${category} gzip bütçesi aşıldı: ${formatBytes(actual)} > ${formatBytes(limit)}`);
    }
  }

  for (const assetPath of summary.initialAssetPaths) {
    if (budget.deferredAssetPrefixes.some((prefix) => assetPath.startsWith(prefix))) {
      violations.push(`Ertelenmesi gereken chunk ilk HTML setinde: ${assetPath}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

export function formatBundleReport(summary, budget = BUNDLE_BUDGET) {
  const lines = [
    "Atlasia bundle bütçesi",
    `İlk HTML seti: ${formatBytes(summary.initialBytes)} ham / ${formatBytes(summary.initialGzipBytes)} gzip (bütçe ${formatBytes(budget.initialGzipBytes)})`,
    `Toplam JS: ${formatBytes(summary.totalJsBytes)} ham / ${formatBytes(summary.totalJsGzipBytes)} gzip (bütçe ${formatBytes(budget.totalJsGzipBytes)})`,
    `Toplam CSS: ${formatBytes(summary.totalCssBytes)} ham / ${formatBytes(summary.totalCssGzipBytes)} gzip (bütçe ${formatBytes(budget.totalCssGzipBytes)})`,
    `İlk boya CSS: ${formatBytes(summary.initialCssGzipBytes)} gzip (bütçe ${formatBytes(budget.initialCssGzipBytes)}) · İlk boya JS: ${formatBytes(summary.initialJsGzipBytes)} gzip (bütçe ${formatBytes(budget.initialJsGzipBytes)})`,
    `Yolculuk — tanıtım: ${formatBytes(summary.journeys.landing)} gzip (bütçe ${formatBytes(budget.journeyGzipBytes.landing)}) · uygulama kabuğu: ${formatBytes(summary.journeys.appShell)} gzip (bütçe ${formatBytes(budget.journeyGzipBytes.appShell)})`,
    "",
    "Dosya | Kategori | Ham | Gzip | İlk set",
  ];

  const initial = new Set(summary.initialAssetPaths);
  const ordered = [...summary.assets].sort((a, b) => b.gzipBytes - a.gzipBytes);
  for (const asset of ordered) {
    lines.push(
      `${asset.path} | ${asset.category} | ${formatBytes(asset.bytes)} | ${formatBytes(asset.gzipBytes)} | ${initial.has(asset.path) ? "evet" : "hayır"}`,
    );
  }
  return lines.join("\n");
}

export function run({ distDir = DEFAULT_DIST, budget = BUNDLE_BUDGET, log = console.log, errorLog = console.error } = {}) {
  const summary = summarizeBundle(collectBundleAssets(distDir));
  const result = evaluateBundleBudget(summary, budget);
  log(formatBundleReport(summary, budget));

  if (!result.ok) {
    errorLog("\nBundle bütçesi aşıldı:");
    for (const violation of result.violations) errorLog(`- ${violation}`);
  } else {
    log("\nBundle bütçesi içinde.");
  }

  return { ...result, summary };
}

function distDirFromArgs(args) {
  const index = args.indexOf("--dist");
  if (index >= 0) {
    if (!args[index + 1]) throw new Error("--dist bir dizin bekler.");
    return path.resolve(args[index + 1]);
  }
  const positional = args.find((arg) => !arg.startsWith("--"));
  return positional ? path.resolve(positional) : DEFAULT_DIST;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = run({ distDir: distDirFromArgs(process.argv.slice(2)) });
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error("Bundle bütçesi ölçülemedi:", error);
    process.exitCode = 1;
  }
}
