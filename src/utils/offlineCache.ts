/**
 * Adım 12 — Çevrimdışı saha paketi
 * Esri tile toplu indirme/önbellekleme YASAK — yalnızca OpenFreeMap ve terrain önbelleklenir.
 * Harita uçak modunda kaydırılabilmeli, pinler görünmeli.
 */

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export const TILE_CACHE_NAME = "atlasia-tiles-v1";
export const TILE_CACHE_MAX_ENTRIES = 500;
export const TILE_TEMPLATES = {
  vector: "https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf",
  terrain: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
};

/**
 * Önbelleğe alınabilir tile kaynakları: tam HTTPS host + path öneki eşleşmesi.
 * Substring eşleşmesi kullanılmaz — lookalike URL'ler (ör. izinli host adını
 * path/query içinde taşıyan veya alt alan gibi gösteren adresler) reddedilir.
 * Bu liste public/sw.js içindeki kopyayla birlikte değiştirilmelidir;
 * offlineCache.test.ts iki tarafın senkronunu kilitler.
 */
const CACHEABLE_TILE_SOURCES: ReadonlyArray<{ host: string; pathPrefixes: readonly string[] }> = [
  {
    host: "tiles.openfreemap.org",
    pathPrefixes: ["/planet", "/natural_earth/", "/fonts/", "/sprites/", "/styles/"],
  },
  {
    host: "s3.amazonaws.com",
    pathPrefixes: ["/elevation-tiles-prod/terrarium/"],
  },
];

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch (error) {
    void error;
    return null;
  }
}

export function isEsriTile(url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  return host === "arcgisonline.com" || host.endsWith(".arcgisonline.com");
}

export function isCacheableTile(url: string): boolean {
  if (isEsriTile(url)) return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;
  // Yalnız HTTPS; kullanıcı bilgisi taşıyan (userinfo) URL'leri reddet —
  // https://izinli-host@sahte-host/ hilesini boşa çıkarır.
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  return CACHEABLE_TILE_SOURCES.some(
    (source) => source.host === host && source.pathPrefixes.some((prefix) => parsed.pathname.startsWith(prefix)),
  );
}

function lngToX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z));
}

function latToY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  const n = Math.pow(2, z);
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return Math.max(0, Math.min(n - 1, y));
}

export function tilesForBbox(bbox: BBox, minZoom: number, maxZoom: number) {
  const tiles: { z: number; x: number; y: number; url: string; terrainUrl: string }[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lngToX(bbox.west, z);
    const xMax = lngToX(bbox.east, z);
    const yMin = latToY(bbox.north, z); // north smaller y
    const yMax = latToY(bbox.south, z);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({
          z,
          x,
          y,
          url: `https://tiles.openfreemap.org/planet/${z}/${x}/${y}.pbf`,
          terrainUrl: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
        });
      }
    }
  }
  return tiles;
}

export async function estimateOfflineUsage(): Promise<{ usage: number; quota: number; percent: number | null }> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.estimate === "function") {
      const est = await navigator.storage.estimate();
      const usage = est.usage ?? 0;
      const quota = est.quota ?? 0;
      const percent = quota ? Math.round((usage / quota) * 100) : null;
      return { usage, quota, percent };
    }
  } catch (error) {
    void error;
  }
  return { usage: 0, quota: 0, percent: null };
}

export async function cachedTileCount(): Promise<number> {
  try {
    if (typeof caches === "undefined") return 0;
    const cache = await caches.open(TILE_CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch (error) {
    void error;
    return 0;
  }
}

export async function prefetchTilesForBbox(
  bbox: BBox,
  minZoom = 12,
  maxZoom = 15,
  onProgress?: (done: number, total: number) => void,
): Promise<{ fetched: number; total: number }> {
  const tiles = tilesForBbox(bbox, minZoom, maxZoom);
  const total = tiles.length * 2; // vector + terrain
  let fetched = 0;

  // Nazik: aynı anda 4 paralel, araya 80ms bekleme
  const queue: string[] = [];
  for (const t of tiles) {
    if (!isEsriTile(t.url)) queue.push(t.url);
    if (!isEsriTile(t.terrainUrl)) queue.push(t.terrainUrl);
  }

  const BATCH = 4;
  for (let i = 0; i < queue.length; i += BATCH) {
    const batch = queue.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const cache = await caches.open(TILE_CACHE_NAME);
          const existing = await cache.match(url);
          if (existing) {
            fetched++;
            onProgress?.(fetched, total);
            return;
          }
          const res = await fetch(url, { mode: "cors" });
          if (res.ok) {
            await cache.put(url, res.clone());
            // LRU trim
            const keys = await cache.keys();
            if (keys.length > TILE_CACHE_MAX_ENTRIES) {
              const toDelete = keys.slice(0, keys.length - TILE_CACHE_MAX_ENTRIES);
              await Promise.all(toDelete.map((k) => cache.delete(k)));
            }
          }
          fetched++;
          onProgress?.(fetched, total);
        } catch (error) {
          void error;
          fetched++;
          onProgress?.(fetched, total);
        }
      }),
    );
    // nazik bekleme
    await new Promise((r) => setTimeout(r, 80));
  }

  return { fetched, total };
}

export function bboxForView(center: { lat: number; lng: number }, spanDegrees = 0.06): BBox {
  const half = spanDegrees / 2;
  return {
    west: center.lng - half,
    south: center.lat - half,
    east: center.lng + half,
    north: center.lat + half,
  };
}
