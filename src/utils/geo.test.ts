import { afterEach, describe, expect, it, vi } from "vitest";
import { searchWorld } from "./geo";

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
