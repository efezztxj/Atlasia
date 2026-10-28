import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const ORIGIN = "https://atlasia.test";
const SHELL_CACHE = "atlasia-shell-v8";
const TILE_CACHE = "atlasia-tiles-v1";
const TILE_META_CACHE = "atlasia-tile-meta-v1";
const PACK_CACHE = "atlasia-packs-v1";
const DAY = 24 * 60 * 60 * 1000;
const swSource = readFileSync("public/sw.js", "utf8");

function urlOf(input) {
  return new URL(typeof input === "string" ? input : input.url, ORIGIN).href;
}

function typedResponse(body, options = {}) {
  const response = new Response(body, options);
  Object.defineProperty(response, "type", { configurable: true, value: options.type ?? "basic" });
  if (options.url) Object.defineProperty(response, "url", { configurable: true, value: options.url });
  return response;
}

function cloneResponse(response) {
  const clone = response.clone();
  Object.defineProperty(clone, "type", { configurable: true, value: response.type });
  if (response.url) Object.defineProperty(clone, "url", { configurable: true, value: response.url });
  return clone;
}

class FakeCache {
  constructor(fetcher) {
    this.fetcher = fetcher;
    this.entries = new Map();
  }

  async addAll(inputs) {
    const responses = await Promise.all(inputs.map(async (input) => {
      const response = await this.fetcher(input);
      if (!response.ok) throw new Error(`cache.addAll failed: ${urlOf(input)}`);
      return { input, response };
    }));
    for (const { input, response } of responses) await this.put(input, response);
  }

  async put(input, response) {
    const url = urlOf(input);
    const storedResponse = cloneResponse(response);
    // Node'un sentetik Response'u "default" tipindedir; tarayıcıdaki gerçek
    // cross-origin fetch/clone davranışını taklit et.
    if (new URL(url).origin !== ORIGIN && storedResponse.type === "default") {
      Object.defineProperty(storedResponse, "type", { configurable: true, value: "cors" });
    }
    this.entries.set(url, { request: new Request(url), response: storedResponse });
  }

  async match(input) {
    const entry = this.entries.get(urlOf(input));
    return entry ? cloneResponse(entry.response) : undefined;
  }

  async keys() {
    return [...this.entries.values()].map((entry) => entry.request.clone());
  }

  async delete(input) {
    return this.entries.delete(urlOf(input));
  }
}

class FakeCacheStorage {
  constructor(fetcher) {
    this.fetcher = fetcher;
    this.caches = new Map();
  }

  async open(name) {
    if (!this.caches.has(name)) this.caches.set(name, new FakeCache(this.fetcher));
    return this.caches.get(name);
  }

  async keys() {
    return [...this.caches.keys()];
  }

  async delete(name) {
    return this.caches.delete(name);
  }
}

