// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewVerificationInput } from "../lib/verifications";
import type { Place } from "../types";
import type { PlaceVerification } from "../utils/freshness";

const h = vi.hoisted(() => {
  const calls: Array<{
    onChange: (items: PlaceVerification[]) => void;
    onError?: (error: Error) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }> = [];
  const addCalls: NewVerificationInput[] = [];
  const state: { created: PlaceVerification | null; addError: Error | null } = {
    created: null,
    addError: null,
  };
  return { calls, addCalls, state };
});

vi.mock("../lib/verifications", () => ({
  subscribeRecentVerifications: (
    onChange: (items: PlaceVerification[]) => void,
    onError?: (error: Error) => void,
  ) => {
    const unsubscribe = vi.fn();
    h.calls.push({ onChange, onError, unsubscribe });
    return unsubscribe;
  },
  addPlaceVerification: async (input: NewVerificationInput) => {
    h.addCalls.push(input);
    if (h.state.addError) throw h.state.addError;
    return h.state.created ?? {
      id: "yeni-dogrulama",
      placeId: input.placeId,
      uid: input.uid,
      status: input.status,
      note: input.note,
      createdAt: Date.now(),
    };
  },
}));

import { useFreshness } from "./useFreshness";

const place = (id: string): Place => ({
  id,
  title: `Yer ${id}`,
  region: "İzmir",
  category: "history",
  lng: 27.14,
  lat: 38.42,
  note: "Not",
  author: "efe",
  kind: "guide",
});

const verification = (id: string, placeId = "p1", createdAt = Date.now()): PlaceVerification => ({
  id,
  placeId,
  uid: "user-1",
  status: "still_open",
  createdAt,
});

beforeEach(() => {
  h.calls.length = 0;
  h.addCalls.length = 0;
  h.state.created = null;
  h.state.addError = null;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useFreshness", () => {
  it("tek aboneliği başlatır; snapshot ile ready ve tazelik özetleri güncellenir", () => {
    const now = Date.now();
    const { result } = renderHook(() => useFreshness("user-1"));

    expect(h.calls).toHaveLength(1);
    expect(result.current.ready).toBe(false);

    act(() => h.calls[0].onChange([verification("v1", "p1", now)]));

    expect(result.current.ready).toBe(true);
    expect(result.current.verifications.map((item) => item.id)).toEqual(["v1"]);
    expect(result.current.freshnessFor("p1")).toMatchObject({
      latestAt: now,
      band: "fresh",
      latestStatus: "still_open",
    });

    const p1 = place("p1");
    const p2 = place("p2");
    const enriched = result.current.withFreshness([p1, p2]);
    expect(enriched[0]).not.toBe(p1);
    expect(enriched[0].freshness?.band).toBe("fresh");
    expect(enriched[1]).toBe(p2);
  });

  it("abonelik hatası uyarı bırakır ve ready durumunu yine açar", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useFreshness("user-1"));

    act(() => h.calls[0].onError?.(new Error("okuma hatası")));

    expect(result.current.ready).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("uid yoksa Firestore okuma aboneliği açmaz ve verify yazmaya çalışmadan hata verir", async () => {
    const { result } = renderHook(() => useFreshness(undefined));

    expect(h.calls).toHaveLength(0);
    await expect(result.current.verify("p1", "still_open")).rejects.toThrow(
      "Doğrulama için giriş gerekli.",
    );
    expect(h.addCalls).toEqual([]);
  });

  it("verify yeni doğrulamayı iyimser olarak başa ekler ve listeyi 50 ile sınırlar", async () => {
    const initial = Array.from({ length: 50 }, (_, index) => verification(`v${index + 1}`));
    h.state.created = verification("yeni", "p9");
    const { result } = renderHook(() => useFreshness("user-1"));
    act(() => h.calls[0].onChange(initial));

    await act(async () => {
      await result.current.verify("p9", "closed", "Kapalı görünüyor");
    });

    expect(h.addCalls).toEqual([
      { placeId: "p9", uid: "user-1", status: "closed", note: "Kapalı görünüyor" },
    ]);
    expect(result.current.verifications).toHaveLength(50);
    expect(result.current.verifications[0].id).toBe("yeni");
    expect(result.current.verifications.at(-1)?.id).toBe("v49");
  });

  it("uid değişiminde aboneliği yeniler ve unmount'ta kapatır", () => {
    const { rerender, unmount } = renderHook(
      ({ uid }: { uid?: string }) => useFreshness(uid),
      { initialProps: { uid: "user-1" } as { uid?: string } },
    );

    rerender({ uid: "user-2" });
    expect(h.calls[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(h.calls).toHaveLength(2);

    unmount();
    expect(h.calls[1].unsubscribe).toHaveBeenCalledTimes(1);
  });
});
