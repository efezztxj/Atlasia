// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasRoute, Place } from "../types";
import { storageRemove } from "../utils/storage";

const h = vi.hoisted(() => ({
  publishRoute: vi.fn(async () => undefined),
  saveRouteReference: vi.fn(async () => undefined),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));
vi.mock("../lib/firebase", () => ({
  firebaseConfigured: false,
  isCloudReady: false,
  db: null,
  firebaseApp: null,
}));
vi.mock("../lib/routeData", () => ({
  publishRoute: h.publishRoute,
  saveRouteReference: h.saveRouteReference,
  removeRouteFromLibrary: vi.fn(async () => undefined),
  toggleSavedPlace: vi.fn(async () => undefined),
  subscribeSavedCollections: vi.fn(() => () => undefined),
}));

import { CollectionsProvider, isCloudAccount, useCollections } from "./useCollections";

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(CollectionsProvider, null, children);

const place = (id: string): Place => ({
  id,
  title: `Yer ${id}`,
  region: "İzmir",
  category: "history",
  lng: 27.14,
  lat: 38.42,
  note: "Not",
  author: "efe",
  kind: "guide",
});

const route = (id: string, routeTitle = `Rota ${id}`): AtlasRoute => ({
  id,
  routeTitle,
  routeSummary: "Özet",
  totalDurationHours: 2,
  totalDistanceKm: 5,
  transport: "walking",
  vibe: "sakin",
  days: [],
  weatherNote: null,
  alternatives: [],
  createdAt: 1,
});

beforeEach(() => {
  storageRemove("atlasia.member.u1.places");
  storageRemove("atlasia.member.u1.routes");
  window.localStorage.clear();
  h.publishRoute.mockClear();
  h.saveRouteReference.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("useCollections (yerel mod)", () => {
  it("provider olmadan açık hata verir", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useCollections())).toThrow("CollectionsProvider is required.");
    errorSpy.mockRestore();
  });

  it("uid'ye özel yerel kayıtları okur; bozuk JSON'da boş listeye düşer", () => {
    window.localStorage.setItem("atlasia.member.u1.places", JSON.stringify([place("p1")]));
    window.localStorage.setItem("atlasia.member.u1.routes", "{bozuk");

    const { result } = renderHook(() => useCollections(), { wrapper });

    expect(result.current.savedPlaces.map((item) => item.id)).toEqual(["p1"]);
    expect(result.current.savedRoutes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSaved("p1")).toBe(true);
  });

  it("savePlace yerelde ekle/kaldır toggle'ı yapar ve kalıcılaştırır", () => {
    const { result } = renderHook(() => useCollections(), { wrapper });
    const item = place("p1");

    act(() => result.current.savePlace(item));
    expect(result.current.savedPlaces).toEqual([item]);
    expect(result.current.isSaved("p1")).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("atlasia.member.u1.places") ?? "[]")).toEqual([item]);

    act(() => result.current.savePlace(item));
    expect(result.current.savedPlaces).toEqual([]);
    expect(result.current.isSaved("p1")).toBe(false);
    expect(JSON.parse(window.localStorage.getItem("atlasia.member.u1.places") ?? "[]")).toEqual([]);
  });

  it("saveRoute aynı kimliği başa taşır, yineleneni eler ve 40 kayıt sınırını korur", () => {
    const initial = Array.from({ length: 40 }, (_, index) => route(`r${index + 1}`));
    window.localStorage.setItem("atlasia.member.u1.routes", JSON.stringify(initial));
    const { result } = renderHook(() => useCollections(), { wrapper });

    act(() => result.current.saveRoute(route("yeni")));
    expect(result.current.savedRoutes).toHaveLength(40);
    expect(result.current.savedRoutes[0].id).toBe("yeni");
    expect(result.current.savedRoutes.at(-1)?.id).toBe("r39");

    act(() => result.current.saveRoute(route("r20", "Güncel başlık")));
    expect(result.current.savedRoutes).toHaveLength(40);
    expect(result.current.savedRoutes[0]).toMatchObject({ id: "r20", routeTitle: "Güncel başlık" });
    expect(result.current.savedRoutes.filter((item) => item.id === "r20")).toHaveLength(1);

    act(() => result.current.removeRoute("r20"));
    expect(result.current.savedRoutes.some((item) => item.id === "r20")).toBe(false);
    expect(
      (JSON.parse(window.localStorage.getItem("atlasia.member.u1.routes") ?? "[]") as AtlasRoute[])
        .some((item) => item.id === "r20"),
    ).toBe(false);
  });

  it("P16 #1: yerel modda publish bulut zincirini ÇAĞIRMAZ; cihazda saklar ve Türkçe neden söyler", async () => {
    const { result } = renderHook(() => useCollections(), { wrapper });
    const item = route("r1");

    let failure: unknown;
    await act(async () => {
      failure = await result.current.publishRoute(item, "public", true).catch((error: unknown) => error);
    });

    // Bulut fonksiyonları hiç denenmez (yerelde yayın yoktur).
    expect(h.publishRoute).not.toHaveBeenCalled();
    expect(h.saveRouteReference).not.toHaveBeenCalled();
    // İş kaybolmaz: rota cihazda saklanır.
    expect(result.current.savedRoutes.map((entry) => entry.id)).toEqual(["r1"]);
    expect(
      (JSON.parse(window.localStorage.getItem("atlasia.member.u1.routes") ?? "[]") as AtlasRoute[])
        .map((entry) => entry.id),
    ).toEqual(["r1"]);
    // Sahte başarı yok: açık Türkçe mesaj.
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe(
      "Bulut hesabı bağlı değil: rota bu cihazda kaydedildi, yayımlanamadı. Yayımlamak için bulut (e-posta) hesabıyla giriş yap.",
    );
  });

  it("ham iz alanları taşıyan rota yayına sokulmaz (yerelde de)", async () => {
    const { result } = renderHook(() => useCollections(), { wrapper });
    const kirlenmis = { ...route("r-kirli"), accuracy: { meanMeters: 5 } } as unknown as AtlasRoute;

    let failure: unknown;
    await act(async () => {
      failure = await result.current.publishRoute(kirlenmis, "private", false).catch((error: unknown) => error);
    });

    expect((failure as Error).message).toContain("Yalnız taslak rota paylaşılabilir");
    expect(h.publishRoute).not.toHaveBeenCalled();
    expect(result.current.savedRoutes).toEqual([]);
  });

  it("onaysız public yayın yerelde de kapıda durur; cihazda da saklanmaz", async () => {
    const { result } = renderHook(() => useCollections(), { wrapper });
    const item = route("r-onaysiz-yerel");

    let failure: unknown;
    await act(async () => {
      failure = await result.current.publishRoute(item, "public", false).catch((error: unknown) => error);
    });

    expect((failure as Error).message).toContain("ayrı bir onay ister");
    expect(h.publishRoute).not.toHaveBeenCalled();
    expect(result.current.savedRoutes).toEqual([]);
  });
});

describe("isCloudAccount — yapılandırmasız derlemede hesap türü fark etmez", () => {
  it("Firebase yoksa herkes yereldir", () => {
    expect(isCloudAccount("firebase")).toBe(false);
    expect(isCloudAccount("device")).toBe(false);
    expect(isCloudAccount(undefined)).toBe(false);
  });
});
