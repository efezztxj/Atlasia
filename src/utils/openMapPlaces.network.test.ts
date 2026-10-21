import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Place, RouteBrief } from "../types";

/**
 * P16 — fetchOpenMapPlaces ağ karakterizasyonu.
 *
 * Photon çağrıları global fetch sahte katmanıyla yakalanır; modül önbelleği
 * her testte resetModules ile temizlenir. 9 saniyelik zamanlayıcı gerçek
 * bekleme olmadan yakalanan callback üzerinden tetiklenir.
 */

const center = { lat: 38.42, lng: 27.14 };
const brief: RouteBrief = {
  duration: "day",
  tempo: "Dengeli",
  interests: ["Tarih"],
  transport: "walking",
  budget: "Orta",
  vibe: "sakin",
  start: "map",
  rain: "flex",
};

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
const clearTimeoutMock = vi.fn();
let timeoutCallback: (() => void) | undefined;
let timeoutMs: number | undefined;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

type FeatureFixture = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

function feature(
  name: string | undefined,
  lng: number,
  lat: number,
  osmKey: string,
  osmValue: string,
  extra: Record<string, unknown> = {},
): FeatureFixture {
  return {
    geometry: { coordinates: [lng, lat] },
    properties: {
      name,
      osm_type: "N",
      osm_id: 101,
      osm_key: osmKey,
      osm_value: osmValue,
      ...extra,
    },
  };
}

function installFetch(
  handler: (url: URL, init?: RequestInit) => Promise<Response> | Response,
): void {
  fetchMock.mockImplementation(async (input, init) => handler(new URL(input), init));
}

function installPhoton(searches: Record<string, FeatureFixture[] | "hata">): void {
  installFetch((url) => {
    if (url.pathname.endsWith("/reverse")) {
      return jsonResponse({
        features: [{ properties: { city: "İzmir" } }],
      });
    }
    const query = url.searchParams.get("q") ?? "";
    const kind = query.split(" ")[0];
    const result = searches[kind] ?? [];
    if (result === "hata") return jsonResponse({ error: "bozuk" }, 503);
    return jsonResponse({ features: result });
  });
}

