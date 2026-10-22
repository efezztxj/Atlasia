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
 *
 * İki örnekleme yolu vardır, ikisi de aynı saf çekirdeğe (`assembleProfile`) beslenir:
 * 1. Harita (senkron): MapLibre `queryTerrainElevation` — canlı harita gerekir.
 * 2. Karo (async, Tur 4): terrarium PNG karoları doğrudan çekilir ve çözülür —
 *    haritanın olmadığı yüzeylerde (rota düzenleyici) de çalışır. Karo
 *    çekilemez/çözülemezse o noktalar "örneklenemedi" sayılır; profil
 *    uydurulmaz, "bilinmiyor" olur.
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

/** Profil çekirdeğinin örnek noktası: konum + kümülatif mesafe + bacak kimliği. */
export interface ProfilePoint {
  lng: number;
  lat: number;
  distanceKm: number;
  mode: LegMode;
  legIndex: number;
}

const STEPS_PER_SEGMENT = 5;

/**
 * Bacaklardan örnek noktalarını üretir (segment başına 5). Mesafe bacaklar
 * arasında kümülatif ilerler; geometri uzunluğu ayrıca ölçülür (DEM yoksa
 * bile mesafe gerçektir).
 */
export function collectProfilePoints(legs: RouteLeg[]): {
  points: ProfilePoint[];
  geometryDistanceKm: number;
} {
  const points: ProfilePoint[] = [];
  let dist = 0;
  let geometryDistanceKm = 0;
  legs.forEach((leg, legIndex) => {
    for (let i = 0; i < leg.coords.length - 1; i += 1) {
      const [lngA, latA] = leg.coords[i];
      const [lngB, latB] = leg.coords[i + 1];
      const segKm = haversineKm(latA, lngA, latB, lngB);
      geometryDistanceKm += segKm;
      for (let s = 0; s < STEPS_PER_SEGMENT; s += 1) {
        const t = (s + 0.5) / STEPS_PER_SEGMENT;
        const [lng, lat] = interpolate([lngA, latA], [lngB, latB], t);
        dist += segKm / STEPS_PER_SEGMENT;
        points.push({ lng, lat, distanceKm: dist, mode: leg.mode, legIndex });
      }
    }
  });
  return { points, geometryDistanceKm };
}

/**
 * Noktalar + yükseklikler (örneklenemeyen `null`) → profil. Kurallar eski
 * senkron akışla birebir: eğim bir önceki **tutulan** örneğe göre, tırmanış
 * ve en dik eğim yalnız aynı bacak içinde sayılır; tek bir nokta bile
 * eksikse profil güvenilmezdir ve örnek listesi boş döner.
 */
export function assembleProfile(
  points: readonly ProfilePoint[],
  elevations: readonly (number | null)[],
  geometryDistanceKm: number,
): ElevationProfileData {
  const samples: ElevationSample[] = [];
  const sampleLegs: number[] = [];
  let missing = 0;
  let totalAscent = 0;
  let maxSlope = 0;

  points.forEach((point, index) => {
    const elevation = elevations[index] ?? null;
    if (elevation === null || !Number.isFinite(elevation)) {
      missing += 1;
      return;
    }
    const previous = samples.length > 0 ? samples[samples.length - 1] : null;
    const sameLeg = previous !== null && sampleLegs[sampleLegs.length - 1] === point.legIndex;
    const deltaElev = previous ? elevation - previous.elevationM : 0;
    const deltaDistM = previous ? (point.distanceKm - previous.distanceKm) * 1000 : 0;
    const slope = deltaDistM > 0 ? (deltaElev / deltaDistM) * 100 : 0;
    if (sameLeg && previous) {
      if (deltaElev > 0) totalAscent += deltaElev;
      if (Math.abs(slope) > maxSlope) maxSlope = Math.abs(slope);
    }
    samples.push({
      lng: point.lng,
      lat: point.lat,
      distanceKm: point.distanceKm,
      elevationM: elevation,
      slopePercent: slope,
      mode: point.mode,
    });
    sampleLegs.push(point.legIndex);
  });

  const reliable = samples.length > 1 && missing === 0;
  const safeDistanceKm = geometryDistanceKm;
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
    unsampledPoints: missing,
  };
}

