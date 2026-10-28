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
 *
 * Ayrıca `src/styles/fonts.css` üretilir (paket içine girer). Daha önce bu
 * tanımlar `public/fonts/fonts.css` idi: ayrı bir render-blocking stil isteği
 * demekti (Lighthouse mobil 81–88). Artık tek CSS dosyası.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCES = [
  { pkg: "@fontsource-variable/bricolage-grotesque", prefix: "bricolage-grotesque" },
  { pkg: "@fontsource-variable/dm-sans", prefix: "dm-sans" },
];
const SUBSETS = ["latin", "latin-ext"];
const OUT = "public/fonts";
const CSS_OUT = "src/styles/fonts.css";

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
// @font-face tanımları: yalnız latin + latin-ext, `font-display: swap`.
// unicode-range, tarayıcının gereksiz alt kümeyi indirmesini engeller.
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
const FACE = (family, subset) => {
  const file = `${family === "Bricolage Grotesque Variable" ? "bricolage-grotesque" : "dm-sans"}-${subset}-wght-normal.woff2`;
  const weight = family === "Bricolage Grotesque Variable" ? "200 800" : "100 1000";
  const range = subset === "latin" ? LATIN : LATIN_EXT;
  return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;`
    + `src:url("/fonts/${file}") format("woff2-variations");unicode-range:${range}}`;
};

const css = `/**\n * B2 — self-host fontlar (üretilen dosya, elle düzenlemeyin).\n *\n * \`npm run fonts:sync\` bu dosyayı \`public/fonts/*.woff2\` kümesiyle birlikte\n * yazar. NEDEN PAKET İÇİNDE: daha önce \`public/fonts/fonts.css\` ayrı bir\n * render-blocking stil isteğiydi (Lighthouse mobil: 81–88). Tek CSS dosyasına\n * gömülünce kritik yoldan bir gidiş-dönüş kalkıyor; \`unicode-range\` sayesinde\n * yalnız gereken alt küme iniyor.\n */\n`
  + FACE("Bricolage Grotesque Variable", "latin") + "\n"
  + FACE("Bricolage Grotesque Variable", "latin-ext") + "\n"
  + FACE("DM Sans Variable", "latin") + "\n"
  + FACE("DM Sans Variable", "latin-ext") + "\n";
if (readFileSync(CSS_OUT, "utf8") !== css) {
  writeFileSync(CSS_OUT, css);
  console.log(`güncellendi: ${CSS_OUT}`);
}

console.log(copied === 0
  ? `Fontlar güncel (${readdirSync(OUT).filter((f) => f.endsWith(".woff2")).length} dosya).`
  : `${copied} font dosyası güncellendi.`);
