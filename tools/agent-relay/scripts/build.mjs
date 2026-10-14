#!/usr/bin/env node
/**
 * Agent Relay derleyici.
 *
 * Neden iki aşama: `pkg` CommonJS bekler, projemiz ise ESM + top-level await kullanır.
 * Bu yüzden önce esbuild ile TEK bir CJS dosyasına paketliyoruz, sonra pkg ile
 * platform çalıştırma dosyasına çeviriyoruz. Statik panel ve varsayılan ayar
 * dosyası pkg "assets" olarak gömülür.
 *
 * Kullanım:
 *   node scripts/build.mjs win            → dist/agent-relay-win-x64.exe
 *   node scripts/build.mjs mac            → macOS arm64 + x64
 *   node scripts/build.mjs linux          → Linux x64
 *   node scripts/build.mjs all
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

// 1) ESM → tek CJS dosya (esbuild)
run("npx", [
  "esbuild",
  "bin/relay.mjs",
  "--bundle",
  "--platform=node",
  "--target=node22",
  "--format=cjs",
  `--outfile=${BUNDLE}`,
  // CJS'de import.meta.url yok; kodumuz __dirname'e düşüyor, burada nötr bir değer veriyoruz.
  "--define:import.meta.url=\"file:///agent-relay\"",
]);

// 2) CJS → platform çalıştırma dosyası (pkg): panel + varsayılan ayar gömülür
for (const { target, out } of selected) {
  run("npx", [
    "pkg",
    BUNDLE,
    "--targets",
    target,
    "--output",
    path.join(DIST, out),
    "--public",
    "--public-packages",
    "*",
    "--no-bytecode",
  ], { env: { ...process.env, PKG_CACHE_PATH: process.env.PKG_CACHE_PATH || path.join(ROOT, ".pkg-cache") } });
  console.log(`✓ ${out}`);
}

console.log(`\nPaketler hazır: ${DIST}`);
