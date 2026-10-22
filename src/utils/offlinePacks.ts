/**
 * P15 — Çevrimdışı saha paketi (indir · tahmin · sil).
 *
 * Lisans kararı (docs/denetim/p15-lisans.md):
 * - Yalnız OpenFreeMap vektör karoları paketlenir. Esri, CARTO ve AWS Terrain
 *   (DEM; çevrimdışı hakkı doğrulanmadı) paketlenmez.
 * - OpenFreeMap tek indirme tavanı: en çok 3.000 karo VEYA 50 MB, en çok 4 paralel istek.
 * - Her URL, offlineCache.isCacheableTile allowlist'inden geçmek zorundadır;
 *   allowlist burada genişletilmez.
 * - İndirme yalnız kullanıcı düğmeye bastığında başlar; tahmin önce gösterilir.
 */
import { isCacheableTile, isEsriTile, type BBox } from "./offlineCache";

export const PACK_CACHE_NAME = "atlasia-packs-v1";
export const PACK_INDEX_KEY = "atlasia.offlinePacks.v1";
export const OFM_TILEJSON_URL = "https://tiles.openfreemap.org/planet";

/** Tek sabit sınır: sağlayıcının resmi tavanı. Gevşetmeden önce p15-lisans.md güncellenmeli. */
export const OFFLINE_PACK_LIMITS = Object.freeze({
  maxTiles: 3000,
  maxBytes: 50 * 1024 * 1024,
  concurrency: 4,
  /** Tahmin için karo başına muhafazakâr ortalama (OFM z12–15 kent içi). */
  estimatedTileBytes: 40 * 1024,
  minZoom: 12,
  maxZoom: 15,
});

/** Harita çevrimdışı açılabilsin diye karolarla birlikte saklanan stil varlıkları. */
export const PACK_STYLE_ASSETS: readonly string[] = [
  OFM_TILEJSON_URL,
  "https://tiles.openfreemap.org/sprites/ofm_f384/ofm.json",
  "https://tiles.openfreemap.org/sprites/ofm_f384/ofm.png",
  "https://tiles.openfreemap.org/sprites/ofm_f384/ofm@2x.json",
  "https://tiles.openfreemap.org/sprites/ofm_f384/ofm@2x.png",
  "https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf",
  "https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/256-511.pbf",
];

const MAX_LAT = 85.0511287798;

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export type PackStatus = "complete" | "incomplete";

export interface OfflinePack {
  id: string;
  name: string;
  bbox: BBox;
  minZoom: number;
  maxZoom: number;
  template: string;
  createdAt: number;
  tiles: number;
  failed: number;
  bytes: number;
  status: PackStatus;
  /** Eksik paketin nedeni (Türkçe, kullanıcıya gösterilir). */
  note?: string;
}

export interface PackEstimate {
  tiles: number;
  bytes: number;
  ok: boolean;
  reason?: string;
}

const clampLat = (lat: number) => Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));

function lngToX(lng: number, z: number): number {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  return Math.max(0, Math.min(n - 1, x));
}

