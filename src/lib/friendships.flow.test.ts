import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Denetim 2026-10-22 (PR #19 bulguları): arkadaşlık akışının YAZMA/OKUMA
 * sırası karakterize edilir. Kurallar alıcının kuyruğunu ve friendships
 * belgesini gönderene okutmaz; bu yüzden istemci ilk istekte bu belgeleri
 * okumaya kalkmamalı, kabul eden de karşı tarafın indeksini yazmamalıdır.
 */
const h = vi.hoisted(() => {
  const docs = new Map<string, Record<string, unknown>>();
  const reads: string[] = [];
  const setDocCalls: { path: string; data: Record<string, unknown> }[] = [];
  const deleteDocCalls: string[] = [];
  const batchOps: { op: string; path: string; data?: Record<string, unknown> }[] = [];
  const commits: { op: string; path: string; data?: Record<string, unknown> }[][] = [];
  const TS = { __serverTimestamp: true };

  const snapshot = (path: string) => ({
    id: path.split("/").pop() ?? "",
    exists: () => docs.has(path),
    data: () => docs.get(path),
  });

  return {
    docs,
    reads,
    setDocCalls,
    deleteDocCalls,
    batchOps,
    commits,
    TS,
    snapshot,
    getDoc: vi.fn(async (ref: { path: string }) => {
      reads.push(ref.path);
      return snapshot(ref.path);
    }),
    setDoc: vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
      setDocCalls.push({ path: ref.path, data });
    }),
    deleteDoc: vi.fn(async (ref: { path: string }) => {
      deleteDocCalls.push(ref.path);
    }),
    batch: {
      set: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
        batchOps.push({ op: "set", path: ref.path, data });
      }),
      delete: vi.fn((ref: { path: string }) => {
        batchOps.push({ op: "delete", path: ref.path });
      }),
      commit: vi.fn(async () => {
        commits.push([...batchOps]);
        batchOps.length = 0;
      }),
    },
    reset() {
      docs.clear();
      reads.length = 0;
      setDocCalls.length = 0;
      deleteDocCalls.length = 0;
      batchOps.length = 0;
      commits.length = 0;
      this.getDoc.mockClear();
      this.setDoc.mockClear();
      this.deleteDoc.mockClear();
      this.batch.set.mockClear();
      this.batch.delete.mockClear();
      this.batch.commit.mockClear();
    },
  };
});

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./notifications", () => ({ createNotification: vi.fn(async () => {}) }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, path: string) => ({ path }),
  collection: (_db: unknown, path: string) => ({ path }),
  query: (ref: unknown) => ref,
  orderBy: (...args: unknown[]) => args,
  limit: (value: number) => value,
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: () => h.TS,
  getDoc: h.getDoc,
  setDoc: h.setDoc,
  deleteDoc: h.deleteDoc,
  writeBatch: () => h.batch,
}));

import { acceptFriendRequest, ensureFriendIndex, sendFriendRequest } from "./friendships";

beforeEach(() => h.reset());

