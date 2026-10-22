import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import style from "../data/openFreeMapDarkStyle.json";

/**
 * MapView kendi katmanlarını OpenFreeMap glyph sunucusuyla çizer. Sunucuda
 * olmayan bir yazı tipi istenirse glyph isteği 404 olur ve etiket hiç
 * görünmez (eski özel bölge etiketi "Open Sans Semibold" istiyordu). Burada izinli
 * küme, paketlenmiş stilin gerçekten kullandığı yazı tipleridir.
 */
function styleFonts(): Set<string> {
  const fonts = new Set<string>();
  for (const layer of style.layers as Array<{ layout?: Record<string, unknown> }>) {
    const value = layer.layout?.["text-font"];
    if (Array.isArray(value)) value.forEach((font) => typeof font === "string" && fonts.add(font));
  }
  return fonts;
}

describe("harita yazı tipleri", () => {
  it("MapView'in istediği her yazı tipi glyph sunucusunun stilinde var", () => {
    const allowed = styleFonts();
    expect(allowed.size).toBeGreaterThan(0);
    const source = readFileSync("src/components/MapView.tsx", "utf8");
    const requested = [...source.matchAll(/"text-font":\s*\[([^\]]*)\]/g)]
      .flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((font) => font[1]));
    // MapView'in kendi metin katmanı olmayabilir; olursa izinli kümeden seçmelidir.
    for (const font of requested) expect(allowed.has(font), font).toBe(true);
  });
});
