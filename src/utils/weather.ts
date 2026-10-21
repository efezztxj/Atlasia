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
  /** 10 m rüzgâr hızı (km/sa). Eski/üçüncü kaynak saatlerde olmayabilir. */
  windSpeedKmh?: number;
  /** Rüzgâr hamlesi (km/sa). */
  windGustKmh?: number;
}

export interface StopWeather {
  arrival: string;
  temperature: number;
  precipitationMm: number;
  precipitationProbability: number;
  weatherCode: number;
  label: string;
  risk: "clear" | "possible" | "rainy";
  windSpeedKmh?: number;
  windGustKmh?: number;
}

export interface WeatherPoint {
  id: string;
  lat: number;
  lng: number;
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 10 * 60 * 1000;
/**
 * Nokta bazlı önbellek: anahtar yalnız koordinattır, sonuç çağıranın verdiği
 * kimliklerle yeniden eşlenir. (Eski toplu anahtar, aynı koordinata farklı
 * kimlikle gelen ikinci isteğe eski kimlikli veri döndürüyordu.)
 */
const pointCache = new Map<string, { at: number; hours: WeatherHour[] }>();
/** Uzun oturumda bellek sınırı: en eski girdiler düşer. */
const CACHE_MAX_POINTS = 50;

function coordKey(point: WeatherPoint): string {
  return `${point.lat.toFixed(2)},${point.lng.toFixed(2)}`;
}

function rememberPoint(key: string, hours: WeatherHour[]): void {
  pointCache.delete(key);
  pointCache.set(key, { at: Date.now(), hours });
  while (pointCache.size > CACHE_MAX_POINTS) {
    const oldest = pointCache.keys().next().value;
    if (oldest === undefined) break;
    pointCache.delete(oldest);
  }
}

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

/**
 * Kötü hava uyarısı eşikleri (Adım 15 kalanı). Uyarı seviyesi yürüyüş/
 * bisiklet güvenliği içindir; "dikkat" bir alt basamaktır. Yağış olasılığı
 * basamakları `rainRisk` ile aynıdır (30/60) ki iki sözleşme çelişmesin.
 */
export const WEATHER_RISK_THRESHOLDS = {
  warningPrecipitationProbabilityPct: 60,
  warningPrecipitationMmPerHour: 2,
  warningWindKmh: 40,
  warningWindGustKmh: 60,
  warningHeatC: 35,
  warningColdC: 0,
  cautionPrecipitationProbabilityPct: 30,
  cautionPrecipitationMmPerHour: 0.5,
  cautionWindKmh: 25,
  cautionWindGustKmh: 40,
  cautionHeatC: 30,
  cautionColdC: 3,
} as const;

/** WMO kodlarında gök gürültülü fırtına aralığı (95–99). */
export function isStormWeatherCode(code: number): boolean {
  return code >= 95 && code <= 99;
}

export type WeatherRiskLevel = "none" | "caution" | "warning";

export interface WeatherRiskAssessment {
  level: WeatherRiskLevel;
  /** En çok 4 kısa Türkçe neden; önce uyarı nedenleri. `level: "none"`da boş. */
  reasons: string[];
  /** Pencerede değerlendirilen saat sayısı. */
  hourCount: number;
}

/** Değerlendirme penceresi: gün öneki ("2026-10-22") ve/veya saat aralığı. */
export interface WeatherRiskWindow {
  date?: string;
  fromClock?: string;
  toClock?: string;
}

function clockOf(hour: WeatherHour): string {
  return hour.time.slice(11, 16);
}

function inWindow(hour: WeatherHour, window: WeatherRiskWindow): boolean {
  if (window.date && !hour.time.startsWith(window.date)) return false;
  const clock = clockOf(hour);
  if (window.fromClock && clock < window.fromClock) return false;
  if (window.toClock && clock > window.toClock) return false;
  return true;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Bir saat penceresinin en kötü hava riskini değerlendirir (saf fonksiyon).
 * Pencerede **hiç saat yoksa `null`** döner: veri yokluğu "risk yok"
 * değildir, çağıran bunu "hava durumu bilinmiyor" olarak göstermelidir;
 * tahmin uydurulmaz. Rüzgâr verisi olmayan saatler (eski kayıtlar) rüzgâr
 * koşulunu tetikleyemez ama diğer koşullarda değerlendirilir.
 */
export function assessWeatherRisk(
  hourly: readonly WeatherHour[],
  window: WeatherRiskWindow = {},
): WeatherRiskAssessment | null {
  const hours = hourly.filter((hour) => inWindow(hour, window));
  if (hours.length === 0) return null;
  const t = WEATHER_RISK_THRESHOLDS;

  let storm: WeatherHour | null = null;
  let worstRain: WeatherHour | null = null;
  let worstWind: WeatherHour | null = null;
  let hottest: WeatherHour | null = null;
  let coldest: WeatherHour | null = null;
  for (const hour of hours) {
    if (!storm && isStormWeatherCode(hour.weatherCode)) storm = hour;
    if (!worstRain
      || hour.precipitationMm > worstRain.precipitationMm
      || (hour.precipitationMm === worstRain.precipitationMm
        && hour.precipitationProbability > worstRain.precipitationProbability)) worstRain = hour;
    const wind = Math.max(finiteOr(hour.windSpeedKmh, 0), finiteOr(hour.windGustKmh, 0));
    if (!worstWind
      || wind > Math.max(finiteOr(worstWind.windSpeedKmh, 0), finiteOr(worstWind.windGustKmh, 0))) worstWind = hour;
    if (!hottest || hour.temperature > hottest.temperature) hottest = hour;
    if (!coldest || hour.temperature < coldest.temperature) coldest = hour;
  }

  const warnings: string[] = [];
  const cautions: string[] = [];
  if (storm) {
    warnings.push(`${clockOf(storm)} · ${weatherLabel(storm.weatherCode).toLocaleLowerCase("tr")}`);
  }
  if (worstRain) {
    const { precipitationProbability: prob, precipitationMm: mm } = worstRain;
    if (prob >= t.warningPrecipitationProbabilityPct || mm >= t.warningPrecipitationMmPerHour) {
      warnings.push(`${clockOf(worstRain)} · kuvvetli yağış olasılığı (%${Math.round(prob)}${mm > 0 ? `, ${mm} mm` : ""})`);
    } else if (prob >= t.cautionPrecipitationProbabilityPct || mm >= t.cautionPrecipitationMmPerHour) {
      cautions.push(`${clockOf(worstRain)} · yağış ihtimali (%${Math.round(prob)})`);
    }
  }
  if (worstWind) {
    const speed = finiteOr(worstWind.windSpeedKmh, 0);
    const gust = finiteOr(worstWind.windGustKmh, 0);
    const detail = `${clockOf(worstWind)} · rüzgâr ${Math.round(speed)} km/sa${gust > speed ? ` (hamle ${Math.round(gust)})` : ""}`;
    if (speed >= t.warningWindKmh || gust >= t.warningWindGustKmh) warnings.push(detail);
    else if (speed >= t.cautionWindKmh || gust >= t.cautionWindGustKmh) cautions.push(detail);
  }
  if (hottest) {
    if (hottest.temperature >= t.warningHeatC) {
      warnings.push(`${clockOf(hottest)} · aşırı sıcak ${Math.round(hottest.temperature)}°C`);
    } else if (hottest.temperature >= t.cautionHeatC) {
      cautions.push(`${clockOf(hottest)} · yüksek sıcaklık ${Math.round(hottest.temperature)}°C`);
    }
  }
  if (coldest) {
    if (coldest.temperature <= t.warningColdC) {
      warnings.push(`${clockOf(coldest)} · dondurucu soğuk ${Math.round(coldest.temperature)}°C`);
    } else if (coldest.temperature <= t.cautionColdC) {
      cautions.push(`${clockOf(coldest)} · serin hava ${Math.round(coldest.temperature)}°C`);
    }
  }

  const level: WeatherRiskLevel = warnings.length > 0 ? "warning" : cautions.length > 0 ? "caution" : "none";
  return { level, reasons: [...warnings, ...cautions].slice(0, 4), hourCount: hours.length };
}

interface OpenMeteoHourly {
  time?: string[];
  temperature_2m?: number[];
  precipitation?: number[];
  precipitation_probability?: number[];
  weather_code?: number[];
  wind_speed_10m?: number[];
  wind_gusts_10m?: number[];
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
    windSpeedKmh: raw.wind_speed_10m?.[index] ?? Number.NaN,
    windGustKmh: raw.wind_gusts_10m?.[index] ?? Number.NaN,
  })).filter((hour) => Number.isFinite(hour.temperature));
}