function createHarness({ now = 1_700_000_000_000 } = {}) {
  const listeners = new Map();
  const fetchCalls = [];
  const routes = new Map();
  const state = {
    now,
    offline: false,
    skipWaitingCalls: 0,
    claimCalls: 0,
    preloadCalls: 0,
  };

  const networkResponse = (input) => {
    const url = new URL(urlOf(input));
    if (url.origin === ORIGIN && url.pathname === "/") {
      return typedResponse('<html><script src="/assets/app.js"></script><link href="/assets/app.css"></html>', {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        url: url.href,
      });
    }
    if (url.origin === ORIGIN && url.pathname === "/assets/app.js") {
      return typedResponse('import("./lazy.js"); const vendor = "assets/vendor.js";', {
        status: 200,
        headers: { "Content-Type": "text/javascript" },
        url: url.href,
      });
    }
    if (url.origin === ORIGIN && url.pathname === "/assets/lazy.js") {
      return typedResponse('import("./nested.js");', {
        status: 200,
        headers: { "Content-Type": "text/javascript" },
        url: url.href,
      });
    }
    if (url.origin === ORIGIN) {
      return typedResponse(`shell:${url.pathname}`, {
        status: 200,
        headers: { "Content-Type": url.pathname.endsWith(".js") ? "text/javascript" : url.pathname.endsWith(".css") ? "text/css" : "application/octet-stream" },
        url: url.href,
      });
    }
    return typedResponse(`tile:${url.href}`, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
      type: "cors",
      url: url.href,
    });
  };

  const fetcher = async (input, init) => {
    const url = urlOf(input);
    fetchCalls.push({ url, init });
    if (state.offline) throw new Error("offline");
    const route = routes.get(url);
    return route ? route(input, init) : networkResponse(input);
  };

  const self = {
    location: { origin: ORIGIN },
    registration: {
      navigationPreload: {
        enable: async () => {
          state.preloadCalls++;
        },
      },
    },
    clients: {
      claim: async () => {
        state.claimCalls++;
      },
    },
    skipWaiting: async () => {
      state.skipWaitingCalls++;
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
  };

  class TestDate extends Date {
    static now() {
      return state.now;
    }
  }

  const caches = new FakeCacheStorage(fetcher);
  vm.runInNewContext(swSource, {
    self,
    caches,
    fetch: fetcher,
    URL,
    Request,
    Response,
    Headers,
    Date: TestDate,
    console,
  }, { filename: "public/sw.js" });

  const dispatch = async (type, properties = {}) => {
    const pending = [];
    const event = {
      ...properties,
      waitUntil(value) {
        pending.push(Promise.resolve(value));
      },
    };
    for (const listener of listeners.get(type) ?? []) listener(event);
    await Promise.all(pending);
    return event;
  };

  const fetchEvent = async (url, options = {}) => {
    const request = new Request(url, {
      method: options.method ?? "GET",
      headers: options.headers,
    });
    Object.defineProperty(request, "mode", { configurable: true, value: options.mode ?? "cors" });
    Object.defineProperty(request, "destination", { configurable: true, value: options.destination ?? "" });
    let responsePromise;
    const pending = [];
    const event = {
      request,
      preloadResponse: options.preloadResponse,
      respondWith(value) {
        responsePromise = Promise.resolve(value);
      },
      waitUntil(value) {
        pending.push(Promise.resolve(value));
      },
    };
    for (const listener of listeners.get("fetch") ?? []) listener(event);
    await Promise.all(pending);
    return {
      intercepted: responsePromise !== undefined,
      response: responsePromise ? await responsePromise : undefined,
    };
  };

  return { caches, dispatch, fetchEvent, fetchCalls, routes, state };
}

async function putTileMetadata(cacheStorage, url, cachedAt, size) {
  const metadata = await cacheStorage.open(TILE_META_CACHE);
  await metadata.put(url, new Response(null, {
    status: 200,
    headers: {
      "x-atlasia-cached-at": String(cachedAt),
      "x-atlasia-content-size": String(size),
    },
  }));
}

