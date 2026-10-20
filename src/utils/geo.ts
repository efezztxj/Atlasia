import type { Place } from "../types";
import { isWithinNorthernCyprus, KKTC_NAME } from "../data/regions";
import { normalize } from "./text";

export { normalize } from "./text";

export interface SearchResult {
  id: string;
  label: string;
  sub: string;
  lng: number;
  lat: number;
  /** [west, south, east, north] */
  bbox?: [number, number, number, number];
  place?: Place;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: { osm_id?: number; osm_type?: string; name?: string; city?: string; district?: string; state?: string; country?: string; extent?: [number, number, number, number] };
}

/** Pure Photon-to-Atlasia mapping seam; Photon extents are already west,south,east,north. */
export function toSearchResult(feature: PhotonFeature, queryText: string, index = 0): SearchResult {
  const [lng, lat] = feature.geometry.coordinates;
  const properties = feature.properties;
  return {
    id: `osm-${properties.osm_type}-${properties.osm_id ?? index}`,
    label: properties.name ?? properties.city ?? queryText,
    sub: isWithinNorthernCyprus(lng, lat)
      ? KKTC_NAME
      : [properties.city, properties.state, properties.country].filter(Boolean).join(" · "),
    lng,
    lat,
    bbox: properties.extent,
  };
}

const endpoint = ((import.meta.env.VITE_GEOCODER_URL as string | undefined) || "https://photon.komoot.io").replace(/\/$/, "");
const searchCache = new Map<string, SearchResult[]>();
const reverseCache = new Map<string, string>();

async function json<T>(url: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 6500);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Geocoding ${response.status}`);
    return await response.json() as T;
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}

export async function searchWorld(q: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const key = normalize(q.trim());
  if (searchCache.has(key)) return searchCache.get(key)!;
  try {
    const data = await json<{ features: PhotonFeature[] }>(`${endpoint}/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`, signal);
    const results = data.features
      .filter((feature) => feature.geometry?.coordinates?.every(Number.isFinite))
      .map((feature, index) => toSearchResult(feature, q, index));
    if (results.length) { searchCache.set(key, results); return results; }
  } catch (failure) { if (signal?.aborted) throw failure; }
  const fallback = await json<{ results?: { id: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string }[] }>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=tr&format=json`, signal);
  const results = (fallback.results ?? []).map((item) => ({ id: `city-${item.id}`, label: item.name, sub: [item.admin1, item.country].filter(Boolean).join(" · "), lng: item.longitude, lat: item.latitude }));
  searchCache.set(key, results);
  return results;
}

export async function reverseName(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (reverseCache.has(key)) return reverseCache.get(key)!;
  const north = isWithinNorthernCyprus(lng, lat);
  try {
    const data = await json<{ features: PhotonFeature[] }>(`${endpoint}/reverse?lat=${lat}&lon=${lng}&limit=1&lang=en`, signal);
    if (signal?.aborted) return null;
    const p = data.features[0]?.properties;
    const name = p ? [p.city ?? p.district ?? p.state ?? p.name, north ? KKTC_NAME : p.country].filter(Boolean).join(" · ") : north ? KKTC_NAME : null;
    if (name) reverseCache.set(key, name);
    return name;
  } catch { return north ? KKTC_NAME : null; }
}

export const formatCoords = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? "K" : "G"}, ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? "D" : "B"}`;
