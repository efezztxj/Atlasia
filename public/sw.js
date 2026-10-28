const CACHE = "atlasia-shell-v8";
const TILE_CACHE = "atlasia-tiles-v1";
const TILE_META_CACHE = "atlasia-tile-meta-v1";
const CACHE_PREFIX = "atlasia-shell-";
const TILE_CACHE_MAX = 500;
const TILE_CACHE_MAX_BYTES = 100 * 1024 * 1024;
const TILE_CACHE_ITEM_MAX_BYTES = 5 * 1024 * 1024;
const TILE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const TILE_CACHED_AT_HEADER = "x-atlasia-cached-at";
const TILE_SIZE_HEADER = "x-atlasia-content-size";
// P15: kullanıcının indirdiği saha paketleri. LRU kırpmasına girmez; yalnız kullanıcı silince silinir.
const PACK_CACHE = "atlasia-packs-v1";
const SHELL = [
  "/theme-boot.js",
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

function hostIs(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function isSensitiveUrl(url) {
  const parsed = parseTileUrl(url);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  return hostIs(host, "googleapis.com")
    || hostIs(host, "firebaseio.com")
    || hostIs(host, "firebaseapp.com")
    || hostIs(host, "web.app")
    || hostIs(host, "accounts.google.com")
    || hostIs(host, "appleid.apple.com")
    || parsed.pathname === "/__/auth"
    || parsed.pathname.startsWith("/__/auth/")
    || parsed.pathname === "/__/firebase"
    || parsed.pathname.startsWith("/__/firebase/")
    || parsed.pathname === "/api"
    || parsed.pathname.startsWith("/api/");
}

// Cache'e yazılan her kabuk cevabında istek kadar yönlendirme sonrası son URL'yi de doğrula.
function isSafeShellResponse(response) {
  if (!response.ok || !response.url || isSensitiveUrl(response.url)) return false;
  const parsed = parseTileUrl(response.url);
  return Boolean(parsed && parsed.origin === self.location.origin);
}

function isAllowedStaticPath(path) {
  return path === "/theme-boot.js"
    || path === "/manifest.webmanifest"
    || path.startsWith("/assets/")
    || path.startsWith("/icons/")
    || path.startsWith("/images/");
}

function isSafeStaticResponse(path, response) {
  if (!isSafeShellResponse(response)) return false;
  const requested = parseTileUrl(new URL(path, self.location.origin).href);
  const finalUrl = parseTileUrl(response.url);
  if (!requested || !finalUrl || !isAllowedStaticPath(requested.pathname) || !isAllowedStaticPath(finalUrl.pathname)) return false;
  const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  // Pages'in SPA fallback'i 200 HTML dönebilir; onu eksik chunk'ın yerine koyma.
  if (mime === "text/html") return false;
  if (requested.pathname.endsWith(".js")) {
    return ["text/javascript", "application/javascript", "application/x-javascript", "text/ecmascript", "application/ecmascript"].includes(mime);
  }
  if (requested.pathname.endsWith(".css")) return mime === "text/css";
  return true;
}

function assetPath(value) {
  let candidate;
  if (value.startsWith("/assets/")) candidate = value;
  else if (value.startsWith("assets/")) candidate = `/${value}`;
  else if (value.startsWith("./")) candidate = `/assets/${value.slice(2)}`;
  else return null;
  const parsed = new URL(candidate, self.location.origin);
  return parsed.origin === self.location.origin && parsed.pathname.startsWith("/assets/") ? parsed.pathname : null;
}

function assetPathsFromText(text) {
  const paths = new Set();
  // Rolldown (Vite 8) varlık yollarını şablon dizgisiyle (backtick) de yazar;
  // keşif üç tırnak türünü de tanımalı, yoksa işçi parçası kabuğa giremez.
  const references = text.matchAll(/["'`]((?:\/assets\/|assets\/|\.\/)[A-Za-z0-9_./-]+\.(?:js|css|png|jpe?g|svg|webp|woff2?))["'`]/g);
  for (const match of references) {
    const path = assetPath(match[1]);
    if (path) paths.add(path);
  }
  return paths;
}

async function fetchShellResource(path) {
  const response = await fetch(path, { cache: "reload" });
  const safe = path === "/" ? isSafeShellResponse(response) : isSafeStaticResponse(path, response);
  if (!safe) throw new Error(`Atlasia shell asset could not be fetched: ${path}`);
  return response;
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE);
  const staticResources = await Promise.all(SHELL.map(async (path) => ({ path, response: await fetchShellResource(path) })));
  await Promise.all(staticResources.map(({ path, response }) => cache.put(path, response)));

  // HTML'deki ilk varlıklardan başlayıp Vite'ın lazy chunk ve worker bağlantılarını
  // de dolaş. Eksik parça install'i reddeder; hata yutulup yarım kabuk bırakılmaz.
  const page = await fetchShellResource("/");
  if (!page.headers.get("content-type")?.includes("text/html")) throw new Error("Atlasia app shell could not be fetched");
  await cache.put("/", page.clone());
  let batch = [...assetPathsFromText(await page.text())];
  const seen = new Set();

  while (batch.length) {
    const paths = batch.filter((path) => {
      if (seen.has(path)) return false;
      seen.add(path);
      return true;
    });
    if (!paths.length) break;
    const responses = await Promise.all(paths.map(async (path) => ({ path, response: await fetchShellResource(path) })));
    const nested = await Promise.all(responses.map(async ({ path, response }) => {
      await cache.put(path, response.clone());
      if (path.endsWith(".js") || path.endsWith(".css")) return [...assetPathsFromText(await response.text())];
      return [];
    }));
    batch = nested.flat();
  }
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
    await Promise.all(keys.filter((key) => key.startsWith("atlasia-tile-meta-") && key !== TILE_META_CACHE).map((key) => caches.delete(key)));
    await trimTileCache();
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
    if (response && isSafeShellResponse(response) && response.headers.get("content-type")?.includes("text/html")) {
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
    if (isSafeStaticResponse(request.url, response) && (response.type === "basic" || response.type === "cors")) {
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

function tileMetadata(response) {
  if (!response) return null;
  const rawCachedAt = response.headers.get(TILE_CACHED_AT_HEADER);
  const rawSize = response.headers.get(TILE_SIZE_HEADER);
  if (rawCachedAt === null || rawSize === null) return null;
  const cachedAt = Number(rawCachedAt);
  const size = Number(rawSize);
  if (!Number.isSafeInteger(cachedAt) || !Number.isSafeInteger(size) || cachedAt < 0 || size < 0) return null;
  return { cachedAt, size };
}

function isFreshTileMetadata(metadata) {
  if (!metadata) return false;
  const age = Date.now() - metadata.cachedAt;
  return age >= 0 && age <= TILE_CACHE_MAX_AGE_MS;
}

async function deleteCachedTile(cache, metadataCache, request) {
  await Promise.all([cache.delete(request), metadataCache.delete(request)]);
}

async function trimTileCache() {
  try {
    const cache = await caches.open(TILE_CACHE);
    const metadataCache = await caches.open(TILE_META_CACHE);
    const entries = [];
    let totalBytes = 0;

    for (const request of await cache.keys()) {
      const metadata = tileMetadata(await metadataCache.match(request));
      if (!isFreshTileMetadata(metadata)) {
        await deleteCachedTile(cache, metadataCache, request);
        continue;
      }
      entries.push({ request, cachedAt: metadata.cachedAt, size: metadata.size });
      totalBytes += metadata.size;
    }

    // Yeniden doğrulanan karoların cachedAt'i yenilenir; en eski kayıt önce silinir.
    entries.sort((a, b) => a.cachedAt - b.cachedAt);
    while (entries.length && (entries.length > TILE_CACHE_MAX || totalBytes > TILE_CACHE_MAX_BYTES)) {
      const oldest = entries.shift();
      totalBytes -= oldest.size;
      await deleteCachedTile(cache, metadataCache, oldest.request);
    }
  } catch {
    // Depolama hatası haritanın çevrimiçi cevabını bozmamalı.
  }
}

async function cacheTileResponse(request, response) {
  if (
    response.status !== 200
    || !(["basic", "cors"].includes(response.type))
    || !response.url
    || isSensitiveUrl(response.url)
    || !isCacheableTile(request.url)
    || !isCacheableTile(response.url)
  ) return;
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > TILE_CACHE_ITEM_MAX_BYTES) return;

  // Content-Length sıkıştırılmış/eksik olabilir; gerçek gövde boyutunu ölç.
  const body = await response.clone().arrayBuffer();
  if (body.byteLength > TILE_CACHE_ITEM_MAX_BYTES) return;
  const cache = await caches.open(TILE_CACHE);
  const metadataCache = await caches.open(TILE_META_CACHE);
  // Orijinal CORS cevabını değiştirmeden sakla; sınır meta verisi ayrı cache'dedir.
  await cache.put(request, response.clone());
  await metadataCache.put(request, new Response(null, {
    status: 200,
    headers: {
      [TILE_CACHED_AT_HEADER]: String(Date.now()),
      [TILE_SIZE_HEADER]: String(body.byteLength),
    },
  }));
  await trimTileCache();
}

async function tileResponse(request) {
  const cache = await caches.open(TILE_CACHE);
  const metadataCache = await caches.open(TILE_META_CACHE);
  const packed = await caches.open(PACK_CACHE).then((packCache) => packCache.match(request)).catch(() => undefined);
  if (packed) return packed;

  const [cached, storedMetadata] = await Promise.all([cache.match(request), metadataCache.match(request)]);
  const freshCached = cached && isFreshTileMetadata(tileMetadata(storedMetadata)) ? cached : undefined;
  if ((cached || storedMetadata) && !freshCached) await deleteCachedTile(cache, metadataCache, request);

  // Taze girdide mevcut stale-while-revalidate davranışı korunur.
  const networkFetch = fetch(request).then(async (response) => {
    if (response.ok) {
      try {
        await cacheTileResponse(request, response);
      } catch {
        // Kota/depolama hatası çevrimiçi karonun kullanılmasını engellememeli.
      }
    }
    return response;
  }).catch(() => undefined);

  if (freshCached) {
    void networkFetch.catch(() => undefined);
    return freshCached;
  }

  const fresh = await networkFetch;
  if (fresh) return fresh;
  // 204 null-body statüsüdür; boş string Response constructor'da TypeError üretir.
  return new Response(null, { status: 204, statusText: "Offline tile not cached" });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("authorization")) return;

  const url = request.url;
  if (isSensitiveUrl(url)) return;

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
  if (parsed.origin !== self.location.origin || parsed.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(event));
    return;
  }

  // Sadece gerçekten statik dağıtım yolları: aynı origin'deki kişisel görsel
  // veya API cevabı `request.destination` image/script diye önbelleğe girmesin.
  const cacheable = isAllowedStaticPath(parsed.pathname);

  if (cacheable) event.respondWith(cachedAsset(request));
});
