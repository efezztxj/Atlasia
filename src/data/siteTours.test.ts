import { describe, expect, it } from "vitest";
import { EPHESUS_TOUR, getEntranceGate, getExitPoint, isRealPath } from "./siteTours";
import { decodePolyline } from "../utils/polyline";

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

  it("sıra editör tarafından yazıldı, planRoute ile üretilmedi", () => {
    // aiReason editör notu içermeli, bölge motoru metni içermemeli
    for (const s of EPHESUS_TOUR.days[0].stops) {
      expect(s.aiReason).toContain("Editör");
      expect(s.aiReason).not.toContain("Önceki duraktan tahmini");
      expect(s.aiReason).not.toContain("başlangıca yakın bir Atlasia");
    }
  });

  it("dataSources atıf içerir", () => {
    expect(EPHESUS_TOUR.dataSources?.join(" ")).toContain("OpenStreetMap");
    expect(EPHESUS_TOUR.dataSources?.join(" ")).toContain("Wikipedia");
  });
});
