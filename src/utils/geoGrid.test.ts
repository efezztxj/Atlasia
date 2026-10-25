import { afterEach, describe, expect, it, vi } from "vitest";
import { debounce, geoGrid, wrapLng } from "./geoGrid";

afterEach(() => { vi.useRealTimers(); });

describe("coğrafi ızgara", () => {
  it("3×3 grid üretir ve kutup yakınında enlemi sınırlar", () => {
    const points = geoGrid({ west: 10, south: 80, east: 20, north: 90 });
    expect(points).toHaveLength(9);
    expect(points[0]).toEqual({ lat: 80, lng: 10 });
    expect(points.at(-1)?.lat).toBe(85);
  });

  it("satır/sütun sayısı büyütülebilir (rüzgâr ızgarası 4×6)", () => {
    expect(geoGrid({ west: 0, south: 0, east: 10, north: 10 }, 4, 6)).toHaveLength(24);
  });

  it("küçük kaydırmada ızgara (dolayısıyla cache anahtarı) değişmez", () => {
    const a = geoGrid({ west: 27.01, south: 38.31, east: 27.29, north: 38.52 });
    for (const shift of [0.01, 0.02, 0.03, -0.02]) {
      expect(geoGrid({ west: 27.01 + shift, south: 38.31 + shift, east: 27.29 + shift, north: 38.52 + shift })).toEqual(a);
    }
  });

  it("antimeridyeni geçen görünümde boş dönmez, boylamı sarar", () => {
    expect(geoGrid({ west: 170, south: -20, east: -170, north: -10 })).toHaveLength(9);
    expect(wrapLng(190)).toBe(-170);
    expect(wrapLng(-190)).toBe(170);
    expect(wrapLng(180)).toBe(-180);
  });

  it("geçersiz sınırlarda boş döner", () => {
    expect(geoGrid({ west: Number.NaN, south: 0, east: 1, north: 1 })).toEqual([]);
    expect(geoGrid({ west: 0, south: 5, east: 1, north: 1 })).toEqual([]);
  });
});

describe("debounce", () => {
  it("yalnız son callback'i çalıştırır; iptal çağrıyı engeller", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const delayed = debounce(fn, 250);
    delayed(); delayed();
    vi.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    delayed(); delayed.cancel(); vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
