import type { Place } from "../types";
import { haversineKm } from "./geo";
import { EPHESUS_CENTER, EPHESUS_HISTORIC_SITES } from "../data/ephesusFixture";

/**
 * Adım 7 — Overpass envanteri + Wikidata/Wikipedia tarihçesi
 * KARAR (f) BAĞLI: Overpass + Wikidata/Wikipedia (elle içerik ve LLM yok)
 * ODbL + CC BY-SA atıf ZORUNLU (dataSources alanı), agresif sorgu yok, önbellek var.
 * OSM note'u tarihçe sanılmaz (antipattern E).
 */

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const CACHE_KEY = "atlasia.historic.cache.v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MEMORY_TTL_MS = 30 * 60 * 1000;
const MAX_RADIUS_M = 2000;
const FETCH_TIMEOUT_MS = 9000;
const WIKI_TIMEOUT_MS = 6500;

interface CacheStore {
  [cacheId: string]: { places: Place[]; fetchedAt: number; dataSources: string[] };
}

interface MemoryEntry {
  places: Place[];
  fetchedAt: number;
  dataSources: string[];
}

const memoryCache = new Map<string, MemoryEntry>();

// Wikipedia özet önbelleği (başlık → metin)
const wikiSummaryCache = new Map<string, { text: string; at: number }>();
const WIKI_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function cacheIdFor(center: { lat: number; lng: number }, radius: number) {
  return `${center.lat.toFixed(3)},${center.lng.toFixed(3)}:${Math.round(radius)}`;
}

function isEphesusArea(center: { lat: number; lng: number }) {
  const d = haversineKm(center.lat, center.lng, EPHESUS_CENTER.lat, EPHESUS_CENTER.lng);
  return d <= 5;
}

function noteForHistoric(name: string) {
  return `${name}, OpenStreetMap verisinde tarihî veya kültürel bir nokta olarak işaretli. Güncel erişim, çalışma saati, ücret ve saha koşullarını gitmeden doğrula.`;
}

function readPersistent(): CacheStore {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(CACHE_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheStore;
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

function writePersistent(store: CacheStore) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch (error) {
    void error;
  }
}

function getCached(center: { lat: number; lng: number }, radius: number): MemoryEntry | null {
  const id = cacheIdFor(center, radius);
  const mem = memoryCache.get(id);
  if (mem && Date.now() - mem.fetchedAt < MEMORY_TTL_MS) return mem;
  const store = readPersistent();
  const entry = store[id];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  memoryCache.set(id, entry);
  return entry;
}

function setCached(center: { lat: number; lng: number }, radius: number, places: Place[], dataSources: string[]) {
  const id = cacheIdFor(center, radius);
  const entry: MemoryEntry = { places, fetchedAt: Date.now(), dataSources };
  memoryCache.set(id, entry);
  const store = readPersistent();
  store[id] = entry;
  // LRU: keep last 20 entries
  const keys = Object.keys(store);
  if (keys.length > 20) {
    const sorted = keys.sort((a, b) => (store[a].fetchedAt ?? 0) - (store[b].fetchedAt ?? 0));
    for (let i = 0; i < keys.length - 20; i++) delete store[sorted[i]];
  }
  writePersistent(store);
}

export function clearHistoricCache() {
  memoryCache.clear();
  wikiSummaryCache.clear();
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    void error;
  }
}

function buildOverpassQuery(lat: number, lng: number, radius: number) {
  const r = Math.min(Math.max(200, Math.round(radius)), MAX_RADIUS_M);
  return `[out:json][timeout:25];(node["historic"](around:${r},${lat},${lng});way["historic"](around:${r},${lat},${lng});relation["historic"](around:${r},${lat},${lng}););out center;`;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

function titleForElement(el: OverpassElement): string {
  const tags = el.tags ?? {};
  const raw =
    tags.name?.trim() ||
    tags["name:tr"]?.trim() ||
    tags["name:en"]?.trim() ||
    tags["historic"]?.trim() ||
    tags.tourism?.trim() ||
    tags.amenity?.trim() ||
    "";
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
  return `Tarihî nokta #${el.id}`;
}

function coordsForElement(el: OverpassElement): { lat: number; lng: number } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lng: el.lon };
  if (el.center && Number.isFinite(el.center.lat) && Number.isFinite(el.center.lon)) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

