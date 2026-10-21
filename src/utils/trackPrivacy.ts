/**
 * P17-Tur2 · Yayın/paylaşım gizliliği (saf, React'siz, ağsız).
 *
 * Sözleşme:
 * 1. **Ham iz (`tracks`) asla paylaşılmaz.** Paylaşılan tek şey taslak rotadır
 *    (`routes`), yani sadeleştirilmiş geometri + kullanıcının gördüğü duraklar.
 *    Ham iz; ölçüm doğruluğu, nokta sayısı ve ham zaman damgaları taşıdığı için
 *    yalnız sahibinin hesabında kalır.
 * 2. Paylaşım (private dışı görünürlük) **ayrı bir onay** ister; kaydetmek
 *    paylaşmak değildir.
 * 3. İsteğe bağlı uç kırpma: rotanın başı ve sonu `trimEndsMeters` kadar
 *    kısaltılabilir; böylece ev/otel konumu rota geometrisinden düşer.
 *    Varsayılan 0 m'dir (gerekçe `DEFAULT_TRIM_METERS`).
 *
 * Fonksiyonlar saftır: girdi değiştirilmez, ağa gidilmez, saat okunmaz.
 */
import type { AtlasRoute, RouteDay, RouteStop, RouteVisibility } from "../types";
import { haversineKm } from "./geo";
import { decodePolyline, encodePolyline } from "./polyline";

/**
 * Varsayılan kırpma: **0 m**.
 *
 * Gerekçe: geometriyi kendiliğinden kısaltmak rotayı kendi duraklarıyla ve
 * kullanıcının gördüğü önizlemeyle tutarsız bırakır — kullanıcı 1 km
 * kaydedip 0,8 km'lik rota yayınlandığını fark etmemeli. Gizlilik ihtiyacı
 * olan kullanıcı bunu **açıkça** seçer (ör. 100 m). Ayrıca kırpma tek başına
 * gizlilik garantisi değildir: güzergâhın kendisi zaten konum bilgisidir.
 */
export const DEFAULT_TRIM_METERS = 0;

/** Kırpma üst sınırı: kısa bir yürüyüşü anlamsız bırakmayacak kadar. */
export const MAX_TRIM_METERS = 2_000;

/** Taslak rotada asla bulunmaması gereken ham iz alanları. */
const RAW_TRACK_FIELDS = ["authorUid", "accuracy", "pointCount", "startedAt", "endedAt"] as const;

function pathKm(coords: [number, number][]): number {
  let total = 0;
  for (let index = 1; index < coords.length; index += 1) {
    const [lngA, latA] = coords[index - 1];
    const [lngB, latB] = coords[index];
    total += haversineKm(latA, lngA, latB, lngB);
  }
  return Math.round(total * 100) / 100;
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000;
}

/** Rotanın gerçek geometrisi: bacak varsa bacaklar, yoksa polyline. */
export function dayCoords(day: RouteDay): [number, number][] {
  if (day.legs && day.legs.length > 0) return day.legs.flatMap((leg) => leg.coords);
  return day.polyline ? decodePolyline(day.polyline) : [];
}

function trimHead(coords: [number, number][], meters: number): { coords: [number, number][]; removedM: number } {
  if (meters <= 0 || coords.length < 3) return { coords, removedM: 0 };
  let travelled = 0;
  let keepFrom = coords.length - 2;
  for (let index = 1; index < coords.length; index += 1) {
    travelled += distanceMeters(
      { lat: coords[index - 1][1], lng: coords[index - 1][0] },
      { lat: coords[index][1], lng: coords[index][0] },
    );
    if (travelled >= meters) {
      keepFrom = Math.min(index, coords.length - 2);
      break;
    }
  }
  return { coords: coords.slice(keepFrom), removedM: Math.round(travelled) };
}

function trimTail(coords: [number, number][], meters: number): { coords: [number, number][]; removedM: number } {
  if (meters <= 0 || coords.length < 3) return { coords, removedM: 0 };
  let travelled = 0;
  let keepTo = 1;
  for (let index = coords.length - 1; index > 0; index -= 1) {
    travelled += distanceMeters(
      { lat: coords[index][1], lng: coords[index][0] },
      { lat: coords[index - 1][1], lng: coords[index - 1][0] },
    );
    if (travelled >= meters) {
      keepTo = Math.max(index, 1);
      break;
    }
  }
  return { coords: coords.slice(0, keepTo + 1), removedM: Math.round(travelled) };
}

