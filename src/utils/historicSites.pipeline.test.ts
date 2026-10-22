import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HISTORY_SUMMARY_MAX_CHARS,
  buildOverpassQuery,
  clampSummary,
  clearHistoricCache,
  fetchHistoricSitesDetailed,
} from "./historicSites";

/** P14: ağdan bağımsız boru hattı testleri (canlı Overpass/Wikipedia'ya gidilmez). */
const CENTER = { lat: 38.4192, lng: 27.1287 }; // Efes fixture alanının dışında

type Route = (url: string) => unknown;

function stubFetch(route: Route) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const body = route(url);
    if (body instanceof Error) throw body;
    if (body === undefined) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const overpass = (elements: unknown[]) => ({ elements });

beforeEach(() => clearHistoricCache());
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); clearHistoricCache(); });

describe("P14 sorgu kurumu ve özet politikası", () => {
  it("Overpass sorgusu lat,lng sırasında ve 200–2000 m'ye sıkıştırılmış yarıçapla kurulur", () => {
    const query = buildOverpassQuery(38.4, 27.1, 50_000);
    expect(query).toContain("around:2000,38.4,27.1");
    expect(buildOverpassQuery(38.4, 27.1, 10)).toContain("around:200,");
  });

  it("özet uzunluk sınırına cümle sonunda kesilir", () => {
    const long = `${"Birinci cümle burada biter. ".repeat(40)}Son`;
    const clamped = clampSummary(long);
    expect(clamped.length).toBeLessThanOrEqual(HISTORY_SUMMARY_MAX_CHARS);
    expect(clamped.endsWith(".")).toBe(true);
    expect(clampSummary("  kısa   metin  ")).toBe("kısa metin");
  });
});

describe("P14 tarihçe eşleştirme ve atıf", () => {
  it("wikidata etiketi → tr madde öncelikli; özet + madde adresi + lisans taşınır", async () => {
    const calls = stubFetch((url) => {
      if (url.startsWith("https://overpass-api.de/")) return overpass([{ type: "node", id: 1, lat: 38.42, lon: 27.13, tags: { historic: "monument", name: "Saat Kulesi", wikidata: "Q123" } }]);
      if (url.includes("wikidata.org")) return { entities: { Q123: { sitelinks: { enwiki: { title: "Clock Tower" }, trwiki: { title: "İzmir Saat Kulesi" } } } } };
      if (url.startsWith("https://tr.wikipedia.org/api/rest_v1/page/summary/")) return { title: "İzmir Saat Kulesi", extract: "İzmir Saat Kulesi, Konak Meydanı'nda 1901'de yapılmış tarihî bir saat kulesidir.", content_urls: { desktop: { page: "https://tr.wikipedia.org/wiki/%C4%B0zmir_Saat_Kulesi" } } };
      return undefined;
    });
    const result = await fetchHistoricSitesDetailed(CENTER, 1000);
    expect(result.status).toBe("fresh");
    const place = result.places[0];
    expect(place.story).toContain("1901");
    expect(place.historySource).toEqual({ name: "Wikipedia", title: "İzmir Saat Kulesi", url: "https://tr.wikipedia.org/wiki/%C4%B0zmir_Saat_Kulesi", license: "CC BY-SA 4.0", lang: "tr" });
    expect(place.dataSources).toContain("© OpenStreetMap contributors (ODbL)");
    expect(calls.some((url) => url.includes("en.wikipedia.org"))).toBe(false);
  });

  it("etiket yoksa tahmin üretilmez: konum/isim araması yapılmaz, hikâye boş kalır", async () => {
    const calls = stubFetch((url) => (url.startsWith("https://overpass-api.de/") ? overpass([{ type: "node", id: 2, lat: 38.42, lon: 27.13, tags: { historic: "ruins", name: "Kalıntı" } }]) : undefined));
    const result = await fetchHistoricSitesDetailed(CENTER, 1000);
    expect(result.places[0].story).toBeUndefined();
    expect(result.places[0].historySource).toBeUndefined();
    expect(result.places[0].dataSources).toEqual(["© OpenStreetMap contributors (ODbL)"]);
    expect(calls.filter((url) => !url.startsWith("https://overpass-api.de/"))).toEqual([]);
  });

  it("politika dışı dilde etiket (de:) doğrudan kullanılmaz; wikidata yoksa özet yok", async () => {
    const calls = stubFetch((url) => (url.startsWith("https://overpass-api.de/") ? overpass([{ type: "node", id: 3, lat: 38.42, lon: 27.13, tags: { historic: "castle", name: "Burg", wikipedia: "de:Burg" } }]) : undefined));
    const result = await fetchHistoricSitesDetailed(CENTER, 1000);
    expect(result.places[0].story).toBeUndefined();
    expect(calls.some((url) => url.includes("de.wikipedia.org"))).toBe(false);
  });

  it("anlam ayrımı sayfası tarihçe sayılmaz", async () => {
    stubFetch((url) => {
      if (url.startsWith("https://overpass-api.de/")) return overpass([{ type: "node", id: 4, lat: 38.42, lon: 27.13, tags: { historic: "yes", name: "Agora", wikipedia: "tr:Agora" } }]);
      if (url.includes("tr.wikipedia.org")) return { type: "disambiguation", title: "Agora", extract: "Agora şu anlamlara gelebilir: birçok farklı yer ve kavram." };
      return undefined;
    });
    const result = await fetchHistoricSitesDetailed(CENTER, 1000);
    expect(result.places[0].story).toBeUndefined();
  });
});

describe("P14 önbellek ve hata yolları", () => {
  it("aynı bölge ikinci kez ağa gitmez (önbellek isabeti)", async () => {
    const calls = stubFetch((url) => (url.startsWith("https://overpass-api.de/") ? overpass([]) : undefined));
    await fetchHistoricSitesDetailed(CENTER, 1000);
    const second = await fetchHistoricSitesDetailed(CENTER, 1000);
    expect(second.status).toBe("cache");
    expect(calls).toHaveLength(1);
  });

  it("ağ hatasında süresi geçmiş kayıt 'stale' + mesajla döner; hata gizlenmez", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
    stubFetch((url) => (url.startsWith("https://overpass-api.de/") ? overpass([{ type: "node", id: 5, lat: 38.42, lon: 27.13, tags: { historic: "ruins", name: "Eski Yapı" } }]) : undefined));
    await fetchHistoricSitesDetailed(CENTER, 1000);
    vi.setSystemTime(new Date("2026-10-20T00:00:00Z")); // 7 günlük TTL geçti
    stubFetch(() => new TypeError("Failed to fetch"));
    const result = await fetchHistoricSitesDetailed(CENTER, 1000);
    expect(result.status).toBe("stale");
    expect(result.places[0].title).toBe("Eski Yapı");
    expect(result.message).toContain("eski olabilir");
  });

  it("önbellek yokken ağ hatası boş liste değil 'error' + Türkçe mesaj döner", async () => {
    stubFetch(() => new TypeError("Failed to fetch"));
    const result = await fetchHistoricSitesDetailed(CENTER, 1000);
    expect(result).toEqual({ places: [], status: "error", message: expect.stringContaining("alınamıyor") });
  });
});
