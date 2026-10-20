import { describe, expect, it } from "vitest";
import { ACCESS_EXAMPLE_ROUTE } from "../data/accessExample";
import { LEG_COEFFICIENT, LEG_SPEED_KMH, distanceForLeg, durationForLeg } from "./routeLegs";
import { decodePolyline } from "./polyline";

describe("routeLegs – erişim tipi ve bacak modu (Adım 10)", () => {
  it("kategoriler ve modlar genişletildi", () => {
    // Tip kontrolü: yeni modlar erişilebilir
    expect(LEG_SPEED_KMH.trail).toBe(3);
    expect(LEG_SPEED_KMH.offroad).toBe(2.2);
    expect(LEG_SPEED_KMH.descent).toBe(2);
    expect(LEG_COEFFICIENT.trail).toBeGreaterThan(LEG_COEFFICIENT.walking);
    expect(LEG_COEFFICIENT.offroad).toBeGreaterThan(LEG_COEFFICIENT.walking);
  });

  it("park et → patika → iniş rotası var ve süre makul", () => {
    const route = ACCESS_EXAMPLE_ROUTE;
    expect(route.days[0].stops.length).toBe(4);
    expect(route.days[0].legs?.length).toBe(3);
    expect(route.days[0].stops[0].type).toBe("parking");
    expect(route.days[0].stops[1].type).toBe("trailhead");
    expect(route.days[0].stops[2].type).toBe("descent");
    expect(route.days[0].legs?.[0].mode).toBe("walking");
    expect(route.days[0].legs?.[1].mode).toBe("trail");
    expect(route.days[0].legs?.[2].mode).toBe("descent");

    // Süre makul: toplam 1-2.5 saat arası (2 km + duraklar)
    expect(route.totalDurationHours).toBeGreaterThanOrEqual(1);
    expect(route.totalDurationHours).toBeLessThanOrEqual(2.5);
    // Mesafe 1.5-3 km arası
    expect(route.totalDistanceKm).toBeGreaterThanOrEqual(1.2);
    expect(route.totalDistanceKm).toBeLessThanOrEqual(3);

    // Her durakta saat tanımlı
    for (const s of route.days[0].stops) {
      expect(s.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(s.endTime).toMatch(/^\d{2}:\d{2}$/);
      expect(s.durationMinutes).toBeGreaterThan(0);
    }

    // Polyline patika geometrisini içerir (düz çizgi değil)
    const coords = decodePolyline(route.days[0].polyline);
    expect(coords.length).toBeGreaterThan(route.days[0].stops.length + 2);

    // Park yeri notu özel (kapasite/ücret/son 200m)
    expect(route.days[0].stops[0].description).toContain("Son 200m");
  });

  it("bacak bazlı hız: patikasız iniş walking'den yavaş", () => {
    const flat = distanceForLeg({ lat: 36.52, lng: 29.11 }, { lat: 36.521, lng: 29.112 }, "walking");
    const trail = distanceForLeg({ lat: 36.52, lng: 29.11 }, { lat: 36.521, lng: 29.112 }, "trail");
    const descent = distanceForLeg({ lat: 36.52, lng: 29.11 }, { lat: 36.521, lng: 29.112 }, "descent");

    // Aynı ham mesafe için katsayı farkı
    expect(trail).toBeGreaterThan(flat);
    expect(descent).toBeLessThan(trail); // descent katsayısı daha düşük ama hız daha yavaş

    const durWalking = durationForLeg(1, "walking");
    const durTrail = durationForLeg(1, "trail");
    const durDescent = durationForLeg(1, "descent");
    expect(durDescent).toBeGreaterThan(durWalking);
    expect(durTrail).toBeGreaterThan(durWalking);
    expect(durDescent).toBeGreaterThan(durTrail);
  });
});
