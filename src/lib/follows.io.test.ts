/**
 * Takip listesi IO sözleşmesi: yazımlar users/{uid}/following/{targetUid}
 * yoluna, kuraldaki kapalı alan kümesiyle gider; okuma 100 kayıtla sınırlıdır.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const stats = { unsubscribes: 0 };
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
      docs = docs.sort((a, b) => (order.direction === "asc"
        ? Number(a.data().createdAt) - Number(b.data().createdAt)
        : Number(b.data().createdAt) - Number(a.data().createdAt)));
    }
    const lim = constraints.find((item) => typeof item.limit === "number")?.limit;
    return typeof lim === "number" ? docs.slice(0, lim) : docs;
  };
  return { store, stats, docsFor };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, path: string) => ({ path }),
  query: (target: { path: string }, ...constraints: Array<{ field?: string; direction?: string; limit?: number }>) => ({ path: target.path, constraints }),
  orderBy: (field: string, direction: string) => ({ field, direction }),
  limit: (value: number) => ({ limit: value }),
  serverTimestamp: () => "SERVER_TS",
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => { h.store.set(ref.path, data); },
  deleteDoc: async (ref: { path: string }) => { h.store.delete(ref.path); },
  getDocs: async (q: { path: string; constraints?: Array<{ field?: string; direction?: string; limit?: number }> }) => ({ docs: h.docsFor(q.path, q.constraints ?? []) }),
  onSnapshot: (
    q: { path: string; constraints?: Array<{ field?: string; direction?: string; limit?: number }> },
    onChange: (snapshot: { docs: ReturnType<typeof h.docsFor> }) => void,
  ) => {
    onChange({ docs: h.docsFor(q.path, q.constraints ?? []) });
    return () => { h.stats.unsubscribes += 1; };
  },
}));

import { FOLLOWING_LIMIT, fetchFollowing, followUser, subscribeFollowing, unfollowUser } from "./follows";

beforeEach(() => {
  h.store.clear();
  h.stats.unsubscribes = 0;
});

describe("takip IO sözleşmesi", () => {
  it("takip, yalnız sahibinin yoluna ve kapalı alan kümesiyle yazılır", async () => {
    await followUser(" me ", " you ");
    expect([...h.store.keys()]).toEqual(["users/me/following/you"]);
    expect(h.store.get("users/me/following/you")).toEqual({
      followerUid: "me",
      targetUid: "you",
      createdAt: "SERVER_TS",
    });
  });

  it("kendini takip ve geçersiz kimlik yazılmadan kodlu reddedilir", async () => {
    await expect(followUser("me", "me")).rejects.toMatchObject({ code: "follow/self" });
    await expect(followUser("me", " ")).rejects.toMatchObject({ code: "follow/uid-invalid" });
    await expect(unfollowUser("me", "me")).rejects.toMatchObject({ code: "follow/self" });
    expect(h.store.size).toBe(0);
  });

  it("takipten çıkma yalnız o belgeyi siler (tekrar çağrılabilir)", async () => {
    await followUser("me", "you");
    await followUser("me", "them");
    await unfollowUser("me", "you");
    expect([...h.store.keys()]).toEqual(["users/me/following/them"]);
    await expect(unfollowUser("me", "you")).resolves.toBeUndefined();
  });

  it("liste en yeni 100 ile sınırlı ve yalnız kendi yolu okunur", async () => {
    expect(FOLLOWING_LIMIT).toBe(100);
    for (let i = 1; i <= 105; i += 1) {
      h.store.set(`users/me/following/u${i}`, { followerUid: "me", targetUid: `u${i}`, createdAt: i });
    }
    h.store.set("users/other/following/u1", { followerUid: "other", targetUid: "u1", createdAt: 999 });

    const mine = await fetchFollowing("me");
    expect(mine).toHaveLength(100);
    expect(mine[0].targetUid).toBe("u105");
    expect(mine.every((item) => item.followerUid === "me")).toBe(true);

    const snapshots: string[][] = [];
    const unsubscribe = subscribeFollowing("me", (items) => snapshots.push(items.map((item) => item.targetUid)));
    expect(snapshots[0]).toHaveLength(100);
    unsubscribe();
    expect(h.stats.unsubscribes).toBe(1);
  });

  it("kimlik yoksa abonelik boş liste verir ve dinleyici açılmaz", () => {
    const seen: unknown[] = [];
    const unsubscribe = subscribeFollowing("  ", (items) => seen.push(items));
    expect(seen).toEqual([[]]);
    unsubscribe();
    expect(h.stats.unsubscribes).toBe(0);
  });
});