function toPlace(el: OverpassElement): Place | null {
  const coords = coordsForElement(el);
  if (!coords) return null;
  const title = titleForElement(el);
  return {
    id: `osm-historic-${el.type}-${el.id}`,
    title,
    region: "Açık harita tarihî noktası",
    category: "history",
    lng: coords.lng,
    lat: coords.lat,
    note: noteForHistoric(title),
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)"],
  };
}

async function fetchWithTimeout(url: string, signal: AbortSignal | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    return res;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function fetchOverpass(center: { lat: number; lng: number }, radius: number, signal?: AbortSignal): Promise<Place[]> {
  const query = buildOverpassQuery(center.lat, center.lng, radius);
  const url = `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, signal, FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = (await res.json()) as OverpassResponse;
  const elements = data.elements ?? [];
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const el of elements) {
    const place = toPlace(el);
    if (!place) continue;
    const dedupe = `${place.title.toLowerCase()}:${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    // enrich tags for later Wikipedia step: carry wikidata/wikipedia if present
    const tags = el.tags ?? {};
    const extra: Record<string, string> = {};
    if (tags.wikidata) extra.wikidata = tags.wikidata;
    if (tags.wikipedia) extra.wikipedia = tags.wikipedia;
    // attach via hidden property on Place (we use casting to store, but keep type safe via extra field)
    // We store in a parallel map; simpler: encode in id check later via title match, but we want to keep tags.
    // We'll stash via (place as Place & { _tags?: Record<string,string> })["_tags"]
    (place as Place & { _wikiTags?: Record<string, string> })._wikiTags = extra;
    places.push(place);
    if (places.length >= 60) break;
  }
  // nazik sıralama: merkeze yakınlık
  places.sort((a, b) => haversineKm(center.lat, center.lng, a.lat, a.lng) - haversineKm(center.lat, center.lng, b.lat, b.lng));
  return places;
}

// ---- Wikipedia helpers ----

function wikiCacheKey(lang: string, title: string) {
  return `${lang}:${title.toLowerCase()}`;
}

async function fetchWikipediaSummary(lang: string, title: string, signal?: AbortSignal): Promise<string | null> {
  const key = wikiCacheKey(lang, title);
  const cached = wikiSummaryCache.get(key);
  if (cached && Date.now() - cached.at < WIKI_CACHE_TTL) return cached.text;
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetchWithTimeout(url, signal, WIKI_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = (await res.json()) as { extract?: string; extract_html?: string; description?: string };
    const text = (data.extract ?? "").trim();
    if (text.length < 20) return null;
    wikiSummaryCache.set(key, { text, at: Date.now() });
    return text;
  } catch {
    return null;
  }
}

async function fetchWikidataSitelink(qid: string, signal?: AbortSignal): Promise<{ lang: string; title: string } | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(qid)}&props=sitelinks&format=json&origin=*`;
  try {
    const res = await fetchWithTimeout(url, signal, WIKI_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = (await res.json()) as { entities?: Record<string, { sitelinks?: Record<string, { title: string }> }> };
    const entity = data.entities?.[qid];
    const links = entity?.sitelinks;
    if (!links) return null;
    // prefer trwiki, then enwiki
    const candidates = ["trwiki", "enwiki", "dewiki", "frwiki"];
    for (const key of candidates) {
      const link = links[key];
      if (link?.title) {
        const lang = key.replace("wiki", "");
        return { lang, title: link.title };
      }
    }
    // fallback first available
    const first = Object.entries(links)[0];
    if (first) {
      const lang = first[0].replace("wiki", "");
      return { lang, title: first[1].title };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchGeosearchSummary(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=1000&gslimit=3&format=json&origin=*`;
  try {
    const res = await fetchWithTimeout(url, signal, WIKI_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = (await res.json()) as { query?: { geosearch?: { title: string }[] } };
    const first = data.query?.geosearch?.[0]?.title;
    if (!first) return null;
    return await fetchWikipediaSummary("en", first, signal);
  } catch {
    return null;
  }
}

