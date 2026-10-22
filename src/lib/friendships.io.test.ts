/**
 * Arkadaşlık kabulü: kural yalnız kendi listesine yazmaya izin verir
 * (tests/firestore.rules.test.ts:1074). Kabul eden karşı tarafın listesine
 * yazmaz; istek sahibi ensureFriendIndex ile kendi listesini tamamlar.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ store: new Map<string, Record<string, unknown>>(), me: "" }));

function denyCrossWrite(path: string) {
  const match = /^users\/([^/]+)\/friends\//.exec(path);
  if (match && match[1] !== h.me) throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
}

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./notifications", () => ({ createNotification: vi.fn(async () => "n1") }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  getDoc: async (ref: { path: string }) => {
    const data = h.store.get(ref.path);
    const box = /^users\/([^/]+)\/(friendRequests|friends)\//.exec(ref.path);
    if ((box && box[1] !== h.me) || (ref.path.startsWith("friendships/") && !data)) {
      throw Object.assign(new Error("denied"), { code: "permission-denied" });
    }
    if (ref.path.startsWith("friendships/") && data && !(data.users as string[]).includes(h.me)) {
      throw Object.assign(new Error("denied"), { code: "permission-denied" });
    }
    return { exists: () => data !== undefined, data: () => data, id: ref.path.split("/").at(-1) };
  },
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    if (/\/friendRequests\//.test(ref.path) && h.store.has(ref.path)) throw Object.assign(new Error("denied"), { code: "permission-denied" });
    if (!/\/friendRequests\//.test(ref.path)) denyCrossWrite(ref.path);
    h.store.set(ref.path, data);
  },
  deleteDoc: async (ref: { path: string }) => { h.store.delete(ref.path); },
  serverTimestamp: () => "TS",
  writeBatch: () => {
    const ops: Array<() => void> = [];
    return {
      set: (ref: { path: string }, data: Record<string, unknown>) => ops.push(() => h.store.set(ref.path, data)),
      delete: (ref: { path: string }) => ops.push(() => h.store.delete(ref.path)),
      commit: async () => ops.forEach((op) => op()),
    };
  },
  query: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  onSnapshot: () => () => {},
}));

import { acceptFriendRequest, ensureFriendIndex } from "./friendships";

beforeEach(() => {
  h.store.clear();
  h.me = "";
});

describe("arkadaşlık kabulü ve liste tamamlama", () => {
  it("kabul eden yalnız kendi listesine yazar; hata vermez", async () => {
    h.me = "bob";
    h.store.set("users/bob/friendRequests/alice", { fromUid: "alice", fromName: "Alice", toUid: "bob" });
    await expect(acceptFriendRequest("bob", "alice", "Bob")).resolves.toMatchObject({ id: "alice_bob" });
    expect(h.store.get("users/bob/friends/alice")).toMatchObject({ friendUid: "alice", friendName: "Alice" });
    expect(h.store.has("users/alice/friends/bob")).toBe(false);
    expect(h.store.has("users/bob/friendRequests/alice")).toBe(false);
  });

  it("istek sahibi kabul edilmiş arkadaşlığı kendi listesine yazar, ikinci kez yazmaz", async () => {
    h.store.set("friendships/alice_bob", { users: ["alice", "bob"], status: "accepted" });
    h.me = "alice";
    expect(await ensureFriendIndex("alice", "bob", "Bob")).toBe(true);
    expect(h.store.get("users/alice/friends/bob")).toMatchObject({ friendUid: "bob", friendName: "Bob" });
    expect(await ensureFriendIndex("alice", "bob", "Bob")).toBe(false);
  });

  it("arkadaşlık yoksa ya da okunamıyorsa liste yazılmaz", async () => {
    h.me = "alice";
    expect(await ensureFriendIndex("alice", "carol", "Carol")).toBe(false);
    h.store.set("friendships/alice_dave", { users: ["dave", "eve"], status: "accepted" });
    expect(await ensureFriendIndex("alice", "dave", "Dave")).toBe(false);
    expect([...h.store.keys()].some((key) => key.startsWith("users/alice/friends/"))).toBe(false);
  });
});

describe("arkadaşlık isteği gönderme (canlı permission-denied düzeltmesi)", () => {
  it("başkasının istek kutusunu okumadan isteği yazar", async () => {
    h.me = "alice";
    const { sendFriendRequest } = await import("./friendships");
    await sendFriendRequest({ fromUid: "alice", fromName: "Alice", toUid: "bob" });
    expect(h.store.get("users/bob/friendRequests/alice")).toMatchObject({ fromUid: "alice", toUid: "bob", fromName: "Alice" });
  });

  it("zaten arkadaşsa ya da karşı taraf istek attıysa yazmaz", async () => {
    h.me = "alice";
    const { sendFriendRequest } = await import("./friendships");
    h.store.set("users/alice/friends/bob", { friendUid: "bob" });
    await expect(sendFriendRequest({ fromUid: "alice", fromName: "Alice", toUid: "bob" })).rejects.toMatchObject({ code: "friend-request/already-friends" });
    h.store.delete("users/alice/friends/bob");
    h.store.set("users/alice/friendRequests/bob", { fromUid: "bob" });
    await expect(sendFriendRequest({ fromUid: "alice", fromName: "Alice", toUid: "bob" })).rejects.toMatchObject({ code: "friend-request/opposite-exists" });
    expect(h.store.has("users/bob/friendRequests/alice")).toBe(false);
  });
});
