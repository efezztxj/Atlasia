import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearWindCache,
  directionToVector,
  fetchWindField,
  HOURLY_HOURS,
  kmh,
  maxPrecipitation,
  precipitationAt,
  sampleWind,
  vectorToDirection,
  windRequestUrl,
  type WindField,
} from "./windField";

afterEach(() => { clearWindCache(); });

const bounds = { west: 26, south: 38, east: 28, north: 39 };

function response(points: Array<{ speed: number; direction: number }>): Response {
  return new Response(JSON.stringify(points.map((p) => ({ current: { wind_speed_10m: p.speed, wind_direction_10m: p.direction } }))), { status: 200 });
}

describe("rüzgâr vektörü", () => {
  it("meteorolojik yön (geldiği yön) akış vektörüne çevrilir", () => {
    // Doğudan esen rüzgâr batıya akar.
    const east = directionToVector(10, 90);
    expect(east.u).toBeCloseTo(-10, 6);
    expect(east.v).toBeCloseTo(0, 6);
    // Kuzeyden esen rüzgâr güneye akar.
    const north = directionToVector(10, 0);
    expect(north.v).toBeCloseTo(-10, 6);
    expect(kmh(10)).toBeCloseTo(36, 6);
  });

  it("vektörden yön geri hesaplanır", () => {
    const sample = directionToVector(7, 135);
    expect(vectorToDirection(sample.u, sample.v)).toBeCloseTo(135, 4);
  });
});

describe("istek URL'i", () => {
  it("çoklu konum, m/s birimi ve sarılmış boylam kullanır", () => {
    const url = new URL(windRequestUrl([{ lat: 38.5, lng: 190 }, { lat: 39, lng: 27 }]));
    expect(url.searchParams.get("current"))
      .toBe("wind_speed_10m,wind_direction_10m,precipitation,temperature_2m,weather_code");
    expect(url.searchParams.get("hourly")).toBe("precipitation");
    expect(url.searchParams.get("forecast_hours")).toBe("13");
    expect(url.searchParams.get("wind_speed_unit")).toBe("ms");
    expect(url.searchParams.get("longitude")).toBe("-170.000,27.000");
  });
});

describe("fetchWindField", () => {
  it("ızgara noktalarını vektörlerle döndürür", async () => {
    const fetcher = vi.fn(async () => response(Array.from({ length: 24 }, () => ({ speed: 5, direction: 270 }))));
    const field = await fetchWindField(bounds, fetcher, 1_000);
    expect(field?.points).toHaveLength(24);
    expect(field?.points[0].speed).toBeCloseTo(5, 6);
    expect(field?.points[0].u).toBeCloseTo(5, 6); // batıdan esen rüzgâr doğuya akar
  });

  it("aynı ızgarayı önbellekten verir, eşzamanlı isteği tekilleştirir", async () => {
    const fetcher = vi.fn(async () => response(Array.from({ length: 24 }, () => ({ speed: 3, direction: 0 }))));
    const [a, b] = await Promise.all([fetchWindField(bounds, fetcher, 1_000), fetchWindField(bounds, fetcher, 1_000)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    await fetchWindField(bounds, fetcher, 1_000 + 9 * 60_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await fetchWindField(bounds, fetcher, 1_000 + 10 * 60_000 + 1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("eksik/bozuk yanıtta null döner (uydurma vektör yok)", async () => {
    const empty = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    expect(await fetchWindField(bounds, empty, 5)).toBeNull();
    const broken = vi.fn(async () => new Response(JSON.stringify([{ current: { wind_speed_10m: null } }]), { status: 200 }));
    expect(await fetchWindField(bounds, broken, 5)).toBeNull();
  });

  it("HTTP hatasını fırlatır; katman bunu 'error' olarak sunar", async () => {
    await expect(fetchWindField(bounds, async () => new Response("", { status: 503 }), 5))
      .rejects.toThrow("Open-Meteo yanıtı: 503");
  });
});

describe("yağış ve sıcaklık alanları", () => {
  const payload = [
    {
      current: { wind_speed_10m: 4, wind_direction_10m: 180, precipitation: 0.6, temperature_2m: 21.5, weather_code: 61 },
      hourly: { precipitation: [0.6, 1.2, 4.8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    },
  ];

  it("anlık yağış, sıcaklık ve hava kodu ayrıştırılır", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    const field = await fetchWindField(bounds, fetcher, 1);
    const point = field?.points[0];
    expect(point?.precipitation).toBeCloseTo(0.6, 6);
    expect(point?.temperature).toBeCloseTo(21.5, 6);
    expect(point?.weatherCode).toBe(61);
    expect(point?.hourly).toHaveLength(HOURLY_HOURS);
  });

  it("saatlik dilim seçilir, aralık dışı sınırlanır", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    const point = (await fetchWindField(bounds, fetcher, 1))!.points[0];
    expect(precipitationAt(point, 0)).toBeCloseTo(0.6, 6);
    expect(precipitationAt(point, 2)).toBeCloseTo(4.8, 6);
    // Aralık dışı: en yakın uca kırpılır, taşmaz.
    expect(precipitationAt(point, 99)).toBe(0);
    expect(precipitationAt(point, -5)).toBeCloseTo(0.6, 6);
  });

  it("saatlik veri yoksa anlık yağışa düşer", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify([
      { current: { wind_speed_10m: 2, wind_direction_10m: 0, precipitation: 1.5 } },
    ]), { status: 200 }));
    const field = await fetchWindField(bounds, fetcher, 1);
    const point = field!.points[0];
    expect(point.hourly).toEqual([]);
    expect(precipitationAt(point, 5)).toBeCloseTo(1.5, 6);
    expect(point.temperature).toBeNull();
    expect(maxPrecipitation(field!, 0)).toBeCloseTo(1.5, 6);
  });

  it("yağış alanı gelmezse 0 sayılır, sıcaklık null kalır (uydurma yok)", async () => {
    const fetcher = vi.fn(async () => response(Array.from({ length: 24 }, () => ({ speed: 3, direction: 90 }))));
    const field = await fetchWindField(bounds, fetcher, 1);
    expect(field?.points[0].precipitation).toBe(0);
    expect(field?.points[0].temperature).toBeNull();
    expect(maxPrecipitation(field!, 0)).toBe(0);
  });
});

describe("sampleWind", () => {
  const field: WindField = {
    bounds,
    rows: 1,
    columns: 2,
    at: 0,
    points: [
      { lat: 38, lng: 26, u: 10, v: 0, speed: 10, precipitation: 0, temperature: 18, weatherCode: 1, hourly: [] },
      { lat: 38, lng: 28, u: 0, v: 10, speed: 10, precipitation: 2.4, temperature: 12, weatherCode: 61, hourly: [2.4] },
    ],
  };

  it("noktalar arasında ağırlıklı ortalama verir", () => {
    const mid = sampleWind(field, 38, 27);
    expect(mid?.u).toBeCloseTo(5, 1);
    expect(mid?.v).toBeCloseTo(5, 1);
  });

  it("bir noktaya yaklaştıkça o noktanın vektörüne yakınsar", () => {
    const near = sampleWind(field, 38, 26.05);
    expect(near?.u).toBeGreaterThan(8);
  });

  it("boş alanda null döner", () => {
    expect(sampleWind({ ...field, points: [] }, 38, 27)).toBeNull();
  });
});