describe("sendFriendRequest — ilk istek alıcının okunamayan belgelerine bağlanmaz", () => {
  it("alıcı kuyruğundaki bekleyen isteği OKUMAZ, yalnız kendi gelen kuyruğunu okur", async () => {
    h.docs.set("users/u2/friendRequests/u1", { fromUid: "u1", fromName: "Ada", toUid: "u2" });

    await sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" });

    // Karşı tarafın kuyruğu ve friendships belgesi HİÇ okunmaz; yalnız kendi
    // gelen kuyruğum ve kendi arkadaş indeksim (ikisi de okunabilir) okunur.
    expect(h.reads).toEqual(["users/u1/friendRequests/u2", "users/u1/friends/u2"]);
    expect(h.setDocCalls).toHaveLength(1);
    expect(h.setDocCalls[0]).toMatchObject({
      path: "users/u2/friendRequests/u1",
      data: { fromUid: "u1", fromName: "Ada", toUid: "u2", createdAt: h.TS },
    });
  });

  it("karşı taraftan bekleyen istek varsa yazmaz, anlaşılır hata verir", async () => {
    h.docs.set("users/u1/friendRequests/u2", { fromUid: "u2", toUid: "u1" });

    await expect(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/opposite-exists",
    });
    expect(h.setDocCalls).toHaveLength(0);
  });

  it("bekleyen istek yüzünden reddedilirse kendi isteğini temizleyip bir kez daha dener", async () => {
    // `allow update: false` olduğu için ikinci gönderim create sayılır ve reddedilir;
    // istemci kendi bekleyen isteğini silip yeniden yazar (kurallar silmeye izin verir).
    h.setDoc.mockRejectedValueOnce(Object.assign(new Error("denied"), { code: "permission-denied" }));

    await expect(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" })).resolves.toBeUndefined();
    expect(h.deleteDocCalls).toEqual(["users/u2/friendRequests/u1"]);
    expect(h.setDocCalls).toHaveLength(1);
  });

  it("temizliğe rağmen reddedilirse 'kural uyuşmazlığı' koduyla bildirilir", async () => {
    const denied = () => Object.assign(new Error("denied"), { code: "permission-denied" });
    h.setDoc.mockRejectedValueOnce(denied()).mockRejectedValueOnce(denied());
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/rules-mismatch",
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("bağlantı hatası ham 'permission-denied' olarak sızmaz, 'offline' koduna çevrilir", async () => {
    h.setDoc.mockRejectedValueOnce(Object.assign(new Error("offline"), { code: "unavailable" }));

    await expect(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/offline",
    });
  });
});

describe("acceptFriendRequest — kabul eden yalnız kendi indeksini yazar", () => {
  it("friendship + kendi indeksi aynı batch'te, istek silinir; karşı taraf indeksi yazılmaz", async () => {
    h.docs.set("users/u2/friendRequests/u1", { fromUid: "u1", fromName: "Ada", toUid: "u2" });

    const friendship = await acceptFriendRequest("u2", "u1", "Deniz");

    expect(friendship).toMatchObject({ id: "u1_u2", requesterUid: "u1", recipientUid: "u2", status: "accepted" });
    expect(h.commits).toHaveLength(1);
    expect(h.commits[0].map((op) => `${op.op}:${op.path}`)).toEqual([
      "set:friendships/u1_u2",
      "delete:users/u2/friendRequests/u1",
      "set:users/u2/friends/u1",
    ]);
    // Kabul eden, isteği gönderenin listesine yazmaya kalkmaz (kural: uid == auth).
    expect(h.setDocCalls.filter((call) => call.path.startsWith("users/u1/"))).toHaveLength(0);
    expect(h.setDocCalls).toHaveLength(0);
  });

  it("bekleyen istek yoksa batch açılmaz", async () => {
    await expect(acceptFriendRequest("u2", "u1", "Deniz")).rejects.toMatchObject({
      code: "friend-request/not-found",
    });
    expect(h.commits).toHaveLength(0);
  });
});

describe("ensureFriendIndex — kabul edilmiş arkadaşlık kanıtı olmadan indeks yazmaz", () => {
  it("kabul edilmiş arkadaşlık varsa yalnız kendi indeksini yazar", async () => {
    h.docs.set("friendships/u1_u2", { users: ["u1", "u2"], status: "accepted" });

    await expect(ensureFriendIndex("u2", "u1", "Ada")).resolves.toBe(true);
    expect(h.setDocCalls).toEqual([
      { path: "users/u2/friends/u1", data: { friendUid: "u1", friendName: "Ada", since: h.TS } },
    ]);
  });

  it("friendship yoksa yazmaz", async () => {
    await expect(ensureFriendIndex("u2", "u1", "Ada")).resolves.toBe(false);
    expect(h.setDocCalls).toHaveLength(0);
  });

  it("bekleyen (accepted olmayan) belge kanıt sayılmaz", async () => {
    h.docs.set("friendships/u1_u2", { users: ["u1", "u2"], status: "pending" });

    await expect(ensureFriendIndex("u2", "u1", "Ada")).resolves.toBe(false);
    expect(h.setDocCalls).toHaveLength(0);
  });

  it("indeks zaten varsa tekrar yazmaz (idempotent)", async () => {
    h.docs.set("users/u2/friends/u1", { friendUid: "u1" });
    h.docs.set("friendships/u1_u2", { users: ["u1", "u2"], status: "accepted" });

    await expect(ensureFriendIndex("u2", "u1", "Ada")).resolves.toBe(false);
    expect(h.setDocCalls).toHaveLength(0);
  });

  it("kendine indeks yazılamaz", async () => {
    await expect(ensureFriendIndex("u1", "u1", "Ada")).rejects.toMatchObject({
      code: "friend-request/uid-invalid",
    });
  });
});
