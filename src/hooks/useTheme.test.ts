// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storageRemove } from "../utils/storage";
import { initTheme, useTheme } from "./useTheme";

const KEY = "atlasia.theme.v2";
const LEGACY_KEY = "atlasia.theme.v1";

beforeEach(() => {
  storageRemove(KEY);
  storageRemove(LEGACY_KEY);
  window.localStorage.clear();
  document.head.innerHTML = '<meta name="theme-color" content="">';
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  cleanup();
});

describe("useTheme", () => {
  it("kayıt yoksa koyu temayla başlar ve DOM/meta/storage değerlerini senkronlar", () => {
    // Ürün kararı: Atlasia her açılışta koyu gelir.
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#021512");
    expect(window.localStorage.getItem(KEY)).toBe("dark");
  });

  it("eski anahtardaki varsayılan 'light' kaydı koyuya taşınır", () => {
    // v1'de "light" uygulamanın varsayılanıydı, tercih değil.
    window.localStorage.setItem(LEGACY_KEY, "light");
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(window.localStorage.getItem(KEY)).toBe("dark");
  });

  it("eski anahtardaki bilinçli 'midnight' seçimi korunur", () => {
    window.localStorage.setItem(LEGACY_KEY, "midnight");
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("midnight");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#071827");
  });

  it("yeni anahtardaki tercih (açık dahil) korunur", () => {
    window.localStorage.setItem(KEY, "light");
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#ffffff");
  });

  it("bozuk değer varsayılan koyu temaya düşer", () => {
    window.localStorage.setItem(KEY, "mavi");
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
  });

  it("setTheme DOM, meta ve kalıcı kaydı birlikte günceller", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("midnight"));

    expect(result.current.theme).toBe("midnight");
    expect(document.documentElement.dataset.theme).toBe("midnight");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#071827");
    expect(window.localStorage.getItem(KEY)).toBe("midnight");
  });

  it("initTheme kayıtlı tercihi ilk React boyamasından önce uygular", () => {
    window.localStorage.setItem(KEY, "light");

    initTheme();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("initTheme kayıt yoksa koyu temayı ilk kareye uygular", () => {
    initTheme();

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#021512");
  });
});
