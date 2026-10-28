import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import test from "node:test";

import {
  BUNDLE_BUDGET,
  classifyBundleAsset,
  collectBundleAssets,
  evaluateBundleBudget,
  formatBundleReport,
  parseInitialAssetPaths,
  run,
  summarizeBundle,
} from "./bundle-budget.mjs";

/**
 * Fixture'lar KB ölçeğinde sahte dist'lerdir; gerçek eşikler onlara göre çok
 * geniş kalır. Bayatlama denetimi yalnız gerçek build ölçümüne anlamlıdır.
 */
const FIXTURE_BUDGET = { ...BUNDLE_BUDGET, staleness: { ...BUNDLE_BUDGET.staleness, maxSlackRatio: 0, minSlackBytes: 0 } };

function writeFixture(distDir, relativePath, content) {
  const fullPath = path.join(distDir, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function makeDist(t, { entry = "console.log('entry')", initialAuth = false, initialFirebaseVendor = false } = {}) {
  const distDir = mkdtempSync(path.join(os.tmpdir(), "atlasia-bundle-budget-"));
  t.after(() => rmSync(distDir, { recursive: true, force: true }));

  const authLink = initialAuth
    ? '<link rel="modulepreload" crossorigin href="/assets/firebase-auth-auth.js">'
    : "";
  const firebaseVendorLink = initialFirebaseVendor
    ? '<link rel="modulepreload" crossorigin href="/assets/firebase-vendor-firebase.js">'
    : "";
  writeFixture(
    distDir,
    "index.html",
    `<!doctype html>\n<script type="module" crossorigin src="/assets/index-entry.js"></script>\n` +
      `<link rel="modulepreload" crossorigin href="/assets/react-vendor-react.js">\n` +
      `${firebaseVendorLink}\n` +
      `${authLink}\n<link rel="stylesheet" crossorigin href="/assets/index-entry.css">`,
  );
  writeFixture(distDir, "assets/index-entry.js", entry);
  writeFixture(distDir, "assets/react-vendor-react.js", "react");
  writeFixture(distDir, "assets/firebase-vendor-firebase.js", "firestore");
  writeFixture(distDir, "assets/firebase-auth-auth.js", "auth");
  writeFixture(distDir, "assets/map-vendor-map.js", "maplibre");
  writeFixture(distDir, "assets/MapView-view.js", "map view");
  writeFixture(distDir, "assets/index-entry.css", "body{}");
  writeFixture(distDir, "sw.js", "self.addEventListener('fetch', () => {})");
  return distDir;
}

test("Vite chunk adlarını bütçe kategorilerine ayırır", () => {
  assert.equal(classifyBundleAsset("assets/index-a1.js"), "entry");
  assert.equal(classifyBundleAsset("assets/react-vendor-a1.js"), "reactVendor");
  assert.equal(classifyBundleAsset("assets/firebase-auth-a1.js"), "firebaseAuth");
  assert.equal(classifyBundleAsset("assets/maplibre-gl-worker-a1.js"), "mapWorker");
  assert.equal(classifyBundleAsset("assets/nested/panel-a1.js"), "lazyChunk");
  assert.equal(classifyBundleAsset("sw.js"), "serviceWorker");
});

test("HTML içinden yalnız yerel ilk JS/CSS referanslarını toplar", () => {
  const paths = parseInitialAssetPaths(`
    <script src="/assets/index-a.js"></script>
    <link rel="stylesheet" href="./assets/index-a.css">
    <link rel="modulepreload" href="https://example.com/assets/remote.js">
    <link rel="icon" href="/icons/icon-192.png">
    <script src="/assets/index-a.js"></script>
  `);
  assert.deepEqual(paths, ["assets/index-a.css", "assets/index-a.js"]);
});

test("geçerli fixture toplamları ve ilk asset setini ölçer", (t) => {
  const summary = summarizeBundle(collectBundleAssets(makeDist(t)));

  assert.equal(evaluateBundleBudget(summary, FIXTURE_BUDGET).ok, true);
  assert.deepEqual(summary.initialAssetPaths, [
    "assets/index-entry.css",
    "assets/index-entry.js",
    "assets/react-vendor-react.js",
  ]);
  assert.equal(summary.categories.entry.gzipBytes, gzipSync("console.log('entry')").length);
  assert.equal(summary.totalCssGzipBytes, gzipSync("body{}").length);
  assert.match(formatBundleReport(summary), /İlk HTML seti:/);
});

test("ilk boya CSS/JS ayrı ölçülür, lazy harita dosyası bu kapıyı harcamaz", (t) => {
  const distDir = makeDist(t);
  // Harita CSS'i ilk HTML'de değil: toplam var, ilk boya yok.
  writeFixture(distDir, "assets/map-vendor-map.css", "x".repeat(2_000));
  const summary = summarizeBundle(collectBundleAssets(distDir));

  assert.equal(summary.totalCssGzipBytes > summary.initialCssGzipBytes, true);
  assert.equal(summary.initialCssGzipBytes, gzipSync("body{}").length);
  assert.equal(summary.initialJsGzipBytes, summary.initialGzipBytes - summary.html.gzipBytes - summary.initialCssGzipBytes);
  assert.match(formatBundleReport(summary), /İlk boya CSS:/);
});

test("ilk boya CSS bütçesi aşılırsa toplam içinde kalsa bile kırar", (t) => {
  const distDir = makeDist(t);
  // Gzip'in sıkıştıramadığı CSS: yalnız ilk boya bütçesini aşar, toplam bütçenin altında kalır.
  const bloated = Buffer.alloc(BUNDLE_BUDGET.initialCssGzipBytes + 2_048);
  let seed = 987_654_321;
  for (let index = 0; index < bloated.length; index += 1) {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    bloated[index] = seed >>> 24;
  }
  writeFixture(distDir, "assets/index-entry.css", bloated);
  const summary = summarizeBundle(collectBundleAssets(distDir));
  const result = evaluateBundleBudget(summary, FIXTURE_BUDGET);

  assert.ok(summary.totalCssGzipBytes <= BUNDLE_BUDGET.totalCssGzipBytes);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((message) => message.includes("İlk boya CSS gzip")));
});

test("yolculuk bütçeleri: tanıtım haritayı, uygulama kabuğu haritayı içerir", (t) => {
  const summary = summarizeBundle(collectBundleAssets(makeDist(t)));
  const mapVendor = summary.categories.mapVendor.gzipBytes;
  const mapView = summary.categories.mapView.gzipBytes;

  assert.equal(summary.journeys.landing, summary.initialGzipBytes);
  assert.equal(summary.journeys.appShell, summary.journeys.landing + mapVendor + mapView);
  assert.match(formatBundleReport(summary), /Yolculuk — tanıtım:/);
});

test("tanıtım yolculuğu bütçesi aşılırsa, toplam içinde kalsa bile kırar", (t) => {
  const distDir = makeDist(t);
  const bloated = Buffer.alloc(BUNDLE_BUDGET.journeyGzipBytes.landing + 8_192);
  let seed = 555_555;
  for (let index = 0; index < bloated.length; index += 1) {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    bloated[index] = seed >>> 24;
  }
  writeFixture(distDir, "assets/index-entry.css", bloated);

  const summary = summarizeBundle(collectBundleAssets(distDir));
  const result = evaluateBundleBudget(summary, FIXTURE_BUDGET);

  assert.equal(result.ok, false);
  assert.ok(result.violations.some((message) => message.includes("tanıtım yolculuğu")));
});

test("ertelenmesi gereken Firebase vendor ilk setteyse bütçeyi kırar (T11)", (t) => {
  const summary = summarizeBundle(collectBundleAssets(makeDist(t, { initialFirebaseVendor: true })));
  const result = evaluateBundleBudget(summary, FIXTURE_BUDGET);

  assert.equal(result.ok, false);
  assert.ok(result.violations.some((message) => message.includes("firebase-vendor-firebase.js")));
});

test("ertelenmesi gereken Auth chunk'ı ilk setteyse bütçeyi kırar", (t) => {
  const summary = summarizeBundle(collectBundleAssets(makeDist(t, { initialAuth: true })));
  const result = evaluateBundleBudget(summary, FIXTURE_BUDGET);

  assert.equal(result.ok, false);
  assert.ok(result.violations.some((message) => message.includes("firebase-auth-auth.js")));
});

test("kasıtlı şişirilen giriş chunk'ı ve toplam bütçeyi kırar", (t) => {
  // Gzip'in sıkıştıramadığı temsili içerik: eşik aşımının sessiz geçmediğini gösterir.
  const bloatedEntry = Buffer.alloc(BUNDLE_BUDGET.totalJsGzipBytes + 65_536);
  let seed = 1_234_567;
  for (let index = 0; index < bloatedEntry.length; index += 1) {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    bloatedEntry[index] = seed >>> 24;
  }
  const errors = [];
  const result = run({
    distDir: makeDist(t, { entry: bloatedEntry }),
    log: () => {},
    errorLog: (message) => errors.push(message),
  });

  assert.equal(result.ok, false);
  assert.ok(result.violations.some((message) => message.includes("entry gzip bütçesi")));
  assert.ok(result.violations.some((message) => message.includes("Toplam JS gzip")));
  assert.ok(errors.some((message) => message.includes("Bundle bütçesi aşıldı")));
});

test("eksik dist için uygulanabilir hata verir", () => {
  assert.throws(
    () => collectBundleAssets(path.join(os.tmpdir(), "atlasia-missing-dist-for-test")),
    /npm run build/,
  );
});

test("bayat eşik build'i kırar (kapı sessizce gevşeyemez)", (t) => {
  const distDir = makeDist(t);
  const summary = summarizeBundle(collectBundleAssets(distDir));

  // Gerçek ölçüm ~300 B; eşik 120.200 B → %99 boşluk. Bayatlama denetimi açıkken kırmalı.
  const result = evaluateBundleBudget(summary, BUNDLE_BUDGET);

  assert.equal(result.ok, false);
  assert.ok(result.violations.some((message) => message.includes("eşiği bayat")));
  // Mesaj ne yapılacağını söyler: hedef eşik ve yüzde.
  assert.ok(result.violations.some((message) => /eşiği ~\d/.test(message)));
});

test("güncel eşik bayatlama uyarısı üretmez", (t) => {
  const distDir = makeDist(t);
  const summary = summarizeBundle(collectBundleAssets(distDir));
  // Ölçüme %3 payla bağlanmış eşikler → bayat değil.
  const tight = {
    ...FIXTURE_BUDGET,
    staleness: BUNDLE_BUDGET.staleness,
    categoryGzipBytes: { ...BUNDLE_BUDGET.categoryGzipBytes, entry: Math.ceil(summary.categories.entry.gzipBytes * 1.03) },
    initialGzipBytes: Math.ceil(summary.initialGzipBytes * 1.03),
    initialCssGzipBytes: Math.ceil(summary.initialCssGzipBytes * 1.03),
    initialJsGzipBytes: Math.ceil(summary.initialJsGzipBytes * 1.03),
    journeyGzipBytes: {
      landing: Math.ceil(summary.journeys.landing * 1.03),
      appShell: Math.ceil(summary.journeys.appShell * 1.03),
    },
  };

  const result = evaluateBundleBudget(summary, tight);

  assert.equal(result.ok, true, result.violations.join(" | "));
});

test("satıcı (vendor) kategorileri bayatlama denetiminin dışında", () => {
  // reactVendor eşiği 66.500; fixture'da 5 B. Vendor sürüm dalgalanması
  // bayatlama sayılmamalı, aksi halde her bağımlılık yükseltmesi kırılır.
  assert.notEqual(BUNDLE_BUDGET.staleness.gates.includes("reactVendor"), true);
  assert.notEqual(BUNDLE_BUDGET.staleness.gates.includes("firebaseVendor"), true);
});
