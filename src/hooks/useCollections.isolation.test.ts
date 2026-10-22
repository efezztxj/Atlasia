// @vitest-environment jsdom
/**
 * İŞ 1c · #61 p8 — koleksiyon izolasyonu.
 *
 * Senaryo: aynı oturumda hesap değişiyor (çıkış → başka hesapla giriş). İlk
 * hesabın kaydettiği yer/rota ikinci hesabın ekranında görünmemeli ve ikinci
 * hesabın yerel anahtarına yazılmamalı.
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Place } from "../types";

const h = vi.hoisted(() => ({ uid: "u1" }));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { uid: h.uid, backend: "device" } }),
}));
vi.mock("../lib/firebase", () => ({
  firebaseConfigured: false,
  isCloudReady: false,
  db: null,
  firebaseApp: null,
}));
vi.mock("../lib/routeData", () => ({
  publishRoute: vi.fn(async () => undefined),
  saveRouteReference: vi.fn(async () => undefined),
  removeRouteFromLibrary: vi.fn(async () => undefined),
  toggleSavedPlace: vi.fn(async () => undefined),
  subscribeSavedCollections: vi.fn(() => () => undefined),
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

beforeEach(() => {
  h.uid = "u1";
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("koleksiyon izolasyonu — hesap değişimi", () => {
  it("ikinci hesap birincinin listesini görmez, onun anahtarına yazılmaz", () => {
    window.localStorage.setItem("atlasia.member.u1.places", JSON.stringify([place("p1")]));
    const { result, rerender } = renderHook(() => useCollections(), { wrapper });
    expect(result.current.savedPlaces.map((item) => item.id)).toEqual(["p1"]);

    // Hesap değişti: u2'nin kendi kayıtları var, u1'inki görünmemeli.
    window.localStorage.setItem("atlasia.member.u2.places", JSON.stringify([place("p2")]));
    h.uid = "u2";
    rerender();

    expect(result.current.savedPlaces.map((item) => item.id)).toEqual(["p2"]);
    expect(result.current.isSaved("p1")).toBe(false);
    // Izolasyon: u2 anahtarı yalnız kendi kaydını taşır.
    expect(JSON.parse(window.localStorage.getItem("atlasia.member.u2.places") ?? "[]").map((item: Place) => item.id))
      .toEqual(["p2"]);
    // u1'in kaydı bozulmadı.
    expect(JSON.parse(window.localStorage.getItem("atlasia.member.u1.places") ?? "[]").map((item: Place) => item.id))
      .toEqual(["p1"]);
  });

  it("ikinci hesapta yeni kaydetme kendi anahtarına yazılır", () => {
    // Benzersiz kimlikler: utils/storage bellek yedeği testler arasında yaşar.
    h.uid = "u31";
    const { result, rerender } = renderHook(() => useCollections(), { wrapper });
    act(() => result.current.savePlace(place("p31")));

    h.uid = "u32";
    rerender();
    expect(result.current.savedPlaces).toEqual([]);

    act(() => result.current.savePlace(place("p32")));
    expect(JSON.parse(window.localStorage.getItem("atlasia.member.u32.places") ?? "[]").map((item: Place) => item.id))
      .toEqual(["p32"]);
    expect(JSON.parse(window.localStorage.getItem("atlasia.member.u31.places") ?? "[]").map((item: Place) => item.id))
      .toEqual(["p31"]);
  });
});