function latToY(lat: number, z: number): number {
  const n = 2 ** z;
  const rad = (clampLat(lat) * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return Math.max(0, Math.min(n - 1, y));
}

function normalizeLng(lng: number): number {
  if (lng >= -180 && lng <= 180) return lng;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** x aralıkları; antimeridyeni geçen kutu (west > east) iki aralığa bölünür. */
function xRanges(bbox: BBox, z: number): Array<[number, number]> {
  if (bbox.east - bbox.west >= 360) return [[0, 2 ** z - 1]];
  const west = normalizeLng(bbox.west);
  const east = normalizeLng(bbox.east);
  if (west <= east) return [[lngToX(west, z), lngToX(east, z)]];
  return [
    [lngToX(west, z), 2 ** z - 1],
    [0, lngToX(east, z)],
  ];
}

function yRange(bbox: BBox, z: number): [number, number] {
  const north = Math.max(bbox.north, bbox.south);
  const south = Math.min(bbox.north, bbox.south);
  return [latToY(north, z), latToY(south, z)];
}

/** Ağ isteği yapmadan karo sayısı (antimeridyen, kutup, z0 güvenli). */
export function countPackTiles(bbox: BBox, minZoom: number, maxZoom: number): number {
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const [yMin, yMax] = yRange(bbox, z);
    for (const [xMin, xMax] of xRanges(bbox, z)) total += (xMax - xMin + 1) * (yMax - yMin + 1);
  }
  return total;
}

export function* packTiles(bbox: BBox, minZoom: number, maxZoom: number): Generator<TileCoord> {
  for (let z = minZoom; z <= maxZoom; z++) {
    const [yMin, yMax] = yRange(bbox, z);
    for (const [xMin, xMax] of xRanges(bbox, z)) {
      for (let x = xMin; x <= xMax; x++) for (let y = yMin; y <= yMax; y++) yield { z, x, y };
    }
  }
}

export function estimatePack(
  bbox: BBox,
  minZoom: number = OFFLINE_PACK_LIMITS.minZoom,
  maxZoom: number = OFFLINE_PACK_LIMITS.maxZoom,
): PackEstimate {
  const tiles = countPackTiles(bbox, minZoom, maxZoom);
  const bytes = tiles * OFFLINE_PACK_LIMITS.estimatedTileBytes;
  if (tiles > OFFLINE_PACK_LIMITS.maxTiles) {
    return { tiles, bytes, ok: false, reason: `Bölge çok büyük: ${tiles} karo (sınır ${OFFLINE_PACK_LIMITS.maxTiles}). Haritayı yakınlaştırıp tekrar dene.` };
  }
  if (bytes > OFFLINE_PACK_LIMITS.maxBytes) {
    return { tiles, bytes, ok: false, reason: "Tahmini boyut 50 MB sınırını aşıyor. Haritayı yakınlaştırıp tekrar dene." };
  }
  return { tiles, bytes, ok: true };
}

export function tileUrl(template: string, { z, x, y }: TileCoord): string {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

/** TileJSON'dan gelen şablon allowlist dışındaysa paket başlatılmaz. */
export function assertPackTemplate(template: unknown): string {
  if (typeof template !== "string" || !/\{z\}.*\{x\}.*\{y\}/.test(template)) throw new Error("invalid-template");
  const probe = tileUrl(template, { z: 0, x: 0, y: 0 });
  if (isEsriTile(probe) || !isCacheableTile(probe) || !probe.startsWith("https://tiles.openfreemap.org/planet/")) {
    throw new Error("template-not-allowed");
  }
  return template;
}

/* ---------- Paket dizini (yalnız meta veri; karolar Cache Storage'da) ---------- */

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function listPacks(): OfflinePack[] {
  try {
    const raw = storage()?.getItem(PACK_INDEX_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as OfflinePack[]) : [];
  } catch {
    return [];
  }
}

function writePacks(packs: OfflinePack[]) {
  try {
    storage()?.setItem(PACK_INDEX_KEY, JSON.stringify(packs));
  } catch {
    /* dizin yazılamazsa paket yine çalışır; listede görünmez */
  }
}

export function packsTotalBytes(packs: OfflinePack[] = listPacks()): number {
  return packs.reduce((sum, pack) => sum + (pack.bytes || 0), 0);
}

function packUrls(pack: Pick<OfflinePack, "bbox" | "minZoom" | "maxZoom" | "template">): Set<string> {
  const urls = new Set<string>();
  for (const tile of packTiles(pack.bbox, pack.minZoom, pack.maxZoom)) urls.add(tileUrl(pack.template, tile));
  return urls;
}

interface PackDeps {
  caches?: CacheStorage;
  fetcher?: typeof fetch;
}

/** Paketi siler; başka paketlerin de kullandığı karolar ve stil varlıkları korunur. */
export async function deletePack(id: string, deps: PackDeps = {}): Promise<void> {
  const packs = listPacks();
  const target = packs.find((pack) => pack.id === id);
  const rest = packs.filter((pack) => pack.id !== id);
  writePacks(rest);
  if (!target) return;
  const cacheStorage = deps.caches ?? (typeof caches === "undefined" ? undefined : caches);
  if (!cacheStorage) return;
  const cache = await cacheStorage.open(PACK_CACHE_NAME);
  if (!rest.length) {
    await cacheStorage.delete(PACK_CACHE_NAME);
    return;
  }
  const keep = new Set<string>();
  for (const pack of rest) for (const url of packUrls(pack)) keep.add(url);
  await Promise.all([...packUrls(target)].filter((url) => !keep.has(url)).map((url) => cache.delete(url)));
}

/* ---------- İndirme ---------- */

export interface DownloadProgress {
  done: number;
  total: number;
  bytes: number;
  failed: number;
}

export interface DownloadOptions extends PackDeps {
  name: string;
  bbox: BBox;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  now?: () => number;
}

export type DownloadResult =
  | { status: "complete" | "incomplete"; pack: OfflinePack }
  | { status: "rejected" | "cancelled" | "error"; message: string };

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "QuotaExceededError" || error.code === 22
    : (error as { name?: string } | null)?.name === "QuotaExceededError";
}

export async function downloadPack(options: DownloadOptions): Promise<DownloadResult> {
  const { bbox, signal, onProgress } = options;
  const minZoom = OFFLINE_PACK_LIMITS.minZoom;
  const maxZoom = OFFLINE_PACK_LIMITS.maxZoom;
  const estimate = estimatePack(bbox, minZoom, maxZoom);
  if (!estimate.ok) return { status: "rejected", message: estimate.reason ?? "Bölge sınırı aşıyor." };

  const fetcher = options.fetcher ?? fetch;
  const cacheStorage = options.caches ?? (typeof caches === "undefined" ? undefined : caches);
  if (!cacheStorage) return { status: "error", message: "Bu tarayıcı çevrimdışı depolamayı desteklemiyor." };

  let cache: Cache;
  let template: string;
  try {
    cache = await cacheStorage.open(PACK_CACHE_NAME);
    const tileJsonResponse = await fetcher(OFM_TILEJSON_URL, { mode: "cors", signal });
    if (!tileJsonResponse.ok) throw new Error(`tilejson-${tileJsonResponse.status}`);
    const tileJson = (await tileJsonResponse.clone().json()) as { tiles?: unknown[] };
    template = assertPackTemplate(tileJson.tiles?.[0]);
    await cache.put(OFM_TILEJSON_URL, tileJsonResponse);
  } catch (error) {
    if (signal?.aborted) return { status: "cancelled", message: "İndirme iptal edildi." };
    if (isQuotaError(error)) return { status: "error", message: "Cihazda yer kalmadı. Eski bir paketi silip tekrar dene." };
    return { status: "error", message: "Harita sunucusuna ulaşılamadı. Bağlantını kontrol edip tekrar dene." };
  }

  const queue = [
    ...PACK_STYLE_ASSETS.filter((url) => url !== OFM_TILEJSON_URL),
    ...Array.from(packTiles(bbox, minZoom, maxZoom), (tile) => tileUrl(template, tile)),
  ].filter((url) => isCacheableTile(url) && !isEsriTile(url));

  const progress: DownloadProgress = { done: 0, total: queue.length, bytes: 0, failed: 0 };
  let stop: "quota" | "bytes" | null = null;
  let cursor = 0;

  const worker = async () => {
    while (!stop && !signal?.aborted && cursor < queue.length) {
      const url = queue[cursor++];
      try {
        const existing = await cache.match(url);
        if (existing) {
          progress.bytes += Number(existing.headers.get("content-length")) || 0;
        } else {
          const response = await fetcher(url, { mode: "cors", signal });
          if (!response.ok && response.status !== 204) throw new Error(`http-${response.status}`);
          const size = (await response.clone().blob()).size;
          if (progress.bytes + size > OFFLINE_PACK_LIMITS.maxBytes) {
            stop = "bytes";
            break;
          }
          await cache.put(url, response);
          progress.bytes += size;
        }
      } catch (error) {
        if (signal?.aborted) break;
        if (isQuotaError(error)) stop = "quota";
        progress.failed++;
      }
      progress.done++;
      onProgress?.({ ...progress });
    }
  };

  await Promise.all(Array.from({ length: OFFLINE_PACK_LIMITS.concurrency }, worker));

  const packBase = { bbox, minZoom, maxZoom, template };
  if (signal?.aborted) {
    // Yarım kalan karoları bırakma: başka paketin kullanmadığı her şeyi sil.
    const keep = new Set<string>(PACK_STYLE_ASSETS);
    for (const pack of listPacks()) for (const url of packUrls(pack)) keep.add(url);
    await Promise.all([...packUrls(packBase)].filter((url) => !keep.has(url)).map((url) => cache.delete(url).catch(() => false)));
    return { status: "cancelled", message: "İndirme iptal edildi; yarım kalan karolar silindi." };
  }

  const missing = progress.total - progress.done + progress.failed;
  const note = stop === "quota"
    ? "Cihazda yer kalmadı; paket eksik."
    : stop === "bytes"
      ? "50 MB sınırına ulaşıldı; paket eksik."
      : missing > 0
        ? `${missing} dosya indirilemedi; o kısımlar çevrimdışı boş görünebilir.`
        : undefined;
  const createdAt = (options.now ?? Date.now)();
  const pack: OfflinePack = {
    id: `pack-${createdAt.toString(36)}`,
    name: options.name.trim().slice(0, 60) || "Saha paketi",
    ...packBase,
    createdAt,
    tiles: estimate.tiles,
    failed: missing,
    bytes: progress.bytes,
    status: missing > 0 ? "incomplete" : "complete",
    ...(note ? { note } : {}),
  };
  writePacks([pack, ...listPacks()]);
  return { status: pack.status, pack };
}
