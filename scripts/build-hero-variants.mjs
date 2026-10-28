/**
 * Atlasia — hero görseli türevleri (B1).
 *
 * NEDEN: Landing'in ilk görseli tek bir 170 KB JPEG'ti. Mobilde 390 px genişlikte
 * aynı 1376 px dosya iniyordu (boşa bayt, yavaş LCP). Bu betik AVIF (en küçük) ve
 * JPEG (son çare) türevlerini üç genişlikte üretir; sayfa `<picture srcset>`
 * ile tarayıcının seçmesine bırakır. WebP üretilmiyor: AVIF'i desteklemeyen
 * tarayıcı JPEG alıyor, ara katman yalnız bayt ekliyordu.
 *
 * DÜRÜSTLÜK NOTU: master dosya 1376×768. Daha büyük bir master olmadan "2400 px
 * retina" **gerçek** olmaz — yükseltmek sadece dosyayı şişirir, keskinlik
 * kazandırmaz. Bu yüzden türevler GERÇEK genişliklerden üretilir (1376, 1080,
 * 768, 480) ve retina için 2x'e kadar en büyük gerçek boy kullanılır. Yeni bir
 * master konduğunda betik aynı komutla daha büyük seti üretir.
 *
 * Kullanım: npm run images:hero   (çıktı: public/images/hero-*)
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const SOURCE = "public/images/atlasia-earth-hero.jpg";
const OUT_DIR = "public/images";
/** Gerçek master'dan büyük türev üretilmez; liste master genişliğiyle kırpılır. */
const WIDTHS = [1376, 768, 480];
const FORMATS = [
  { ext: "avif", encode: (img) => img.avif({ quality: 52, effort: 6 }) },
  { ext: "jpg", encode: (img) => img.jpeg({ quality: 74, progressive: true, mozjpeg: true }) },
];

mkdirSync(OUT_DIR, { recursive: true });
const meta = await sharp(SOURCE).metadata();
const masterWidth = meta.width ?? 0;
const widths = WIDTHS.filter((width) => width <= masterWidth);
if (!widths.includes(masterWidth)) widths.unshift(masterWidth);

for (const width of widths) {
  for (const format of FORMATS) {
    const target = join(OUT_DIR, `hero-${width}.${format.ext}`);
    mkdirSync(dirname(target), { recursive: true });
    await format.encode(sharp(SOURCE).resize({ width, withoutEnlargement: true })).toFile(target);
    console.log(`üretildi: ${target}`);
  }
}
console.log(`Hero türevleri hazır · master ${masterWidth}px · genişlikler: ${widths.join(", ")}`);
