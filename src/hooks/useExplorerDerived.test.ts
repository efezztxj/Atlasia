// @vitest-environment jsdom
/**
 * F1-6 adım 5 davranış kilidi — türetilmiş değerler.
 *
 * Kilitlenen sözler: yakınlık sayacı 3,2 zoom altında **tüm** keşifleri sayar,
 * sahiplik yazarsız yerde yalnız ilk canlı snapshot öncesi geçerlidir, kategori
 * filtresi rehber yerlerini de kapsar, açık detay tazelik değişince tazelenir.
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useExplorerDerived, type ExplorerDerivedDeps } from "./useExplorerDerived";
import type { Place, ViewState } from "../types";

const place = (over: Partial<Place> & { id: string }): Place => ({
  title: over.id, region: "Ege", category: "cities", lat: 38.4, lng: 27.1,
  kind: "user", authorUid: "u1", ...over,
} as Place);

const view = (over: Partial<ViewState> = {}): ViewState => ({ zoom: 5, lat: 38.4, lng: 27.1, ...over } as ViewState);

function deps(over: Partial<ExplorerDerivedDeps> = {}): ExplorerDerivedDeps {
  return {
    discoveries: [place({ id: "a" }), place({ id: "b", category: "beaches" })],
    freshness: { withFreshness: (places) => places },
    uid: "u1",
    remoteReady: true,
    category: null,
    featuredIdx: 0,
    activeId: null,
    storyPlace: null,
    view: view(),
    rawPosts: [],
    rawStories: [],
    notifications: [],
    isBlocked: () => false,
    ...over,
  };
}

describe("useExplorerDerived", () => {
  it("rehber yerlerini keşiflere ekler", () => {
    const { result } = renderHook(() => useExplorerDerived(deps()));
    expect(result.current.allPlaces.length).toBeGreaterThan(2);
  });

  it("sahipliği yazara ve canlı snapshot durumuna göre verir", () => {
    const own = place({ id: "own", authorUid: "u1" });
    const foreign = place({ id: "foreign", authorUid: "u2" });
    const anonymous = place({ id: "anon", authorUid: undefined });
    const { result } = renderHook(() => useExplorerDerived(deps({
      discoveries: [own, foreign, anonymous], remoteReady: true,
    })));
    expect(result.current.canManagePlace(own)).toBe(true);
    expect(result.current.canManagePlace(foreign)).toBe(false);
    // Yazarsız yer yalnız ilk canlı snapshot öncesi sahiplenilebilir.
    expect(result.current.canManagePlace(anonymous)).toBe(false);

    const before = renderHook(() => useExplorerDerived(deps({
      discoveries: [anonymous], remoteReady: false,
    })));
    expect(before.result.current.canManagePlace(anonymous)).toBe(true);
  });

  it("misafir hiçbir yeri silemez", () => {
    const { result } = renderHook(() => useExplorerDerived(deps({ uid: undefined })));
    expect(result.current.canManagePlace(place({ id: "x", authorUid: undefined }))).toBe(false);
    expect(result.current.myPlaces).toHaveLength(0);
  });

  it("kategori filtresi rehber yerlerini de süzer", () => {
    const all = renderHook(() => useExplorerDerived(deps()));
    const beaches = renderHook(() => useExplorerDerived(deps({ category: "beaches" })));
    expect(beaches.result.current.visiblePlaces.length).toBeLessThan(all.result.current.visiblePlaces.length);
    expect(beaches.result.current.visiblePlaces.every((p) => p.category === "beaches")).toBe(true);
  });

  it("yakınlık sayacı 3,2 zoom altında tüm keşifleri sayar", () => {
    const { result } = renderHook(() => useExplorerDerived(deps({ view: view({ zoom: 2 }) })));
    expect(result.current.nearby).toBe(2);
  });

  it("açık detay tazelik verisi değişince güncel özeti gösterir", () => {
    const opened = place({ id: "a" });
    const { result } = renderHook(() => useExplorerDerived(deps({ storyPlace: opened })));
    expect(result.current.liveStoryPlace?.id).toBe("a");
    // Tazelenmiş listede aynı id: canlı kopya kazanır (yerel kopya değil).
    const fresh = { ...opened, title: "Tazelenmiş" };
    const { result: refreshed } = renderHook(() => useExplorerDerived(deps({
      storyPlace: opened, freshness: { withFreshness: () => [fresh] },
    })));
    expect(refreshed.current.liveStoryPlace?.title).toBe("Tazelenmiş");
  });

  it("engellenmiş yazarın gönderileri ve bildirimleri düşer", () => {
    const isBlocked = vi.fn((uid?: string) => uid === "kotu");
    const { result } = renderHook(() => useExplorerDerived(deps({
      isBlocked,
      rawPosts: [{ id: "p1", authorUid: "kotu" }, { id: "p2", authorUid: "iyi" }] as never,
      notifications: [
        { id: "n1", actorUid: "kotu", read: false },
        { id: "n2", actorUid: "iyi", read: false },
        { id: "n3", actorUid: "iyi", read: true },
      ] as never,
    })));
    expect(result.current.filteredPosts).toHaveLength(1);
    expect(result.current.visibleNotifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
  });

  it("aktif yer yokken öne çıkan yeri 'şu an' yapar", () => {
    const { result } = renderHook(() => useExplorerDerived(deps({ featuredIdx: 1 })));
    expect(result.current.activePlace).toBeUndefined();
    expect(result.current.current?.id).toBe(result.current.visiblePlaces[1].id);
  });
});
