import { describe, expect, it } from "vitest";
import { bboxForView, isCacheableTile, isEsriTile, tilesForBbox } from "./offlineCache";

describe("offlineCache – çevrimdışı saha paketi (Adım 12)", () => {
  it("Esri tile toplu önbellekleme yasak", () => {
    expect(isEsriTile("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/2/3")).toBe(true);
    expect(isEsriTile("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/10/2/3")).toBe(true);
    expect(isCacheableTile("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/2/3")).toBe(false);
  });

  it("OpenFreeMap ve terrain karoları önbelleklenebilir", () => {
    expect(isCacheableTile("https://tiles.openfreemap.org/planet/14/8800/5400.pbf")).toBe(true);
    expect(isCacheableTile("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/2200/1400.png")).toBe(true);
    expect(isCacheableTile("https://tiles.openfreemap.org/natural_earth/ne2sr/5/16/10.png")).toBe(true);
  });

  it("bbox için karo listesi üretir (uçak modunda kaydırma için)", () => {
    const bbox = bboxForView({ lat: 37.9395, lng: 27.3417 }, 0.06);
    const tiles = tilesForBbox(bbox, 12, 13);
    expect(tiles.length).toBeGreaterThan(0);
    // her karo Esri değil, cacheable olmalı
    for (const t of tiles) {
      expect(isEsriTile(t.url)).toBe(false);
      expect(isCacheableTile(t.url)).toBe(true);
      expect(isCacheableTile(t.terrainUrl)).toBe(true);
    }
  });

  it("bboxForView span hesaplar", () => {
    const bbox = bboxForView({ lat: 35.2, lng: 33.4 }, 0.08);
    expect(bbox.west).toBeCloseTo(33.36, 2);
    expect(bbox.east).toBeCloseTo(33.44, 2);
  });

  it("pinler çevrimdışı görünür: GUIDE_PLACES yerel, cache'ten bağımsız", async () => {
    const { GUIDE_PLACES } = await import("../data/places");
    expect(GUIDE_PLACES.length).toBeGreaterThan(10);
    // En az bir pin Efes yakını olmalı (uçak modunda da sabit veri)
    const efes = GUIDE_PLACES.find((p) => p.id === "efes");
    expect(efes).toBeDefined();
    expect(efes?.lat).toBeCloseTo(37.9395, 1);
  });
});
