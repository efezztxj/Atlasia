import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasRoute, RouteStop } from "../types";
import {
  attachStopWeather,
  dailyRainNote,
  fetchWeatherSeries,
  optimizeForRain,
  rainExposure,
  rainRisk,
  weatherAtClock,
  weatherLabel,
  type WeatherHour,
} from "./weather";

const BASE = "2026-10-19";

function hours(entries: Array<[number, number, number]>): WeatherHour[] {
  // [hour, precipitationProbability, weatherCode]
  return entries.map(([hour, probability, code]) => ({
    time: `${BASE}T${String(hour).padStart(2, "0")}:00`,
    temperature: 20 + hour / 10,
    precipitationMm: probability >= 60 ? 2.4 : 0,
    precipitationProbability: probability,
    weatherCode: code,
  }));
}

function stop(id: string, startTime: string, durationMinutes = 60): RouteStop {
  return {
    order: 1,
    name: id,
    type: "history",
    lat: 38.42,
    lng: 27.14,
    startTime,
    endTime: startTime,
    durationMinutes,
    description: "Test durağı",
    aiReason: "Test",
    tips: [],
    isCommunityPin: false,
    pinId: id,
    category: "history",
    imageUrl: null,
  };
}

function route(stops: RouteStop[]): AtlasRoute {
  return {
    id: "rt-test",
    routeTitle: "Test rotası",
    routeSummary: "Test",
    totalDurationHours: 2,
    totalDistanceKm: 1,
    transport: "walking",
    vibe: "Keşifçi",
    days: [{
      dayNumber: 1,
      title: "1. gün",
      summary: `${stops.length} durak.`,
      stops,
      polyline: "",
    }],
    weatherNote: null,
    alternatives: [],
    createdAt: 1,
    origin: { lat: 38.42, lng: 27.14 },
  };
}

describe("hava durumu derinleştirme", () => {
  it("hava kodlarını Türkçe etikete ve yağış riskine çevirir", () => {
    expect(weatherLabel(0)).toBe("Açık");
    expect(weatherLabel(63)).toBe("Yağmur");
    expect(weatherLabel(999)).toBe("Bilinmeyen hava");
    expect(rainRisk(10)).toBe("clear");
    expect(rainRisk(30)).toBe("possible");
    expect(rainRisk(60)).toBe("rainy");
  });

  it("varış saatini tahmin dilimine eşler ve dakikayı yuvarlar", () => {
    const series = hours([[9, 0, 0], [10, 20, 2], [11, 80, 63]]);
    expect(weatherAtClock(series, 0, "09:00")?.precipitationProbability).toBe(0);
    expect(weatherAtClock(series, 0, "09:45")?.precipitationProbability).toBe(20);
    expect(weatherAtClock(series, 0, "11:20")?.precipitationProbability).toBe(80);
    expect(weatherAtClock(series, 0, "23:00")).toBeNull();
  });

  it("gün ofsetini tahmin tarihine taşır", () => {
    const series: WeatherHour[] = [
      { ...hours([[9, 10, 1]])[0], time: `${BASE}T09:00` },
      { ...hours([[9, 10, 1]])[0], time: "2026-10-20T09:00" },
    ];
    expect(weatherAtClock(series, 0, "09:00")?.time).toBe(`${BASE}T09:00`);
    expect(weatherAtClock(series, 1, "09:00")?.time).toBe("2026-10-20T09:00");
  });

  it("her durağa varış saatindeki havayı ekler, sıralamayı değiştirmez", () => {
    const base = route([stop("a", "09:00"), stop("b", "11:00")]);
    const series = { a: hours([[9, 80, 63]]), b: hours([[11, 10, 1]]) };
    const next = attachStopWeather(base, series);

    expect(next.days[0].stops.map((item) => item.pinId)).toEqual(["a", "b"]);
    expect(next.days[0].stops[0].weather).toMatchObject({
      precipitationProbability: 80,
      risk: "rainy",
      label: "Yağmur",
    });
    expect(next.days[0].stops[1].weather?.risk).toBe("clear");
    expect(next.days[0].summary).toContain("1 durakta yağış riski");
  });

  it("yağmur planı ıslak durakları kuru saatlere kaydırır ve maruziyeti azaltır", () => {
    const base = route([stop("a", "09:00"), stop("b", "10:00")]);
    // 09:00'da a ıslak, 10:00'da b ıslak: takas ikisini de kuru saate taşır.
    const series = {
      a: hours([[9, 90, 63], [10, 10, 1]]),
      b: hours([[9, 10, 1], [10, 90, 63]]),
    };
    const before = rainExposure(base, series);
    const result = optimizeForRain(base, series);

    expect(before).toBe(180);
    expect(rainExposure(result.route, series)).toBeLessThan(before);
    expect(result.movedStops).toBeGreaterThan(0);
    expect(result.route.days[0].stops.map((item) => item.pinId)).toEqual(["b", "a"]);
    expect(result.route.days[0].stops.every((item) => item.weather?.risk === "clear")).toBe(true);
    expect(result.route.weatherNote).toContain("Yağmur planı");
  });

  it("yağış riski yoksa sıralamayı korur ve dürüst not yazar", () => {
    const base = route([stop("a", "09:00"), stop("b", "10:00")]);
    const series = { a: hours([[9, 5, 0], [10, 5, 0]]), b: hours([[9, 5, 0], [10, 5, 0]]) };
    const result = optimizeForRain(base, series);
    expect(result.movedStops).toBe(0);
    expect(result.route.days[0].stops.map((item) => item.pinId)).toEqual(["a", "b"]);
    expect(result.route.weatherNote).toContain("belirgin yağış riski yok");
  });

  it("günlük özet en yüksek yağış olasılığını gösterir", () => {
    expect(dailyRainNote(hours([[9, 20, 1], [10, 70, 63]]))).toContain("%70");
    expect(dailyRainNote(hours([[9, 5, 0], [10, 10, 1]]))).toContain("belirgin yağış riski görünmüyor");
    expect(dailyRainNote([])).toContain("ulaşamadım");
  });
});

