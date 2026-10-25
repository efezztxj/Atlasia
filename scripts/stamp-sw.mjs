/**
 * Atlasia — üretim service worker damgası.
 *
 * NEDEN VAR: Tarayıcı bir service worker'ı yalnızca `sw.js` dosyasının baytları
 * değiştiğinde günceller. `public/sw.js` depoda sabit olduğu için her deploy'da
 * aynı dosya yayınlanıyordu; sonuç:
 *   - `src/components/UpdateNotice.tsx` ("Yeni sürüm hazır") çoğu deploy'da hiç
 *     görünmüyordu, çünkü yeni bir service worker hiç oluşmuyordu,
 *   - eski hash'li kabuk dosyaları aynı `atlasia-shell-v7` cache'inde birikiyordu
 *     (depolama büyümesi, çevrimdışı kabukta eski/yeni karışması).
 *
 * ÇÖZÜM: Build sonunda `dist/sw.js`, kaynaktan birebir kopyalanır; yalnız
 * `CACHE` sabitinin değeri `atlasia-shell-<build-id>` olarak yazılır:
 *   - her yeni build yeni bir service worker üretir → kullanıcıya sorulan
 *     güncelleme akışı gerçekten çalışır,
 *   - `activate` eski `atlasia-shell-*` cache'lerini siler → depolama şişmez,
 *   - kodun geri kalanı bit-bit aynı kalır; `scripts/verify-sw-shell.mjs` bunu
 *     (yazılan dosya ile kaynak arasındaki tek fark CACHE adı) doğrular.
 *
 * `public/sw.js` kaynağı değişmez: `sw.node-test.mjs` ve
 * `src/config/pwaManifest.test.ts` hâlâ okunabilir kaynağı test eder.
 *
 * Build kimliği sırası: `CF_PAGES_COMMIT_SHA` → `GITHUB_SHA` → git kısa SHA →
 * yerel build için zaman damgası. Aynı commit'in iki build'i aynı kimliği üretir;
 * Vite çıktısı da içerik-hash'li olduğu için bu durumda güncellenecek bir şey yoktur.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CACHE_PREFIX = "atlasia-shell-";
/** Kaynak dosyada damgalanacak satır; başka hiçbir yere dokunulmaz. */
const CACHE_LITERAL = /const CACHE = "(atlasia-shell-[A-Za-z0-9._-]+)";/;

/**
 * Build kimliğini cache adında güvenli olacak biçime indirger.
 * Yalnız küçük harf ve rakam; 4–12 karakter. Geçersizse boş dize döner.
 */
export function sanitizeBuildId(raw) {
  const cleaned = String(raw ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.length < 4) return "";
  return cleaned.slice(0, 12);
}

/**
 * Yerel build'de git kısa SHA'sını okur. Git yoksa boş dize döner (zaman damgasına düşülür).
 */
export function readGitShortSha() {
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Build kimliğini ortama göre çözer. Testler `options` ile deterministik çalışır;
 * git okuması bilinçli olarak çağıranın (CLI) işidir, bu fonksiyon saftır.
 */
export function resolveBuildId(env = process.env, options = {}) {
  const candidates = [env.CF_PAGES_COMMIT_SHA, env.GITHUB_SHA, options.gitSha];
  for (const candidate of candidates) {
    const id = sanitizeBuildId(candidate);
    if (id) return id;
  }
  const now = typeof options.now === "number" ? options.now : Date.now();
  return `local${now.toString(36)}`;
}

/**
 * Service worker kaynağını damgalar. Yalnız `CACHE` sabitinin değeri değişir.
 * @param {string} source `public/sw.js` içeriği
 * @param {string} buildId build kimliği
 * @returns {{ source: string, cacheName: string }}
 */
export function stampSwSource(source, buildId) {
  const id = sanitizeBuildId(buildId);
  if (!id) throw new Error(`Geçersiz service worker build kimliği: ${JSON.stringify(buildId)}`);
  const match = CACHE_LITERAL.exec(source);
  if (!match) {
    throw new Error(
      'public/sw.js içinde `const CACHE = "atlasia-shell-…";` satırı bulunamadı; damgalama yapılamaz.',
    );
  }
  const cacheName = `${CACHE_PREFIX}${id}`;
  const stamped = `${source.slice(0, match.index)}const CACHE = "${cacheName}";${source.slice(match.index + match[0].length)}`;
  return { source: stamped, cacheName };
}

/**
 * Kaynağı okuyup damgalı kopyayı hedefe yazar ve yazılanı doğrular.
 */
export function stampServiceWorker({ sourcePath = "public/sw.js", outPath = "dist/sw.js", buildId } = {}) {
  if (!existsSync(sourcePath)) throw new Error(`Service worker kaynağı yok: ${sourcePath}`);
  const source = readFileSync(sourcePath, "utf8");
  const { source: stamped, cacheName } = stampSwSource(source, buildId);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, stamped);
  const written = readFileSync(outPath, "utf8");
  if (!written.includes(`const CACHE = "${cacheName}";`)) {
    throw new Error(`Damgalı service worker yazılamadı: ${outPath}`);
  }
  return { cacheName, bytes: Buffer.byteLength(written), outPath };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  try {
    const result = stampServiceWorker({ buildId: resolveBuildId(process.env, { gitSha: readGitShortSha() }) });
    console.log(`Service worker damgalandı: ${result.cacheName} → ${result.outPath} (${result.bytes} bayt)`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
