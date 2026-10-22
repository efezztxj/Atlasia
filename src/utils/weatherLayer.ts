export interface WeatherBounds { west: number; south: number; east: number; north: number }
export interface WeatherCell { lat: number; lng: number; temperature: number; precipitationMm: number; weatherCode: number }
export type WeatherFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; value: WeatherCell[] }>();
const pending = new Map<string, Promise<WeatherCell[]>>();

export function weatherGrid(bounds: WeatherBounds, rows = 3, columns = 3): Array<{ lat: number; lng: number }> {
  if (rows < 1 || columns < 1 || !Object.values(bounds).every(Number.isFinite)) return [];
  const south = Math.max(-85, bounds.south);
  const north = Math.min(85, bounds.north);
  if (south > north || bounds.west > bounds.east) return [];
  return Array.from({ length: rows * columns }, (_, index) => {
    const r = Math.floor(index / columns);
    const c = index % columns;
    return {
      lat: rows === 1 ? (south + north) / 2 : south + (north - south) * r / (rows - 1),
      lng: columns === 1 ? (bounds.west + bounds.east) / 2 : bounds.west + (bounds.east - bounds.west) * c / (columns - 1),
    };
  });
}

function requestUrl(points: Array<{ lat: number; lng: number }>): string {
  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", points.map((p) => p.lat.toFixed(3)).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lng.toFixed(3)).join(","));
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
