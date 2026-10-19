import { afterEach, describe, expect, it, vi } from "vitest";
import { haversineKm, searchWorld } from "./geo";

describe("haversineKm mesafe kilidi", () => {
  it("İstanbul → Ankara büyük daire mesafesi ≈ 349.4 km (±0.5)", () => {
    // Regresyon kilidi: haversine formülü değiştirilirse mesafeler sessizce kayar.
    const km = haversineKm(41.0082, 28.9784, 39.9334, 32.8597);
    expect(km).toBeGreaterThan(348.9);
    expect(km).toBeLessThan(349.9);
  });

  it("aynı nokta sıfır mesafedir", () => {
    expect(haversineKm(41.0082, 28.9784, 41.0082, 28.9784)).toBe(0);
  });
});

describe("Photon arama sınırları", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Photon extent sırasını bbox içinde değiştirmeden korur", async () => {
    const extent: [number, number, number, number] = [26.11, 38.25, 29.64, 40.18];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{
          geometry: { coordinates: [27.14, 38.42] },
          properties: {
            osm_id: 123,
            osm_type: "R",
            name: "İzmir",
            country: "Türkiye",
            extent,
          },
        }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [result] = await searchWorld("izmir-bbox-regression");

    expect(result?.bbox).toEqual(extent);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
