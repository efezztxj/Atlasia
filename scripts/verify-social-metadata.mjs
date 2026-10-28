import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const productionOrigin = "https://atlasia.pages.dev";
const shareImageUrl = `${productionOrigin}/images/atlasia-share-card.jpg`;
const title = "Atlasia — Dünyayı merakınla keşfet";
const description =
  "Atlasia — 3B dünya haritasında ve uydu görüntülerinde gezginlerin bıraktığı izleri keşfet; rotanı planla, kendi keşfini haritaya bırak.";
const imageAlt =
  "Atlasia logosu ve gece Dünya görünümü üzerinde Dünyayı merakınla keşfet mesajı";

const expectedMetadata = new Map([
  ["description", description],
  ["og:locale", "tr_TR"],
  ["og:site_name", "Atlasia"],
  ["og:type", "website"],
  ["og:title", title],
  ["og:description", description],
  ["og:url", `${productionOrigin}/`],
  ["og:image", shareImageUrl],
  ["og:image:secure_url", shareImageUrl],
  ["og:image:type", "image/jpeg"],
  ["og:image:width", "1200"],
  ["og:image:height", "630"],
  ["og:image:alt", imageAlt],
  ["twitter:card", "summary_large_image"],
  ["twitter:title", title],
  ["twitter:description", description],
  ["twitter:image", shareImageUrl],
  ["twitter:image:alt", imageAlt],
]);

const distDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
const sourceImagePath = fileURLToPath(
  new URL("../public/images/atlasia-share-card.jpg", import.meta.url),
);
const distImagePath = `${distDirectory}images/atlasia-share-card.jpg`;

function fail(message) {
  console.error(`Sosyal metadata doğrulaması başarısız: ${message}`);
  process.exit(1);
}

function parseMetaElements(html) {
  const values = new Map();

  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = new Map();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gis)) {
      attributes.set(match[1].toLowerCase(), match[3]);
    }

    const key = attributes.get("property") ?? attributes.get("name");
    const content = attributes.get("content");
    if (!key || content === undefined) continue;

    const entries = values.get(key) ?? [];
    entries.push(content);
    values.set(key, entries);
  }

  return values;
}

function readJpegFrame(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("paylaşım görseli geçerli bir JPEG başlangıcına sahip değil");
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;

    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 1 >= buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) break;
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
        progressive: marker === 0xc2,
      };
    }

    offset += segmentLength;
  }

  throw new Error("paylaşım görselinin JPEG boyut bilgisi okunamadı");
}

let html;
try {
  html = readFileSync(`${distDirectory}index.html`, "utf8");
} catch (error) {
  fail(`dist/index.html okunamadı; önce production build çalıştırılmalı (${error.message})`);
}

const actualMetadata = parseMetaElements(html);
for (const [key, expected] of expectedMetadata) {
  const values = actualMetadata.get(key) ?? [];
  if (values.length !== 1) {
    fail(`${key} tam bir kez bulunmalı; bulunan: ${values.length}`);
  }
  if (values[0] !== expected) {
    fail(`${key} beklenen değerden farklı: ${JSON.stringify(values[0])}`);
  }
}

for (const key of ["og:url", "og:image", "og:image:secure_url", "twitter:image"]) {
  const value = actualMetadata.get(key)?.[0];
  if (!value || new URL(value).origin !== productionOrigin) {
    fail(`${key} doğrulanmış üretim köküne kilitli değil`);
  }
}

let sourceImage;
let distImage;
try {
  sourceImage = readFileSync(sourceImagePath);
  distImage = readFileSync(distImagePath);
} catch (error) {
  fail(`birinci taraf paylaşım JPEG'i okunamadı (${error.message})`);
}

if (!sourceImage.equals(distImage)) {
  fail("build çıktısındaki paylaşım görseli public kaynağıyla aynı değil");
}

const imageBytes = statSync(distImagePath).size;
if (imageBytes > 250 * 1024) {
  fail(`paylaşım görseli 250 KiB sınırını aşıyor: ${imageBytes} bayt`);
}

let frame;
try {
  frame = readJpegFrame(distImage);
} catch (error) {
  fail(error.message);
}
if (frame.width !== 1200 || frame.height !== 630) {
  fail(`paylaşım görseli 1200×630 değil: ${frame.width}×${frame.height}`);
}

console.log(
  `Sosyal metadata doğrulandı: ${expectedMetadata.size} değer, ` +
    `${frame.width}×${frame.height} JPEG, ${imageBytes} bayt, ` +
    `${frame.progressive ? "progressive" : "baseline"}.`,
);
