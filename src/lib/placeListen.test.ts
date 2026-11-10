import { afterEach, describe, expect, it, vi } from "vitest";
import {
  estimatedListenSeconds,
  loadPlaceListen,
  parsePlaceListen,
  resetPlaceListenCacheForTests,
} from "./placeListen";

const longText = "Efes limandan yukarı doğru kurulmuş bir liman kentiydi. ".repeat(4).trim();

function payload(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    entries: [
      {
        id: "efes",
        title: "Efes Antik Kenti",
        tr: { audio: "/audio/listen/efes.mp3", text: longText },
        en: { audio: "/audio/listen/en-efes.mp3", text: longText },
        ...overrides,
      },
    ],
  };
}

afterEach(() => {
  resetPlaceListenCacheForTests();
  vi.unstubAllGlobals();
});

describe("parsePlaceListen", () => {
  it("sağlam kaydı sözlüğe çevirir", () => {
    const map = parsePlaceListen(payload());
    expect(map.efes.title).toBe("Efes Antik Kenti");
    expect(map.efes.tr.audio).toBe("/audio/listen/efes.mp3");
  });

  it("bozuk kaydı sessizce atlamaz", () => {
    expect(() => parsePlaceListen({})).toThrow(/entries/);
    expect(() => parsePlaceListen(payload({ id: "" }))).toThrow(/id/);
    expect(() => parsePlaceListen(payload({ id: "efes", tr: { audio: "/baska/efes.mp3", text: longText } }))).toThrow(
      /ses yolu/,
    );
    expect(() => parsePlaceListen(payload({ id: "efes", en: { audio: "/audio/listen/en-efes.mp3", text: "kısa" } }))).toThrow(
      /çok kısa/,
    );
    expect(() =>
      parsePlaceListen({
        entries: [
          { id: "efes", title: "Efes", tr: { audio: "/audio/listen/efes.mp3", text: longText }, en: { audio: "/audio/listen/en-efes.mp3", text: longText } },
          { id: "efes", title: "Efes", tr: { audio: "/audio/listen/efes.mp3", text: longText }, en: { audio: "/audio/listen/en-efes.mp3", text: longText } },
        ],
      }),
    ).toThrow(/iki kez/);
  });
});

describe("loadPlaceListen", () => {
  it("metni bir kez çeker, sonra önbellekten verir", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify(payload()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await loadPlaceListen();
    const second = await loadPlaceListen();

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/audio/listen/place-listen.json");
  });

  it("başarısız isteği yutar ama önbelleğe yazmaz; sonraki açılış yeniden dener", async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPlaceListen()).rejects.toThrow(/503/);
    await expect(loadPlaceListen()).resolves.toMatchObject({ efes: { title: "Efes Antik Kenti" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("estimatedListenSeconds", () => {
  it("saniyeyi metin uzunluğundan kestirir, alt sınırı korur", () => {
    expect(estimatedListenSeconds("kısa")).toBe(10);
    expect(estimatedListenSeconds("a".repeat(600))).toBe(40);
  });
});
