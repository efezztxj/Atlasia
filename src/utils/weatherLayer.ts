export interface WeatherBounds { west: number; south: number; east: number; north: number }
export interface WeatherCell { lat: number; lng: number; temperature: number; precipitationMm: number; weatherCode: number }
export type WeatherFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; value: WeatherCell[] }>();
const pending = new Map<string, Promise<WeatherCell[]>>();

const SNAP_STEPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 45, 90] as const;
const CACHE_MAX = 40;

/** Görünür açıklığa göre "yuvarlak" adım: küçük kaydırmalarda grid aynı kalır, cache tutar. */
function snapStep(span: number, cells: number): number {
  const wanted = span / Math.max(1, cells);
  return SNAP_STEPS.find((step) => step >= wanted) ?? 90;
}

/** Boylamı [-180, 180) aralığına sarar (MapLibre antimeridyen ötesinde 190° gibi değer verebilir). */
export function wrapLng(lng: number): number {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function weatherGrid(bounds: WeatherBounds, rows = 3, columns = 3): Array<{ lat: number; lng: number }> {
  if (rows < 1 || columns < 1 || !Object.values(bounds).every(Number.isFinite)) return [];
  const south = Math.max(-85, bounds.south);
  const north = Math.min(85, bounds.north);
  if (south > north) return [];
  // Antimeridyeni geçen kutu (west > east) doğuya açılır; dünya turundan geniş görünüm merkezde 360°'ye kırpılır.
  let west = bounds.west;
  let east = bounds.east < west ? bounds.east + 360 : bounds.east;
  if (east - west > 360) {
    const mid = (west + east) / 2;
    west = mid - 180;
    east = mid + 180;
  }
  // Merkez "yuvarlak" adıma oturtulur, noktalar merkezden adım adım dizilir: grid
  // (ve cache anahtarı) ancak görünüm adımın yarısından fazla kayınca değişir.
  const latStep = snapStep(north - south, Math.max(1, rows - 1));
  const lngStep = snapStep(east - west, Math.max(1, columns - 1));
  const latCenter = Math.round((south + north) / 2 / latStep) * latStep;
  const lngCenter = Math.round((west + east) / 2 / lngStep) * lngStep;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return Array.from({ length: rows * columns }, (_, index) => {
    const r = Math.floor(index / columns);
    const c = index % columns;
    const lat = Math.min(85, Math.max(-85, latCenter + (r - (rows - 1) / 2) * latStep));
    const lng = lngCenter + (c - (columns - 1) / 2) * lngStep;
    return { lat: round(lat), lng: round(lng) };
  });
}

/** WMO hava kodu → harita etiketi simgesi. */
export function weatherIcon(code: number): string {
  if (code === 0) return "☀";
  if (code <= 2) return "🌤";
  if (code === 3) return "☁";
  if (code === 45 || code === 48) return "🌫";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "❄";
  if (code >= 95 && code <= 99) return "⛈";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧";
  return "🌡";
}

function requestUrl(points: Array<{ lat: number; lng: number }>): string {
  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", points.map((p) => p.lat.toFixed(3)).join(","));
  url.searchParams.set("longitude", points.map((p) => wrapLng(p.lng).toFixed(3)).join(","));
  url.searchParams.set("current", "temperature_2m,precipitation,weather_code");
  return url.toString();
}

export async function fetchWeatherGrid(
  bounds: WeatherBounds,
  fetcher: WeatherFetcher = fetch,
  now = Date.now(),
  signal?: AbortSignal,
): Promise<WeatherCell[]> {
  const points = weatherGrid(bounds);
  if (!points.length || signal?.aborted) return [];
  const key = requestUrl(points);
  const cached = cache.get(key);
  if (cached && now - cached.at < TTL_MS) return cached.value;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const request = (async () => {
    const response = await fetcher(key, { signal });
    if (!response.ok) throw new Error(`Open-Meteo yanıtı: ${response.status}`);
    const raw: unknown = await response.json();
    const groups = Array.isArray(raw) ? raw : [raw];
    const cells = groups.flatMap((entry, i) => {
      if (!entry || typeof entry !== "object") return [];
      const current = (entry as { current?: Record<string, unknown> }).current;
      const point = points[i];
      if (!point || !current || typeof current.temperature_2m !== "number") return [];
      return [{ ...point, temperature: current.temperature_2m,
        precipitationMm: typeof current.precipitation === "number" ? current.precipitation : 0,
        weatherCode: typeof current.weather_code === "number" ? current.weather_code : 0 }];
    });
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: now, value: cells });
    return cells;
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}

export function debounce<T extends (...args: never[]) => void>(fn: T, delayMs: number, timers = globalThis) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = (...args: Parameters<T>) => {
    if (timer !== undefined) timers.clearTimeout(timer);
    timer = timers.setTimeout(() => { timer = undefined; fn(...args); }, delayMs);
  };
  run.cancel = () => { if (timer !== undefined) timers.clearTimeout(timer); timer = undefined; };
  return run;
}

export function clearWeatherLayerCache(): void { cache.clear(); pending.clear(); }
