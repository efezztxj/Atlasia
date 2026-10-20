const CACHE = "atlasia-shell-v4";
const TILE_CACHE = "atlasia-tiles-v1";
const CACHE_PREFIX = "atlasia-shell-";
const TILE_CACHE_MAX = 500;
const SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/atlasia-earth-hero.jpg",
];

function isEsriTile(url) {
  return url.includes("server.arcgisonline.com") || url.includes("arcgisonline.com");
}

function isCacheableTile(url) {
  if (isEsriTile(url)) return false;
  return (
    url.includes("tiles.openfreemap.org") ||
    url.includes("elevation-tiles-prod") ||
    url.includes("openfreemap") ||
    url.includes("s3.amazonaws.com/elevation-tiles-prod")
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

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key))));
    // Eski tile cache temizliği: yalnız mevcut TILE_CACHE korunur, eski versiyonlar silinir
    await Promise.all(keys.filter((key) => key.startsWith("atlasia-tiles-") && key !== TILE_CACHE).map((key) => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

async function navigationResponse(event) {
  const cache = await caches.open(CACHE);
  try {
    const response = await event.preloadResponse || await fetch(event.request);
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