test("install: hash'li ve lazy uygulama parçalarıyla kabuğu saklar, skipWaiting çağırmaz", async () => {
  const harness = createHarness();
  await harness.dispatch("install");

  assert.equal(harness.state.skipWaitingCalls, 0);
  const shell = await harness.caches.open(SHELL_CACHE);
  for (const path of [
    "/",
    "/theme-boot.js",
    "/manifest.webmanifest",
    "/assets/app.js",
    "/assets/app.css",
    "/assets/lazy.js",
    "/assets/nested.js",
    "/assets/vendor.js",
  ]) {
    assert.ok(await shell.match(path), `${path} ön önbellekte olmalı`);
  }

  await harness.dispatch("message", { data: { type: "UNRELATED" } });
  assert.equal(harness.state.skipWaitingCalls, 0);
  await harness.dispatch("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(harness.state.skipWaitingCalls, 1);
});

test("install: yeni v7 beklerken aktif v6 kabuğuna dokunmaz", async () => {
  const harness = createHarness();
  const active = await harness.caches.open("atlasia-shell-v6");
  await active.put("/", typedResponse("active-v6", { status: 200, url: `${ORIGIN}/` }));
  await harness.dispatch("install");
  assert.equal(harness.state.skipWaitingCalls, 0);
  assert.equal(await (await active.match("/")).text(), "active-v6");
  assert.ok(await (await harness.caches.open(SHELL_CACHE)).match("/"));
});

test("install: eksik lazy parça kurulumu reddeder ve aktif v6 kabuğunu ezmez", async () => {
  const harness = createHarness();
  const oldShell = await harness.caches.open("atlasia-shell-v6");
  await oldShell.put("/", typedResponse("old-v6-shell", { status: 200, url: `${ORIGIN}/` }));
  harness.routes.set(`${ORIGIN}/assets/lazy.js`, () => typedResponse("missing", { status: 404 }));

  await assert.rejects(harness.dispatch("install"), /shell asset could not be fetched/);
  assert.equal(harness.state.skipWaitingCalls, 0);
  assert.equal(await (await oldShell.match("/")).text(), "old-v6-shell");
});

test("install: eksik JS'e sunulan 200 HTML SPA fallback'i kabuk sanıp saklamaz", async () => {
  const harness = createHarness();
  const oldShell = await harness.caches.open("atlasia-shell-v6");
  await oldShell.put("/", typedResponse("old-shell", { status: 200, url: `${ORIGIN}/` }));
  harness.routes.set(`${ORIGIN}/assets/lazy.js`, () => typedResponse("<html>not a module</html>", {
    status: 200,
    headers: { "Content-Type": "text/html" },
    // SPA rewrite: URL değişmese bile HTML bir JS dosyası değildir.
    url: `${ORIGIN}/assets/lazy.js`,
  }));

  await assert.rejects(harness.dispatch("install"), /shell asset could not be fetched/);
  assert.equal(await (await oldShell.match("/")).text(), "old-shell");
});

test("navigasyon ve lazy script ağ yokken aynı sürümün ön önbelleğinden gelir", async () => {
  const harness = createHarness();
  await harness.dispatch("install");
  harness.state.offline = true;

  const navigation = await harness.fetchEvent(`${ORIGIN}/kesif/rota?tab=ozet`, { mode: "navigate" });
  assert.equal(navigation.intercepted, true);
  assert.equal(navigation.response.status, 200);
  assert.match(await navigation.response.text(), /assets\/app\.js/);

  const lazy = await harness.fetchEvent(`${ORIGIN}/assets/lazy.js`, { destination: "script" });
  assert.equal(lazy.intercepted, true);
  assert.equal(lazy.response.status, 200);
  assert.match(await lazy.response.text(), /nested\.js/);
});

test("Firebase/Auth/Firestore, authorization, Esri ve genel dış API istekleri hiç yakalanmaz", async () => {
  const harness = createHarness();
  const urls = [
    "https://firestore.googleapis.com/v1/projects/atlasia/databases/(default)/documents/places",
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
    "https://securetoken.googleapis.com/v1/token",
    "https://atlasia.firebaseio.com/places.json",
    "https://atlasia.firebaseapp.com/__/auth/handler",
    "https://accounts.google.com/o/oauth2/v2/auth",
    "https://appleid.apple.com/auth/authorize",
    "https://api.open-meteo.com/v1/forecast?latitude=38",
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/1/2/3",
    "https://tiles.openfreemap.org.evil.example/planet/1/2/3.pbf",
    `${ORIGIN}/__/auth/handler`,
    `${ORIGIN}/__/firebase/init.json`,
    `${ORIGIN}/api/private-data`,
    `${ORIGIN}/api`,
  ];

  for (const url of urls) {
    const result = await harness.fetchEvent(url, { mode: "navigate", destination: "document" });
    assert.equal(result.intercepted, false, `${url} worker'dan doğrudan ağa bırakılmalı`);
  }
  const authorized = await harness.fetchEvent(`${ORIGIN}/assets/private.js`, {
    destination: "script",
    headers: { Authorization: "Bearer secret" },
  });
  assert.equal(authorized.intercepted, false);
  const post = await harness.fetchEvent(`${ORIGIN}/assets/app.js`, { method: "POST", destination: "script" });
  assert.equal(post.intercepted, false);

  assert.equal(harness.fetchCalls.length, 0);
  assert.deepEqual(await harness.caches.keys(), []);
});

test("izinli istek Firebase/Auth cevabına yönlendirilirse son URL fail-closed olarak saklanmaz", async () => {
  const harness = createHarness();
  const tileUrl = "https://tiles.openfreemap.org/planet/14/9/9.pbf";
  harness.routes.set(tileUrl, () => typedResponse("firebase-response", {
    status: 200,
    type: "cors",
    url: "https://firestore.googleapis.com/v1/private-data",
  }));

  const tile = await harness.fetchEvent(tileUrl);
  assert.equal(tile.response.status, 200);
  assert.equal(await (await harness.caches.open(TILE_CACHE)).match(tileUrl), undefined);
  assert.equal(await (await harness.caches.open(TILE_META_CACHE)).match(tileUrl), undefined);

  const assetUrl = `${ORIGIN}/assets/auth-redirect.js`;
  harness.routes.set(assetUrl, () => typedResponse("auth-response", {
    status: 200,
    type: "basic",
    url: "https://accounts.google.com/o/oauth2/v2/auth",
  }));
  const asset = await harness.fetchEvent(assetUrl, { destination: "script" });
  assert.equal(asset.response.status, 200);
  assert.equal(await (await harness.caches.open(SHELL_CACHE)).match(assetUrl), undefined);

  const installHarness = createHarness();
  installHarness.routes.set(`${ORIGIN}/`, () => typedResponse("firestore-html", {
    status: 200,
    headers: { "Content-Type": "text/html" },
    url: "https://firestore.googleapis.com/v1/private-data",
  }));
  await assert.rejects(installHarness.dispatch("install"), /shell asset could not be fetched/);
  assert.equal(await (await installHarness.caches.open(SHELL_CACHE)).match("/"), undefined);
});

test("aynı origin API yönlendirmesi ve dinamik kişisel görsel önbelleklenmez", async () => {
  const harness = createHarness();
  const assetUrl = `${ORIGIN}/assets/redirected.js`;
  harness.routes.set(assetUrl, () => typedResponse("private-response", {
    status: 200,
    headers: { "Content-Type": "text/javascript" },
    url: `${ORIGIN}/api/me`,
  }));
  const asset = await harness.fetchEvent(assetUrl, { destination: "script" });
  assert.equal(asset.response.status, 200);
  assert.equal(await (await harness.caches.open(SHELL_CACHE)).match(assetUrl), undefined);

  const privateImage = await harness.fetchEvent(`${ORIGIN}/account/me/avatar`, { destination: "image" });
  assert.equal(privateImage.intercepted, false);
});

test("izinli karo CORS gövdesiyle saklanır; çevrimdışı okunur ve 7 gün sonunda silinir", async () => {
  const harness = createHarness();
  const url = "https://tiles.openfreemap.org/planet/14/8800/5400.pbf";

  const online = await harness.fetchEvent(url);
  assert.equal(online.intercepted, true);
  assert.equal(online.response.status, 200);
  const expectedBody = await online.response.text();
  const tileCache = await harness.caches.open(TILE_CACHE);
  const metadataCache = await harness.caches.open(TILE_META_CACHE);
  assert.ok(await tileCache.match(url));
  const metadata = await metadataCache.match(url);
  assert.equal(metadata.headers.get("x-atlasia-cached-at"), String(harness.state.now));
  assert.equal(Number(metadata.headers.get("x-atlasia-content-size")), new TextEncoder().encode(expectedBody).byteLength);
  assert.equal(harness.fetchCalls.filter((call) => call.url === url).length, 1);

  harness.state.offline = true;
  const offline = await harness.fetchEvent(url);
  assert.equal(offline.response.type, "cors");
  assert.equal(await offline.response.text(), expectedBody);
  // #65'in stale-while-revalidate denemesi ağa çıkar ve başarısız olur; cevap yine cache'dendir.
  assert.equal(harness.fetchCalls.filter((call) => call.url === url).length, 2);

  harness.state.now += 7 * DAY + 1;
  const expired = await harness.fetchEvent(url);
  assert.equal(expired.response.status, 204);
  assert.equal(expired.response.body, null, "204 cevabının gövdesi null olmalı");
  assert.equal(await tileCache.match(url), undefined);
  assert.equal(await metadataCache.match(url), undefined);
});

test("5 MiB üzeri karo saklanmaz; toplam 100 MiB üzerindeki en eski girdi kaldırılır", async () => {
  const harness = createHarness();
  const oversized = "https://tiles.openfreemap.org/planet/14/1/1.pbf";
  harness.routes.set(oversized, () => typedResponse(new Uint8Array(5 * 1024 * 1024 + 1), {
    status: 200,
    type: "cors",
    url: oversized,
  }));
  await harness.fetchEvent(oversized);
  const tileCache = await harness.caches.open(TILE_CACHE);
  assert.equal(await tileCache.match(oversized), undefined);

  const oldUrl = "https://tiles.openfreemap.org/planet/14/1/2.pbf";
  const newUrl = "https://tiles.openfreemap.org/planet/14/1/3.pbf";
  // Ekleme sırası değil cachedAt belirleyici olmalı: yeni girdi önce eklenir.
  for (const url of [newUrl, oldUrl]) {
    await tileCache.put(url, typedResponse("tile", { status: 200, type: "cors", url }));
    const cachedAt = url === oldUrl ? harness.state.now - 1_000 : harness.state.now;
    await putTileMetadata(harness.caches, url, cachedAt, 60 * 1024 * 1024);
  }
  await harness.dispatch("activate");
  assert.equal(await tileCache.match(oldUrl), undefined);
  assert.ok(await tileCache.match(newUrl));
});

test("aktivasyon 500 girdi tavanını uygular, eski sürümleri siler ve saha paketini korur", async () => {
  const harness = createHarness();
  const tileCache = await harness.caches.open(TILE_CACHE);
  for (let index = 0; index < 501; index++) {
    const url = `https://tiles.openfreemap.org/planet/14/2/${index}.pbf`;
    await tileCache.put(url, typedResponse("x", { status: 200, type: "cors", url }));
    await putTileMetadata(harness.caches, url, harness.state.now, 1);
  }
  const packs = await harness.caches.open(PACK_CACHE);
  await packs.put("https://tiles.openfreemap.org/planet/12/1/1.pbf", typedResponse("packed", { status: 200 }));
  await (await harness.caches.open("atlasia-shell-v6")).put("/", typedResponse("old"));
  await (await harness.caches.open("atlasia-tiles-v0")).put("old", typedResponse("old"));

  await harness.dispatch("activate");
  assert.equal((await tileCache.keys()).length, 500);
  assert.equal(await tileCache.match("https://tiles.openfreemap.org/planet/14/2/0.pbf"), undefined);
  assert.ok(await packs.match("https://tiles.openfreemap.org/planet/12/1/1.pbf"));
  const names = await harness.caches.keys();
  assert.equal(names.includes("atlasia-shell-v6"), false);
  assert.equal(names.includes("atlasia-tiles-v0"), false);
  assert.equal(names.includes(PACK_CACHE), true);
  assert.equal(harness.state.preloadCalls, 1);
  assert.equal(harness.state.claimCalls, 1);
});