function applyHead(day: RouteDay, meters: number): { day: RouteDay; removedM: number } {
  if (day.legs && day.legs.length > 0) {
    const legs = day.legs.map((leg) => ({ ...leg, coords: leg.coords }));
    const head = trimHead(legs[0].coords, meters);
    legs[0] = { ...legs[0], coords: head.coords, distanceKm: pathKm(head.coords) };
    return {
      day: { ...day, legs, polyline: encodePolyline(legs.flatMap((leg) => leg.coords)) },
      removedM: head.removedM,
    };
  }
  const head = trimHead(decodePolyline(day.polyline), meters);
  return { day: { ...day, polyline: encodePolyline(head.coords) }, removedM: head.removedM };
}

function applyTail(day: RouteDay, meters: number): { day: RouteDay; removedM: number } {
  if (day.legs && day.legs.length > 0) {
    const legs = day.legs.map((leg) => ({ ...leg, coords: leg.coords }));
    const tail = trimTail(legs[legs.length - 1].coords, meters);
    legs[legs.length - 1] = { ...legs[legs.length - 1], coords: tail.coords, distanceKm: pathKm(tail.coords) };
    return {
      day: { ...day, legs, polyline: encodePolyline(legs.flatMap((leg) => leg.coords)) },
      removedM: tail.removedM,
    };
  }
  const tail = trimTail(decodePolyline(day.polyline), meters);
  return { day: { ...day, polyline: encodePolyline(tail.coords) }, removedM: tail.removedM };
}

function renumber(stops: RouteStop[]): RouteStop[] {
  return stops.map((stop, index) => (stop.order === index + 1 ? stop : { ...stop, order: index + 1 }));
}

function dropStopsInside(
  day: RouteDay,
  anchor: { lat: number; lng: number },
  radiusM: number,
  removedM: number,
): RouteDay {
  if (removedM <= 0) return day;
  const kept = day.stops.filter((stop) => distanceMeters(anchor, stop) >= radiusM);
  if (kept.length === day.stops.length) return day;
  return { ...day, stops: renumber(kept) };
}

export interface TrimResult {
  route: AtlasRoute;
  trimmedStartM: number;
  trimmedEndM: number;
  droppedStops: number;
}

/**
 * Rotanın **başını ve sonunu** `meters` kadar kırpar. Ara geometri ve ara
 * duraklar korunur. Kırpılan bölgede kalan duraklar rota ile tutarsız olacağı
 * için düşürülür. Kırpma istenen miktardan az olabilir (kısa rota).
 */
export function trimRouteEnds(route: AtlasRoute, meters: number): TrimResult {
  if (!Number.isFinite(meters) || meters <= 0 || route.days.length === 0) {
    return { route, trimmedStartM: 0, trimmedEndM: 0, droppedStops: 0 };
  }
  const cap = Math.min(meters, MAX_TRIM_METERS);
  const days = route.days.map((day) => ({ ...day, stops: [...day.stops] }));
  const usable = days.map((day, index) => (dayCoords(day).length >= 3 ? index : -1)).filter((index) => index >= 0);
  if (usable.length === 0) return { route, trimmedStartM: 0, trimmedEndM: 0, droppedStops: 0 };

  const firstIndex = usable[0];
  const lastIndex = usable[usable.length - 1];
  let trimmedStartM = 0;
  let trimmedEndM = 0;
  let droppedStops = 0;

  const headAnchor = dayCoords(days[firstIndex])[0];
  const head = applyHead(days[firstIndex], cap);
  trimmedStartM = head.removedM;
  const headDay = dropStopsInside(
    head.day,
    { lat: headAnchor[1], lng: headAnchor[0] },
    trimmedStartM,
    trimmedStartM,
  );
  droppedStops += head.day.stops.length - headDay.stops.length;
  days[firstIndex] = headDay;

  const tailCoordsBefore = dayCoords(days[lastIndex]);
  const tailAnchor = tailCoordsBefore[tailCoordsBefore.length - 1];
  const tail = applyTail(days[lastIndex], cap);
  trimmedEndM = tail.removedM;
  const tailDay = dropStopsInside(
    tail.day,
    { lat: tailAnchor[1], lng: tailAnchor[0] },
    trimmedEndM,
    trimmedEndM,
  );
  droppedStops += tail.day.stops.length - tailDay.stops.length;
  days[lastIndex] = tailDay;

  days.forEach((day, index) => {
    days[index] = { ...day, stops: renumber(day.stops) };
  });

  const firstCoord = dayCoords(days[firstIndex])[0];
  const totalDistanceKm = Math.round(days.reduce((sum, day) => sum + pathKm(dayCoords(day)), 0) * 10) / 10;

  return {
    route: {
      ...route,
      days,
      totalDistanceKm,
      origin: firstCoord ? { lat: firstCoord[1], lng: firstCoord[0] } : route.origin,
    },
    trimmedStartM,
    trimmedEndM,
    droppedStops,
  };
}

