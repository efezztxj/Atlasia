/**
 * Atlasia — Hava durumu derinleştirme (Adım 15).
 *
 * Anahtarsız Open-Meteo: saatlik sıcaklık, yağış ve yağış olasılığı. Rota
 * duraklarının VARİŞ saatine göre hava eşlenir; yağmur planı sıralamayı
 * gerçek tahmine göre iyileştirir. Ücretli servis yok.
 */
import type { AtlasRoute, RouteDay } from "../types";
import { reorderRoute } from "./routePlanner";

export interface WeatherHour {
  /** Yerel saat, "2026-10-19T14:00" */
  time: string;
  temperature: number;
  precipitationMm: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface StopWeather {
  arrival: string;
  temperature: number;
  precipitationMm: number;
  precipitationProbability: number;
  weatherCode: number;
  label: string;
  risk: "clear" | "possible" | "rainy";
}

export interface WeatherPoint {
  id: string;
  lat: number;
  lng: number;
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: Record<string, WeatherHour[]> }>();

const WEATHER_LABELS: Record<number, string> = {
  0: "Açık",
  1: "Az bulutlu",
  2: "Parçalı bulutlu",
  3: "Kapalı",
  45: "Sisli",
  48: "Kırağılı sis",
  51: "Hafif çisenti",
  53: "Çisenti",
  55: "Yoğun çisenti",
  56: "Dondurucu çisenti",
  57: "Yoğun dondurucu çisenti",
  61: "Hafif yağmur",
  63: "Yağmur",
  65: "Şiddetli yağmur",
  66: "Dondurucu yağmur",
  67: "Şiddetli dondurucu yağmur",
  71: "Hafif kar",
  73: "Kar",
  75: "Yoğun kar",
  77: "Kar taneleri",
  80: "Hafif sağanak",
  81: "Sağanak",
  82: "Şiddetli sağanak",
  85: "Kar sağanağı",
  86: "Yoğun kar sağanağı",
  95: "Gök gürültülü fırtına",
  96: "Dolulu fırtına",
  99: "Şiddetli dolulu fırtına",
};

export function weatherLabel(code: number): string {
  return WEATHER_LABELS[code] ?? "Bilinmeyen hava";
}

export function rainRisk(probability: number): StopWeather["risk"] {
  if (probability >= 60) return "rainy";
  if (probability >= 30) return "possible";
  return "clear";
}

interface OpenMeteoHourly {
  time?: string[];
  temperature_2m?: number[];
  precipitation?: number[];
  precipitation_probability?: number[];
  weather_code?: number[];
}

interface OpenMeteoResponse {
  hourly?: OpenMeteoHourly;
  latitude?: number;
  longitude?: number;
}

function parseHours(raw: OpenMeteoHourly | undefined): WeatherHour[] {
  if (!raw?.time?.length) return [];
  return raw.time.map((time, index) => ({
    time,
    temperature: raw.temperature_2m?.[index] ?? Number.NaN,
    precipitationMm: raw.precipitation?.[index] ?? 0,
    precipitationProbability: raw.precipitation_probability?.[index] ?? 0,
    weatherCode: raw.weather_code?.[index] ?? 0,
  })).filter((hour) => Number.isFinite(hour.temperature));
}

/**
 * Birden çok nokta için TEK istek: Open-Meteo virgülle ayrılmış koordinatları
 * destekler. Böylece 7 duraklı rota 7 okuma yapmaz; ücretsiz kotada kalır.
 */
export async function fetchWeatherSeries(
  points: WeatherPoint[],
  signal?: AbortSignal,
): Promise<Record<string, WeatherHour[]>> {
  const unique = points
    .filter((point, index, all) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
      && all.findIndex((other) => other.id === point.id) === index)
    .slice(0, 10);
  if (!unique.length) return {};

  const key = unique.map((point) => `${point.lat.toFixed(2)},${point.lng.toFixed(2)}`).join("|");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  signal?.addEventListener("abort", abort, { once: true });
  const timer = globalThis.setTimeout(abort, 8000);
  const lat = unique.map((point) => point.lat.toFixed(3)).join(",");
  const lng = unique.map((point) => point.lng.toFixed(3)).join(",");
  const url = `${ENDPOINT}?latitude=${lat}&longitude=${lng}`
    + "&hourly=temperature_2m,precipitation,precipitation_probability,weather_code"
    + "&forecast_days=3&timezone=auto";

  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Weather service ${response.status}`);
    const payload = await response.json() as OpenMeteoResponse | OpenMeteoResponse[];
    const entries = Array.isArray(payload) ? payload : [payload];
    const data: Record<string, WeatherHour[]> = {};
    unique.forEach((point, index) => {
      data[point.id] = parseHours(entries[index]?.hourly);
    });
    if (Object.values(data).every((hours) => hours.length === 0)) throw new Error("Weather data empty");
    cache.set(key, { at: Date.now(), data });
    return data;
  } finally {
    globalThis.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "09:30" + gün ofseti → tahmindeki saatlik dilim. */
export function weatherAtClock(hours: WeatherHour[], dayOffset: number, clock: string): WeatherHour | null {
  if (!hours.length) return null;
  const baseDate = hours[0].time.slice(0, 10);
  const [hourRaw, minuteRaw] = clock.split(":").map(Number);
  const hour = Number.isFinite(hourRaw) ? Math.max(0, Math.min(23, hourRaw)) : 9;
  // En yakın saat dilimi; tahmin saatliktir, dakika yuvarlanır.
  const rounded = Math.min(23, hour + (Number.isFinite(minuteRaw) && minuteRaw >= 30 ? 1 : 0));
  const target = `${addDays(baseDate, Math.max(0, dayOffset))}T${String(rounded).padStart(2, "0")}:00`;
  return hours.find((entry) => entry.time === target) ?? null;
}

export function toStopWeather(hour: WeatherHour): StopWeather {
  return {
    arrival: hour.time,
    temperature: hour.temperature,
    precipitationMm: hour.precipitationMm,
    precipitationProbability: hour.precipitationProbability,
    weatherCode: hour.weatherCode,
    label: weatherLabel(hour.weatherCode),
    risk: rainRisk(hour.precipitationProbability),
  };
}

/** Günün en yüksek yağış olasılığı — planRoute'un mevcut weatherNote sözleşmesi için. */
export function dailyRainNote(hours: WeatherHour[]): string {
  if (!hours.length) return "Canlı hava bilgisine ulaşamadım. Yağmur ihtimalini yerel tahminden kontrol et.";
  const firstDay = hours[0].time.slice(0, 10);
  const today = hours.filter((hour) => hour.time.startsWith(firstDay)).slice(0, 24);
  const peak = today.reduce((max, hour) => Math.max(max, hour.precipitationProbability), 0);
  return peak >= 30
    ? `Hava modelinde mevcut yağış görünüyor (bugün en yüksek olasılık %${peak}). Kaygan zemin ve açık alanlar için kapalı bir mola planla; durakların varış saatlerine göre ayrıntı aşağıda.`
    : "Hava modelinde bugün belirgin yağış riski görünmüyor. Bu, gün boyunca yağmur olmayacağı anlamına gelmez.";
}

function cloneDay(day: RouteDay): RouteDay {
  return { ...day, stops: day.stops.map((stop) => ({ ...stop, tips: [...stop.tips] })) };
}

/** Durakların varış saatine göre hava ekler; sıralama değişmez. */
export function attachStopWeather(
  route: AtlasRoute,
  series: Record<string, WeatherHour[]>,
  dayOffsetBase = 0,
): AtlasRoute {
  const days = route.days.map((day, dayIndex) => {
    const next = cloneDay(day);
    let rainy = 0;
    next.stops = next.stops.map((stop) => {
      const hours = stop.pinId ? series[stop.pinId] : undefined;
      if (!hours?.length) return { ...stop, weather: undefined };
      const hour = weatherAtClock(hours, dayOffsetBase + dayIndex, stop.startTime);
      if (!hour) return { ...stop, weather: undefined };
      const weather = toStopWeather(hour);
      if (weather.risk === "rainy") rainy += 1;
      return { ...stop, weather };
    });
    return {
      ...next,
      summary: rainy > 0
        ? `${next.summary} ${rainy} durakta yağış riski var.`
        : next.summary,
    };
  });
  return { ...route, days, weatherNote: route.weatherNote };
}

/** Rota için toplam yağış maruziyeti: varış saatlerindeki olasılıkların toplamı. */
export function rainExposure(route: AtlasRoute, series: Record<string, WeatherHour[]>, dayOffsetBase = 0): number {
  let total = 0;
  route.days.forEach((day, dayIndex) => {
    day.stops.forEach((stop) => {
      const hours = stop.pinId ? series[stop.pinId] : undefined;
      if (!hours?.length) return;
      const hour = weatherAtClock(hours, dayOffsetBase + dayIndex, stop.startTime);
      if (hour) total += hour.precipitationProbability;
    });
  });
  return total;
}

export interface RainPlanResult {
  route: AtlasRoute;
  movedStops: number;
  rainyStops: number;
}

/**
 * Yağmur planı: durakların sırasını, varış saatlerindeki gerçek yağış olasılığını
 * azaltacak şekilde takas eder. Açgözlü iyileştirme kullanır (en fazla 3 geçiş),
 * en iyi bulunan sırayı döndürür; iyileşme yoksa rotayı değiştirmez.
 */
export function optimizeForRain(
  route: AtlasRoute,
  series: Record<string, WeatherHour[]>,
  dayOffsetBase = 0,
): RainPlanResult {
  let best = route;
  let bestScore = rainExposure(route, series, dayOffsetBase);
  let movedStops = 0;

  for (let pass = 0; pass < 3; pass += 1) {
    let improved = false;
    route.days.forEach((day, dayIndex) => {
      for (let from = 0; from < day.stops.length; from += 1) {
        for (let to = 0; to < day.stops.length; to += 1) {
          if (from === to) continue;
          const candidate = reorderRoute(best, dayIndex, from, to);
          const score = rainExposure(candidate, series, dayOffsetBase);
          if (score + 0.001 < bestScore) {
            best = candidate;
            bestScore = score;
            movedStops += 1;
            improved = true;
          }
        }
      }
    });
    if (!improved) break;
  }

  const withWeather = attachStopWeather(best, series, dayOffsetBase);
  const rainyStops = withWeather.days.flatMap((day) => day.stops).filter((stop) => stop.weather?.risk === "rainy").length;
  const note = rainyStops > 0
    ? `Yağmur planı: ${rainyStops} durakta yağış riski sürüyor. Mümkün olan duraklar daha kuru saatlere kaydırıldı; şemsiye ve kapalı mola planla.`
    : movedStops > 0
      ? `Yağmur planı: ${movedStops} durak daha kuru varış saatine kaydırıldı (${Math.round(bestScore)}% toplam yağış olasılığı).`
      : "Yağmur planı: durakların varış saatlerinde belirgin yağış riski yok; sıralama korundu.";

  return {
    route: { ...withWeather, weatherNote: note },
    movedStops,
    rainyStops,
  };
}
