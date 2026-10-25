import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

const origin = "https://atlasia.test";
const swSource = readFileSync("public/sw.js", "utf8");
const sandbox = {
  self: {
    location: { origin },
    addEventListener() {},
  },
  URL,
  console,
};
vm.runInNewContext(`${swSource}\nglobalThis.readShellAssets = assetPathsFromText;`, sandbox, {
  filename: "public/sw.js",
});

// Test ayrı bir regex kopyası kullanmaz: SW'nin üretimde çalışan keşif mantığını
// doğrudan gerçek Vite çıktısına uygular.
const readShellAssets = sandbox.readShellAssets;
assert.equal(typeof readShellAssets, "function");
assert.ok(existsSync("dist/index.html"), "dist/index.html yok; önce üretim derlemesi çalıştırılmalı.");

const pending = [...readShellAssets(readFileSync("dist/index.html", "utf8"))];
const reachable = new Set();
while (pending.length) {
  const path = pending.shift();
  if (reachable.has(path)) continue;
  reachable.add(path);
  assert.ok(existsSync(`dist${path}`), `SW kabuğunun istediği üretim varlığı eksik: ${path}`);
  if (path.endsWith(".js") || path.endsWith(".css")) {
    pending.push(...readShellAssets(readFileSync(`dist${path}`, "utf8")));
  }
}

const builtAssets = readdirSync("dist/assets", { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => `/assets/${entry.name}`);
const unreached = builtAssets.filter((path) => !reachable.has(path));
assert.deepEqual(unreached, [], `SW ön önbellek grafiğine girmeyen üretim varlıkları: ${unreached.join(", ")}`);

// Damgalama kapısı: dist/sw.js kaynağın kopyası olmalı; tek fark CACHE adı.
// (scripts/stamp-sw.mjs her build'de yeni bir cache adı yazar; bu olmadan
// tarayıcı yeni service worker'ı hiç görmez ve "Yeni sürüm hazır" çıkmaz.)
const distSw = readFileSync("dist/sw.js", "utf8");
const sourceCache = /const CACHE = "(atlasia-shell-[^"]+)";/.exec(swSource)?.[1];
const distCache = /const CACHE = "(atlasia-shell-[^"]+)";/.exec(distSw)?.[1];
assert.ok(sourceCache, "public/sw.js içinde CACHE sabiti yok.");
assert.ok(distCache, "dist/sw.js içinde CACHE sabiti yok; önce `npm run stamp:sw` çalıştırılmalı.");
assert.notEqual(distCache, sourceCache, "dist/sw.js damgalanmamış: her deploy'da SW güncellemesi algılanmaz.");
assert.equal(
  distSw,
  swSource.replace(`const CACHE = "${sourceCache}";`, `const CACHE = "${distCache}";`),
  "dist/sw.js kaynaktan farklı: damgalama yalnız CACHE adını değiştirmeli.",
);

console.log(`SW üretim kabuğu doğrulandı: ${reachable.size}/${builtAssets.length} varlık kapsanıyor.`);
