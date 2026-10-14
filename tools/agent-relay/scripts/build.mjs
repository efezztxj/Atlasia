#!/usr/bin/env node
/**
 * Agent Relay derleyici.
 *
 * İki aşama:
 *   1) Panel dosyaları gömülür (scripts/embed-assets.mjs) ve varsayılan ayar JSON olarak
 *      pakete dahil edilir → esbuild ile TEK bir CJS dosyası üretilir.
 *      (pkg CommonJS bekler; proje ESM olduğu için bu adım şart. v0.1.0/0.1.1 bu yüzden ölmüştü.)
 *   2) Bu CJS dosyası pkg ile platform çalıştırma dosyasına çevrilir.
 *
 * Exe hiçbir dış dosyaya ihtiyaç duymaz: panel gömülü, varsayılan ayar gömülü.
 * İlk açılışta çalışma klasörüne düzenlenebilir relay.config.json bırakır.
 *
 * Kullanım:
 *   node scripts/build.mjs win | mac | linux | all
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const BUNDLE = path.join(DIST, "agent-relay.cjs");

const TARGETS = {
  win: [{ target: "node22-win-x64", out: "agent-relay-win-x64.exe" }],
  mac: [
    { target: "node22-macos-arm64", out: "agent-relay-macos-arm64" },
    { target: "node22-macos-x64", out: "agent-relay-macos-x64" },
  ],
  linux: [{ target: "node22-linux-x64", out: "agent-relay-linux-x64" }],
};

const which = process.argv[2] || "all";
const selected = which === "all" ? Object.values(TARGETS).flat() : TARGETS[which];
if (!selected) {
  console.error(`Bilinmeyen hedef: ${which}. Seçenekler: win | mac | linux | all`);
  process.exit(1);
}

const run = (cmd, args, extra = {}) => {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...extra });
};

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// 1) Panel dosyalarını gömelim (exe dış dosya aramasın)
run("node", ["scripts/embed-assets.mjs"]);

// 2) ESM → tek CJS dosya (esbuild). JSON import'u da pakete gömülür.
run("npx", [
  "esbuild",
  "bin/relay.mjs",
  "--bundle",
  "--platform=node",
  "--target=node22",
  "--format=cjs",
  `--outfile=${BUNDLE}`,
  "--define:import.meta.url=\"file:///agent-relay\"",
]);

// 3) CJS → platform ikilisi (pkg)
for (const { target, out } of selected) {
  run(
    "npx",
    ["pkg", BUNDLE, "--targets", target, "--output", path.join(DIST, out), "--public", "--public-packages", "*", "--no-bytecode"],
    { env: { ...process.env, PKG_CACHE_PATH: process.env.PKG_CACHE_PATH || path.join(ROOT, ".pkg-cache") } },
  );
  console.log(`✓ ${out}`);
}

console.log(`\nPaketler hazır: ${DIST}`);
