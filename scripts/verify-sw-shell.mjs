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

// A6: kaynak haritaları yayın künyesine girmez (postbuild onları dist dışına
// taşır). Doğrulama `dist` içinde kalmış olsalar bile onları saymaz; sayılan küme
// tarayıcıya giden gerçek varlıklarla aynı olmalı.
const builtAssets = readdirSync("dist/assets", { withFileTypes: true })
  .filter((entry) => entry.isFile() && !entry.name.endsWith(".map"))
  .map((entry) => `/assets/${entry.name}`);
const unreached = builtAssets.filter((path) => !reachable.has(path));
assert.deepEqual(unreached, [], `SW ön önbellek grafiğine girmeyen üretim varlıkları: ${unreached.join(", ")}`);
console.log(`SW üretim kabuğu doğrulandı: ${reachable.size}/${builtAssets.length} varlık kapsanıyor.`);
