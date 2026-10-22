import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * P13 — etiket görünürlük matrisi kilidi (ROADMAP §2.4 kusur #9).
 *
 * Kanıtlanan sözleşme (stil kurulumu + efekt aynı kuralı uygular):
 *  - OpenFreeMap symbol (etiket) katmanları: yalnız dark ve satellite altlıklarda.
 *  - OpenFreeMap symbol olmayan katmanlar: yalnız dark altlıkta.
 *  - Bölgeye özel katman yoktur: KKTC sınır çizgisi ve sarı isim katmanı
 *    2026-10-22 kullanıcı kararıyla kaldırıldı.
 *
 * Kullanıcının onayladığı B seçeneği kusur #9'u kapatır: street/topographic
 * (Esri raster) altlıkları kendi gömülü etiketleriyle geldiğinden özel KKTC
 * yazısı oralarda gizlenir. Sınır çizgisi metin çakışması yaratmadığı için
 * her altlıkta korunur. Bu test düzeltilmiş sözleşmeyi regresyona kapatır.
 */

const mapViewPath = fileURLToPath(new URL("../components/MapView.tsx", import.meta.url));
const mapSource = readFileSync(mapViewPath, "utf8");

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

  it("KKTC'ye özel sınır çizgisi ve sarı isim katmanı yoktur (kullanıcı kararı 2026-10-22)", () => {
    // Harita hiçbir bölgeyi özel olarak işaretlemez; isimler altlığın kendi etiketlerinden gelir.
    expect(mapSource.toLowerCase()).not.toContain("kktc");
    expect(mapSource).not.toContain("KUZEY KIBRIS");
    expect(mapSource).not.toContain("#ffdb8d");
  });
});
