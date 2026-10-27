/**
 * Atlasia — rüzgâr alanı (Windy benzeri hava katmanının veri kaynağı).
 *
 * Kaynak: Open-Meteo (`current=wind_speed_10m,wind_direction_10m`). Anahtarsız,
 * ücretsiz katman; CSP `connect-src` içinde `api.open-meteo.com` zaten var.
 * Tek istekte N nokta istenir (Open-Meteo çoklu konum desteği), böylece ızgara
 * 24 noktada da tek ağ çağrısıdır.
 *
 * Yön kuralı: Open-Meteo `wind_direction_10m` rüzgârın **geldiği** yönü verir
 * (meteorolojik). Ekranda akış yönü için işaret ters çevrilir:
 *   u = -hız·sin(yön), v = -hız·cos(yön)   (u doğu, v kuzey, m/s)
 */
import { geoGrid, wrapLng, type GeoBounds } from "./geoGrid";

export interface WindSample {
  /** Doğu bileşeni, m/s */
  u: number;
  /** Kuzey bileşeni, m/s */
  v: number;
  /** Yatay hız, m/s */
  speed: number;
}

export interface WindPoint extends WindSample {
  lat: number;
  lng: number;
  /** Anlık yağış, mm/saat. */
  precipitation: number;
  /** 2 m sıcaklık, °C. Veri yoksa null. */
  temperature: number | null;
  /** WMO hava kodu. Veri yoksa null. */
  weatherCode: number | null;
  /** Saatlik yağış (mm): [0] şimdiki saat, ... [HOURLY_HOURS-1]. */
  hourly: number[];
}

export interface WindField {
  bounds: GeoBounds;
  rows: number;
  columns: number;
  points: WindPoint[];
  /** Verinin çekildiği an (ms). */
  at: number;
}

export type WindFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const WIND_GRID_ROWS = 4;
export const WIND_GRID_COLUMNS = 6;
/** Saatlik yağış dilimleyicisinin kapsadığı saat sayısı (0 = şimdi). */
export const HOURLY_HOURS = 13;
export const WIND_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

const TTL_MS = 10 * 60_000;
const CACHE_MAX = 24;
const cache = new Map<string, { at: number; field: WindField }>();
const pending = new Map<string, Promise<WindField | null>>();

/** m/s → km/sa */
export function kmh(speedMs: number): number {
  return speedMs * 3.6;
}

/** Meteorolojik yön (derece, rüzgârın geldiği yön) → u/v bileşenleri. */
export function directionToVector(speed: number, degrees: number): WindSample {
  const rad = (degrees * Math.PI) / 180;
  const u = -speed * Math.sin(rad);
  const v = -speed * Math.cos(rad);
  return { u, v, speed };
}

/** Bileşenlerden yön (derece, geliş yönü) — oklar ve lejant için. */
export function vectorToDirection(u: number, v: number): number {
  const fromRad = Math.atan2(-u, -v);
  return ((fromRad * 180) / Math.PI + 360) % 360;
}

export function windRequestUrl(points: Array<{ lat: number; lng: number }>): string {
  const url = new URL(WIND_ENDPOINT);
  url.searchParams.set("latitude", points.map((p) => p.lat.toFixed(3)).join(","));
  url.searchParams.set("longitude", points.map((p) => wrapLng(p.lng).toFixed(3)).join(","));
  url.searchParams.set(
    "current",
    "wind_speed_10m,wind_direction_10m,precipitation,temperature_2m,weather_code",
  );
  url.searchParams.set("hourly", "precipitation");
  url.searchParams.set("forecast_hours", String(HOURLY_HOURS));
  url.searchParams.set("wind_speed_unit", "ms");
  return url.toString();
}

