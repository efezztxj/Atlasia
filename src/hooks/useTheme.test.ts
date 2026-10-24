// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storageRemove } from "../utils/storage";
import { initTheme, useTheme } from "./useTheme";

const KEY = "atlasia.theme.v1";

beforeEach(() => {
  storageRemove(KEY);
  window.localStorage.clear();
  document.head.innerHTML = '<meta name="theme-color" content="">';
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  cleanup();
});

describe("useTheme", () => {
  it("kayıt yoksa gerçek beyaz açık temayla başlar ve DOM/meta/storage değerlerini senkronlar", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#ffffff");
    expect(window.localStorage.getItem(KEY)).toBe("light");
  });

  it("kayıtlı koyu tercihi korur; bozuk değer varsayılan açık temaya düşer", () => {
    window.localStorage.setItem(KEY, "dark");
    const first = renderHook(() => useTheme());
    expect(first.result.current.theme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#021512");
    first.unmount();

    storageRemove(KEY);
    window.localStorage.setItem(KEY, "mavi");
    const second = renderHook(() => useTheme());
    expect(second.result.current.theme).toBe("light");
  });

  it("setTheme DOM, meta ve kalıcı kaydı birlikte günceller", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("dark"));

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#021512");
    expect(window.localStorage.getItem(KEY)).toBe("dark");
  });

  it("initTheme kayıtlı tercihi ilk React boyamasından önce uygular", () => {
    window.localStorage.setItem(KEY, "dark");

    initTheme();

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#021512");
  });
});
