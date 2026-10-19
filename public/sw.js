const CACHE = "atlasia-shell-v4";
const CACHE_PREFIX = "atlasia-shell-";
const SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/atlasia-earth-hero.jpg",
];

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
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

async function navigationResponse(event) {
  const cache = await caches.open(CACHE);
  try {
    // A failed preload does not imply the network failed. Retry navigation before
    // falling back to a potentially stale cached app shell.
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(event));
    return;
  }

  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  const cacheable = ["script", "style", "font", "image", "manifest"].includes(request.destination)
    || url.pathname.startsWith("/assets/")
    || url.pathname.startsWith("/icons/")
    || url.pathname.startsWith("/images/");

  if (cacheable) event.respondWith(cachedAsset(request));
});