/**
 * Rotada ham iz alanı var mı? Savunma denetimi: yanlışlıkla `AtlasTrack`
 * alanları taşıyan bir nesne yayına girmesin. Dönen liste boşsa yayın güvenli.
 */
export function routeLeaksRawTrack(value: unknown): string[] {
  const leaks: string[] = [];
  const walk = (node: unknown, path: string, depth: number): void => {
    if (depth > 6 || node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`, depth + 1));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      const childPath = path ? `${path}.${key}` : key;
      if ((RAW_TRACK_FIELDS as readonly string[]).includes(key)) leaks.push(childPath);
      walk(child, childPath, depth + 1);
    }
  };
  walk(value, "", 0);
  return leaks;
}

export interface TrackShareRequest {
  /** Kullanıcı açıkça "kaydet/paylaş" dedi mi? */
  userInitiated: boolean;
  visibility: RouteVisibility;
  /** private dışı görünürlük için ayrı onay. */
  shareConsent?: boolean;
  /** Başlangıç/bitişten kırpılacak metre. Varsayılan `DEFAULT_TRIM_METERS`. */
  trimEndsMeters?: number;
}

export type TrackShareDecision =
  | {
      ok: true;
      route: AtlasRoute;
      visibility: RouteVisibility;
      trimmedStartM: number;
      trimmedEndM: number;
      droppedStops: number;
      warnings: string[];
    }
  | { ok: false; reason: string };

/**
 * Yayın kararı. Ham izi **dışarıda bırakır**: dönen nesnede `track` yoktur,
 * yalnız paylaşılabilir taslak rota vardır.
 */
export function resolveTrackShare(route: AtlasRoute, request: TrackShareRequest): TrackShareDecision {
  if (!request.userInitiated) {
    return { ok: false, reason: "Ham iz yalnız senin açık kaydetme eyleminle paylaşılabilir." };
  }
  const leaks = routeLeaksRawTrack(route);
  if (leaks.length > 0) {
    return {
      ok: false,
      reason: `Yalnız taslak rota paylaşılabilir; ham iz alanları taşınıyor (${leaks.slice(0, 3).join(", ")}).`,
    };
  }
  if (request.visibility !== "private" && request.shareConsent !== true) {
    return {
      ok: false,
      reason: "Bağlantıyla veya herkese açık paylaşım ayrı bir onay ister. Önce paylaşım kutusunu işaretle.",
    };
  }

  const requested = request.trimEndsMeters ?? DEFAULT_TRIM_METERS;
  if (!Number.isFinite(requested) || requested < 0) {
    return { ok: false, reason: "Kırpma mesafesi geçersiz." };
  }
  const warnings: string[] = [];
  if (requested > MAX_TRIM_METERS) {
    warnings.push(`Kırpma en fazla ${MAX_TRIM_METERS} m olabilir; bu değer uygulandı.`);
  }
  const trimmed = trimRouteEnds(route, requested);
  if (requested > 0 && trimmed.trimmedStartM === 0 && trimmed.trimmedEndM === 0) {
    warnings.push("Rota kırpma için çok kısa; geometri olduğu gibi kaldı.");
  }
  if (trimmed.droppedStops > 0) {
    warnings.push(`Kırpılan bölgede ${trimmed.droppedStops} durak vardı; rota ile tutarlı olsun diye çıkarıldı.`);
  }

  return {
    ok: true,
    route: trimmed.route,
    visibility: request.visibility,
    trimmedStartM: trimmed.trimmedStartM,
    trimmedEndM: trimmed.trimmedEndM,
    droppedStops: trimmed.droppedStops,
    warnings,
  };
}
