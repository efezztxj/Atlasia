/**
 * Takip veri katmanı (İŞ 1d) — kural sözleşmesinin istemci tarafı.
 *
 * Kural (`firestore.rules` → users/{uid}/following):
 * - yalnız sahibi yazar, kendini takip edemez, alanlar dar;
 * - takipçi sayısı collection-group count() ile ve **where taşıyarak** okunur.
 * Bu testler o sözleşmenin istemcide bozulmadığını kilitler.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  written: [] as string[],
  deleted: [] as string[],
  counts: [] as Array<{ kind: string; payload: unknown }>,
  listeners: [] as Array<{ path: string; constraints: unknown[] }>,
}));

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ kind: "collection", path: segments.join("/") }),
  collectionGroup: (_db: unknown, id: string) => ({ kind: "collectionGroup", path: id }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  orderBy: (field: string, direction: string) => ({ field, direction }),
  limit: (value: number) => ({ limit: value }),
  query: (target: unknown, ...constraints: unknown[]) => ({ target, constraints }),
  serverTimestamp: () => "TS",
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    h.written.push(ref.path);
    h.store.set(ref.path, data);
  },
  deleteDoc: async (ref: { path: string }) => {
    h.deleted.push(ref.path);
    h.store.delete(ref.path);
  },
  getCountFromServer: async (input: { target?: { kind: string; path: string }; constraints?: unknown[] } & { kind?: string; path?: string }) => {
    // count() bazen query, bazen doğrudan koleksiyon referansı alır.
    const target = input.target ?? { kind: input.kind ?? "", path: input.path ?? "" };
    const constraints = input.constraints ?? [];
    h.counts.push({ kind: target.kind, payload: constraints });
    const filter = constraints.find((item) => (item as { op?: string }).op === "==") as
      | { field: string; value: unknown }
      | undefined;
    const matches = [...h.store.entries()].filter(([key, value]) => {
      const inPath = target.kind === "collectionGroup"
        ? key.includes(`/${target.path}/`)
        : key.startsWith(`${target.path}/`);
      if (!inPath) return false;
      if (!filter) return true;
      return (value as Record<string, unknown>)[filter.field] === filter.value;
    }).length;
    return { data: () => ({ count: matches }) };
  },
  onSnapshot: (q: { target: { path: string }; constraints: unknown[] }, onChange: (snap: unknown) => void) => {
    h.listeners.push({ path: q.target.path, constraints: q.constraints });
    onChange({ docs: [] });
    return () => {};
  },
}));

import {
  countFollowers,
  countFollowing,
  followUser,
  normalizeFollow,
  subscribeFollowing,
  unfollowUser,
  validateFollowInput,
  FOLLOWING_LIMIT,
} from "./follows";

beforeEach(() => {
  h.store.clear();
  h.written.length = 0;
  h.deleted.length = 0;
  h.counts.length = 0;
  h.listeners.length = 0;
});

describe("followUser / unfollowUser", () => {
  it("yalnız kendi following alt koleksiyonuna dar şemayla yazar", async () => {
    await followUser({ uid: "me", targetUid: "u2", targetName: "  Efe  " });
    expect(h.written).toEqual(["users/me/following/u2"]);
    expect(h.store.get("users/me/following/u2")).toEqual({
      targetUid: "u2",
      targetName: "Efe",
      since: "TS",
    });
  });

  it("kendini takip etmeyi istemcide reddeder (kural da reddeder)", async () => {
    await expect(followUser({ uid: "me", targetUid: "me", targetName: "Ben" }))
      .rejects.toMatchObject({ code: "follow/self" });
    expect(h.written).toEqual([]);
    expect(validateFollowInput({ uid: "me", targetUid: "me", targetName: "Ben" })).toBe("follow/self");
  });

  it("boş kimlik ve aşırı uzun ad reddedilir", () => {
    expect(validateFollowInput({ uid: "", targetUid: "u2", targetName: "A" })).toBe("follow/uid-invalid");
    expect(validateFollowInput({ uid: "me", targetUid: "  ", targetName: "A" })).toBe("follow/target-invalid");
    expect(validateFollowInput({ uid: "me", targetUid: "x".repeat(129), targetName: "A" })).toBe("follow/target-invalid");
    expect(validateFollowInput({ uid: "me", targetUid: "u2", targetName: "   " })).toBe("follow/name-invalid");
    expect(validateFollowInput({ uid: "me", targetUid: "u2", targetName: "x".repeat(101) })).toBe("follow/name-invalid");
    expect(validateFollowInput({ uid: "me", targetUid: "u2", targetName: "Efe" })).toBeNull();
  });

  it("takipten çıkma yalnız kendi belgesini siler", async () => {
    h.store.set("users/me/following/u2", { targetUid: "u2", targetName: "Efe", since: 1 });
    h.store.set("users/other/following/u2", { targetUid: "u2", targetName: "Efe", since: 1 });
    await unfollowUser("me", "u2");
    expect(h.deleted).toEqual(["users/me/following/u2"]);
    expect(h.store.has("users/other/following/u2")).toBe(true);
  });
});

describe("okuma ve sayım", () => {
  it("kendi listesi 100 kayıt tavanıyla, en yeni önce", () => {
    subscribeFollowing("me", () => {});
    const listener = h.listeners[0];
    expect(listener.path).toBe("users/me/following");
    expect(listener.constraints).toContainEqual({ limit: FOLLOWING_LIMIT });
    expect(listener.constraints).toContainEqual({ field: "since", direction: "desc" });
  });

  it("takipçi sayısı collection-group + where(targetUid == uid) ile istenir", async () => {
    h.store.set("users/u1/following/me", { targetUid: "me" });
    h.store.set("users/u2/following/me", { targetUid: "me" });
    h.store.set("users/u1/following/u9", { targetUid: "u9" });

    await expect(countFollowers("me")).resolves.toBe(2);
    expect(h.counts[0]).toEqual({
      kind: "collectionGroup",
      payload: [{ field: "targetUid", op: "==", value: "me" }],
    });
  });

  it("takip edilen sayısı kendi alt koleksiyonundan sayılır", async () => {
    h.store.set("users/me/following/u1", { targetUid: "u1" });
    h.store.set("users/me/following/u2", { targetUid: "u2" });
    await expect(countFollowing("me")).resolves.toBe(2);
    expect(h.counts[0].kind).toBe("collection");
  });

  it("boş uid sayım yapmaz", async () => {
    await expect(countFollowers("   ")).resolves.toBe(0);
    await expect(countFollowing("")).resolves.toBe(0);
    expect(h.counts).toHaveLength(0);
  });
});

describe("normalizeFollow", () => {
  it("eksik alanlarda güvenli varsayılan kullanır", () => {
    expect(normalizeFollow("u2", {})).toEqual({ targetUid: "u2", targetName: "", since: 0 });
    expect(normalizeFollow("u2", {
      targetUid: "u2",
      targetName: "Efe",
      since: { toMillis: () => 42 },
    })).toEqual({ targetUid: "u2", targetName: "Efe", since: 42 });
  });
});
