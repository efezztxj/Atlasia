/**
 * P16 — ziyaret doğrulaması IO karakterizasyonu.
 *
 * Firestore sahte katmanı sorgudaki createdAt sıralama ve limit koşulunu da
 * uygular; böylece 50 kayıt penceresi yalnız isimde değil davranışta kilitlenir.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const stats = { unsubscribes: 0 };

  const millis = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (
      value &&
      typeof value === "object" &&
      "toMillis" in value &&
      typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
      return (value as { toMillis: () => number }).toMillis();
    }
    return 0;
  };

  const docsFor = (
    path: string,
    constraints: Array<{ field?: string; direction?: string; limit?: number }> = [],
  ) => {
    let docs = [...store.entries()]
      .filter(([key]) => key.startsWith(`${path}/`))
      .filter(([key]) => key.slice(path.length + 1).split("/").length === 1)
      .map(([key, data]) => ({ id: key.slice(path.length + 1), data: () => data }));
    const order = constraints.find((item) => item.field === "createdAt");
    if (order) {
      docs = docs.sort((a, b) =>
        order.direction === "asc"
          ? millis(a.data().createdAt) - millis(b.data().createdAt)
          : millis(b.data().createdAt) - millis(a.data().createdAt),
      );
    }
    const limit = constraints.find((item) => typeof item.limit === "number")?.limit;
    return typeof limit === "number" ? docs.slice(0, limit) : docs;
  };

  return { store, stats, docsFor };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  query: (
    target: { path: string },
    ...constraints: Array<{ field?: string; direction?: string; limit?: number }>
  ) => ({ path: target.path, constraints }),
  orderBy: (field: string, direction: string) => ({ field, direction }),
  limit: (value: number) => ({ limit: value }),
  serverTimestamp: () => "SERVER_TS",
  setDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    h.store.set(docRef.path, data);
  },
  onSnapshot: (
    q: { path: string; constraints?: Array<{ field?: string; direction?: string; limit?: number }> },
    onChange: (snapshot: { docs: ReturnType<typeof h.docsFor> }) => void,
  ) => {
    onChange({ docs: h.docsFor(q.path, q.constraints ?? []) });
    return () => {
      h.stats.unsubscribes += 1;
    };
  },
}));

import type { VerificationStatus } from "../utils/freshness";
import {
  addPlaceVerification,
  normalizeVerification,
  subscribeRecentVerifications,
  VERIFICATIONS_LIMIT,
} from "./verifications";

beforeEach(() => {
  h.store.clear();
  h.stats.unsubscribes = 0;
});

describe("ziyaret doğrulaması IO sözleşmesi", () => {
  it("normalize eksik/yanlış tipli alanlarda güvenli varsayılanlar kullanır", () => {
    expect(normalizeVerification("v1", {})).toEqual({
      id: "v1",
      placeId: "",
      uid: "",
      status: "still_open",
      note: undefined,
      createdAt: 0,
    });
    expect(
      normalizeVerification("v2", {
        placeId: "güzelyurt-şelale",
        uid: "user-ı",
        status: "road_closed",
        note: "İğneada yolu kapalı",
        createdAt: { toMillis: () => 987_654 },
      }),
    ).toEqual({
      id: "v2",
      placeId: "güzelyurt-şelale",
      uid: "user-ı",
      status: "road_closed",
      note: "İğneada yolu kapalı",
      createdAt: 987_654,
    });
  });

  it("ekleme kimlikleri/notu kırpar ve sunucu zamanıyla tek belge yazar", async () => {
    const created = await addPlaceVerification({
      placeId: "  manavgat-şelalesi  ",
      uid: "  user-42  ",
      status: "fee_changed",
      note: "  Giriş ücreti değişmiş.  ",
    });

    expect(created.id).toMatch(/^vr-/);
    expect(created).toMatchObject({
      placeId: "manavgat-şelalesi",
      uid: "user-42",
      status: "fee_changed",
      note: "Giriş ücreti değişmiş.",
    });
    expect(created.createdAt).toBeGreaterThan(0);
    expect(h.store.get(`verifications/${created.id}`)).toEqual({
      placeId: "manavgat-şelalesi",
      uid: "user-42",
      status: "fee_changed",
      note: "Giriş ücreti değişmiş.",
      createdAt: "SERVER_TS",
    });
  });

  it("yalnız boşluklardan oluşan not belgeye de dönüş değerine de yazılmaz", async () => {
    const created = await addPlaceVerification({
      placeId: "place-1",
      uid: "user-1",
      status: "still_open",
      note: "   ",
    });

    expect(created.note).toBeUndefined();
    expect(h.store.get(`verifications/${created.id}`)).not.toHaveProperty("note");
  });

  it("girişsiz/geçersiz doğrulama kodlu reddedilir ve yazma yapılmaz", async () => {
    await expect(
      addPlaceVerification({ placeId: "p1", uid: "  ", status: "still_open" }),
    ).rejects.toMatchObject({ code: "auth/required" });
    await expect(
      addPlaceVerification({ placeId: " ", uid: "u1", status: "still_open" }),
    ).rejects.toMatchObject({ code: "verification/place-invalid" });
    await expect(
      addPlaceVerification({
        placeId: "p1",
        uid: "u1",
        status: "bilinmiyor" as unknown as VerificationStatus,
      }),
    ).rejects.toMatchObject({ code: "verification/status-invalid" });
    await expect(
      addPlaceVerification({
        placeId: "p1",
        uid: "u1",
        status: "still_open",
        note: "ş".repeat(281),
      }),
    ).rejects.toMatchObject({ code: "verification/note-too-long" });

    expect(h.store.size).toBe(0);
  });

  it("canlı abonelik en yeni 50 doğrulamayı azalan sırayla verir", () => {
    expect(VERIFICATIONS_LIMIT).toBe(50);
    for (let i = 1; i <= 55; i += 1) {
      h.store.set(`verifications/v${i}`, {
        placeId: `place-${i}`,
        uid: "user-1",
        status: i % 2 ? "still_open" : "closed",
        createdAt: i,
      });
    }

    const snapshots: string[][] = [];
    const unsubscribe = subscribeRecentVerifications((items) =>
      snapshots.push(items.map((item) => item.id)),
    );

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toHaveLength(50);
    expect(snapshots[0][0]).toBe("v55");
    expect(snapshots[0].at(-1)).toBe("v6");
    unsubscribe();
    expect(h.stats.unsubscribes).toBe(1);
  });
});
