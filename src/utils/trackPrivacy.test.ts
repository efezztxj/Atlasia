import { describe, expect, it } from "vitest";
import type { AtlasRoute, RouteLeg, RouteStop } from "../types";
import { encodePolyline } from "./polyline";
import {
  DEFAULT_TRIM_METERS,
  MAX_TRIM_METERS,
  dayCoords,
  resolveTrackShare,
  routeLeaksRawTrack,
  trimRouteEnds,
} from "./trackPrivacy";

const ORIGIN = { lat: 38.4, lng: 27.1 };
const M_PER_DEG_LAT = 111_320;

/** Batı→doğu 1 km düz çizgi, 100 m'de bir nokta (11 nokta). */
function lineCoords(lengthM = 1_000, stepM = 100): [number, number][] {
  const coords: [number, number][] = [];
  for (let east = 0; east <= lengthM; east += stepM) {
    coords.push([ORIGIN.lng + east / (M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180)), ORIGIN.lat]);
  }
  return coords;
}

const stop = (order: number, eastM: number): RouteStop => ({
  order,
  name: `Durak ${order}`,
  type: "other",
  lat: ORIGIN.lat,
  lng: ORIGIN.lng + eastM / (M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180)),
  startTime: "09:00",
  endTime: "09:05",
  durationMinutes: 5,
  description: "",
  aiReason: "",
  tips: [],
  isCommunityPin: false,
  pinId: null,
  category: "Kayıtlı iz",
  imageUrl: null,
});

function route(stops: RouteStop[] = []): AtlasRoute {
  const coords = lineCoords();
  const leg: RouteLeg = { id: "leg-1", coords, mode: "walking", distanceKm: 1, durationMinutes: 12 };
  return {
    id: "route-abc",
    routeTitle: "Kayıtlı yürüyüş",
    routeSummary: "Özet",
    totalDurationHours: 0.2,
    totalDistanceKm: 1,
    transport: "walking",
    vibe: "Yürüyüş kaydı",
    days: [
      {
        dayNumber: 1,
        title: "Yürüyüş",
        summary: "Duraklar",
        stops,
        polyline: encodePolyline(coords),
        legs: [leg],
      },
    ],
    weatherNote: null,
    alternatives: [],
    createdAt: 1,
    origin: { lat: ORIGIN.lat, lng: ORIGIN.lng },
  };
}

describe("trackPrivacy · ham iz paylaşılmaz", () => {
  it("varsayılan kırpma 0 m'dir: geometri sessizce değişmez", () => {
    expect(DEFAULT_TRIM_METERS).toBe(0);
    const decision = resolveTrackShare(route(), { userInitiated: true, visibility: "private" });
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.trimmedStartM).toBe(0);
    expect(decision.trimmedEndM).toBe(0);
    expect(dayCoords(decision.route.days[0])).toHaveLength(11);
  });

  it("kullanıcı açık eylemi olmadan paylaşım kararı vermez", () => {
    const decision = resolveTrackShare(route(), { userInitiated: false, visibility: "private" });
    expect(decision).toEqual({
      ok: false,
      reason: "Ham iz yalnız senin açık kaydetme eyleminle paylaşılabilir.",
    });
  });

  it("herkese açık/bağlantılı yayın ayrı onay ister", () => {
    for (const visibility of ["public", "unlisted"] as const) {
      expect(resolveTrackShare(route(), { userInitiated: true, visibility })).toMatchObject({
        ok: false,
        reason: expect.stringContaining("ayrı bir onay"),
      });
      expect(resolveTrackShare(route(), { userInitiated: true, visibility, shareConsent: true }).ok).toBe(true);
    }
  });

  it("karar nesnesi ham iz taşımaz: yalnız paylaşılabilir rota döner", () => {
    const decision = resolveTrackShare(route(), { userInitiated: true, visibility: "private" });
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(Object.keys(decision)).not.toContain("track");
    expect(routeLeaksRawTrack(decision.route)).toEqual([]);
  });

  it("ham iz alanları taşıyan nesneyi yayına sokmaz", () => {
    const kirlenmis = {
      ...route(),
      // Bir ajanın yanlışlıkla iz alanlarını rotaya kopyaladığı durum.
      accuracy: { sampleCount: 3, meanMeters: 5, maxMeters: 9 },
      stops: [{ pointCount: 4 }],
    };
    const decision = resolveTrackShare(kirlenmis as unknown as AtlasRoute, {
      userInitiated: true,
      visibility: "public",
      shareConsent: true,
    });
    expect(decision.ok).toBe(false);
    if (decision.ok) return;
    expect(decision.reason).toContain("ham iz alanları");
    expect(decision.reason).toContain("accuracy");
  });

  it("routeLeaksRawTrack iç içe geçmiş ham iz alanlarını yoluyla bildirir", () => {
    expect(routeLeaksRawTrack(route())).toEqual([]);
    expect(routeLeaksRawTrack({ days: [{ stops: [{ pointCount: 2 }] }] })).toEqual(["days[0].stops[0].pointCount"]);
    expect(routeLeaksRawTrack({ authorUid: "u1", accuracy: {} })).toEqual(["authorUid", "accuracy"]);
    expect(routeLeaksRawTrack(null)).toEqual([]);
    expect(routeLeaksRawTrack("metin")).toEqual([]);
  });
});

