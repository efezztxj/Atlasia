import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CACHE_PREFIX,
  resolveBuildId,
  sanitizeBuildId,
  stampServiceWorker,
  stampSwSource,
} from "./stamp-sw.mjs";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = readFileSync(path.join(REPO_ROOT, "public/sw.js"), "utf8");
const SOURCE_CACHE = /const CACHE = "(atlasia-shell-[A-Za-z0-9._-]+)";/.exec(SOURCE)?.[1] ?? "";

test("sanitizeBuildId yalnız güvenli karakter bırakır ve kısa kimliği reddeder", () => {
  assert.equal(sanitizeBuildId("A1B2-C3_d4"), "a1b2c3d4");
  assert.equal(sanitizeBuildId("  deadbeef  "), "deadbeef");
  assert.equal(sanitizeBuildId("0123456789abcdef"), "0123456789ab");
  assert.equal(sanitizeBuildId("abc"), "", "3 karakterli kimlik cache adına girmemeli");
  assert.equal(sanitizeBuildId("--__"), "");
  assert.equal(sanitizeBuildId(undefined), "");
  assert.equal(sanitizeBuildId(null), "");
});

test("resolveBuildId sırayla CF Pages, GitHub SHA, git SHA ve zaman damgasını kullanır", () => {
  assert.equal(
    resolveBuildId({ CF_PAGES_COMMIT_SHA: "ABCDEF123", GITHUB_SHA: "9999999" }, { gitSha: "1111111" }),
    "abcdef123",
    "CF Pages kimliği en yüksek öncelik",
  );
  assert.equal(resolveBuildId({ GITHUB_SHA: "9999999" }, { gitSha: "1111111" }), "9999999");
  assert.equal(resolveBuildId({}, { gitSha: "1111111" }), "1111111");
  assert.equal(resolveBuildId({}, { now: 1_700_000_000_000 }), `local${(1_700_000_000_000).toString(36)}`);
  // Aynı girdi aynı kimliği verir: build deterministik kalmalı.
  assert.equal(resolveBuildId({}, { gitSha: "abcdef0" }), resolveBuildId({}, { gitSha: "abcdef0" }));
});

test("stampSwSource yalnız CACHE değerini değiştirir, kodun geri kalanı bit-bit aynıdır", () => {
  assert.ok(SOURCE_CACHE, "kaynakta CACHE sabiti bulunmalı");
  const { source, cacheName } = stampSwSource(SOURCE, "abc1234");

  assert.equal(cacheName, `${CACHE_PREFIX}abc1234`);
  assert.ok(cacheName.startsWith(CACHE_PREFIX), "activate temizliği bu öneke bağlı");
  assert.notEqual(cacheName, SOURCE_CACHE);
  assert.equal(
    source.replace(`const CACHE = "${cacheName}";`, `const CACHE = "${SOURCE_CACHE}";`),
    SOURCE,
    "kaynak ile damgalı sürüm arasındaki tek fark CACHE adı olmalı",
  );
  assert.equal(source.match(/const CACHE = /g)?.length, 1);
  assert.ok(source.includes("precacheAppShell()"));
  assert.ok(source.includes('const CACHE_PREFIX = "atlasia-shell-";'));
  assert.ok(source.includes('self.addEventListener("message"'), "SKIP_WAITING akışı korunmalı");
});

test("stampSwSource damgalanacak satır yoksa veya kimlik geçersizse hata verir", () => {
  assert.throws(() => stampSwSource("self.addEventListener('fetch', () => {});", "abc1234"), /bulunamadı/);
  assert.throws(() => stampSwSource(SOURCE, "!!"), /Geçersiz/);
  assert.throws(() => stampSwSource(SOURCE, "ab"), /Geçersiz/);
});

test("stampServiceWorker dist kopyasını yazar, kaynağa dokunmaz ve aynı girdide deterministiktir", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "atlasia-sw-stamp-"));
  const sourcePath = path.join(dir, "public-sw.js");
  const outPath = path.join(dir, "dist", "sw.js");
  writeFileSync(sourcePath, SOURCE);

  const first = stampServiceWorker({ sourcePath, outPath, buildId: "abc1234" });
  assert.equal(first.cacheName, "atlasia-shell-abc1234");
  const firstBytes = readFileSync(outPath, "utf8");
  assert.equal(first.bytes, Buffer.byteLength(firstBytes));

  const second = stampServiceWorker({ sourcePath, outPath, buildId: "abc1234" });
  assert.equal(second.cacheName, first.cacheName);
  assert.equal(readFileSync(outPath, "utf8"), firstBytes, "aynı kimlik aynı dosyayı üretmeli");
  assert.equal(readFileSync(sourcePath, "utf8"), SOURCE, "kaynak dosya değişmemeli");

  const third = stampServiceWorker({ sourcePath, outPath, buildId: "def5678" });
  assert.notEqual(third.cacheName, first.cacheName, "yeni build yeni cache adı üretmeli");
  assert.throws(() => stampServiceWorker({ sourcePath: path.join(dir, "yok.js"), outPath }), /kaynağı yok/);
});
