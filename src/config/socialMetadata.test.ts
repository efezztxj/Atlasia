import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const indexHtml = readFileSync(`${projectRoot}index.html`, "utf8");
const packageJson = JSON.parse(readFileSync(`${projectRoot}package.json`, "utf8")) as {
  scripts: Record<string, string>;
};
const verifier = readFileSync(`${projectRoot}scripts/verify-social-metadata.mjs`, "utf8");
const productionOrigin = "https://atlasia.pages.dev";
const imageUrl = `${productionOrigin}/images/atlasia-share-card.jpg`;
const title = "Atlasia — Dünyayı merakınla keşfet";
const description =
  "Atlasia — gerçek uydu görüntüleriyle dünyayı keşfet, gezginlerin bıraktığı küçük ipuçlarını bul ve kendi keşfini haritaya bırak.";
const imageAlt =
  "Atlasia logosu ve gece Dünya görünümü üzerinde Dünyayı merakınla keşfet mesajı";

function parseMetaElements(html: string) {
  const values = new Map<string, string[]>();

  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gis)) {
      attributes.set(match[1].toLowerCase(), match[3]);
    }

    const key = attributes.get("property") ?? attributes.get("name");
    const content = attributes.get("content");
    if (!key || content === undefined) continue;
    values.set(key, [...(values.get(key) ?? []), content]);
  }

  return values;
}

function readJpegDimensions(buffer: Buffer) {
  expect([...buffer.subarray(0, 2)]).toEqual([0xff, 0xd8]);
  let offset = 2;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    const length = buffer.readUInt16BE(offset);
    if (startOfFrameMarkers.has(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    offset += length;
  }

  throw new Error("JPEG frame marker bulunamadı");
}

const metadata = parseMetaElements(indexHtml);
const expectSingleValue = (key: string, value: string) => {
  expect(metadata.get(key)).toEqual([value]);
};

describe("social sharing metadata", () => {
  it("defines the complete Open Graph set on the verified production origin", () => {
    const expected = new Map([
      ["description", description],
      ["og:locale", "tr_TR"],
      ["og:site_name", "Atlasia"],
      ["og:type", "website"],
      ["og:title", title],
      ["og:description", description],
      ["og:url", `${productionOrigin}/`],
      ["og:image", imageUrl],
      ["og:image:secure_url", imageUrl],
      ["og:image:type", "image/jpeg"],
      ["og:image:width", "1200"],
      ["og:image:height", "630"],
      ["og:image:alt", imageAlt],
    ]);

    for (const [key, value] of expected) expectSingleValue(key, value);
    for (const key of ["og:url", "og:image", "og:image:secure_url"]) {
      expect(new URL(metadata.get(key)?.[0] ?? "").origin).toBe(productionOrigin);
    }
  });

  it("keeps the large Twitter card equivalent to Open Graph", () => {
    expectSingleValue("twitter:card", "summary_large_image");
    expectSingleValue("twitter:title", metadata.get("og:title")?.[0] ?? "");
    expectSingleValue("twitter:description", metadata.get("og:description")?.[0] ?? "");
    expectSingleValue("twitter:image", metadata.get("og:image")?.[0] ?? "");
    expectSingleValue("twitter:image:alt", metadata.get("og:image:alt")?.[0] ?? "");
  });

  it("ships a lightweight first-party 1200×630 JPEG", () => {
    const imagePath = `${projectRoot}public/images/atlasia-share-card.jpg`;
    const image = readFileSync(imagePath);

    expect(statSync(imagePath).size).toBeLessThanOrEqual(250 * 1024);
    expect(readJpegDimensions(image)).toEqual({ width: 1200, height: 630 });
    expect(metadata.get("og:image:type")).toEqual(["image/jpeg"]);
    expect(new URL(metadata.get("og:image")?.[0] ?? "").pathname).toBe(
      "/images/atlasia-share-card.jpg",
    );
  });

  it("runs the dist verifier immediately after the production build", () => {
    expect(packageJson.scripts["verify:social-metadata"]).toBe(
      "node scripts/verify-social-metadata.mjs",
    );
    expect(packageJson.scripts.check).toContain(
      "npm run build && npm run verify:social-metadata && npm run audit:check",
    );
    expect(verifier).toContain('`${distDirectory}index.html`');
    expect(verifier).toContain('`${distDirectory}images/atlasia-share-card.jpg`');
  });
});
