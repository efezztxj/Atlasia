/**
 * Atlasia — kaynak haritalarını yayın klasöründen çıkar (A6).
 *
 * NEDEN: `vite build --sourcemap hidden` .map üretir ama pakete referans yazmaz.
 * Dosyalar yine `dist/assets/*.map` altında kalırsa Cloudflare Pages onları da
 * yayınlar ve tahmin edilebilir URL'den indirilebilir hale gelir. Bu betik
 * haritaları `sourcemaps/` klasörüne taşır (dist dışı): CI bunları artifact
 * olarak saklar, üretim sitesinde bulunmazlar.
 *
 * Davranış: harita yoksa sessizce çıkar (sourcemap kapalı bir derlemede de
 * `npm run build` kırılmaz). Taşıma sonrası boş klasörler temizlenir.
 */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const DIST = "dist";
const OUT = "sourcemaps";

export function findSourceMaps(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findSourceMaps(full, acc);
    else if (entry.name.endsWith(".map")) acc.push(full);
  }
  return acc;
}

const maps = findSourceMaps(DIST);
if (maps.length === 0) {
  console.log("Kaynak haritası yok (sourcemap kapalı olabilir) — taşıma atlandı.");
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
for (const file of maps) {
  const target = join(OUT, relative(DIST, file));
  mkdirSync(dirname(target), { recursive: true });
  renameSync(file, target);
}

// Taşıma sonrası boşalan klasörleri temizle (dist/assets gibi).
function pruneEmpty(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmpty(join(dir, entry.name));
  }
  if (readdirSync(dir).length === 0) rmSync(dir, { recursive: true, force: true });
}
pruneEmpty(DIST);

console.log(`Kaynak haritaları yayın klasöründen çıkarıldı: ${maps.length} dosya → ${OUT}/`);
