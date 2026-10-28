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

  assert.equal(evaluateBundleBudget(summary).ok, true);
  assert.deepEqual(summary.initialAssetPaths, [
    "assets/index-entry.css",
    "assets/index-entry.js",
    "assets/react-vendor-react.js",
  ]);
  assert.equal(summary.categories.entry.gzipBytes, gzipSync("console.log('entry')").length);
  assert.equal(summary.totalCssGzipBytes, gzipSync("body{}").length);
  assert.match(formatBundleReport(summary), /İlk HTML seti:/);
});

test("ertelenmesi gereken Firebase vendor ilk setteyse bütçeyi kırar (T11)", (t) => {
  const summary = summarizeBundle(collectBundleAssets(makeDist(t, { initialFirebaseVendor: true })));
  const result = evaluateBundleBudget(summary);

  assert.equal(result.ok, false);
  assert.ok(result.violations.some((message) => message.includes("firebase-vendor-firebase.js")));
});

test("ertelenmesi gereken Auth chunk'ı ilk setteyse bütçeyi kırar", (t) => {
  const summary = summarizeBundle(collectBundleAssets(makeDist(t, { initialAuth: true })));
  const result = evaluateBundleBudget(summary);

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
