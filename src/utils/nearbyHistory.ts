import type { Place } from "../types";
import { haversineKm } from "./geo";

/** P14: yer detayındaki "Yakındaki tarihî yerler" listesinin saf sıralama/biçim kuralları. */
export const NEARBY_HISTORY_MAX = 60;
export const NEARBY_HISTORY_PREVIEW = 6;

export type Nearby = { place: Place; km: number };

export function pickNearby(origin: Place, places: Place[], max = NEARBY_HISTORY_MAX): Nearby[] {
  return places
    .filter((candidate) => candidate.id !== origin.id && candidate.title.trim().toLocaleLowerCase("tr") !== origin.title.trim().toLocaleLowerCase("tr"))
    .map((candidate) => ({ place: candidate, km: haversineKm(origin.lat, origin.lng, candidate.lat, candidate.lng) }))
    .sort((a, b) => {
      const rank = (place: Place) => place.historyVerification?.status === "corroborated" ? 2 : place.historySource ? 1 : 0;
      return rank(b.place) - rank(a.place) || a.km - b.km;
    })
    .slice(0, max);
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m` : `${km.toFixed(1)} km`;
}

