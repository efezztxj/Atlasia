import { haversineKm } from "./geo";
import type { AtlasRoute, LegMode, RouteLeg } from "../types";

/**
 * Adım 10 — Erişim tipi duraklar + bacak modu
 * Bacak bazlı mesafe ve hız: tek global katsayı yok, her moda göre ayrı.
 * Park yeri bir yer olarak modellenir (kapasite/ücret/son 200m toprak notu).
 */

export const LEG_SPEED_KMH: Record<LegMode, number> = {
  walking: 4,
  cycling: 12,
  driving: 35,
  transit: 18,
  trail: 3,
  offroad: 2.2,
  descent: 2,
};

export const LEG_COEFFICIENT: Record<LegMode, number> = {
  walking: 1.25,
  cycling: 1.2,
  driving: 1.0,
  transit: 1.1,
  trail: 1.35,
  offroad: 1.4,
  descent: 1.15,
};

export const LEG_LABEL: Record<LegMode, string> = {
  walking: "Yürüyüş (kaplı)",
  cycling: "Bisiklet",
  driving: "Araç",
  transit: "Toplu taşıma",
  trail: "Patika",
  offroad: "Arazı",
  descent: "İniş (patikasız)",
};

export function distanceForLeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  mode: LegMode,
): number {
  const raw = haversineKm(a.lat, a.lng, b.lat, b.lng);
  const coeff = LEG_COEFFICIENT[mode] ?? 1.25;
  return raw * coeff;
}

export function durationForLeg(distanceKm: number, mode: LegMode): number {
  const speed = LEG_SPEED_KMH[mode] ?? 4;
  if (distanceKm < 0.08) return 0;
  const minutes = (distanceKm / speed) * 60;
  return Math.max(3, Math.round(minutes));
}

export function totalStatsForLegs(
  legs: { distanceKm: number; durationMinutes: number }[],
): { totalDistanceKm: number; totalDurationMinutes: number } {
  const totalDistanceKm = legs.reduce((s, l) => s + l.distanceKm, 0);
  const totalDurationMinutes = legs.reduce((s, l) => s + l.durationMinutes, 0);
  return {
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalDurationMinutes: Math.round(totalDurationMinutes),
  };
}

/**
 * Verilen koordinat dizisi ve mod için bacak oluştur.
 * Koordinatlar en az 2 nokta içermeli; bacak mesafesi haversine×katsayı ile hesaplanır.
 */
export function createLeg(
  id: string,
  coords: [number, number][],
  mode: LegMode,
): { id: string; distanceKm: number; durationMinutes: number; coords: [number, number][]; mode: LegMode } {
  if (coords.length < 2) throw new Error("Bacak en az 2 koordinat gerektirir");
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lngA, latA] = coords[i - 1];
    const [lngB, latB] = coords[i];
    dist += distanceForLeg({ lat: latA, lng: lngA }, { lat: latB, lng: lngB }, mode);
  }
  const durationMinutes = durationForLeg(dist, mode);
  return { id, coords, mode, distanceKm: Math.round(dist * 10) / 10, durationMinutes };
}

/** Eski global formüle göre süre karşılaştırması (yanlışlık göstermek için) */
export function legacyDuration(distanceKm: number): number {
  const raw = distanceKm / 1.25; // haversine geri
  return Math.max(3, Math.round((raw * 1.25) / 4 * 60)); // walking 4 km/h global
}

/**
 * Haritada bacak bazlı (mod ayrımlı) çizim için rotanın tüm bacakları.
 * Her günün geçerli bacağı (en az 2 nokta) yoksa `null` döner ve çağıran
 * düz çizgiye düşer: yarım bacaklı karışık çizim yanıltıcı olurdu.
 */
export function routeDrawLegs(route: AtlasRoute): RouteLeg[] | null {
  if (route.days.length === 0) return null;
  const legs: RouteLeg[] = [];
  for (const day of route.days) {
    const valid = (day.legs ?? []).filter((leg) => leg.coords.length >= 2);
    if (valid.length === 0) return null;
    legs.push(...valid);
  }
  return legs;
}
