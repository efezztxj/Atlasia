import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isCacheableTile } from "./offlineCache";
import {
  OFFLINE_PACK_LIMITS,
  OFM_TILEJSON_URL,
  PACK_CACHE_NAME,
  assertPackTemplate,
  countPackTiles,
  deletePack,
  downloadPack,
  estimatePack,
  listPacks,
  packTiles,
} from "./offlinePacks";

/** P15: ağ ve gerçek Cache Storage olmadan paket yaşam döngüsü. */
const TEMPLATE = "https://tiles.openfreemap.org/planet/20261015_001001_pt/{z}/{x}/{y}.pbf";
// ~0.01° kare: z12–15'te birkaç düzine karo
const SMALL = { west: 27.34, south: 37.94, east: 27.35, north: 37.95 };

class FakeCache {
  store = new Map<string, Response>();
  failPutWith: unknown = null;
  async match(url: string) { return this.store.get(url)?.clone(); }
  async put(url: string, response: Response) {
    if (this.failPutWith) throw this.failPutWith;
    this.store.set(url, response);
  }
  async delete(url: string) { return this.store.delete(url); }
}

function fakeCaches() {
  const caches = new Map<string, FakeCache>();
  const storage = {
    open: async (name: string) => { if (!caches.has(name)) caches.set(name, new FakeCache()); return caches.get(name)!; },
    delete: async (name: string) => caches.delete(name),
  };
  return { storage: storage as unknown as CacheStorage, get: (name = PACK_CACHE_NAME) => caches.get(name) };
}

function okFetcher(opts: { fail?: (url: string) => boolean; onUrl?: (url: string) => void } = {}) {
  let inFlight = 0;
  const state = { maxInFlight: 0, urls: [] as string[] };
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    state.urls.push(url);
    opts.onUrl?.(url);
    if (url === OFM_TILEJSON_URL) return new Response(JSON.stringify({ tiles: [TEMPLATE] }));
    inFlight++;
    state.maxInFlight = Math.max(state.maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 1));
    inFlight--;
    if (opts.fail?.(url)) return new Response("", { status: 500 });
    return new Response("x".repeat(1000));
  });
  return { fetcher: fetcher as unknown as typeof fetch, state };
}

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("P15 karo sayımı (ağsız)", () => {
  it("z0 dünya tek karodur; sayım üretilen karo listesiyle aynıdır", () => {
    expect(countPackTiles({ west: -180, south: -90, east: 180, north: 90 }, 0, 0)).toBe(1);
    expect(countPackTiles(SMALL, 12, 15)).toBe([...packTiles(SMALL, 12, 15)].length);
  });

  it("antimeridyeni geçen kutu iki x aralığına bölünür, dünyayı dolaşmaz", () => {
    const fiji = { west: 179, south: -18, east: -179, north: -17 };
    const tiles = [...packTiles(fiji, 2, 2)];
    expect(tiles.map((t) => t.x).sort()).toEqual([0, 3]);
    expect(countPackTiles(fiji, 6, 6)).toBeLessThan(10);
  });

  it("kutup enlemi Mercator sınırına kıstırılır (NaN/sonsuz yok)", () => {
    const count = countPackTiles({ west: 0, south: 89, east: 1, north: 90 }, 3, 3);
    expect(Number.isFinite(count)).toBe(true);
    expect(count).toBe(1);
  });

  it("tahmin 3000 karo sınırını aşan bölgeyi reddeder ve nedeni Türkçe söyler", () => {
    expect(estimatePack(SMALL).ok).toBe(true);
    const big = estimatePack({ west: 26, south: 37, east: 28, north: 39 });
    expect(big.ok).toBe(false);
    expect(big.reason).toMatch(/yakınlaştır/);
    expect(OFFLINE_PACK_LIMITS.maxTiles).toBe(3000);
    expect(OFFLINE_PACK_LIMITS.concurrency).toBe(4);
  });

  it("TileJSON şablonu allowlist dışındaysa (Esri, terrain, başka host) paket başlamaz", () => {
    expect(assertPackTemplate(TEMPLATE)).toBe(TEMPLATE);
    expect(() => assertPackTemplate("https://server.arcgisonline.com/x/{z}/{y}/{x}")).toThrow();
    expect(() => assertPackTemplate("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png")).toThrow();
    expect(() => assertPackTemplate("https://tiles.openfreemap.org.evil.test/planet/{z}/{x}/{y}.pbf")).toThrow();
    expect(() => assertPackTemplate(undefined)).toThrow();
  });
});

