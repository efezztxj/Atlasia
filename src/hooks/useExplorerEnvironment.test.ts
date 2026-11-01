// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_ROUTE_KEY, useExplorerEnvironment } from "./useExplorerEnvironment";

/**
 * F1-5 davranış kilidi. Üç söz burada korunuyor:
 *  1) 767 px eşiği CSS ile aynı olmalı,
 *  2) bildirim aboneliği yalnız bulut hesabında bağlanır (K-14),
 *  3) karşılama yalnız "görülmedi" VE "cihazda rota yok" iken açılır.
 */
const notif = vi.hoisted(() => ({ subscribeNotifications: vi.fn() }));
vi.mock("../lib/notifications", () => notif);

/** jsdom `matchMedia` sağlamaz; dinleyicileri tutan küçük bir sahte kuruyoruz. */
type Listener = (event: { matches: boolean }) => void;
const listeners = new Map<string, Set<Listener>>();
const fakeMatchMedia = (query: string) => {
  if (!listeners.has(query)) listeners.set(query, new Set());
  return {
    media: query,
    get matches() { return query.includes("max-width") ? window.innerWidth <= 767 : false; },
    addEventListener: (_: string, fn: Listener) => { listeners.get(query)!.add(fn); },
    removeEventListener: (_: string, fn: Listener) => { listeners.get(query)!.delete(fn); },
  };
};

const setWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
};

beforeEach(() => {
  window.matchMedia = fakeMatchMedia as unknown as typeof window.matchMedia;
  listeners.clear();
  notif.subscribeNotifications.mockReset();
  notif.subscribeNotifications.mockReturnValue(() => {});
  localStorage.clear();
  setWidth(1024);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useExplorerEnvironment", () => {
  it("masaüstünde smallScreen false, 767 px altında true (CSS eşiği)", () => {
    const { result } = renderHook(() => useExplorerEnvironment({ uid: "u1", cloudEnabled: true }));
    expect(result.current.smallScreen).toBe(false);

    setWidth(767);
    const narrow = renderHook(() => useExplorerEnvironment({ uid: "u1", cloudEnabled: true }));
    expect(narrow.result.current.smallScreen).toBe(true);
  });

  it("medya sorgusu değişince ekran durumu güncellenir, sökümde dinleyici kalır", () => {
    const { result, unmount } = renderHook(() => useExplorerEnvironment({ uid: undefined, cloudEnabled: false }));
    const screen = listeners.get("(max-width: 767px)")!;
    expect(screen.size).toBe(1);

    act(() => {
      setWidth(600);
      for (const fn of screen) fn({ matches: true });
    });
    expect(result.current.smallScreen).toBe(true);

    unmount();
    expect(screen.size).toBe(0);
  });

  it("cihaz hesabında bildirimlere abone olunmaz (K-14)", () => {
    renderHook(() => useExplorerEnvironment({ uid: "device-uid", cloudEnabled: false }));
    expect(notif.subscribeNotifications).not.toHaveBeenCalled();
  });

  it("bulut hesabında bildirimler dinlenir", () => {
    renderHook(() => useExplorerEnvironment({ uid: "u1", cloudEnabled: true }));
    expect(notif.subscribeNotifications).toHaveBeenCalledWith("u1", expect.any(Function), expect.any(Function));
  });

  it("karşılama: görülmediyse ve rota yoksa açılır", () => {
    const { result } = renderHook(() => useExplorerEnvironment({ uid: undefined, cloudEnabled: false }));
    expect(result.current.onboarding).toBe(true);
  });

  it("karşılama: daha önce görüldüyse açılmaz", () => {
    localStorage.setItem("atlasia.onboardingSeen", "1");
    const { result } = renderHook(() => useExplorerEnvironment({ uid: undefined, cloudEnabled: false }));
    expect(result.current.onboarding).toBe(false);
  });

  it("karşılama: cihazda rota varsa açılmaz (aktivasyon kapısı)", () => {
    localStorage.setItem(FIRST_ROUTE_KEY, "1");
    const { result } = renderHook(() => useExplorerEnvironment({ uid: undefined, cloudEnabled: false }));
    expect(result.current.onboarding).toBe(false);
  });

  it("dismissOnboarding bayrağı yazar ve paneli kapatır", async () => {
    const { result } = renderHook(() => useExplorerEnvironment({ uid: undefined, cloudEnabled: false }));
    expect(result.current.onboarding).toBe(true);

    result.current.dismissOnboarding();

    await waitFor(() => expect(result.current.onboarding).toBe(false));
    expect(localStorage.getItem("atlasia.onboardingSeen")).toBe("1");
  });

  it("konum etiketi varsayılanı 'Dünya'", () => {
    const { result } = renderHook(() => useExplorerEnvironment({ uid: undefined, cloudEnabled: false }));
    expect(result.current.locationLabel).toBe("Dünya");
    expect(result.current.preciseLabel).toBeNull();
  });
});
