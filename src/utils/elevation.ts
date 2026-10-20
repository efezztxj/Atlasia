import type { LegMode, RouteLeg } from "../types";
import { haversineKm } from "./geo";

/**
 * Adım 11 — Yükseklik profili + bacak bazlı çizim
 * GeoFix'te elevation YOK → tırmanış terrain raster-dem'den (AWS Terrain Tiles terrarium)
 * MapLibre terrain source: s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
 */

export interface ElevationSample {
  lng: number;
  lat: number;
  distanceKm: number;
  elevationM: number;
  slopePercent: number;
  mode: LegMode;
}

/** Terrarium encoding: elevation = (R*256 + G + B/256) - 32768 */
export function terrariumToElevation(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

/**
 * Çevrimdışı/ test için deterministik sentetik yükseklik.
 * Gerçekte MapLibre queryTerrainElevation kullanılacak; testte bu fallback çalışır.
 */
export function syntheticElevation(lat: number, lng: number): number {
  // Efes ve Likya bölgesi için 0-250m arası plausibly
  // Deterministic: aynı koordinat → aynı yükseklik
  const a = Math.sin(lat * 12.3) * Math.cos(lng * 8.7) * 40;
  const b = Math.sin(lng * 5) * 20 + Math.cos(lat * 6) * 15;
  const c = ((lat * 1000) % 1) * 10;
  return Math.round(80 + a + b + c);
}

/**
 * MapLibre terrain'den yükseklik sorgula, yoksa sentetik.
 * map parametresi MapView'dan gelen Map instance; yoksa sentetik döndürür.
 */
export function getElevationForPoint(
  lat: number,
  lng: number,
  map?: { queryTerrainElevation?: (lngLat: [number, number]) => number | null },
): number {
  if (map && typeof map.queryTerrainElevation === "function") {
    try {
      const v = map.queryTerrainElevation([lng, lat]);
      if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    } catch (error) {
      void error;
    }
  }
  return syntheticElevation(lat, lng);
}

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function sampleAlongCoords(
  coords: [number, number][],
  mode: LegMode,
  startDistKm: number,
  map: unknown,
  out: ElevationSample[],
): number {
  // Her segmenti 5 parçaya bölerek örnekle (daha sık örnekleme)
  let dist = startDistKm;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lngA, latA] = coords[i];
    const [lngB, latB] = coords[i + 1];
    const segSteps = 5;
    for (let s = 0; s < segSteps; s++) {
      const t0 = s / segSteps;
      const t1 = (s + 1) / segSteps;
      const midT = (t0 + t1) / 2;
      const [lng, lat] = interpolate([lngA, latA], [lngB, latB], midT);
      const segDist = haversineKm(latA, lngA, latB, lngB) / segSteps;
      dist += segDist;
      const elev = getElevationForPoint(lat, lng, map as never);
      const prevElev = out.length ? out[out.length - 1].elevationM : elev;
      const prevDist = out.length ? out[out.length - 1].distanceKm : dist - segDist;
      const deltaElev = elev - prevElev;
      const deltaDistM = (dist - prevDist) * 1000;
      const slope = deltaDistM > 0 ? (deltaElev / deltaDistM) * 100 : 0;
      out.push({ lng, lat, distanceKm: dist, elevationM: elev, slopePercent: slope, mode });
    }
  }
  return dist;
}

export interface ElevationProfileData {
  samples: ElevationSample[];
  totalAscentM: number;
  maxSlopePercent: number;
  totalDistanceKm: number;
  naismithMinutes: number;
}

export function buildElevationProfile(
  legs: RouteLeg[],
  map?: unknown,
): ElevationProfileData {
  const samples: ElevationSample[] = [];
  let dist = 0;
  let totalAscent = 0;
  let maxSlope = 0;

  for (const leg of legs) {
    const startIdx = samples.length;
    dist = sampleAlongCoords(leg.coords, leg.mode, dist, map, samples);
    // Ascent hesap: bu bacak içindeki pozitif tırmanışlar
    for (let i = startIdx + 1; i < samples.length; i++) {
      const delta = samples[i].elevationM - samples[i - 1].elevationM;
      if (delta > 0) totalAscent += delta;
      const absSlope = Math.abs(samples[i].slopePercent);
      if (absSlope > maxSlope) maxSlope = absSlope;
    }
  }

  // Naismith: 5 km/h düz + 600m tırmanış başına 1 saat
  const flatMinutes = (dist / 5) * 60;
  const climbMinutes = (totalAscent / 600) * 60;
  const naismithMinutes = Math.round(flatMinutes + climbMinutes);

  return {
    samples,
    totalAscentM: Math.round(totalAscent),
    maxSlopePercent: Math.round(maxSlope * 10) / 10,
    totalDistanceKm: Math.round(dist * 10) / 10,
    naismithMinutes,
  };
}

/** Tek polyline için (bacak yoksa) sentetik leg oluştur ve profil üret */
export function buildProfileForPolyline(
  coords: [number, number][],
  mode: LegMode = "walking",
  map?: unknown,
): ElevationProfileData {
  const pseudoLeg: RouteLeg = {
    id: "polyline-leg",
    coords,
    mode,
    distanceKm: 0,
    durationMinutes: 0,
  };
  return buildElevationProfile([pseudoLeg], map);
}
