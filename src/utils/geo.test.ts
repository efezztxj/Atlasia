import { afterEach, describe, expect, it, vi } from "vitest";
import { haversineKm, searchWorld, toSearchResult } from "./geo";

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

  it("geocoding dönüşümü extent değerini değiştirmez", () => {
    const extent: [number, number, number, number] = [26.1, 38.2, 29.6, 40.1];
    const result = toSearchResult({
      geometry: { coordinates: [27.14, 38.42] },
      properties: { osm_id: 42, osm_type: "R", name: "İzmir", extent },
    }, "şehir");
    expect(result.bbox).toEqual(extent);
  });

  it("İstanbul-Ankara kuş uçuşu mesafesini yaklaşık 351 km hesaplar", () => {
    const distance = haversineKm(41.0082, 28.9784, 39.9334, 32.8597);
    expect(Math.abs(distance - 351)).toBeLessThan(2);
  });
});