/**
 * Birden çok nokta için TEK istek: Open-Meteo virgülle ayrılmış koordinatları
 * destekler. Böylece 7 duraklı rota 7 okuma yapmaz; ücretsiz kotada kalır.
 * Önbellekteki noktalar isteğe hiç girmez; yalnız eksikler çekilir.
 *
 * Hata sözleşmesi: mesajlar Türkçedir ve kullanıcıya gösterilebilir.
 * Dışarıdan iptal (çağıranın `signal`'ı) `AbortError` olarak korunur;
 * 8 sn'lik iç zaman aşımı ondan ayırt edilebilir bir hatayla döner.
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

  const now = Date.now();
  const data: Record<string, WeatherHour[]> = {};
  const misses: WeatherPoint[] = [];
  const missKeys = new Set<string>();
  for (const point of unique) {
    const key = coordKey(point);
    const cached = pointCache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      data[point.id] = cached.hours;
    } else if (!missKeys.has(key)) {
      missKeys.add(key);
      misses.push(point);
    }
  }

  if (misses.length > 0) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    signal?.addEventListener("abort", abort, { once: true });
    let timedOut = false;
    const timer = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8000);
    const lat = misses.map((point) => point.lat.toFixed(3)).join(",");
    const lng = misses.map((point) => point.lng.toFixed(3)).join(",");
    const url = `${ENDPOINT}?latitude=${lat}&longitude=${lng}`
      + "&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m"
      // 7 gün: çok günlü rota planlarında gün kartları da veri bulsun;
      // daha uzak günler "bilinmiyor" kalır, tahmin uydurulmaz.
      + "&forecast_days=7&timezone=auto";

    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Hava durumu servisi yanıt vermedi (HTTP ${response.status}).`);
      const payload = await response.json() as OpenMeteoResponse | OpenMeteoResponse[];
      const entries = Array.isArray(payload) ? payload : [payload];
      misses.forEach((point, index) => {
        rememberPoint(coordKey(point), parseHours(entries[index]?.hourly));
      });
    } catch (failure) {
      if (signal?.aborted) throw failure;
      if (timedOut) {
        throw Object.assign(new Error("Hava durumu isteği zaman aşımına uğradı. Bağlantını kontrol edip tekrar dene."), { cause: failure });
      }
      if (failure instanceof Error && failure.message.startsWith("Hava durumu")) throw failure;
      throw Object.assign(new Error("Hava durumuna ulaşılamadı. Bağlantını kontrol edip tekrar dene."), { cause: failure });
    } finally {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }

    // Bu turun eksikleri önbellekten (yeni yazıldı) kimliklere eşlenir; aynı
    // koordinatı paylaşan ikinci kimlik de aynı seriyi alır.
    for (const point of unique) {
      if (data[point.id] === undefined) {
        data[point.id] = pointCache.get(coordKey(point))?.hours ?? [];
      }
    }
  }

  if (Object.values(data).every((hours) => hours.length === 0)) {
    throw new Error("Hava durumu verisi boş döndü. Biraz sonra tekrar dene.");
  }
  return data;
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Planın `dayIndex`'inci gününün tahmin serisindeki tarih anahtarı
 * ("2026-10-22"). Sözleşme `weatherAtClock` ile aynı: 0. gün, serinin
 * ilk günüdür. Seri boşsa `null`.
 */
export function dateKeyForDayIndex(hours: readonly WeatherHour[], dayIndex: number): string | null {
  if (!hours.length) return null;
  return addDays(hours[0].time.slice(0, 10), Math.max(0, dayIndex));
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
    // NaN kalıcı veriye sızmasın: rüzgâr yalnız ölçülmüşse taşınır.
    ...(typeof hour.windSpeedKmh === "number" && Number.isFinite(hour.windSpeedKmh)
      ? { windSpeedKmh: hour.windSpeedKmh }
      : {}),
    ...(typeof hour.windGustKmh === "number" && Number.isFinite(hour.windGustKmh)
      ? { windGustKmh: hour.windGustKmh }
      : {}),
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
