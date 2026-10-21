import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * P13 — etiket görünürlük matrisi kilidi (ROADMAP §2.4 kusur #9).
 *
 * Kanıtlanan sözleşme (stil kurulumu + efekt aynı kuralı uygular):
 *  - OpenFreeMap symbol (etiket) katmanları: yalnız dark ve satellite altlıklarda.
 *  - OpenFreeMap symbol olmayan katmanlar: yalnız dark altlıkta.
 *  - kktc-outline / kktc-label: yalnız `labels` bayrağına bağlı; altlık koşulu YOK.
 *
 * Son kural kusur #9'un kaynağıdır: street/topographic (Esri raster) altlıkları
 * kendi gömülü etiketleriyle geldiğinden, KKTC etiketi Esri etiketiyle aynı
 * bölgede üst üste gelebilir. Düzeltme (kktc etiketlerine altlık koşulu
 * eklemek) MapView dokunma listesinde olduğu için kullanıcı kararı bekliyor;
 * bu test kusurun varlığını regresyona karşı görünür biçimde kilitler.
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

  it("KUSUR #9: KKTC etiketi altlık koşulsuzdur — sokak/topo'da Esri etiketiyle çakışabilir (karar bekliyor)", () => {
    const outline = styleBlock("kktc-outline");
    const label = styleBlock("kktc-label");
    // İki katman da ilk kurulumda yalnız `labels` koşuluna bağlı (baseMap yok).
    expect(outline).toContain('visibility: labels ? "visible" : "none"');
    expect(label).toContain('visibility: labels ? "visible" : "none"');
    expect(label).not.toContain("baseMap");
    // Güncelleme efektinde de baseMap dikkate alınmıyor.
    expect(mapSource).toContain(
      'map.setLayoutProperty(layer, "visibility", showLabels ? "visible" : "none")',
    );
    // KKTC etiketi çakışmaya izinli çizilir; yani üst üste binme render'da engellenmez.
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