describe("trackPrivacy · uç kırpma", () => {
  it("baştan ve sondan N metre kırpar, ara geometriyi ve mesafeyi günceller", () => {
    const trimmed = trimRouteEnds(route(), 250);
    expect(trimmed.trimmedStartM).toBeGreaterThanOrEqual(200);
    expect(trimmed.trimmedStartM).toBeLessThanOrEqual(300);
    expect(trimmed.trimmedEndM).toBeGreaterThanOrEqual(200);
    const coords = dayCoords(trimmed.route.days[0]);
    expect(coords.length).toBeLessThan(11);
    // Yeni başlangıç artık ev noktası değil: 200 m'den fazla doğuda.
    const firstEastM = (coords[0][0] - ORIGIN.lng) * M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180);
    expect(firstEastM).toBeGreaterThanOrEqual(200);
    expect(trimmed.route.totalDistanceKm).toBeLessThan(1);
    expect(trimmed.route.origin).toEqual({ lat: coords[0][1], lng: coords[0][0] });
  });

  it("kırpılan bölgede kalan durakları düşürür ve sıralamayı yeniden numaralar", () => {
    const trimmed = trimRouteEnds(route([stop(1, 0), stop(2, 500), stop(3, 1_000)]), 250);
    const stops = trimmed.route.days[0].stops;
    expect(stops.map((item) => item.name)).toEqual(["Durak 2"]);
    expect(stops[0].order).toBe(1);
    expect(trimmed.droppedStops).toBe(2);
  });

  it("bacaksız rotada polyline üzerinden kırpar", () => {
    const coords = lineCoords();
    const bacaksiz: AtlasRoute = {
      ...route(),
      days: [{ ...route().days[0], legs: undefined, stops: [], polyline: encodePolyline(coords) }],
    };
    const trimmed = trimRouteEnds(bacaksiz, 300);
    expect(trimmed.trimmedStartM).toBeGreaterThanOrEqual(300);
    const kept = dayCoords(trimmed.route.days[0]);
    expect(kept.length).toBeLessThan(coords.length);
    expect(kept.length).toBeGreaterThanOrEqual(2);
  });

  it("kısa rotada en az iki nokta korunur; sınır üstü istek kırpılır", () => {
    const kisa = trimRouteEnds(route(), 50_000);
    expect(dayCoords(kisa.route.days[0]).length).toBeGreaterThanOrEqual(2);
    const decision = resolveTrackShare(route(), {
      userInitiated: true,
      visibility: "private",
      trimEndsMeters: MAX_TRIM_METERS + 5_000,
    });
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.warnings[0]).toContain(`en fazla ${MAX_TRIM_METERS} m`);
  });

  it("geçersiz kırpma isteğini reddeder; 0 m girdiyi aynen döndürür", () => {
    expect(resolveTrackShare(route(), { userInitiated: true, visibility: "private", trimEndsMeters: -1 })).toEqual({
      ok: false,
      reason: "Kırpma mesafesi geçersiz.",
    });
    const ayni = route();
    expect(trimRouteEnds(ayni, 0).route).toBe(ayni);
  });
});
