import { afterEach, describe, expect, it, vi } from "vitest";
import { clearWeatherLayerCache, debounce, fetchWeatherGrid, weatherGrid } from "./weatherLayer";

afterEach(() => { clearWeatherLayerCache(); vi.useRealTimers(); });

describe("hava katmanı verisi", () => {
  it("3×3 grid üretir ve kutup yakınında enlemi sınırlar", () => {
    const points = weatherGrid({ west: 10, south: 80, east: 20, north: 90 });
    expect(points).toHaveLength(9);
    expect(points[0]).toEqual({ lat: 80, lng: 10 });
    expect(points.at(-1)?.lat).toBe(85);
  });

  it("aynı koordinat isteğini birleştirir ve sonucu 10 dakika cache'ler", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ current: { temperature_2m: i + 10, precipitation: 0, weather_code: 1 } }))), { status: 200 }));
    const bounds = { west: 1, south: 2, east: 4, north: 5 };
    const [a, b] = await Promise.all([fetchWeatherGrid(bounds, fetcher, 100), fetchWeatherGrid(bounds, fetcher, 100)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    await fetchWeatherGrid(bounds, fetcher, 100 + 9 * 60_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await fetchWeatherGrid(bounds, fetcher, 100 + 10 * 60_000 + 1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("HTTP hatasını reddeder; tüketen katman bunu veri yok olarak sunabilir", async () => {
    await expect(fetchWeatherGrid({ west: 1, south: 1, east: 2, north: 2 }, async () => new Response("", { status: 503 })))
      .rejects.toThrow("Open-Meteo yanıtı: 503");
  });

  it("debounce yalnız son callback'i çalıştırır; iptal çağrıyı engeller", () => {
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
