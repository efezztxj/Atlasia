const CACHE = "atlasia-shell-v5";
const TILE_CACHE = "atlasia-tiles-v1";
const CACHE_PREFIX = "atlasia-shell-";
const TILE_CACHE_MAX = 500;
// P15: kullanıcının indirdiği saha paketleri. LRU kırpmasına girmez; yalnız kullanıcı silince silinir.
const PACK_CACHE = "atlasia-packs-v1";
const SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/atlasia-earth-hero.jpg",
];

// Tam HTTPS host + path öneki eşleşmesi (substring değil) — lookalike URL reddi.
// src/utils/offlineCache.ts içindeki CACHEABLE_TILE_SOURCES ile senkron tutulmalı;
// offlineCache.test.ts iki tarafın eşitliğini kilitler.
const CACHEABLE_TILE_SOURCES = [
  {
    host: "tiles.openfreemap.org",
    pathPrefixes: ["/planet", "/natural_earth/", "/fonts/", "/sprites/", "/styles/"],
  },
  {
    host: "s3.amazonaws.com",
    pathPrefixes: ["/elevation-tiles-prod/terrarium/"],
  },
];

function parseTileUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isEsriTile(url) {
  const parsed = parseTileUrl(url);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  return host === "arcgisonline.com" || host.endsWith(".arcgisonline.com");
}

function isCacheableTile(url) {
  if (isEsriTile(url)) return false;
  const parsed = parseTileUrl(url);
  if (!parsed) return false;
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  return CACHEABLE_TILE_SOURCES.some(
    (source) => source.host === host && source.pathPrefixes.some((prefix) => parsed.pathname.startsWith(prefix)),
  );
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);

  // Her dağıtımda index.html içindeki o sürüme ait hash'li JS/CSS dosyalarını
  // bulup birlikte sakla. Böylece ilk çevrimiçi ziyaretten sonra kabuk açılabilir.
  const page = await fetch("/", { cache: "reload" });
  if (!page.ok) throw new Error("Atlasia app shell could not be fetched");
  await cache.put("/", page.clone());
  const html = await page.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  await Promise.allSettled(assets.map((asset) => cache.add(asset)));
}

// Güncelleme sessizce zorlanmaz: yeni sürüm "waiting" durumunda bekler,
// kullanıcı arayüzdeki "Yenile" düğmesine basınca devreye girer (İŞ 5).
self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    // Eski tile cache temizliği: yalnız mevcut TILE_CACHE korunur, eski versiyonlar silinir
    await Promise.all(keys.filter((key) => key.startsWith("atlasia-tiles-") && key !== TILE_CACHE).map((key) => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

async function navigationResponse(event) {
  const cache = await caches.open(CACHE);
  try {
    // Başarısız preload ağın düştüğü anlamına gelmez: önbellekteki (eski olabilecek)
    // kabuğa düşmeden önce gezinmeyi ağdan bir kez daha dene. (PR #18'den taşındı.)
    const preloaded = await Promise.resolve(event.preloadResponse).catch(() => undefined);
    const response = preloaded || await fetch(event.request);
    if (response?.ok && response.headers.get("content-type")?.includes("text/html")) {
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    return await cache.match("/") || new Response(
      "Atlasia çevrimdışı. İnternet bağlantını kontrol edip tekrar dene.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}

async function cachedAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (response.ok && (response.type === "basic" || response.type === "cors")) {
      await cache.put(request, response.clone());
    }
    return response;
  });

  if (cached) {
    void update.catch(() => undefined);
    return cached;
  }

  try {
    return await update;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function trimTileCache() {
  try {
    const cache = await caches.open(TILE_CACHE);
    const keys = await cache.keys();
    if (keys.length > TILE_CACHE_MAX) {
      const toDelete = keys.slice(0, keys.length - TILE_CACHE_MAX);
      await Promise.all(toDelete.map((k) => cache.delete(k)));
    }
  } catch {
    // ignore
  }
}

async function tileResponse(request) {
  const cache = await caches.open(TILE_CACHE);
  const packed = await caches.open(PACK_CACHE).then((packCache) => packCache.match(request)).catch(() => undefined);
  if (packed) return packed;
  const cached = await cache.match(request);
  // Stale-while-revalidate + LRU boyut sınırı
  const networkFetch = fetch(request).then(async (response) => {
    if (response.ok) {
      // Esri asla yazılmaz (güvenlik: double-check)
      if (!isEsriTile(request.url)) {
        await cache.put(request, response.clone());
        void trimTileCache();
      }
    }
    return response;
  }).catch(() => undefined);

  if (cached) {
    void networkFetch.catch(() => undefined);
    return cached;
  }

  try {
    const fresh = await networkFetch;
    if (fresh) return fresh;
  } catch {
    // ignore
  }
  // Çevrimdışı ve önbellekte yoksa 204 boş karo dön, harita boş kalmasın
  return new Response("", { status: 204, statusText: "Offline tile not cached" });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = request.url;

  // Esri toplu önbellekleme YASAK: hiçbir Esri isteği cache'e yazılmaz, normal ağa bırakılır
  if (isEsriTile(url)) {
    return;
  }

  // Harita ve arazi karoları: OpenFreeMap + terrain raster-dem — uçak modunda kaydırılabilir olmalı
  if (isCacheableTile(url)) {
    event.respondWith(tileResponse(request));
    return;
  }

  const parsed = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(event));
    return;
  }

  if (parsed.origin !== self.location.origin || parsed.pathname === "/sw.js") return;

  const cacheable = ["script", "style", "font", "image", "manifest"].includes(request.destination)
    || parsed.pathname.startsWith("/assets/")
    || parsed.pathname.startsWith("/icons/")
    || parsed.pathname.startsWith("/images/");

  if (cacheable) event.respondWith(cachedAsset(request));
});
