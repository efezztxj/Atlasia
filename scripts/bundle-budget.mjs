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
 *
 * 2026-10-28 — kabuk bölünmesi (App.tsx = kapı, components/Explorer.tsx = lazy
 * harita+paneller+Firestore) tamamlandı. Firebase artık landing'de DEĞİL.
 * Ölçüm: tanıtım 116.702, ilk boya JS 90.444, CSS 24.504, entry 19.722,
 * appShell 516.564. Eşikler ölçüme ~%3 payla yeniden bağlandı.
 *
 * EŞİK BAYATLAMASI ARTIK KAPI: eski hâlde tanıtım 116 KB iken eşik 425 KB'de
 * duruyordu; yani "koruma" %72 boşlukla hiçbir şeyi yakalamıyordu. Bu yüzden
 * `staleness` denetimi eklendi: sahibi olduğumuz kapılar (entry, initial*,
 * journey*) ölçümün %20'sinden fazla üstündeyse build kırılır. Böylece büyük
 * bir kazançtan sonra eşiği sıkılaştırmak zorunlu hale gelir; sessizce
 * gevşeyemez. Satıcı (vendor) kategorileri kapsam dışıdır: sürüm
 * yükseltmelerinde doğal dalgalanırlar.
 *
 * 2026-10-28 (bağımlılık yükseltmeleri) — `main` ile birleşince maplibre
 * 6.4.1 -> 6.15.0 ve react 19.3.1 geldi. Ölçüm ve bayat-kalan eşikler:
 *   mapVendor  248.691 -> 300.903  (+52.212)   maplibre
 *   mapWorker  131.810 -> 150.448  (+18.638)   maplibre
 *   reactVendor 60.325 ->  69.004  ( +8.679)   react 19.3.1
 *   entry       19.722 ->  19.721  (     -1)   bizim kod: DEĞİŞMEDİ
 *   tanıtım    116.702 -> 125.517  (+8.815)    yalnız react-vendor büyümesi
 *   appShell   516.564 -> 585.711  (+69.147)   tamamı harita (lazy, giriş sonrası)
 * Yani tanıtım sayfası kendi kodumuz yüzünden büyümedi; giriş sonrası harita
 * maliyeti arttı ve o zaten lazy. Eşikler yeni ölçüme ~%3 payla bağlandı:
 *   initial 129.400 · initialJs 102.200 · landing 129.400 · appShell 603.400
 * Vendor eşikleri (react/mapVendor/mapWorker) `main` tarafından yükseltilmişti,
 * aynen korundu — sürüm yükseltmesinde doğal.
 *
 * 2026-10-28 (ikinci birleşme) — `main` T13-T16 landing işi + firebase 13.1.0
 * geldi; kapı `entry` 20.530 B ile kırıldı (doğru davranış). Ölçüm (env'li /
 * env'siz derleme arasındaki fark ~17 B; eşik ikisinin BÜYÜĞÜNE bağlanır):
 *   entry      19.721 -> 20.547  (+826)   main'in landing/huni kodu
 *   tanıtım   125.517 -> 126.422  (+905)
 *   appShell  585.711 -> 586.617  (+906)
 *   toplam JS 984.682 -> 996.818  (main bu turda 997.500'e çıkardı)
 *   entry eşiği 20.400 -> 21.200 (ölçüme %3,2 pay)
 */
export const BUNDLE_BUDGET = Object.freeze({
  // 2026-10-28 (T4 misafir modu + T5 niyet hatırlama): misafir oturum bayrağı,
  // yazma kapısı (Explorer + veri katmanı), "misafir olarak devam et" yolu ve
  // hesap açılınca tüketilen niyet kaydı koda eklendi; **yeni bağımlılık yok**.
  // Ölçüm (güncel bağımlılıklarla `npm ci` + `npm run build`):
  //   toplam JS 996.828 → **997.761** (+933)  ·  eşik 997.500 → 998.500
  //   entry 20.530 → 20.814 (+284)            ·  eşik 20.900 (değişmedi)
  //   ilk set 125.517 → 126.774 (+1.257)      ·  eşik 129.400 (değişmedi)
  //   ilk boya JS 100.213 / 102.200 · appShell 586.968 / 603.400 (değişmedi)
  // Yani artışın tamamı misafir modu kodudur; kullanıcıya görünen ilk boya
  // eşiklerinin hepsi payla içinde kaldı, yalnız toplam JS eşiği aşıldı.
  //
  // 2026-10-28 (kritik yol ayrımı) — giriş paketindeki pay 20.915 / 20.900'e
  // dayanmıştı. İki blok `entry` dışına alındı (ölçüm: `npm ci` + `npm run build`):
  //   LandingFooter (SSS + footer) lazy  ·  CookieConsent lazy
  //   entry           20.915 -> **18.344**  (−2.571)  · eşik 20.900 (değişmedi)
  //   ilk boya JS    100.314 -> **97.743**  (−2.571)  · eşik 102.200 (değişmedi)
  //   ilk HTML seti  127.918 -> **125.351** (−2.567)  · eşik 129.400 (değişmedi)
  //   toplam JS      998.070 -> **999.785** (+1.715)  · eşik 998.500 -> 1.001.000
  // Toplam JS neden büyüdü: ayrı chunk'lar tek tek daha kötü sıkışır (4,3 KB ve
  // 6,2 KB ham parçalar) ve chunk sarmalayıcı/preload yardımcısı eklenir. Yani
  // bu, kullanıcıya **daha hızlı ilk boya** karşılığında ödenen ~1,7 KB'dir;
  // indirilen toplam bayt artmaz (aynı kod, farklı zaman). Eşik bu ölçüme göre
  // 1.001.000'e çekildi: pay 1.215 B (%0,12), bayatlama kapısı rahat.
  totalJsGzipBytes: 1_001_000,
  totalCssGzipBytes: 35_700,
  initialGzipBytes: 129_400,
  // İlk HTML ile gelen gerçek ilk boya maliyeti (lazy chunk'lar hariç).
  initialCssGzipBytes: 25_200,
  initialJsGzipBytes: 102_200,
  // Yolculuk bazlı üst sınırlar (bkz. başlıktaki M-03 notu).
  journeyGzipBytes: Object.freeze({
    landing: 129_400,
    appShell: 603_400,
  }),
  categoryGzipBytes: Object.freeze({
    entry: 21_200,
    reactVendor: 69_500,
    iconsVendor: 10_500,
    firebaseVendor: 164_500,
    firebaseAuth: 40_500,
    mapVendor: 302_500,
    mapWorker: 152_000,
    mapView: 9_100,
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
  /**
   * Eşik bayatlaması denetimi. `maxSlackRatio`: eşik, ölçümün bu orandan fazla
   * üstündeyse kapı iş görmüyor demektir → build kırılır, eşik sıkılaştırılır.
   * `gates`: yalnız bizim kodumuzu izleyen kapılar (vendor hariç).
   */
  staleness: Object.freeze({
    maxSlackRatio: 0.2,
    // Küçük parçalarda birkaç yüz baytlık boşluk anlamsızdır; bayatlama yalnız
    // hem oransal hem mutlak olarak büyük boşlukta bildirilir.
    minSlackBytes: 4_096,
    gates: Object.freeze(["entry", "initial", "initialCss", "initialJs", "landing", "appShell"]),
  }),
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

/** Bayatlama denetiminin okuduğu kapı → {ölçüm, eşik} çiftleri. */
function gateValues(summary, budget, gate) {
  switch (gate) {
    case "entry":
      return { actual: summary.categories?.entry?.gzipBytes, limit: budget.categoryGzipBytes?.entry };
    case "initial":
      return { actual: summary.initialGzipBytes, limit: budget.initialGzipBytes };
    case "initialCss":
      return { actual: summary.initialCssGzipBytes, limit: budget.initialCssGzipBytes };
    case "initialJs":
      return { actual: summary.initialJsGzipBytes, limit: budget.initialJsGzipBytes };
    case "landing":
      return { actual: summary.journeys?.landing, limit: budget.journeyGzipBytes?.landing };
    case "appShell":
      return { actual: summary.journeys?.appShell, limit: budget.journeyGzipBytes?.appShell };
    default:
      return { actual: undefined, limit: undefined };
  }
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

  // Eşik bayatlaması: sahibi olduğumuz kapılar ölçümün çok üstündeyse kapı iş
  // görmüyor demektir. Sessizce gevşemeyi engeller (bkz. başlıktaki 2026-10-28 notu).
  const staleness = budget.staleness;
  if (staleness && staleness.maxSlackRatio > 0) {
    for (const gate of staleness.gates) {
      const { actual, limit } = gateValues(summary, budget, gate);
      if (actual === undefined || limit === undefined || limit <= 0) continue;
      const slack = (limit - actual) / limit;
      const slackBytes = limit - actual;
      if (slack > staleness.maxSlackRatio && slackBytes > (staleness.minSlackBytes ?? 0)) {
        const target = Math.ceil((actual * 1.03) / 100) * 100;
        violations.push(
          `${gate} eşiği bayat: ölçüm ${formatBytes(actual)}, eşik ${formatBytes(limit)} ` +
          `(boşluk %${Math.round(slack * 100)}). Kapı regresyonu yakalamıyor; ` +
          `eşiği ~${formatBytes(target)} yap.`,
        );
      }
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