async function loadModule(): Promise<typeof import("./openMapPlaces")> {
  return import("./openMapPlaces");
}

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  clearTimeoutMock.mockClear();
  timeoutCallback = undefined;
  timeoutMs = undefined;
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", {
    setTimeout: (handler: TimerHandler, ms?: number) => {
      if (typeof handler === "function") timeoutCallback = handler as () => void;
      timeoutMs = ms;
      return 123;
    },
    clearTimeout: clearTimeoutMock,
  } as unknown as Window & typeof globalThis);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOpenMapPlaces", () => {
  it("önceden iptal edilmiş signal ile ağa çıkmadan AbortError verir", async () => {
    const { fetchOpenMapPlaces } = await loadModule();
    const controller = new AbortController();
    controller.abort();

    await expect(fetchOpenMapPlaces(center, brief, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Photon özelliklerini filtreler, yinelenenleri eler, mesafeyle sıralar ve cache kullanır", async () => {
    installPhoton({
      museum: [
        feature("Uzak Müze", 27.19, 38.42, "tourism", "museum", { osm_id: 103 }),
        feature("İzmir Saat Kulesi", 27.145, 38.42, "tourism", "museum", {
          osm_id: 101,
          city: "İzmir",
          state: "İzmir",
          country: "Türkiye",
        }),
        feature("Otel", 27.15, 38.42, "tourism", "hotel", { osm_id: 104 }),
        feature("Yarıçap Dışı Müze", 27.2, 38.42, "tourism", "museum", { osm_id: 105 }),
        feature(undefined, 27.15, 38.42, "tourism", "museum", { osm_id: 106 }),
      ],
      historic: [
        feature("İzmir Saat Kulesi", 27.145, 38.42, "historic", "monument", { osm_id: 999 }),
      ],
      park: [
        feature("Kültürpark", 27.16, 38.42, "leisure", "park", {
          osm_id: 102,
          district: "Konak",
          country: "Türkiye",
        }),
      ],
    });
    const { fetchOpenMapPlaces } = await loadModule();

    const result: Place[] = await fetchOpenMapPlaces(center, brief);

    expect(result.map((place) => place.title)).toEqual([
      "İzmir Saat Kulesi",
      "Kültürpark",
      "Uzak Müze",
    ]);
    expect(result[0]).toMatchObject({
      id: "osm-route-N-101",
      region: "İzmir · Türkiye",
      category: "history",
      lng: 27.145,
      lat: 38.42,
      author: "OpenStreetMap katkıcıları",
      kind: "guide",
    });
    expect(result[0].note).toContain("OpenStreetMap verisinde");
    expect(result[1]).toMatchObject({ region: "Konak · Türkiye", category: "nature" });
    expect(fetchMock).toHaveBeenCalledTimes(4); // reverse + museum/historic/park
    expect(timeoutMs).toBe(9000);
    expect(clearTimeoutMock).toHaveBeenCalledWith(123);
    expect(fetchMock.mock.calls.every(([, init]) =>
      init?.signal instanceof AbortSignal &&
      (init.headers as Record<string, string>).Accept === "application/json",
    )).toBe(true);
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toContain("/reverse");
    expect(fetchMock.mock.calls.slice(1).map(([input]) =>
      new URL(input).searchParams.get("q"),
    )).toEqual(["museum İzmir", "historic İzmir", "park İzmir"]);

    const cached = await fetchOpenMapPlaces(center, { ...brief, interests: ["Tarih"] });
    expect(cached).toBe(result);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("tek arama türü başarısız olsa bile diğer sonuçlarla devam eder", async () => {
    installPhoton({
      museum: "hata",
      historic: [
        feature("Agora", 27.145, 38.42, "historic", "archaeological_site", { osm_id: 201 }),
      ],
      park: [],
    });
    const { fetchOpenMapPlaces } = await loadModule();

    const result = await fetchOpenMapPlaces(center, brief);

    expect(result.map((place) => place.title)).toEqual(["Agora"]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("tüm aramalar başarısızsa servis kullanılamıyor hatası verir", async () => {
    installPhoton({ museum: "hata", historic: "hata", park: "hata" });
    const { fetchOpenMapPlaces } = await loadModule();

    await expect(fetchOpenMapPlaces(center, brief)).rejects.toThrow(
      "Open map search unavailable",
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("başarılı ama boş aramalar boş listeyi cache'ler", async () => {
    installPhoton({ museum: [], historic: [], park: [] });
    const { fetchOpenMapPlaces } = await loadModule();

    await expect(fetchOpenMapPlaces(center, brief)).resolves.toEqual([]);
    await expect(fetchOpenMapPlaces(center, brief)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reverse sonucu yerel alan vermezse aramaları başlatmaz", async () => {
    installFetch((url) => {
      if (url.pathname.endsWith("/reverse")) return jsonResponse({ features: [{}] });
      throw new Error("arama çağrılmamalı");
    });
    const { fetchOpenMapPlaces } = await loadModule();

    await expect(fetchOpenMapPlaces(center, brief)).rejects.toThrow(
      "Nearby area could not be resolved",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reverse HTTP hatasını durum koduyla yüzeye çıkarır", async () => {
    installFetch(() => jsonResponse({ error: "kapalı" }, 503));
    const { fetchOpenMapPlaces } = await loadModule();

    await expect(fetchOpenMapPlaces(center, brief)).rejects.toThrow("Open map service 503");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("dış signal iptalini iç fetch signal'ine iletir", async () => {
    installFetch((_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      }),
    );
    const { fetchOpenMapPlaces } = await loadModule();
    const external = new AbortController();

    const pending = fetchOpenMapPlaces(center, brief, external.signal);
    external.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(clearTimeoutMock).toHaveBeenCalledWith(123);
  });

  it("9 saniyelik iç zamanlayıcı fetch'i iptal eder", async () => {
    installFetch((_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      }),
    );
    const { fetchOpenMapPlaces } = await loadModule();

    const pending = fetchOpenMapPlaces(center, brief);
    expect(timeoutMs).toBe(9000);
    timeoutCallback?.();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(clearTimeoutMock).toHaveBeenCalledWith(123);
  });
});
