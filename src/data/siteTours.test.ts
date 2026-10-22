import { describe, expect, it } from "vitest";
import {
  EPHESUS_TOUR,
  PRIENE_TOUR,
  getEntranceGate,
  getExitPoint,
  getSiteTourById,
  getSiteTours,
  isRealPath,
  siteTourForPoint,
} from "./siteTours";
import { decodePolyline } from "../utils/polyline";
import { haversineKm } from "../utils/geo";

describe("siteTours – Efes 3 saatlik tur (Adım 8)", () => {
  it("tur 3 saat sürer ve durak saatleri tanımlıdır", () => {
    expect(EPHESUS_TOUR.totalDurationHours).toBe(3);
    const stops = EPHESUS_TOUR.days[0].stops;
    expect(stops.length).toBeGreaterThanOrEqual(8);
    for (const s of stops) {
      expect(s.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(s.endTime).toMatch(/^\d{2}:\d{2}$/);
      expect(s.durationMinutes).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(2);
      expect(s.lat).toBeGreaterThan(37);
      expect(s.lng).toBeGreaterThan(27);
    }
    // ilk durak giriş, son durak çıkış
    expect(stops[0].name.toLowerCase()).toContain("giriş");
    expect(stops[stops.length - 1].name.toLowerCase()).toContain("çıkış");
  });

  it("giriş kapısı ve çıkış noktası ayrı ve tanımlı", () => {
    const entrance = getEntranceGate(EPHESUS_TOUR);
    const exit = getExitPoint(EPHESUS_TOUR);
    expect(entrance).not.toBeNull();
    expect(exit).not.toBeNull();
    expect(entrance?.lat).not.toBe(exit?.lat);
    // origin girişle eşleşmeli
    expect(EPHESUS_TOUR.origin?.lat).toBeCloseTo(entrance!.lat, 2);
  });

  it("patika geometrisi gerçek (düz çizgi değil, ara noktalı)", () => {
    expect(isRealPath(EPHESUS_TOUR)).toBe(true);
    const coords = decodePolyline(EPHESUS_TOUR.days[0].polyline);
    // durak sayısı 10, ama polyline 32 nokta içermeli -> ara nokta var
    expect(coords.length).toBeGreaterThan(EPHESUS_TOUR.days[0].stops.length + 5);
    // toplam mesafe makul (site içi ~2 km)
    expect(EPHESUS_TOUR.totalDistanceKm).toBeGreaterThan(1);
    expect(EPHESUS_TOUR.totalDistanceKm).toBeLessThan(5);
  });
});

describe("siteTours – Priene kısa yürüyüş (patika doğrulanmadı)", () => {
  it("dört durak, sıralı ve süreleri tutarlı", () => {
    const stops = PRIENE_TOUR.days[0].stops;
    expect(stops).toHaveLength(4);
    expect(stops.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    for (const stop of stops) {
      expect(stop.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(stop.durationMinutes).toBeGreaterThan(0);
      // Tüm duraklar Priene ören yeri çevresinde (≤ 2 km).
      expect(haversineKm(stop.lat, stop.lng, PRIENE_TOUR.origin!.lat, PRIENE_TOUR.origin!.lng)).toBeLessThan(2);
    }
  });

  it("patika doğrulanmadığı için isRealPath false (uydurma yol yok)", () => {
    expect(PRIENE_TOUR.days[0].polyline).toBe("");
    expect(isRealPath(PRIENE_TOUR)).toBe(false);
  });

  it("mesafe kuş uçuşu durak toplamıyla aynı mertebede", () => {
    const stops = PRIENE_TOUR.days[0].stops;
    let sum = 0;
    for (let i = 1; i < stops.length; i += 1) {
      sum += haversineKm(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
    }
    expect(PRIENE_TOUR.totalDistanceKm).toBeCloseTo(sum, 1);
  });
});

describe("siteTours – tüm turlar için ortak sözleşme", () => {
  const tours = getSiteTours();

  it("liste tekrarsız kimlik taşır ve kimlikle bulunur", () => {
    const ids = tours.map((tour) => tour.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getSiteTourById(id)?.id).toBe(id);
    expect(getSiteTourById("yok-boyle-tur")).toBeNull();
  });

  it("her tur geçerli: saatler artan, duraklar sıralı, koordinatlar girişe yakın", () => {
    for (const tour of tours) {
      const day = tour.days[0];
      expect(day.stops.length).toBeGreaterThanOrEqual(3);
      let previousEnd = -1;
      day.stops.forEach((stop, index) => {
        expect(stop.order).toBe(index + 1);
        const [hour, minute] = stop.startTime.split(":").map(Number);
        const startMinutes = hour * 60 + minute;
        expect(startMinutes).toBeGreaterThanOrEqual(previousEnd);
        previousEnd = startMinutes + stop.durationMinutes;
        expect(stop.description.length).toBeGreaterThan(20);
        expect(stop.tips.length).toBeGreaterThan(0);
        expect(stop.isCommunityPin).toBe(false);
        // Giriş noktasına makul uzaklık: site turları yaya ve kompakt.
        const km = haversineKm(stop.lat, stop.lng, tour.origin!.lat, tour.origin!.lng);
        expect(km).toBeLessThan(3);
      });
      expect(tour.transport).toBe("walking");
      expect(tour.totalDurationHours).toBeGreaterThan(0);
    }
  });

  it("tourGuide uyumu: her durak GuideCandidate alanlarını taşır", () => {
    for (const tour of tours) {
      for (const stop of tour.days[0].stops) {
        const candidate = { id: stop.pinId ?? `${tour.id}-${stop.order}`, lat: stop.lat, lng: stop.lng, order: stop.order, title: stop.name };
        expect(candidate.id.length).toBeGreaterThan(0);
        expect(Number.isFinite(candidate.lat)).toBe(true);
        expect(Number.isFinite(candidate.lng)).toBe(true);
        expect(candidate.order).toBeGreaterThan(0);
        expect(candidate.title).toBe(stop.name);
      }
    }
  });

  it("isRealPath doğru sınıflandırır: Efes gerçek, Priene doğrulanmadı", () => {
    expect(tours.filter(isRealPath).map((tour) => tour.id)).toEqual([EPHESUS_TOUR.id]);
    expect(isRealPath(PRIENE_TOUR)).toBe(false);
  });

  it("konuma göre tur seçimi: Efes ve Priene ayrı ayrı bulunur", () => {
    expect(siteTourForPoint(37.9395, 27.3417)?.id).toBe(EPHESUS_TOUR.id);
    expect(siteTourForPoint(37.6597, 27.2977)?.id).toBe(PRIENE_TOUR.id);
    expect(siteTourForPoint(39.0, 35.0)).toBeNull();
  });
});