export function buildElevationProfile(
  legs: RouteLeg[],
  map?: unknown,
): ElevationProfileData {
  const terrain = (map ?? null) as TerrainSampler | null;
  const { points, geometryDistanceKm } = collectProfilePoints(legs);
  const elevations = points.map((point) => sampleTerrainElevation(point.lat, point.lng, terrain));
  return assembleProfile(points, elevations, geometryDistanceKm);
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

/* ------------------------------------------------------------------ */
/* Karo (tile) tabanlı örnekleme — haritasız yüzeyler için (Tur 4)     */
/* ------------------------------------------------------------------ */

export const ELEVATION_TILE_ZOOM = 12;
/** Uzun rotalarda istek patlamasını önler; aşan karolar örneklenemez → bilinmiyor. */
export const ELEVATION_MAX_TILES = 32;
const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;
/** Terrarium "veri yok" pikselleri (0,0,0 → -32768) ve saçmalığı elemek için aralık. */
const MIN_SANE_ELEVATION_M = -500;
const MAX_SANE_ELEVATION_M = 9000;

export function elevationTileUrl(z: number, x: number, y: number): string {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
}

/** Boylam/enlem → slippy-map karo + karo içi piksel (0–255). Saf fonksiyon. */
export function lngLatToTilePixel(
  lng: number,
  lat: number,
  zoom: number,
): { tileX: number; tileY: number; pixelX: number; pixelY: number } {
  const scale = 2 ** zoom;
  const clampedLat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const xFloat = ((lng + 180) / 360) * scale;
  const yFloat = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  const tileX = Math.min(scale - 1, Math.max(0, Math.floor(xFloat)));
  const tileY = Math.min(scale - 1, Math.max(0, Math.floor(yFloat)));
  const pixelX = Math.min(TILE_SIZE - 1, Math.max(0, Math.floor((xFloat - tileX) * TILE_SIZE)));
  const pixelY = Math.min(TILE_SIZE - 1, Math.max(0, Math.floor((yFloat - tileY) * TILE_SIZE)));
  return { tileX, tileY, pixelX, pixelY };
}

export interface TileElevationOptions {
  signal?: AbortSignal;
  zoom?: number;
  /** Test enjeksiyonu: karo PNG'sini çeker. Varsayılan `fetch` + `blob()`. */
  fetchTile?: (url: string, signal?: AbortSignal) => Promise<Blob>;
  /** Test enjeksiyonu: PNG → RGBA piksel verisi (256×256). Varsayılan canvas. */
  decodeTile?: (blob: Blob) => Promise<Uint8ClampedArray>;
}

async function defaultFetchTile(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Yükseklik karosu alınamadı (HTTP ${response.status}).`);
  return response.blob();
}

async function defaultDecodeTile(blob: Blob): Promise<Uint8ClampedArray> {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
    throw new Error("Bu ortamda yükseklik karosu çözülemiyor.");
  }
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Yükseklik karosu için 2B bağlam açılamadı.");
    context.drawImage(bitmap, 0, 0, TILE_SIZE, TILE_SIZE);
    return context.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
  } finally {
    bitmap.close();
  }
}

function isAbortError(failure: unknown): boolean {
  return failure instanceof Error && failure.name === "AbortError";
}

/**
 * Karo tabanlı profil: noktalar karolara gruplanır, her karo bir kez
 * çekilip çözülür, piksel yükseklikleri `assembleProfile` çekirdeğine
 * verilir. Karo hatası (HTTP/çözme/CORS) o karonun noktalarını
 * "örneklenemedi" yapar → profil bilinmiyor olur; sayı uydurulmaz.
 * İptal (`AbortSignal`) aynen yukarı fırlatılır.
 */
export async function buildElevationProfileFromTiles(
  legs: RouteLeg[],
  options: TileElevationOptions = {},
): Promise<ElevationProfileData> {
  const zoom = options.zoom ?? ELEVATION_TILE_ZOOM;
  const fetchTile = options.fetchTile ?? defaultFetchTile;
  const decodeTile = options.decodeTile ?? defaultDecodeTile;
  const { points, geometryDistanceKm } = collectProfilePoints(legs);
  const elevations: (number | null)[] = points.map(() => null);
  if (points.length === 0) return assembleProfile(points, elevations, geometryDistanceKm);

  const byTile = new Map<string, Array<{ index: number; pixelX: number; pixelY: number }>>();
  points.forEach((point, index) => {
    const { tileX, tileY, pixelX, pixelY } = lngLatToTilePixel(point.lng, point.lat, zoom);
    const key = `${tileX}/${tileY}`;
    const bucket = byTile.get(key) ?? [];
    bucket.push({ index, pixelX, pixelY });
    byTile.set(key, bucket);
  });

  const tileKeys = Array.from(byTile.keys()).slice(0, ELEVATION_MAX_TILES);
  const outcomes = await Promise.allSettled(tileKeys.map(async (key) => {
    const [tileX, tileY] = key.split("/").map(Number);
    const blob = await fetchTile(elevationTileUrl(zoom, tileX, tileY), options.signal);
    const rgba = await decodeTile(blob);
    return { key, rgba };
  }));

  for (const outcome of outcomes) {
    if (outcome.status === "rejected") {
      if (isAbortError(outcome.reason)) throw outcome.reason;
      continue; // bu karonun noktaları null kalır → bilinmiyor
    }
    const { key, rgba } = outcome.value;
    if (rgba.length < TILE_SIZE * TILE_SIZE * 4) continue;
    for (const entry of byTile.get(key) ?? []) {
      const offset = (entry.pixelY * TILE_SIZE + entry.pixelX) * 4;
      const elevation = terrariumToElevation(rgba[offset], rgba[offset + 1], rgba[offset + 2]);
      elevations[entry.index] = elevation >= MIN_SANE_ELEVATION_M && elevation <= MAX_SANE_ELEVATION_M
        ? Math.round(elevation)
        : null;
    }
  }

  return assembleProfile(points, elevations, geometryDistanceKm);
}
