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

/**
 * Tarihçe içerik politikası (P14) — tek yer:
 * - Dil: önce Türkçe, yoksa İngilizce madde; başka dil kullanılmaz.
 * - Eşleştirme: yalnız OSM `wikipedia`/`wikidata` etiketi. Etiket yoksa isim
 *   ya da konum yakınlığıyla tahmin YAPILMAZ (yanlış yere yanlış tarihçe).
 * - Uzunluk: özet en fazla HISTORY_SUMMARY_MAX_CHARS, cümle sınırında kesilir.
 * - Atıf: her özetle madde adı, adresi ve CC BY-SA 4.0 lisansı taşınır.
 */
export const HISTORY_SUMMARY_LANGS = ["tr", "en"] as const;
export const HISTORY_SUMMARY_MAX_CHARS = 600;
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors (ODbL)";
export const WIKIPEDIA_LICENSE = "CC BY-SA 4.0";
type HistoryLang = (typeof HISTORY_SUMMARY_LANGS)[number];

function isHistoryLang(value: string): value is HistoryLang {
  return (HISTORY_SUMMARY_LANGS as readonly string[]).includes(value);
}

/** Wikipedia özetini politika uzunluğuna indirir; mümkünse cümle sonunda keser. */
export function clampSummary(text: string, max = HISTORY_SUMMARY_MAX_CHARS): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd >= max * 0.5) return cut.slice(0, sentenceEnd + 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 0 ? space : max).trimEnd()}…`;
}

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
const wikiSummaryCache = new Map<string, { summary: WikiSummary; at: number }>();
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

function getCached(center: { lat: number; lng: number }, radius: number, allowStale = false): MemoryEntry | null {
  const id = cacheIdFor(center, radius);
  const mem = memoryCache.get(id);
  if (mem && Date.now() - mem.fetchedAt < MEMORY_TTL_MS) return mem;
  const store = readPersistent();
  const entry = store[id] ?? (allowStale ? mem : undefined);
  if (!entry) return null;
  // Süresi geçmiş kayıt yalnız ağ hatasında "eski veri" olarak kullanılır (stale-while-error).
  if (allowStale) return entry;
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

export function buildOverpassQuery(lat: number, lng: number, radius: number) {
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

interface WikiSummary { text: string; title: string; lang: HistoryLang; url: string }

async function fetchWikipediaSummary(lang: HistoryLang, title: string, signal?: AbortSignal): Promise<WikiSummary | null> {
  const key = wikiCacheKey(lang, title);
  const cached = wikiSummaryCache.get(key);
  if (cached && Date.now() - cached.at < WIKI_CACHE_TTL) return cached.summary;
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  try {
    const res = await fetchWithTimeout(url, signal, WIKI_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = (await res.json()) as { extract?: string; title?: string; type?: string; content_urls?: { desktop?: { page?: string } } };
    // Anlam ayrımı sayfası tarihçe değildir.
    if (data.type === "disambiguation") return null;
    const text = clampSummary(data.extract ?? "");
    if (text.length < 20) return null;
    const pageTitle = data.title?.trim() || title;
    const summary: WikiSummary = {
      text,
      title: pageTitle,
      lang,
      url: data.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`,
    };
    wikiSummaryCache.set(key, { summary, at: Date.now() });
    return summary;
  } catch {
    return null;
  }
}

