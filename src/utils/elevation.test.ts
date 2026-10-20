import { describe, expect, it } from "vitest";
import { buildElevationProfile, syntheticElevation, terrariumToElevation } from "./elevation";
import type { RouteLeg } from "../types";
import { ACCESS_EXAMPLE_ROUTE } from "../data/accessExample";

describe("elevation – terrain raster-dem'den tırmanış (Adım 11)", () => {
  it("terrarium formülü doğru", () => {
    // r=128,g=0,b=0 => 128*256 -32768 =0
    expect(terrariumToElevation(128, 0, 0)).toBe(0);
    expect(terrariumToElevation(0, 0, 0)).toBe(-32768);
    // R=255,G=255,B=255 => 255*256+255+0.996 -32768 ≈ 32767.996
    expect(terrariumToElevation(255, 255, 255)).toBeCloseTo(32767.996, 1);
  });

  it("syntheticElevation deterministik ve GeoFix yok sayılır", () => {
    const a = syntheticElevation(37.9395, 27.3417);
    const b = syntheticElevation(37.9395, 27.3417);
    expect(a).toBe(b);
    expect(Number.isFinite(a)).toBe(true);
    // Efes çevresi 0-250 arası makul
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(300);
  });

  it("profil grafiği için örnekleme + toplam tırmanış + en dik eğim üretir", () => {
    const legs: RouteLeg[] = ACCESS_EXAMPLE_ROUTE.days[0].legs!;
    const profile = buildElevationProfile(legs);
    expect(profile.samples.length).toBeGreaterThan(legs.length * 5);
    expect(profile.totalDistanceKm).toBeGreaterThan(0);
    expect(profile.totalAscentM).toBeGreaterThanOrEqual(0);
    expect(profile.maxSlopePercent).toBeGreaterThanOrEqual(0);
    expect(profile.naismithMinutes).toBeGreaterThan(0);
    // Her örnek bacak modunu korur -> mod ayrımı görünüyor
    const modes = new Set(profile.samples.map((s) => s.mode));
    expect(modes.size).toBe(3); // walking, trail, descent
    expect(modes.has("walking")).toBe(true);
    expect(modes.has("trail")).toBe(true);
    expect(modes.has("descent")).toBe(true);
  });

  it("tek polyline için de profil üretir (Efes turu patika)", () => {
    const coords: [number, number][] = [
      [27.3435, 37.9365],
      [27.344, 37.937],
      [27.3425, 37.938],
      [27.3417, 37.9395],
    ];
    const profile = buildElevationProfile([
      { id: "t", coords, mode: "walking", distanceKm: 0, durationMinutes: 0 },
    ]);
    expect(profile.samples.length).toBeGreaterThan(5);
  });
});
