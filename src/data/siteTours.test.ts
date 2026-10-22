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
import { encodePolyline, decodePolyline } from "../utils/polyline";
import { ADDITIONAL_SITE_TOURS, OSTIA_TOUR, POMPEII_TOUR } from "./tours/additionalTours";
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

  it("elle çizilmiş Efes çok noktalı olsa da doğrulanmış yol değildir", () => {
    expect(isRealPath(EPHESUS_TOUR)).toBe(false);
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
        if (ADDITIONAL_SITE_TOURS.includes(tour)) {
          expect(stop.startTime).toBe("");
          expect(stop.endTime).toBe("");
          expect(stop.durationMinutes).toBe(0);
        } else {
          const [hour, minute] = stop.startTime.split(":").map(Number);
          const startMinutes = hour * 60 + minute;
          expect(startMinutes).toBeGreaterThanOrEqual(previousEnd);
          previousEnd = startMinutes + stop.durationMinutes;
        }
        expect(stop.description.length).toBeGreaterThan(20);
        expect(stop.tips.length).toBeGreaterThan(0);
        expect(stop.isCommunityPin).toBe(false);
        // Giriş noktasına makul uzaklık: site turları yaya ve kompakt.
        const km = haversineKm(stop.lat, stop.lng, tour.origin!.lat, tour.origin!.lng);
        expect(km).toBeLessThan(3);
      });
      expect(tour.transport).toBe("walking");
      if (ADDITIONAL_SITE_TOURS.includes(tour)) expect(tour.totalDurationHours).toBe(0);
      else expect(tour.totalDurationHours).toBeGreaterThan(0);
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

  it("hiçbir doğrulanmamış tur gerçek yol sayılmaz", () => {
    expect(tours.filter(isRealPath).map((tour) => tour.id)).toEqual([]);
    expect(isRealPath(PRIENE_TOUR)).toBe(false);
  });

  it("konuma göre tur seçimi: Efes ve Priene ayrı ayrı bulunur", () => {
    expect(siteTourForPoint(37.9395, 27.3417)?.id).toBe(EPHESUS_TOUR.id);
    expect(siteTourForPoint(37.6597, 27.2977)?.id).toBe(PRIENE_TOUR.id);
    expect(siteTourForPoint(39.0, 35.0)).toBeNull();
  });
});


describe("Pompeii ve Ostia: kaynaklı fakat geometrisiz turlar", () => {
  it("Priene dahil dört tur korunur; yeni alanlarda konumdan seçilir", () => {
    expect(getSiteTours()).toHaveLength(4);
    for (const tour of ADDITIONAL_SITE_TOURS) {
      expect(getSiteTourById(tour.id)).toBe(tour);
      expect(siteTourForPoint(tour.origin!.lat, tour.origin!.lng)).toBe(tour);
    }
  });

  it.each([
    [POMPEII_TOUR, ["Porta Marina", "Bazilika", "Pompeii Forumu"]],
    [OSTIA_TOUR, ["Porta Romana", "Roma Tiyatrosu", "Korporasyonlar Forumu"]],
  ] as const)("%s: hat sırası, giriş ve tur bitişi sabittir", (tour, names) => {
    const stops = tour.days[0].stops;
    expect(stops).toHaveLength(3);
    stops.forEach((stop, index) => {
      expect(stop.name).toContain(names[index]);
      expect(stop.order).toBe(index + 1);
      expect(stop.description).toContain("Kaynak: https://");
    });
    expect(getEntranceGate(tour)).toBe(stops[0]);
    expect(getExitPoint(tour)).toBe(stops[2]);
    expect(stops[2].name).toContain("park çıkışı değil");
    expect(tour.origin).toEqual({ lat: stops[0].lat, lng: stops[0].lng });
  });

  it.each(ADDITIONAL_SITE_TOURS)("%s: süre, saat ve kilometre uydurulmaz", (tour) => {
    expect(tour.totalDistanceKm).toBe(0);
    expect(tour.totalDurationHours).toBe(0);
    expect(tour.days[0].polyline).toBe("");
    expect(isRealPath(tour)).toBe(false);
    expect(tour.routeSummary).toContain("Mesafe ve süre bilinmiyor");
    expect(tour.routeSummary).toContain("Giriş ücreti, açılış saati ve sezon bilgisi doğrulanmadı");
    for (const stop of tour.days[0].stops) {
      expect(stop.startTime).toBe("");
      expect(stop.endTime).toBe("");
      expect(stop.durationMinutes).toBe(0);
    }
  });

  it("çok nokta, OSM atfı, tur kimliği veya ad gerçek yol kanıtı olamaz", () => {
    const dense = encodePolyline(Array.from({ length: 500 }, (_, i): [number, number] => [14.48 + i / 100000, 40.75]));
    for (const tour of getSiteTours()) {
      expect(isRealPath({ ...tour, dataSources: ["OpenStreetMap (ODbL)"], days: [{ ...tour.days[0], polyline: dense }] })).toBe(false);
    }
    expect(isRealPath({ ...POMPEII_TOUR, days: [] })).toBe(false);
  });
});
