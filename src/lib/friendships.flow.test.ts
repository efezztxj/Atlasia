/**
 * Aşama 1 — ret akışı: decline + istek silme TEK batch'te, ardından kanıtlı
 * friend_declined bildirimi. Bildirim hatası ana akışı bozmaz.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  batches: [] as Array<Array<{ op: "set" | "delete"; path: string; data?: Record<string, unknown> }>>,
  directWrites: [] as string[],
  commits: 0,
  failCommit: false,
}));

vi.mock("./firebase", () => ({ db: {} }));
const notify = vi.hoisted(() => vi.fn(async () => "n1"));
vi.mock("./notifications", () => ({ createNotification: notify }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  getDoc: async (ref: { path: string }) => ({
    exists: () => h.store.has(ref.path),
    data: () => h.store.get(ref.path),
    id: ref.path.split("/").at(-1),
  }),
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    h.directWrites.push(ref.path);
    h.store.set(ref.path, data);
  },
  deleteDoc: async (ref: { path: string }) => {
    h.directWrites.push(ref.path);
    h.store.delete(ref.path);
  },
  serverTimestamp: () => "TS",
  writeBatch: () => {
    const ops: Array<{ op: "set" | "delete"; path: string; data?: Record<string, unknown> }> = [];
    h.batches.push(ops);
    return {
      set: (ref: { path: string }, data: Record<string, unknown>) => ops.push({ op: "set", path: ref.path, data }),
      delete: (ref: { path: string }) => ops.push({ op: "delete", path: ref.path }),
      commit: async () => {
        if (h.failCommit) throw Object.assign(new Error("batch failed"), { code: "unavailable" });
        h.commits += 1;
        for (const op of ops) {
          if (op.op === "set") h.store.set(op.path, op.data ?? {});
          else h.store.delete(op.path);
        }
      },
    };
  },
  query: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  onSnapshot: () => () => {},
}));

import { declineFriendRequest } from "./friendships";

beforeEach(() => {
  h.store.clear();
  h.batches.length = 0;
  h.directWrites.length = 0;
  h.commits = 0;
  h.failCommit = false;
  notify.mockClear();
  notify.mockResolvedValue("n1");
  h.store.set("users/bob/friendRequests/alice", { fromUid: "alice", toUid: "bob" });
});

describe("declineFriendRequest — tek batch + kanıtlı bildirim", () => {
  it("ret belgesini ve istek silmesini aynı batch'te yazar, sonra kanıtlı bildirim gönderir", async () => {
    await declineFriendRequest("bob", "alice");

    expect(h.batches).toHaveLength(1);
    expect(h.batches[0]).toEqual([
      {
        op: "set",
        path: "friendDeclines/alice_bob",
        data: { declinerUid: "bob", requesterUid: "alice", users: ["alice", "bob"], createdAt: "TS" },
      },
      { op: "delete", path: "users/bob/friendRequests/alice" },
    ]);
    // Batch dışına taşan yazma yok.
    expect(h.directWrites).toEqual([]);
    expect(h.commits).toBe(1);
    expect(h.store.has("users/bob/friendRequests/alice")).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      recipientUid: "alice",
      actorUid: "bob",
      type: "friend_declined",
      title: "Istek reddedildi",
      body: "Arkadaslik istegin reddedildi.",
      targetId: "alice_bob",
    });
  });

  it("bildirim yazılamazsa ret yine tamamlanır ve uyarı loglanır", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    notify.mockRejectedValueOnce(new Error("permission-denied"));

    await expect(declineFriendRequest("bob", "alice")).resolves.toBeUndefined();

    expect(h.store.get("friendDeclines/alice_bob")).toMatchObject({ declinerUid: "bob", requesterUid: "alice" });
    expect(h.store.has("users/bob/friendRequests/alice")).toBe(false);
    expect(warn).toHaveBeenCalledWith("[Atlasia] Red bildirimi yazilamadi:", expect.any(Error));
    warn.mockRestore();
  });

  it("batch düşerse bildirim gönderilmez; hata çağırana döner", async () => {
    h.failCommit = true;

    await expect(declineFriendRequest("bob", "alice")).rejects.toMatchObject({ code: "unavailable" });

    expect(notify).not.toHaveBeenCalled();
    expect(h.store.has("users/bob/friendRequests/alice")).toBe(true);
    expect(h.store.has("friendDeclines/alice_bob")).toBe(false);
  });

  it("kendine ret yazılamaz; hiçbir yazma denenmez", async () => {
    await expect(declineFriendRequest("bob", "bob")).rejects.toMatchObject({ code: "friendship/self" });
    expect(h.batches).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });
});