async function fetchWikidataSitelink(qid: string, signal?: AbortSignal): Promise<{ lang: HistoryLang; title: string } | null> {
  if (!/^Q\d+$/.test(qid)) return null;
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(qid)}&props=sitelinks&format=json&origin=*`;
  try {
    const res = await fetchWithTimeout(url, signal, WIKI_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = (await res.json()) as { entities?: Record<string, { sitelinks?: Record<string, { title: string }> }> };
    const links = data.entities?.[qid]?.sitelinks;
    if (!links) return null;
    for (const lang of HISTORY_SUMMARY_LANGS) {
      const link = links[`${lang}wiki`];
      if (link?.title) return { lang, title: link.title };
    }
    return null;
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
      let summary: WikiSummary | null = null;
      try {
        const raw = tags?.wikipedia ?? "";
        const sep = raw.indexOf(":");
        const tagLang = sep > 0 ? raw.slice(0, sep) : "";
        // Etiketteki madde politika dilindeyse doğrudan; değilse wikidata'dan tr/en bağlantısı aranır.
        if (sep > 0 && isHistoryLang(tagLang)) summary = await fetchWikipediaSummary(tagLang, raw.slice(sep + 1), signal);
        if (!summary && tags?.wikidata) {
          const link = await fetchWikidataSitelink(tags.wikidata.split(";")[0].trim(), signal);
          if (link) summary = await fetchWikipediaSummary(link.lang, link.title, signal);
        }
        // Etiket yoksa tahmin yok: konum/isim yakınlığıyla madde aranmaz.
      } catch {
        summary = null;
      }
      if (summary) {
        enriched[idx] = {
          ...place,
          story: summary.text,
          dataSources: [OSM_ATTRIBUTION, `Wikipedia (${summary.lang}): ${summary.title} — ${WIKIPEDIA_LICENSE}`],
          historySource: { name: "Wikipedia", title: summary.title, url: summary.url, license: WIKIPEDIA_LICENSE, lang: summary.lang },
        };
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

export type HistoricFetchStatus = "fresh" | "cache" | "fixture" | "stale" | "error";

export interface HistoricFetchResult {
  places: Place[];
  status: HistoricFetchStatus;
  /** "stale" ve "error" durumlarında kullanıcıya gösterilecek Türkçe açıklama. */
  message?: string;
}

const STALE_MESSAGE = "Bağlantı kurulamadı; tarihî yerler daha önce kaydedilen (eski olabilir) veriden gösteriliyor.";
const ERROR_MESSAGE = "Tarihî yer listesi şu an alınamıyor. Bağlantını kontrol edip tekrar dene.";

/**
 * Ana giriş: Overpass envanteri + Wikidata/Wikipedia tarihçesi.
 * - Yarıçap 200-2000m arası, agresif değil.
 * - Bellek + localStorage önbellek (7 gün); aynı bölge için tekrar sorgu yok.
 * - Ağ hatasında süresi geçmiş kayıt "stale" olarak döner; hiç kayıt yoksa
 *   "error" + mesaj döner — hata sessiz boş listeye dönüşmez.
 * - Efes için çevrimdışı fixture döndürür (kanıt).
 */
export async function fetchHistoricSitesDetailed(
  center: { lat: number; lng: number },
  radiusM = 1200,
  signal?: AbortSignal,
): Promise<HistoricFetchResult> {
  const radius = Math.min(Math.max(200, Math.round(radiusM)), MAX_RADIUS_M);

  const cached = getCached(center, radius);
  if (cached) return { places: cached.places, status: "cache" };

  if (isEphesusArea(center)) {
    const places = EPHESUS_HISTORIC_SITES.map((p) => ({ ...p }));
    setCached(center, radius, places, [OSM_ATTRIBUTION, `Wikipedia contributors (${WIKIPEDIA_LICENSE})`]);
    return { places, status: "fixture" };
  }

  try {
    const rawPlaces = await fetchOverpass(center, radius, signal);
    if (rawPlaces.length === 0) {
      setCached(center, radius, [], [OSM_ATTRIBUTION]); // negatif önbellek
      return { places: [], status: "fresh" };
    }
    const enriched = await enrichPlacesWithWikipedia(rawPlaces, signal);
    const dataSources = enriched.some((p) => p.historySource)
      ? [OSM_ATTRIBUTION, `Wikipedia contributors (${WIKIPEDIA_LICENSE})`]
      : [OSM_ATTRIBUTION];
    setCached(center, radius, enriched, dataSources);
    return { places: enriched, status: "fresh" };
  } catch (error) {
    if (signal?.aborted) throw error;
    const stale = getCached(center, radius, true);
    if (stale) return { places: stale.places, status: "stale", message: STALE_MESSAGE };
    return { places: [], status: "error", message: ERROR_MESSAGE };
  }
}

/** Geriye uyumlu kısa yol: yalnız yer listesi. Durum/mesaj için fetchHistoricSitesDetailed. */
export async function fetchHistoricSites(
  center: { lat: number; lng: number },
  radiusM = 1200,
  signal?: AbortSignal,
): Promise<Place[]> {
  return (await fetchHistoricSitesDetailed(center, radiusM, signal)).places;
}

/** Efes özelinde hızlı erişim: doğrudan fixture */
export function getEphesusFixture(): Place[] {
  return EPHESUS_HISTORIC_SITES.map((p) => ({ ...p }));
}

export function getHistoricDataSources(): string[] {
  return [OSM_ATTRIBUTION, `Wikipedia contributors (${WIKIPEDIA_LICENSE})`];
}

export const HISTORIC_OVERPASS_QUERY_EXAMPLE = buildOverpassQuery(EPHESUS_CENTER.lat, EPHESUS_CENTER.lng, 1200);
