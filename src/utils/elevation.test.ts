import { describe, expect, it, vi } from "vitest";
import { buildElevationProfile, sampleTerrainElevation, terrariumToElevation, type TerrainSampler } from "./elevation";
import type { RouteLeg } from "../types";
import { ACCESS_EXAMPLE_ROUTE } from "../data/accessExample";

/** Sahte DEM: doğrusal rampa (0 m → 200 m), böylece tırmanış hesabı doğrulanabilir. */
function rampTerrain(): TerrainSampler {
  return {
    // Yükseklik koordinatla artar/azalır: tırmanış ve eğim hesaplanabilir olur.
    queryTerrainElevation: ([lng, lat]) => Math.round((lng - 27.3) * 200_000 + (lat - 37.9) * 50_000),
  };
}

describe("elevation – terrain raster-dem'den tırmanış (Adım 11)", () => {
  it("terrarium formülü doğru", () => {
    // r=128,g=0,b=0 => 128*256 -32768 =0
    expect(terrariumToElevation(128, 0, 0)).toBe(0);
    expect(terrariumToElevation(0, 0, 0)).toBe(-32768);
    // R=255,G=255,B=255 => 255*256+255+0.996 -32768 ≈ 32767.996
    expect(terrariumToElevation(255, 255, 255)).toBeCloseTo(32767.996, 1);
  });

  it("DEM yoksa yükseklik 'bilinmiyor' olur: sahte/sıfır çizgi üretilmez", () => {
    const profile = buildElevationProfile(ACCESS_EXAMPLE_ROUTE.days[0].legs!);
    expect(profile.reliable).toBe(false);
    expect(profile.source).toBe("unknown");
    expect(profile.samples).toHaveLength(0);
    expect(profile.totalAscentM).toBe(0);
    expect(profile.naismithMinutes).toBe(0);
    // Mesafe iddiası yine gerçek: yalnız yükseklik bilinmiyor.
    expect(profile.totalDistanceKm).toBeGreaterThan(0);
    expect(profile.unsampledPoints).toBeGreaterThan(0);
  });

  it("DEM örnekleyici hata atarsa da yanıltıcı profil üretmez", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken: TerrainSampler = {
      queryTerrainElevation: () => {
        throw new Error("terrain katmanı hazır değil");
      },
    };
    expect(sampleTerrainElevation(37.9, 27.3, broken)).toBeNull();
    const profile = buildElevationProfile(ACCESS_EXAMPLE_ROUTE.days[0].legs!, broken);
    expect(profile.reliable).toBe(false);
    expect(profile.samples).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("DEM varsa profil: örnekleme + toplam tırmanış + en dik eğim", () => {
    const legs: RouteLeg[] = ACCESS_EXAMPLE_ROUTE.days[0].legs!;
    const profile = buildElevationProfile(legs, rampTerrain());
    expect(profile.reliable).toBe(true);
    expect(profile.source).toBe("terrain");
    expect(profile.samples.length).toBeGreaterThan(legs.length * 5);
    expect(profile.unsampledPoints).toBe(0);
    expect(profile.totalDistanceKm).toBeGreaterThan(0);
    expect(profile.totalAscentM).toBeGreaterThan(0);
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
    ], rampTerrain());
    expect(profile.samples.length).toBeGreaterThan(5);
    expect(profile.reliable).toBe(true);
  });

  it("ilk örnekte eğim 0'dır (tanımsız), NaN sızmaz", () => {
    const profile = buildElevationProfile([
      { id: "t", coords: [[27.34, 37.9], [27.35, 37.91]], mode: "walking", distanceKm: 0, durationMinutes: 0 },
    ], rampTerrain());
    expect(profile.samples[0].slopePercent).toBe(0);
    expect(profile.samples.every((sample) => Number.isFinite(sample.slopePercent))).toBe(true);
  });
});