async function enrichPlacesWithWikipedia(places: Place[], signal?: AbortSignal): Promise<Place[]> {
  // concurrency control: max 3 at a time, max 15 total
  const limit = Math.min(places.length, 15);
  const enriched: Place[] = [...places];
  let cursor = 0;

  async function worker() {
    while (cursor < limit) {
      const idx = cursor++;
      const place = enriched[idx];
      const tags = (place as Place & { _wikiTags?: Record<string, string> })._wikiTags;
      let summary: string | null = null;
      try {
        if (tags?.wikipedia) {
          const raw = tags.wikipedia;
          const sep = raw.indexOf(":");
          if (sep > 0) {
            const lang = raw.slice(0, sep);
            const title = raw.slice(sep + 1);
            summary = await fetchWikipediaSummary(lang, title, signal);
          } else {
            summary = await fetchWikipediaSummary("en", raw, signal);
          }
        } else if (tags?.wikidata) {
          const qid = tags.wikidata.split(";")[0].trim();
          const link = await fetchWikidataSitelink(qid, signal);
          if (link) summary = await fetchWikipediaSummary(link.lang, link.title, signal);
        }
        if (!summary) {
          // fallback geosearch near coords
          summary = await fetchGeosearchSummary(place.lat, place.lng, signal);
        }
      } catch {
        summary = null;
      }
      if (summary && summary.length >= 20) {
        enriched[idx] = {
          ...place,
          story: summary,
          dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
        };
      } else {
        // keep ODbL only, but ensure story not empty for fallback? Keep original note as disclaimer,
        // story will remain undefined -> but for offline fixture we already have stories.
        // We do not fabricate LLM content.
      }
      // temizle internal tag
      delete (enriched[idx] as Place & { _wikiTags?: unknown })._wikiTags;
    }
  }

  const workers = Array.from({ length: Math.min(3, limit) }, () => worker());
  await Promise.all(workers);
  // temizle kalan tag'ler
  for (let i = limit; i < enriched.length; i++) {
    delete (enriched[i] as Place & { _wikiTags?: unknown })._wikiTags;
    // for non-enriched beyond limit, also ensure dataSources
    if (!enriched[i].dataSources) enriched[i].dataSources = ["© OpenStreetMap contributors (ODbL)"];
  }
  return enriched;
}

/**
 * Ana giriş: Overpass envanteri + Wikidata/Wikipedia tarihçesi.
 * - Yarıçap 200-2000m arası, agresif değil.
 * - Bellek + localStorage önbellek.
 * - Efes için çevrimdışı fixture döndürür (kanıt).
 */
export async function fetchHistoricSites(
  center: { lat: number; lng: number },
  radiusM = 1200,
  signal?: AbortSignal,
): Promise<Place[]> {
  const radius = Math.min(Math.max(200, Math.round(radiusM)), MAX_RADIUS_M);

  // 1) önbellek hit?
  const cached = getCached(center, radius);
  if (cached) return cached.places;

  // 2) Efes bölgesi için fixture önceliği (çevrimdışı kanıt, agresif sorgu yok)
  if (isEphesusArea(center)) {
    // Klonla, atıf zaten içinde
    const places = EPHESUS_HISTORIC_SITES.map((p) => ({ ...p }));
    const dataSources = ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"];
    setCached(center, radius, places, dataSources);
    return places;
  }

  // 3) Canlı Overpass + Wikipedia
  try {
    const rawPlaces = await fetchOverpass(center, radius, signal);
    if (rawPlaces.length === 0) {
      // boş sonuç da önbelleklenir (negatif cache)
      const dataSources = ["© OpenStreetMap contributors (ODbL)"];
      setCached(center, radius, [], dataSources);
      return [];
    }
    const enriched = await enrichPlacesWithWikipedia(rawPlaces, signal);
    const dataSources = enriched.some((p) => p.dataSources?.some((s) => s.includes("Wikipedia")))
      ? ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"]
      : ["© OpenStreetMap contributors (ODbL)"];
    setCached(center, radius, enriched, dataSources);
    return enriched;
  } catch (error) {
    // ağ hatasında önbellek varsa döndür, yoksa boş dön (fixture dışı bölgede)
    const fallback = getCached(center, radius);
    if (fallback) return fallback.places;
    if (signal?.aborted) throw error;
    return [];
  }
}

/** Efes özelinde hızlı erişim: doğrudan fixture */
export function getEphesusFixture(): Place[] {
  return EPHESUS_HISTORIC_SITES.map((p) => ({ ...p }));
}

export function getHistoricDataSources(): string[] {
  return ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"];
}

export const HISTORIC_OVERPASS_QUERY_EXAMPLE = buildOverpassQuery(EPHESUS_CENTER.lat, EPHESUS_CENTER.lng, 1200);
