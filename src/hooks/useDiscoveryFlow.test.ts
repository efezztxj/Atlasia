// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDiscoveryFlow } from "./useDiscoveryFlow";

/**
 * F1-4 davranış kilidi: toast ömrü ve Esc kısayolu artık kancanın içinde.
 * `Explorer` bu iki davranışı kaybetmemeli — testler tam olarak onu ölçer.
 */
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useDiscoveryFlow", () => {
  it("varsayılanlar: filtre yok, seçim yok, panel kapalı", () => {
    const { result } = renderHook(() => useDiscoveryFlow());
    expect(result.current.category).toBeNull();
    expect(result.current.activeId).toBeNull();
    expect(result.current.addMode).toBe(false);
    expect(result.current.draft).toBeNull();
    expect(result.current.toast).toBeNull();
    expect(result.current.resumeRoute).toBeNull();
    expect(result.current.routeEditorRoute).toBeNull();
  });

  it("toast 3.2 saniye sonra kendiliğinden kapanır", () => {
    const { result } = renderHook(() => useDiscoveryFlow());

    act(() => result.current.setToast("Kaydedildi"));
    expect(result.current.toast).toBe("Kaydedildi");

    act(() => { vi.advanceTimersByTime(3199); });
    expect(result.current.toast).toBe("Kaydedildi");

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.toast).toBeNull();
  });

  it("yeni toast sayacı sıfırlar (eski süre yenisini kapatmaz)", () => {
    const { result } = renderHook(() => useDiscoveryFlow());

    act(() => result.current.setToast("birinci"));
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => result.current.setToast("ikinci"));
    act(() => { vi.advanceTimersByTime(2000); });

    // İlk toast'ın 3.2 sn'si doldu ama ikincinin dolmadı.
    expect(result.current.toast).toBe("ikinci");

    act(() => { vi.advanceTimersByTime(1200); });
    expect(result.current.toast).toBeNull();
  });

  it("ekleme modunda Esc çıkarır, mod kapalıyken dinleyici takılmaz", () => {
    const { result } = renderHook(() => useDiscoveryFlow());

    const key = new KeyboardEvent("keydown", { key: "Escape" });
    act(() => { window.dispatchEvent(key); });
    expect(result.current.addMode).toBe(false);

    act(() => result.current.setAddMode(true));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(result.current.addMode).toBe(false);

    // Enter/başka tuş modu değiştirmez.
    act(() => result.current.setAddMode(true));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })); });
    expect(result.current.addMode).toBe(true);
  });
});
