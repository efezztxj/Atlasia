// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "./useDebouncedValue";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedValue", () => {
  it("gecikme dolmadan değer değişmez", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: "e" },
    });
    expect(result.current).toBe("e");

    rerender({ value: "ef" });
    expect(result.current).toBe("e");

    act(() => { vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1); });
    expect(result.current).toBe("e");

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe("ef");
  });

  it("hızlı yazımda yalnız son değer yayılır", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: "e" },
    });
    rerender({ value: "ef" });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: "efe" });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: "efe y" });
    expect(result.current).toBe("e");

    act(() => { vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS); });
    expect(result.current).toBe("efe y");
  });

  it("sökülünce zamanlayıcı temizlenir", () => {
    const { unmount } = renderHook(() => useDebouncedValue("arama"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