describe("fetchWeatherSeries (fixture ile; ağ yok)", () => {
  /** Open-Meteo şekilli sahte yanıt: istenen koordinat sayısı kadar giriş. */
  function meteoPayload(url: string) {
    const count = new URL(url).searchParams.get("latitude")?.split(",").length ?? 1;
    const entry = {
      hourly: {
        time: [`${BASE}T09:00`, `${BASE}T10:00`],
        temperature_2m: [21, 22],
        precipitation: [0, 0.4],
        precipitation_probability: [10, 40],
        weather_code: [1, 61],
      },
    };
    return count === 1 ? entry : Array.from({ length: count }, () => entry);
  }

  const fetchMock = vi.fn(async (input: unknown) => ({
    ok: true,
    status: 200,
    json: async () => meteoPayload(String(input)),
  }));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("tek istekte birden çok noktayı kimlikleriyle döndürür", async () => {
    const series = await fetchWeatherSeries([
      { id: "a", lat: 40.01, lng: 29.01 },
      { id: "b", lat: 40.02, lng: 29.02 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(series.a).toHaveLength(2);
    expect(series.a[1]).toMatchObject({ precipitationProbability: 40, weatherCode: 61 });
    expect(series.b).toHaveLength(2);
  });

  it("aynı koordinat farklı kimlikle istenirse veri yeni kimliğe eşlenir (önbellek regresyonu)", async () => {
    await fetchWeatherSeries([{ id: "center", lat: 41.01, lng: 28.01 }]);
    const second = await fetchWeatherSeries([{ id: "pin-7", lat: 41.01, lng: 28.01 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // ikinci çağrı ağa gitmez
    expect(second["pin-7"]).toHaveLength(2); // eski davranış: undefined (eski kimlik)
  });

  it("kısmi çakışmada yalnız eksik nokta çekilir", async () => {
    await fetchWeatherSeries([
      { id: "a", lat: 42.01, lng: 30.01 },
      { id: "b", lat: 42.02, lng: 30.02 },
    ]);
    fetchMock.mockClear();
    const series = await fetchWeatherSeries([
      { id: "b", lat: 42.02, lng: 30.02 },
      { id: "c", lat: 42.03, lng: 30.03 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("latitude=42.030");
    expect(url).not.toContain("42.020");
    expect(series.b).toHaveLength(2);
    expect(series.c).toHaveLength(2);
  });

  it("önbellek 10 dakika sonra bayatlar ve yeniden çekilir", async () => {
    const t0 = 1_760_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(t0);
    await fetchWeatherSeries([{ id: "x", lat: 43.01, lng: 31.01 }]);
    vi.spyOn(Date, "now").mockReturnValue(t0 + 9 * 60 * 1000);
    await fetchWeatherSeries([{ id: "x", lat: 43.01, lng: 31.01 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.spyOn(Date, "now").mockReturnValue(t0 + 11 * 60 * 1000);
    await fetchWeatherSeries([{ id: "x", lat: 43.01, lng: 31.01 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("HTTP hatası Türkçe ve durum koduyla söylenir", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    await expect(fetchWeatherSeries([{ id: "h", lat: 44.01, lng: 32.01 }]))
      .rejects.toThrow("Hava durumu servisi yanıt vermedi (HTTP 503)");
  });

  it("ağ hatası anlaşılır mesaja çevrilir, boş veri ayrıca söylenir", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(fetchWeatherSeries([{ id: "n", lat: 44.02, lng: 32.02 }]))
      .rejects.toThrow("ulaşılamadı");

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ hourly: { time: [] } }) });
    await expect(fetchWeatherSeries([{ id: "e", lat: 44.03, lng: 32.03 }]))
      .rejects.toThrow("boş döndü");
  });

  it("önceden iptal edilmiş sinyal AbortError verir, ağa gidilmez", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(fetchWeatherSeries([{ id: "s", lat: 45.01, lng: 33.01 }], controller.signal))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("iç zaman aşımı iptalden ayırt edilebilir hatayla döner", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce((_input: unknown, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }));
    const pending = fetchWeatherSeries([{ id: "t", lat: 46.01, lng: 34.01 }]);
    const assertion = expect(pending).rejects.toThrow("zaman aşımına uğradı");
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });
});
