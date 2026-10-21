import type { LegMode, RouteLeg } from "../types";
import { haversineKm } from "./geo";

/**
 * Adım 11 — Yükseklik profili + bacak bazlı çizim
 * GeoFix'te elevation YOK → tırmanış terrain raster-dem'den (AWS Terrain Tiles terrarium)
 * MapLibre terrain source: s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
 *
 * P17 politika değişikliği: DEM örneklenemiyorsa profil **"bilinmiyor"** olur.
 * Önceki sürüm `syntheticElevation()` ile deterministik ama **sahte** bir eğri
 * üretiyordu; bu, kullanıcıya gerçek bir tırmanış varmış gibi gösterildiği için
 * yanıltıcıydı (P17 kabul maddesi: "sıfır düz çizgi YOK"). Artık:
 * - `source: "terrain"` → tüm örnekler gerçek DEM'den, `reliable: true`
 * - `source: "unknown"` → DEM yok/eksik, `samples: []`, tırmanış iddiası yok
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

/** MapLibre `queryTerrainElevation` benzeri dar arayüz (testte sahte map verilebilir). */
export interface TerrainSampler {
  queryTerrainElevation?: (lngLat: [number, number]) => number | null;
}

/**
 * Tek noktanın DEM yüksekliği. DEM yoksa `null` döner — **sentetik yedek yok**.
 * Sessizce uydurulmuş bir sayı, "bilinmiyor" bilgisinden daha zararlıdır.
 */
export function sampleTerrainElevation(
  lat: number,
  lng: number,
  map?: TerrainSampler | null,
): number | null {
  if (!map || typeof map.queryTerrainElevation !== "function") return null;
  try {
    const value = map.queryTerrainElevation([lng, lat]);
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
    return null;
  } catch (error) {
    // DEM katmanı hazır değilse MapLibre hata atabilir; bu "bilinmiyor" demektir.
    console.warn("[Atlasia] Yükseklik örneklenemedi:", error);
    return null;
  }
}

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Bir bacağın segmentlerini eşit parçalara bölerek örnek noktaları üretir. */
export function legSamplePoints(
  coords: [number, number][],
  stepsPerSegment = 5,
): Array<{ lng: number; lat: number; distanceKm: number }> {
  const points: Array<{ lng: number; lat: number; distanceKm: number }> = [];
  let dist = 0;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const [lngA, latA] = coords[i];
    const [lngB, latB] = coords[i + 1];
    const segKm = haversineKm(latA, lngA, latB, lngB);
    for (let s = 0; s < stepsPerSegment; s += 1) {
      const t = (s + 0.5) / stepsPerSegment;
      const [lng, lat] = interpolate([lngA, latA], [lngB, latB], t);
      dist += segKm / stepsPerSegment;
      points.push({ lng, lat, distanceKm: dist });
    }
  }
  return points;
}

function sampleAlongCoords(
  coords: [number, number][],
  mode: LegMode,
  startDistKm: number,
  map: TerrainSampler | null | undefined,
  out: ElevationSample[],
  missing: { count: number },
): number {
  // Her segmenti 5 parçaya bölerek örnekle (daha sık örnekleme).
  let dist = startDistKm;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const [lngA, latA] = coords[i];
    const [lngB, latB] = coords[i + 1];
    const steps = 5;
    const segKm = haversineKm(latA, lngA, latB, lngB) / steps;
    for (let s = 0; s < steps; s += 1) {
      const t = (s + 0.5) / steps;
      const [lng, lat] = interpolate([lngA, latA], [lngB, latB], t);
      dist += segKm;
      const elevation = sampleTerrainElevation(lat, lng, map);
      if (elevation === null) {
        missing.count += 1;
        continue;
      }
      const previous = out.length > 0 ? out[out.length - 1] : null;
      // Önceki örnek yoksa (ilk nokta) eğim tanımsızdır → 0.
      const deltaElev = previous ? elevation - previous.elevationM : 0;
      const deltaDistM = previous ? (dist - previous.distanceKm) * 1000 : 0;
      const slope = deltaDistM > 0 ? (deltaElev / deltaDistM) * 100 : 0;
      out.push({ lng, lat, distanceKm: dist, elevationM: elevation, slopePercent: slope, mode });
    }
  }
  return dist;
}

export type ElevationSource = "terrain" | "unknown";

export interface ElevationProfileData {
  samples: ElevationSample[];
  /** Yalnız `reliable` ise anlamlıdır; aksi hâlde 0 ve UI "bilinmiyor" demeli. */
  totalAscentM: number;
  maxSlopePercent: number;
  totalDistanceKm: number;
  naismithMinutes: number;
  source: ElevationSource;
  /** Tüm örnekler gerçek DEM'den mi geldi? */
  reliable: boolean;
  /** DEM örneklenemeyen nokta sayısı (teşhis). */
  unsampledPoints: number;
}

export function buildElevationProfile(
  legs: RouteLeg[],
  map?: unknown,
): ElevationProfileData {
  const terrain = (map ?? null) as TerrainSampler | null;
  const samples: ElevationSample[] = [];
  const missing = { count: 0 };
  let dist = 0;
  let totalAscent = 0;
  let maxSlope = 0;
  // DEM yoksa bile mesafe gerçektir: uzunluk yalnız geometriden ölçülür.
  const geometryDistance = legs.reduce((total, leg) => {
    let legKm = 0;
    for (let i = 1; i < leg.coords.length; i += 1) {
      const [lngA, latA] = leg.coords[i - 1];
      const [lngB, latB] = leg.coords[i];
      legKm += haversineKm(latA, lngA, latB, lngB);
    }
    return total + legKm;
  }, 0);

  for (const leg of legs) {
    const startIdx = samples.length;
    dist = sampleAlongCoords(leg.coords, leg.mode, dist, terrain, samples, missing);
    // Ascent hesap: bu bacak içindeki pozitif tırmanışlar
    for (let i = startIdx + 1; i < samples.length; i++) {
      const delta = samples[i].elevationM - samples[i - 1].elevationM;
      if (delta > 0) totalAscent += delta;
      const absSlope = Math.abs(samples[i].slopePercent);
      if (absSlope > maxSlope) maxSlope = absSlope;
    }
  }

  const reliable = samples.length > 1 && missing.count === 0;
  const safeDistanceKm = samples.length > 0 ? dist : geometryDistance;
  const flatMinutes = (safeDistanceKm / 5) * 60;
  const climbMinutes = (totalAscent / 600) * 60;
  const naismithMinutes = reliable ? Math.round(flatMinutes + climbMinutes) : 0;

  return {
    samples: reliable ? samples : [],
    totalAscentM: reliable ? Math.round(totalAscent) : 0,
    maxSlopePercent: reliable ? Math.round(maxSlope * 10) / 10 : 0,
    totalDistanceKm: Math.round(safeDistanceKm * 10) / 10,
    naismithMinutes,
    source: reliable ? "terrain" : "unknown",
    reliable,
    unsampledPoints: missing.count,
  };
}

/** Tek polyline için (bacak yoksa) profil üret; DEM yoksa "bilinmiyor" döner. */
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
