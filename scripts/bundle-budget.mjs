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
 */
export const BUNDLE_BUDGET = Object.freeze({
  totalJsGzipBytes: 888_000,
  totalCssGzipBytes: 34_500,
  initialGzipBytes: 439_000,
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
