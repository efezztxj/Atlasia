import { readFileSync } from "node:fs";
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
    expect(isCacheableTile("https://tiles.openfreemap.org/planet")).toBe(true);
    expect(isCacheableTile("https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf")).toBe(true);
    expect(isCacheableTile("https://tiles.openfreemap.org/sprites/ofm_f384/ofm.json")).toBe(true);
    expect(isCacheableTile("https://tiles.openfreemap.org/styles/dark")).toBe(true);
  });

  it("izinli host/path eşleşmesi tamdır: lookalike ve sahte URL'ler reddedilir", () => {
    const rejected = [
      // izinli host adı path/query içinde geçen sahte adresler
      "https://evil.example/tiles.openfreemap.org/planet/14/1/2.pbf",
      "https://evil.example/tile?src=tiles.openfreemap.org",
      "https://evil.example/elevation-tiles-prod/terrarium/12/1/2.png",
      // alt alan gibi gösteren sahte hostlar
      "https://tiles.openfreemap.org.evil.example/planet/14/1/2.pbf",
      "https://s3.amazonaws.com.evil.example/elevation-tiles-prod/terrarium/12/1/2.png",
      "https://nottiles.openfreemap.org/planet/14/1/2.pbf",
      // userinfo hilesi: gerçek host @ sonrası
      "https://tiles.openfreemap.org@evil.example/planet/14/1/2.pbf",
      "https://user:pass@tiles.openfreemap.org/planet/14/1/2.pbf",
      // HTTPS dışı
      "http://tiles.openfreemap.org/planet/14/1/2.pbf",
      "http://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/1/2.png",
      // izinli host ama liste dışı path
      "https://tiles.openfreemap.org/admin/panel",
      "https://s3.amazonaws.com/baska-bucket/gizli.png",
      "https://s3.amazonaws.com/elevation-tiles-prod/not-terrarium/1.png",
      // parse edilemez
      "not a url",
      "",
    ];
    for (const url of rejected) {
      expect(isCacheableTile(url), url).toBe(false);
    }
  });

  it("Esri kontrolü gerçek hosta bakar; sahte son ek Esri sayılmaz, üst alan sayılır", () => {
    expect(isEsriTile("https://arcgisonline.com/tile/1")).toBe(true);
    expect(isEsriTile("https://services.arcgisonline.com/tile/1")).toBe(true);
    expect(isEsriTile("https://arcgisonline.com.evil.example/tile/1")).toBe(false);
    expect(isEsriTile("https://evil.example/server.arcgisonline.com/tile/1")).toBe(false);
    expect(isEsriTile("geçersiz")).toBe(false);
  });

  it("public/sw.js allowlist kopyası offlineCache ile senkron ve substring gevşekliğine dönmez", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    const cache = readFileSync("src/utils/offlineCache.ts", "utf8");
    for (const literal of [
      '"tiles.openfreemap.org"',
      '"s3.amazonaws.com"',
      "/planet",
      "/natural_earth/",
      "/fonts/",
      "/sprites/",
      "/styles/",
      "/elevation-tiles-prod/terrarium/",
    ]) {
      expect(sw, `sw.js: ${literal}`).toContain(literal);
      expect(cache, `offlineCache.ts: ${literal}`).toContain(literal);
    }
    // Host kararı URL parse üzerinden: gevşek substring içerikleri geri dönmesin.
    expect(sw).toContain("parsed.hostname");
    expect(sw).not.toContain('url.includes("openfreemap")');
    expect(sw).not.toContain('url.includes("tiles.openfreemap.org")');
    expect(cache).not.toContain('url.includes("openfreemap")');
    expect(cache).not.toContain('url.includes("tiles.openfreemap.org")');
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