describe("P15 indirme yaşam döngüsü", () => {
  it("sınır dışı bölgede hiç ağ isteği yapılmaz", async () => {
    const { fetcher, state } = okFetcher();
    const result = await downloadPack({ name: "Büyük", bbox: { west: 20, south: 30, east: 40, north: 45 }, fetcher, caches: fakeCaches().storage });
    expect(result.status).toBe("rejected");
    expect(state.urls).toEqual([]);
  });

  it("tamamlanan paket: ≤4 paralel, yalnız allowlist'teki OpenFreeMap URL'leri, dizine kaydedilir", async () => {
    const { fetcher, state } = okFetcher();
    const caches = fakeCaches();
    const result = await downloadPack({ name: "Efes", bbox: SMALL, fetcher, caches: caches.storage, now: () => 1 });
    expect(result.status).toBe("complete");
    expect(state.maxInFlight).toBeLessThanOrEqual(4);
    expect(state.urls.every((url) => isCacheableTile(url) && url.startsWith("https://tiles.openfreemap.org/"))).toBe(true);
    expect(state.urls.some((url) => url.includes("terrarium") || url.includes("arcgisonline"))).toBe(false);
    expect(caches.get()!.store.size).toBe(state.urls.length);
    expect(listPacks()).toHaveLength(1);
    expect(listPacks()[0]).toMatchObject({ name: "Efes", status: "complete", failed: 0, tiles: countPackTiles(SMALL, 12, 15) });
  });

  it("bazı karolar inemezse paket 'eksik' olarak işaretlenir, tam diye gösterilmez", async () => {
    let n = 0;
    const { fetcher } = okFetcher({ fail: (url) => url.endsWith(".pbf") && n++ % 5 === 0 });
    const result = await downloadPack({ name: "Kısmi", bbox: SMALL, fetcher, caches: fakeCaches().storage });
    expect(result.status).toBe("incomplete");
    expect(listPacks()[0].failed).toBeGreaterThan(0);
    expect(listPacks()[0].note).toMatch(/indirilemedi/);
  });

  it("depolama dolarsa (QuotaExceededError) indirme durur ve paket eksik kalır", async () => {
    const caches = fakeCaches();
    const { fetcher, state } = okFetcher();
    (await caches.storage.open(PACK_CACHE_NAME) as unknown as FakeCache);
    const result = await downloadPack({
      name: "Dolu",
      bbox: SMALL,
      caches: caches.storage,
      fetcher: (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) !== OFM_TILEJSON_URL) caches.get()!.failPutWith = new DOMException("full", "QuotaExceededError");
        return fetcher(input, init);
      }) as typeof fetch,
    });
    expect(result.status).toBe("incomplete");
    expect(listPacks()[0].note).toMatch(/yer kalmadı/);
    expect(state.urls.length).toBeLessThan(countPackTiles(SMALL, 12, 15));
  });

  it("iptal edilen indirme dizine yazılmaz ve yarım karoları siler", async () => {
    const controller = new AbortController();
    const caches = fakeCaches();
    let tiles = 0;
    const { fetcher } = okFetcher({ onUrl: (url) => { if (url.endsWith(".pbf") && ++tiles === 6) controller.abort(); } });
    const result = await downloadPack({ name: "İptal", bbox: SMALL, fetcher, caches: caches.storage, signal: controller.signal });
    expect(result.status).toBe("cancelled");
    expect(listPacks()).toEqual([]);
    expect([...caches.get()!.store.keys()].filter((url) => url.includes("/planet/"))).toEqual([]);
  });

  it("paket silinince yalnız ona ait karolar gider; ortak karolar diğer pakette kalır", async () => {
    const caches = fakeCaches();
    const { fetcher } = okFetcher();
    const a = await downloadPack({ name: "A", bbox: SMALL, fetcher, caches: caches.storage, now: () => 1 });
    const shifted = { ...SMALL, west: SMALL.west + 0.005, east: SMALL.east + 0.005 };
    await downloadPack({ name: "B", bbox: shifted, fetcher, caches: caches.storage, now: () => 2 });
    if (!("pack" in a)) throw new Error("A indirilemedi");
    await deletePack(a.pack.id, { caches: caches.storage });
    expect(listPacks().map((p) => p.name)).toEqual(["B"]);
    const remaining = [...caches.get()!.store.keys()];
    for (const tile of packTiles(shifted, 12, 15)) expect(remaining).toContain(TEMPLATE.replace("{z}", String(tile.z)).replace("{x}", String(tile.x)).replace("{y}", String(tile.y)));
    const onlyA = [...packTiles(SMALL, 12, 15)].filter((t) => ![...packTiles(shifted, 12, 15)].some((s) => s.z === t.z && s.x === t.x && s.y === t.y));
    expect(onlyA.length).toBeGreaterThan(0);
    for (const tile of onlyA) expect(remaining).not.toContain(TEMPLATE.replace("{z}", String(tile.z)).replace("{x}", String(tile.x)).replace("{y}", String(tile.y)));
  });

  it("son paket silinince paket önbelleği tamamen kalkar", async () => {
    const caches = fakeCaches();
    const { fetcher } = okFetcher();
    const result = await downloadPack({ name: "Tek", bbox: SMALL, fetcher, caches: caches.storage });
    if (!("pack" in result)) throw new Error("indirilemedi");
    await deletePack(result.pack.id, { caches: caches.storage });
    expect(caches.get()).toBeUndefined();
  });
});

describe("P15 service worker sözleşmesi", () => {
  it("sw.js paket önbelleğini aynı adla okur, kırpmaz; allowlist korunur", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    expect(sw).toContain(`const PACK_CACHE = "${PACK_CACHE_NAME}"`);
    expect(sw).toMatch(/caches\.open\(PACK_CACHE\)[\s\S]*?\.match\(request\)/);
    expect(sw).not.toMatch(/trim[\s\S]{0,80}PACK_CACHE/);
    expect(sw).toContain('const TILE_CACHE_MAX = 500;');
  });
});
