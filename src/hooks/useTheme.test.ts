// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storageRemove } from "../utils/storage";
import { useTheme } from "./useTheme";

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
  it("kayıt yoksa koyu temayla başlar ve DOM/meta/storage değerlerini senkronlar", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#021512");
    expect(window.localStorage.getItem(KEY)).toBe("dark");
  });

  it("midnight kaydı gece temasını koyu renk şemasıyla açar", () => {
    window.localStorage.setItem(KEY, "midnight");
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("midnight");
    expect(document.documentElement.dataset.theme).toBe("midnight");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#071827");
    expect(window.localStorage.getItem(KEY)).toBe("midnight");
  });

  it("yalnız açıkça light kaydı açık temayı seçer; bozuk değer koyuya düşer", () => {
    window.localStorage.setItem(KEY, "light");
    const first = renderHook(() => useTheme());
    expect(first.result.current.theme).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#f4f1e7");
    first.unmount();

    storageRemove(KEY);
    window.localStorage.setItem(KEY, "mavi");
    const second = renderHook(() => useTheme());
    expect(second.result.current.theme).toBe("dark");
  });

  it("setTheme DOM, meta ve kalıcı kaydı birlikte günceller", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("light"));

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#f4f1e7");
    expect(window.localStorage.getItem(KEY)).toBe("light");
  });
});
