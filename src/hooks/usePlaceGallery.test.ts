// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Place } from "../types";

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();

const place = (overrides: Partial<Place> = {}): Place => ({
  id: "yer-1",
  title: "Saat Kulesi",
  region: "İzmir",
  category: "history",
  lng: 27.145,
  lat: 38.42,
  note: "Not",
  author: "efe",
  kind: "guide",
  ...overrides,
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

async function loadHook(): Promise<typeof import("./usePlaceGallery")> {
  return import("./usePlaceGallery");
}

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("usePlaceGallery", () => {
  it("beş ve üzeri temel fotoğraf varsa Wikimedia çağrısı yapmaz", async () => {
    const { usePlaceGallery } = await loadHook();
    const item = place({
      photo: "https://images.pexels.com/photos/123/pexels-photo.jpg",
      gallery: [
        "https://commons.wikimedia.org/wiki/Special:FilePath/Saat.jpg?width=1200",
        "https://example.com/3.jpg",
        "https://example.com/4.jpg",
        "https://example.com/5.jpg",
      ],
      image: "https://example.com/6.jpg",
    });

    const { result } = renderHook(() => usePlaceGallery(item));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.photos).toHaveLength(6);
    expect(result.current.photos[0]).toMatchObject({
      credit: "Pexels · fotoğrafçı bilgisi",
      source: "https://www.pexels.com/photo/123/",
    });
    expect(result.current.photos[1]).toMatchObject({
      credit: "Wikimedia Commons · fotoğraf ve lisans",
      source: "https://commons.wikimedia.org/wiki/File:Saat.jpg",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("az fotoğrafta yakın Wikimedia sonuçlarını atıfla ekler ve aynı koordinatı cache'ler", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        query: {
          pages: {
            a: {
              imageinfo: [{
                mime: "image/jpeg",
                thumburl: "https://upload.wikimedia.org/yakin.jpg",
                descriptionurl: "https://commons.wikimedia.org/wiki/File:Yakin.jpg",
                extmetadata: {
                  Artist: { value: "<a href='#'>İğne Sanatçısı</a>" },
                  LicenseShortName: { value: "<b>CC BY-SA 4.0</b>" },
                },
              }],
            },
            b: { imageinfo: [{ mime: "image/gif", thumburl: "https://upload.wikimedia.org/atla.gif" }] },
            c: { imageinfo: [{ mime: "image/png" }] },
          },
        },
      }),
    );
    const { usePlaceGallery } = await loadHook();
    const item = place({ photo: "https://example.com/temel.jpg" });
    const { result, rerender } = renderHook(({ p }: { p: Place }) => usePlaceGallery(p), {
      initialProps: { p: item },
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(false);
    expect(result.current.photos).toHaveLength(2);
    expect(result.current.photos[1]).toEqual({
      url: "https://upload.wikimedia.org/yakin.jpg",
      credit: "İğne Sanatçısı · CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Yakin.jpg",
      nearby: true,
    });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://commons.wikimedia.org/w/api.php");
    expect(url.searchParams.get("ggscoord")).toBe("38.42|27.145");
    expect(url.searchParams.get("ggsradius")).toBe("500");
    expect(url.searchParams.get("iiurlwidth")).toBe("1200");

    rerender({ p: place({ id: "yer-2", photo: "https://example.com/baska.jpg" }) });
    expect(result.current.photos.map((photo) => photo.url)).toContain(
      "https://upload.wikimedia.org/yakin.jpg",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("HTTP hatası temel fotoğrafları korur ve error=true verir", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "kapalı" }, 503));
    const { usePlaceGallery } = await loadHook();
    const item = place({ photo: "https://example.com/temel.jpg" });

    const { result } = renderHook(() => usePlaceGallery(item));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.photos.map((photo) => photo.url)).toEqual([
      "https://example.com/temel.jpg",
    ]);
  });

  it("unmount bekleyen fetch'in AbortSignal'ini iptal eder", async () => {
    let observedSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        observedSignal = init?.signal ?? undefined;
        observedSignal?.addEventListener("abort", () => reject(observedSignal?.reason), { once: true });
      }),
    );
    const { usePlaceGallery } = await loadHook();
    const { unmount } = renderHook(() => usePlaceGallery(place()));

    expect(observedSignal?.aborted).toBe(false);
    unmount();

    expect(observedSignal?.aborted).toBe(true);
  });

  it("7 saniye dolunca error verir ve fetch'i iptal eder", async () => {
    vi.useFakeTimers();
    let observedSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        observedSignal = init?.signal ?? undefined;
        observedSignal?.addEventListener("abort", () => reject(observedSignal?.reason), { once: true });
      }),
    );
    const { usePlaceGallery } = await loadHook();
    const { result } = renderHook(() => usePlaceGallery(place()));

    await act(async () => {
      vi.advanceTimersByTime(7_000);
    });

    expect(observedSignal?.aborted).toBe(true);
    expect(result.current.error).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});
