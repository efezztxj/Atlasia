// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockRecord } from "../lib/moderation";

const h = vi.hoisted(() => {
  const calls: Array<{
    uid: string;
    onChange: (blocks: BlockRecord[]) => void;
    onError?: (error: Error) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }> = [];
  return { calls };
});

vi.mock("../lib/moderation", () => ({
  subscribeBlocks: (
    uid: string,
    onChange: (blocks: BlockRecord[]) => void,
    onError?: (error: Error) => void,
  ) => {
    const unsubscribe = vi.fn();
    h.calls.push({ uid, onChange, onError, unsubscribe });
    return unsubscribe;
  },
}));

import { useBlocks } from "./useBlocks";

const block = (blockedUid: string): BlockRecord => ({
  id: `block-${blockedUid}`,
  blockerUid: "user-1",
  blockedUid,
  createdAt: 1,
});

beforeEach(() => {
  h.calls.length = 0;
});

afterEach(() => {
  cleanup();
});

describe("useBlocks", () => {
  it("uid yoksa abonelik açmaz ve hazır sayılmaz", () => {
    const { result } = renderHook(() => useBlocks(undefined));

    expect(result.current.blockedUids).toEqual([]);
    expect(result.current.ready).toBe(false);
    expect(result.current.isBlocked("u2")).toBe(false);
    expect(h.calls).toEqual([]);
  });

  it("snapshot geldikçe engellenen UID listesini ve hazır durumunu günceller", () => {
    const { result } = renderHook(() => useBlocks("user-1"));

    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].uid).toBe("user-1");
    expect(result.current.ready).toBe(false);

    act(() => h.calls[0].onChange([block("hedef-1"), block("hedef-2")]));

    expect(result.current.blockedUids).toEqual(["hedef-1", "hedef-2"]);
    expect(result.current.blockedSet).toEqual(new Set(["hedef-1", "hedef-2"]));
    expect(result.current.ready).toBe(true);
    expect(result.current.isBlocked("hedef-1")).toBe(true);
    expect(result.current.isBlocked("baskasi")).toBe(false);
    expect(result.current.isBlocked(null)).toBe(false);
    expect(result.current.isBlocked(undefined)).toBe(false);
  });

  it("hata callback'i hazır durumuna geçirir ama listeyi uydurmaz", () => {
    const { result } = renderHook(() => useBlocks("user-1"));

    act(() => h.calls[0].onError?.(new Error("abonelik hatası")));

    expect(result.current.ready).toBe(true);
    expect(result.current.blockedUids).toEqual([]);
  });

  it("uid değişiminde eski aboneliği kapatır, çıkışı bekleyene kadar ready=false yapar", () => {
    const { result, rerender, unmount } = renderHook(
      ({ uid }: { uid?: string }) => useBlocks(uid),
      { initialProps: { uid: "user-1" } },
    );
    act(() => h.calls[0].onChange([block("hedef-1")]));
    expect(result.current.ready).toBe(true);

    rerender({ uid: "user-2" });

    expect(h.calls[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(h.calls).toHaveLength(2);
    expect(h.calls[1].uid).toBe("user-2");
    expect(result.current.ready).toBe(false);

    unmount();
    expect(h.calls[1].unsubscribe).toHaveBeenCalledTimes(1);
  });
});
