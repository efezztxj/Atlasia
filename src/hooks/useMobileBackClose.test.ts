// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMobileBackClose } from "./useMobileBackClose";

const MARKER = "__atlasiaBackLayer";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "");
});

describe("mobil geri tuşu ile katman kapatma", () => {
  it("katman açıkken geçmişe işaretli bir kayıt ekler", () => {
    renderHook(() => useMobileBackClose(true, () => {}));

    const state = window.history.state as Record<string, unknown> | null;
    expect(state?.[MARKER]).toEqual(expect.stringContaining(MARKER));
  });

  it("kapalı katman için geçmişe kayıt eklemez", () => {
    renderHook(() => useMobileBackClose(false, () => {}));

    expect(window.history.state).toBeNull();
  });

  it("geri tuşu (popstate) katmanı kapatır", () => {
    const onClose = vi.fn();
    renderHook(() => useMobileBackClose(true, onClose));

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("katman kapandıktan sonra geri tuşu dinleyicisi kalkar", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ open }) => useMobileBackClose(open, onClose), {
      initialProps: { open: true },
    });

    rerender({ open: false });
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("en güncel kapatıcıyı çağırır (bayat referans kullanmaz)", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ onClose }) => useMobileBackClose(true, onClose), {
      initialProps: { onClose: first },
    });

    rerender({ onClose: second });
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
