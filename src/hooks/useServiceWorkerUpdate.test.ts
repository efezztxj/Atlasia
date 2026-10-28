// @vitest-environment jsdom
/**
 * Güncelleme bildirimi sözleşmesi.
 *
 * Neden kritik: bu kanca yanlış davranırsa iki uçtan biri olur — ya güncelleme
 * sessizce asılı kalır (kullanıcı eski kabukta kalır) ya da uygulama kendini
 * habersiz yeniler (yazılmakta olan iz kaybolur). Bu yüzden:
 *   • bildirim yalnız `controller` varken gösterilir (ilk kurulumda değil),
 *   • `skipWaiting` yalnız kullanıcı "Yenile" dediğinde gider,
 *   • `controllerchange` tek sefer yeniler.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useServiceWorkerUpdate } from "./useServiceWorkerUpdate";

type Listener = () => void;

function createWorker(state: ServiceWorker["state"] = "installed") {
  const listeners: Record<string, Listener[]> = {};
  return {
    state,
    postMessage: vi.fn(),
    addEventListener: (type: string, listener: Listener) => {
      (listeners[type] ??= []).push(listener);
      // "installed" durumu dinleyici eklenir eklenmez işlenmiş sayılır.
      if (type === "statechange" && state === "installed") listener();
    },
    emit: (type: string) => (listeners[type] ?? []).forEach((listener) => listener()),
  } as unknown as ServiceWorker & { postMessage: ReturnType<typeof vi.fn> };
}

function installServiceWorker(options: {
  waiting?: ServiceWorker | null;
  controller?: boolean;
  registration?: Promise<ServiceWorkerRegistration> | "reject";
} = {}) {
  const listeners: Record<string, Listener[]> = {};
  const registration = {
    waiting: options.waiting ?? null,
    installing: null as ServiceWorker | null,
    addEventListener: vi.fn(),
  };
  const register = vi.fn(() =>
    (options.registration === "reject"
      ? Promise.reject(new Error("kayıt yok"))
      : Promise.resolve(registration as unknown as ServiceWorkerRegistration)));

  const container = {
    controller: options.controller === false ? null : {},
    register,
    addEventListener: (type: string, listener: Listener) => {
      (listeners[type] ??= []).push(listener);
    },
    removeEventListener: (type: string, listener: Listener) => {
      listeners[type] = (listeners[type] ?? []).filter((item) => item !== listener);
    },
    emit: (type: string) => (listeners[type] ?? []).forEach((listener) => listener()),
  };

  Object.defineProperty(navigator, "serviceWorker", { value: container, configurable: true });
  return { container, registration, register };
}

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
  Object.defineProperty(window, "location", {
    value: { protocol: "https:", reload: vi.fn() },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (originalServiceWorker) Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
  else Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("useServiceWorkerUpdate", () => {
  it("bekleyen sürüm varsa hazır der ve kullanıcı kararını beklemez", async () => {
    const waiting = createWorker();
    installServiceWorker({ waiting });

    const { result } = renderHook(() => useServiceWorkerUpdate());
    await act(async () => { await Promise.resolve(); });

    expect(result.current.ready).toBe(true);
    expect(result.current.applying).toBe(false);
    // Kullanıcı basmadan skipWaiting GİTMEZ.
    expect(waiting.postMessage).not.toHaveBeenCalled();
  });

  it("bekleyen sürüm yoksa hazır demez", async () => {
    installServiceWorker({ waiting: null });

    const { result } = renderHook(() => useServiceWorkerUpdate());
    await act(async () => { await Promise.resolve(); });

    expect(result.current.ready).toBe(false);
  });

  it("controller yokken (ilk kurulum) güncelleme bildirmez", async () => {
    const waiting = createWorker();
    const { registration } = installServiceWorker({ waiting, controller: false });
    registration.installing = waiting;

    const { result } = renderHook(() => useServiceWorkerUpdate());
    await act(async () => { await Promise.resolve(); });

    expect(result.current.ready).toBe(false);
  });

  it("kayıt başarısız olursa uygulama çökmez, konsola uyarı yazar", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    installServiceWorker({ registration: "reject" });

    const { result } = renderHook(() => useServiceWorkerUpdate());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(result.current.ready).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("çevrimiçi modda devam"), expect.any(Error));
  });

  it("apply: SKIP_WAITING mesajı gönderir, uygulanıyor durumuna geçer", async () => {
    const waiting = createWorker();
    installServiceWorker({ waiting });

    const { result } = renderHook(() => useServiceWorkerUpdate());
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.apply(); });

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(result.current.applying).toBe(true);
  });

  it("apply: bekleyen yoksa doğrudan yeniler", async () => {
    installServiceWorker({ waiting: null });

    const { result } = renderHook(() => useServiceWorkerUpdate());
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.apply(); });

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("mesaj kanalı kurulmazsa 1,5 sn sonra yeniler (kullanıcıyı bekletmez)", async () => {
    const waiting = createWorker();
    installServiceWorker({ waiting });

    const { result } = renderHook(() => useServiceWorkerUpdate());
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.apply(); });
    expect(window.location.reload).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(1_500); });

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("controllerchange tek sefer yeniler (çift yenileme yok)", async () => {
    const { container } = installServiceWorker({ waiting: null });

    renderHook(() => useServiceWorkerUpdate());
    await act(async () => { await Promise.resolve(); });

    act(() => { container.emit("controllerchange"); });
    act(() => { container.emit("controllerchange"); });

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("register=false iken hiç kayıt denemez", async () => {
    const { register } = installServiceWorker({ waiting: null });

    renderHook(() => useServiceWorkerUpdate(false));
    await act(async () => { await Promise.resolve(); });

    expect(register).not.toHaveBeenCalled();
  });
});