function parsePoints(raw: unknown, points: Array<{ lat: number; lng: number }>): WindPoint[] {
  const groups = Array.isArray(raw) ? raw : [raw];
  const out: WindPoint[] = [];
  groups.forEach((entry, index) => {
    const point = points[index];
    if (!point || !entry || typeof entry !== "object") return;
    const current = (entry as { current?: Record<string, unknown> }).current;
    if (!current) return;
    const speed = current.wind_speed_10m;
    const direction = current.wind_direction_10m;
    if (typeof speed !== "number" || !Number.isFinite(speed) || speed < 0) return;
    if (typeof direction !== "number" || !Number.isFinite(direction)) return;
    const record = entry as { current: Record<string, unknown>; hourly?: { precipitation?: unknown } };
    // Yağış/sıcaklık rüzgârla aynı yanıtta gelir; gelmezse 0/null kalır ve
    // katman "veri yok" der — uydurma değer çizmez.
    const numberOr = (value: unknown, fallback: number): number =>
      typeof value === "number" && Number.isFinite(value) ? value : fallback;
    const optionalNumber = (value: unknown): number | null =>
      typeof value === "number" && Number.isFinite(value) ? value : null;
    const hourlyRaw = record.hourly?.precipitation;
    const hourly = Array.isArray(hourlyRaw)
      ? hourlyRaw.slice(0, HOURLY_HOURS).map((value) => numberOr(value, 0))
      : [];
    out.push({
      ...point,
      ...directionToVector(speed, direction),
      precipitation: Math.max(0, numberOr(current.precipitation, 0)),
      temperature: optionalNumber(current.temperature_2m),
      weatherCode: optionalNumber(current.weather_code),
      hourly,
    });
  });
  return out;
}

/**
 * Görünür alan için rüzgâr ızgarası. Aynı ızgara 10 dakika önbellekte tutulur;
 * eşzamanlı istekler tekilleştirilir. Veri yoksa `null` döner (katman dürüst
 * biçimde "veri alınamadı" gösterir, uydurma vektör çizmez).
 */
export async function fetchWindField(
  bounds: GeoBounds,
  fetcher: WindFetcher = fetch,
  now = Date.now(),
  signal?: AbortSignal,
): Promise<WindField | null> {
  const points = geoGrid(bounds, WIND_GRID_ROWS, WIND_GRID_COLUMNS);
  if (!points.length || signal?.aborted) return null;
  const key = windRequestUrl(points);
  const cached = cache.get(key);
  if (cached && now - cached.at < TTL_MS) return cached.field;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const request = (async (): Promise<WindField | null> => {
    const response = await fetcher(key, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Open-Meteo yanıtı: ${response.status}`);
    const parsed = parsePoints(await response.json(), points);
    if (!parsed.length) return null;
    const field: WindField = { bounds, rows: WIND_GRID_ROWS, columns: WIND_GRID_COLUMNS, points: parsed, at: now };
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: now, field });
    return field;
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}

/** İki nokta arası yaklaşık mesafe (km) — ağırlıklandırma için. */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (a.lat - b.lat) * 110.574;
  const dLng = (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Alanı verilen noktada örnekler (ters mesafe ağırlıklı, kuvvet 2). Izgara
 * noktalarına çok yakınken ağırlık patlamasın diye mesafe alt sınırı vardır.
 * Alan dışında `null` döner; katman parçacığı yeniden doğurur.
 */
export function sampleWind(field: WindField, lat: number, lng: number): WindSample | null {
  if (!field.points.length) return null;
  let totalWeight = 0;
  let u = 0;
  let v = 0;
  for (const point of field.points) {
    const d = Math.max(0.05, distanceKm({ lat, lng }, point));
    const weight = 1 / (d * d);
    totalWeight += weight;
    u += point.u * weight;
    v += point.v * weight;
  }
  if (!totalWeight) return null;
  const su = u / totalWeight;
  const sv = v / totalWeight;
  return { u: su, v: sv, speed: Math.sqrt(su * su + sv * sv) };
}

/**
 * Bir ızgara noktasının `hourOffset` saat sonraki yağışı (mm/saat).
 * Saatlik veri yoksa anlık yağışa düşer; ikisi de yoksa 0.
 */
export function precipitationAt(point: WindPoint, hourOffset = 0): number {
  const offset = Math.max(0, Math.min(HOURLY_HOURS - 1, Math.round(hourOffset)));
  const value = point.hourly[offset];
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  const current = point.precipitation;
  return typeof current === "number" && Number.isFinite(current) ? Math.max(0, current) : 0;
}

/** Alanın seçili saatteki en yüksek yağışı (mm/saat) — lejant/karar metni için. */
export function maxPrecipitation(field: WindField, hourOffset = 0): number {
  return field.points.reduce((max, point) => Math.max(max, precipitationAt(point, hourOffset)), 0);
}

export function clearWindCache(): void {
  cache.clear();
  pending.clear();
}
