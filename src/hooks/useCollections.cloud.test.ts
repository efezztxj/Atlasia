// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedCollectionSnapshot } from "../lib/routeData";
import type { AtlasRoute, Place } from "../types";

const h = vi.hoisted(() => {
  const subscriptions: Array<{
    uid: string;
    onChange: (snapshot: SavedCollectionSnapshot) => void;
    onError: (error: Error) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }> = [];
  return {
    user: { uid: "u1" } as { uid: string },
    subscriptions,
    toggleSavedPlace: vi.fn(async () => undefined),
    saveRouteReference: vi.fn(async () => undefined),
    publishRoute: vi.fn(async () => undefined),
    removeRouteFromLibrary: vi.fn(async () => undefined),
  };
});

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: h.user }),
}));
vi.mock("../lib/firebase", () => ({
  firebaseConfigured: true,
  isCloudReady: true,
  db: {},
  firebaseApp: {},
}));
vi.mock("../lib/routeData", () => ({
  toggleSavedPlace: h.toggleSavedPlace,
  saveRouteReference: h.saveRouteReference,
  publishRoute: h.publishRoute,
  removeRouteFromLibrary: h.removeRouteFromLibrary,
  subscribeSavedCollections: (
    uid: string,
    onChange: (snapshot: SavedCollectionSnapshot) => void,
    onError: (error: Error) => void,
  ) => {
    const unsubscribe = vi.fn();
    h.subscriptions.push({ uid, onChange, onError, unsubscribe });
    return unsubscribe;
  },
}));

import { CollectionsProvider, useCollections } from "./useCollections";

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

const route = (id: string): AtlasRoute => ({
  id,
  routeTitle: `Rota ${id}`,
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
  h.user = { uid: "u1" };
  h.subscriptions.length = 0;
  h.toggleSavedPlace.mockReset().mockResolvedValue(undefined);
  h.saveRouteReference.mockReset().mockResolvedValue(undefined);
  h.publishRoute.mockReset().mockResolvedValue(undefined);
  h.removeRouteFromLibrary.mockReset().mockResolvedValue(undefined);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("useCollections (bulut modu)", () => {
  it("yerel kayıtları okumaz; abonelik snapshot'ı gelene kadar loading kalır", () => {
    window.localStorage.setItem("atlasia.member.u1.places", JSON.stringify([place("yerel")]));
    const { result } = renderHook(() => useCollections(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.savedPlaces).toEqual([]);
    expect(h.subscriptions).toHaveLength(1);
    expect(h.subscriptions[0].uid).toBe("u1");

    act(() => h.subscriptions[0].onChange({ places: [place("p1")], routes: [route("r1")] }));

    expect(result.current.loading).toBe(false);
    expect(result.current.savedPlaces.map((item) => item.id)).toEqual(["p1"]);
    expect(result.current.savedRoutes.map((item) => item.id)).toEqual(["r1"]);
    expect(result.current.isSaved("p1")).toBe(true);
  });

  it("abonelik hatası mesajını state'e taşır ve loading'i indirir", () => {
    const { result } = renderHook(() => useCollections(), { wrapper });

    act(() => h.subscriptions[0].onError(new Error("İzin reddedildi")));

    expect(result.current.error).toBe("İzin reddedildi");
    expect(result.current.loading).toBe(false);
  });

  it("yer/rota işlemlerini routeData'ya devreder; reddi kullanıcı hatasına çevirir", async () => {
    const { result } = renderHook(() => useCollections(), { wrapper });
    const item = place("p1");
    const rotaItem = route("r1");

    act(() => result.current.savePlace(item));
    act(() => result.current.saveRoute(rotaItem));
    act(() => result.current.removeRoute("r1"));

    expect(h.toggleSavedPlace).toHaveBeenCalledWith("u1", item);
    expect(h.saveRouteReference).toHaveBeenCalledWith("u1", rotaItem);
    expect(h.removeRouteFromLibrary).toHaveBeenCalledWith("u1", "r1");

    h.toggleSavedPlace.mockRejectedValueOnce(new Error("Yer yazılamadı"));
    act(() => result.current.savePlace(item));
    await waitFor(() => expect(result.current.error).toBe("Yer yazılamadı"));
  });

  it("publish önce yayınlar sonra kayıt referansı ekler; ilk hata ikinciyi engeller", async () => {
    const { result } = renderHook(() => useCollections(), { wrapper });
    const item = route("r1");

    await act(async () => {
      await result.current.publishRoute(item, "unlisted");
    });
    expect(h.publishRoute).toHaveBeenCalledWith("u1", item, "unlisted");
    expect(h.saveRouteReference).toHaveBeenCalledWith("u1", item);
    expect(h.publishRoute.mock.invocationCallOrder[0]).toBeLessThan(
      h.saveRouteReference.mock.invocationCallOrder[0],
    );

    h.publishRoute.mockRejectedValueOnce(new Error("Yayın reddedildi"));
    h.saveRouteReference.mockClear();
    await expect(result.current.publishRoute(item, "public")).rejects.toThrow("Yayın reddedildi");
    expect(h.saveRouteReference).not.toHaveBeenCalled();
  });

  it("kullanıcı nesnesi değişince eski aboneliği kapatıp yeni uid ile açar", () => {
    const { result, rerender, unmount } = renderHook(() => useCollections(), { wrapper });
    act(() => h.subscriptions[0].onChange({ places: [], routes: [] }));
    expect(result.current.loading).toBe(false);

    h.user = { uid: "u2" };
    rerender();

    expect(h.subscriptions[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(h.subscriptions).toHaveLength(2);
    expect(h.subscriptions[1].uid).toBe("u2");
    expect(result.current.loading).toBe(true);

    unmount();
    expect(h.subscriptions[1].unsubscribe).toHaveBeenCalledTimes(1);
  });
});
