import type { Place, RouteBrief, TransportMode } from "../types";
import { haversineKm } from "./geo";
import { normalize } from "./text";

const PHOTON_ENDPOINT = ((import.meta.env.VITE_GEOCODER_URL as string | undefined) || "https://photon.komoot.io").replace(/\/$/, "");
const cache = new Map<string, Place[]>();

type SearchKind = "museum" | "historic" | "park" | "viewpoint" | "food" | "beach" | "camp";

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
  };
}

export function openMapRadiusKm(transport: TransportMode) {
  return transport === "walking" ? 4.5 : transport === "cycling" ? 12 : transport === "transit" ? 18 : 30;
}

function accepted(kind: SearchKind, key = "", value = "") {
  if (kind === "museum") return key === "tourism" && ["museum", "gallery", "artwork"].includes(value);
  if (kind === "historic") return key === "historic";
  if (kind === "park") return (key === "leisure" && ["park", "garden", "nature_reserve"].includes(value)) || (key === "natural" && value === "wood");
  if (kind === "viewpoint") return key === "tourism" && value === "viewpoint";
  if (kind === "food") return key === "amenity" && ["restaurant", "cafe", "marketplace"].includes(value);
  if (kind === "beach") return key === "natural" && value === "beach";
  return key === "tourism" && value === "camp_site";
}

function categoryOf(kind: SearchKind): Place["category"] {
  if (kind === "museum" || kind === "historic") return "history";
  if (kind === "park") return "nature";
  if (kind === "viewpoint") return "photo";
  if (kind === "food") return "food";
  if (kind === "beach") return "beaches";
  return "camp";
}

function noteFor(category: Place["category"], name: string) {
  const kind = category === "history" ? "tarihî veya kültürel bir nokta"
    : category === "nature" ? "park ya da doğa noktası"
      : category === "photo" ? "seyir ve fotoğraf noktası"
        : category === "food" ? "yeme-içme noktası"
          : category === "beaches" ? "kıyı noktası"
            : "kamp noktası";
  return `${name}, OpenStreetMap verisinde ${kind} olarak işaretli. Güncel erişim, çalışma saati, ücret ve saha koşullarını gitmeden doğrula.`;
}

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Open map service ${response.status}`);
  return await response.json() as T;
}

function termsFor(brief: RouteBrief): { kind: SearchKind; query: string }[] {
  const terms: { kind: SearchKind; query: string }[] = [
    { kind: "museum", query: "museum" },
    { kind: "historic", query: "historic" },
    { kind: "park", query: "park" },
  ];
  if (!brief.interests.length || brief.interests.some((value) => ["Fotoğraf", "Doğa", "Gizli Yerler", "Manzara"].includes(value))) terms.push({ kind: "viewpoint", query: "viewpoint" });
  if (brief.interests.includes("Yemek")) terms.push({ kind: "food", query: "restaurant" });
  if (brief.interests.includes("Plaj")) terms.push({ kind: "beach", query: "beach" });
  if (brief.interests.includes("Kamp")) terms.push({ kind: "camp", query: "campground" });
  return terms;
}

export async function fetchOpenMapPlaces(
  center: { lat: number; lng: number },
  brief: RouteBrief,
  signal?: AbortSignal,
): Promise<Place[]> {
  const radius = openMapRadiusKm(brief.transport);
  const key = `${center.lat.toFixed(2)},${center.lng.toFixed(2)}:${radius}:${brief.interests.slice().sort().join("|")}`;
  const saved = cache.get(key);
  if (saved) return saved;

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  signal?.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(abort, 9000);
  const lat = Number(center.lat.toFixed(3));
  const lng = Number(center.lng.toFixed(3));

  try {
    const reverse = await readJson<{ features?: PhotonFeature[] }>(`${PHOTON_ENDPOINT}/reverse?lat=${lat}&lon=${lng}&limit=1&lang=en`, controller.signal);
    const area = reverse.features?.[0]?.properties;
    const locality = area?.city || area?.district || area?.state || area?.country;
    if (!locality) throw new Error("Nearby area could not be resolved");

    const searches = await Promise.allSettled(termsFor(brief).map(async ({ kind, query }) => {
      const q = encodeURIComponent(`${query} ${locality}`);
      const data = await readJson<{ features?: PhotonFeature[] }>(`${PHOTON_ENDPOINT}/api/?q=${q}&lat=${lat}&lon=${lng}&limit=25&lang=en`, controller.signal);
      return { kind, features: data.features ?? [] };
    }));

    const seen = new Set<string>();
    const places: Place[] = [];
    for (const result of searches) {
      if (result.status !== "fulfilled") continue;
      const { kind, features } = result.value;
      for (const feature of features) {
        const p = feature.properties;
        const coords = feature.geometry?.coordinates;
        const title = p?.name?.trim();
        if (!p || !coords || !title || !accepted(kind, p.osm_key, p.osm_value) || !coords.every(Number.isFinite)) continue;
        const [placeLng, placeLat] = coords;
        const distance = haversineKm(center.lat, center.lng, placeLat, placeLng);
        if (distance > radius * 1.05) continue;
        const dedupe = `${normalize(title)}:${placeLat.toFixed(3)},${placeLng.toFixed(3)}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        const category = categoryOf(kind);
        const region = [p.city || p.district, p.state, p.country].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(" · ");
        places.push({
          id: `osm-route-${p.osm_type ?? "x"}-${p.osm_id ?? dedupe}`,
          title,
          region: region || "Yakındaki açık harita noktası",
          category,
          lng: placeLng,
          lat: placeLat,
          note: noteFor(category, title),
          author: "OpenStreetMap katkıcıları",
          kind: "guide",
        });
      }
    }

    places.sort((a, b) => haversineKm(center.lat, center.lng, a.lat, a.lng) - haversineKm(center.lat, center.lng, b.lat, b.lng));
    const limited = places.slice(0, 60);
    if (!limited.length && searches.every((result) => result.status === "rejected")) throw new Error("Open map search unavailable");
    cache.set(key, limited);
    return limited;
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
