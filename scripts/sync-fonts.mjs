/**
 * Atlasia — font dosyalarını paketlerden `public/fonts/`'a kopyalar (B2).
 *
 * NEDEN: Fontlar self-host ediliyor (dış istek yok, KVKK temiz). Dosyalar depoda
 * duruyor ki build/CI ek bir adım gerektirmesin; bu betik onları kaynağından
 * **yeniden üretilebilir** biçimde tazeler (sürüm yükseltmesinde tek komut).
 *
 * Yalnız `wght` ekseni ve `latin` + `latin-ext` alt kümeleri kopyalanır:
 * Türkçe karakterler bu iki aralıkta; Vietnamca/Kiril dosyaları hiç gönderilmez.
 *
 * Kullanım: npm run fonts:sync   (fark varsa dosyalar güncellenir)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCES = [
  { pkg: "@fontsource-variable/bricolage-grotesque", prefix: "bricolage-grotesque" },
  { pkg: "@fontsource-variable/dm-sans", prefix: "dm-sans" },
];
const SUBSETS = ["latin", "latin-ext"];
const OUT = "public/fonts";

export function variants(prefix) {
  return SUBSETS.map((subset) => `${prefix}-${subset}-wght-normal.woff2`);
}

mkdirSync(OUT, { recursive: true });
let copied = 0;
for (const { pkg, prefix } of SOURCES) {
  const dir = join("node_modules", pkg, "files");
  if (!existsSync(dir)) {
    console.error(`Font paketi bulunamadı: ${pkg} — önce \`npm ci\` çalıştır.`);
    process.exit(1);
  }
  for (const file of variants(prefix)) {
    const from = join(dir, file);
    const to = join(OUT, file);
    if (!existsSync(from)) {
      console.error(`Beklenen font dosyası yok: ${from}`);
      process.exit(1);
    }
    const same = existsSync(to)
      && statSync(from).size === statSync(to).size
      && readFileSync(from, "base64") === readFileSync(to, "base64");
    if (!same) {
      copyFileSync(from, to);
      copied += 1;
      console.log(`güncellendi: ${to}`);
    }
  }
}
console.log(copied === 0
  ? `Fontlar güncel (${readdirSync(OUT).filter((f) => f.endsWith(".woff2")).length} dosya).`
  : `${copied} font dosyası güncellendi.`);
