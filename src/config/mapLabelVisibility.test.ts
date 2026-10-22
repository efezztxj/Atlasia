import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * P13 — etiket görünürlük matrisi kilidi (ROADMAP §2.4 kusur #9).
 *
 * Kanıtlanan sözleşme (stil kurulumu + efekt aynı kuralı uygular):
 *  - OpenFreeMap symbol (etiket) katmanları: yalnız dark ve satellite altlıklarda.
 *  - OpenFreeMap symbol olmayan katmanlar: yalnız dark altlıkta.
 *  - kktc-outline: yalnız `labels` bayrağına bağlı; her altlıkta aynı davranır.
 *  - kktc-label: `labels` + dark/satellite koşuluna bağlı.
 *
 * Kullanıcının onayladığı B seçeneği kusur #9'u kapatır: street/topographic
 * (Esri raster) altlıkları kendi gömülü etiketleriyle geldiğinden özel KKTC
 * yazısı oralarda gizlenir. Sınır çizgisi metin çakışması yaratmadığı için
 * her altlıkta korunur. Bu test düzeltilmiş sözleşmeyi regresyona kapatır.
 */

const mapViewPath = fileURLToPath(new URL("../components/MapView.tsx", import.meta.url));
const mapSource = readFileSync(mapViewPath, "utf8");

function styleBlock(layerId: string): string {
  const start = mapSource.indexOf(`id: "${layerId}"`);
  if (start < 0) throw new Error(`${layerId} katmanı MapView'da bulunamadı`);
  return mapSource.slice(start, start + 700);
}

describe("harita etiket görünürlük matrisi (P13)", () => {
  it("OpenFreeMap etiketleri yalnız dark/satellite altlıklarında görünürdür", () => {
    expect(mapSource).toContain(
      'return labels && (baseMap === "dark" || baseMap === "satellite")',
    );
    // Symbol olmayan (çizgi/dolgu) katmanlar yalnız dark'ta.
    expect(mapSource).toContain('return baseMap === "dark";');
    // Aynı kural hem ilk stil kurulumunda hem güncellemede kullanılıyor.
    expect(mapSource.match(/openFreeMapLayerVisible\(id, labels, baseMap\)/g)).toHaveLength(1);
    expect(mapSource.match(/openFreeMapLayerVisible\(layerId, showLabels, baseMap\)/g)).toHaveLength(1);
  });

  it("raster altlıklar (Esri) kendi etiketleriyle tek başına devreye girer", () => {
    expect(mapSource).toContain('id: "street"');
    expect(mapSource).toContain('id: "topographic"');
    expect(mapSource).toContain("server.arcgisonline.com/ArcGIS/rest/services");
    // Etiket katmanı koşulu street/topographic'i hiç görünür saymaz.
    const visibilityFn = mapSource.slice(
      mapSource.indexOf("function openFreeMapLayerVisible"),
      mapSource.indexOf("function openFreeMapLayers"),
    );
    expect(visibilityFn).not.toContain('"street" ? "visible"');
    expect(visibilityFn).not.toContain('"topographic" ? "visible"');
  });

  it("kktc-outline her altlıkta kalır; kktc-label yalnız dark/satellite'de görünürdür", () => {
    const outline = styleBlock("kktc-outline");
    const label = styleBlock("kktc-label");
    const helper = mapSource.slice(
      mapSource.indexOf("function kktcLabelVisible"),
      mapSource.indexOf("function openFreeMapLayers"),
    );

    expect(helper).toContain(
      'return labels && (baseMap === "dark" || baseMap === "satellite")',
    );
    // Çizgi ilk kurulumda ve güncellemede altlığa değil yalnız labels'a bağlıdır.
    expect(outline).toContain('visibility: labels ? "visible" : "none"');
    expect(mapSource).toContain(
      'map.setLayoutProperty("kktc-outline", "visibility", showLabels ? "visible" : "none")',
    );
    // Etiket aynı yardımcı koşulu ilk kurulumda ve güncellemede kullanır;
    // böylece street/topographic'te Esri'nin gömülü etiketiyle çakışmaz.
    expect(label).toContain(
      'visibility: kktcLabelVisible(labels, baseMap) ? "visible" : "none"',
    );
    expect(mapSource).toContain('kktcLabelVisible(showLabels, baseMap)');
    expect(mapSource.match(/kktcLabelVisible\(/g)).toHaveLength(3); // tanım + 2 çağrı
    // Koşul kapsamındaki altlıklarda mevcut çizim sözleşmesi değişmez.
    expect(label).toContain('"text-allow-overlap": true');
  });

  it("KKTC etiketi zoom aralığı ve konumu sözleşmeye kilitlidir (kaza değişimine kapanır)", () => {
    const label = styleBlock("kktc-label");
    expect(label).toContain("minzoom: 5.2");
    expect(label).toContain("maxzoom: 11");
    expect(mapSource).toContain("KUZEY KIBRIS");
    expect(mapSource).toContain("coordinates: [33.58, 35.265]");
  });
});
