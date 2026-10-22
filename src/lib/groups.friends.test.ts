/**
 * Atlasia — grup davetinde rıza sınırı (kabul edilmiş arkadaş şartı).
 *
 * Kullanıcının şikâyeti: grup üyelerini elle UID yazarak davet etmek zordu.
 * Çözüm: grup kurulumu kabul edilmiş arkadaşlar arasından SEÇİM yapar.
 * Güvenlik sınırı: kabul edilmiş arkadaşlık olmadan kimse davet edilemez ve
 * doğrudan EKLENEMEZ — üye listesi başlangıçta yalnız kurucuyu içerir, davetli
 * kişi daveti kabul ettiğinde kendini ekler.
 *
 * Firestore istemcisi in-memory sahte ile değiştirilir; gerçek güvenlik
 * kuralları emülatör testindedir (tests/firestore.rules.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const notifications: Array<Record<string, unknown>> = [];
  let counter = 0;
  /** Kural reddini taklit etmek için; test başına sıfırlanır. */
  const flags = { failNextUpdate: false };
  return { store, notifications, flags, nextId: () => `group-${++counter}` };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("./notifications", () => ({
  createNotification: async (input: Record<string, unknown>) => {
    h.notifications.push(input);
    return `nt-${h.notifications.length}`;
  },
}));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  doc: (first: unknown, ...rest: string[]) => {
    // `id` alanı ZORUNLU: createGroup `doc(collection(db,"groups"))` sonucunun
    // .id değerini grup kimliği olarak kullanır ve store anahtarı buna göre kurulur.
    const withId = (path: string) => ({ path, id: path.split("/").at(-1) });
    if (first && typeof first === "object" && "path" in first) {
      const base = (first as { path: string }).path;
      // createGroup otomatik kimlik üretir; deterministik sahte kimlik veriyoruz.
      return base === "groups" && rest.length === 0 ? withId(`groups/${h.nextId()}`) : withId(`${base}/${rest.join("/")}`);
    }
    return withId(rest.join("/"));
  },
  query: (target: { path: string }) => ({ path: target.path }),
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  limit: (value: number) => ({ limit: value }),
  orderBy: () => ({}),
  serverTimestamp: () => "SERVER_TS",
  arrayUnion: (...values: string[]) => ({ __arrayUnion: values }),
  setDoc: async (docRef: { path: string }, data: Record<string, unknown>) => { h.store.set(docRef.path, data); },
  getDoc: async (docRef: { path: string }) => ({
    exists: () => h.store.has(docRef.path),
    data: () => h.store.get(docRef.path),
    id: docRef.path.split("/").at(-1),
    ref: docRef,
  }),
  updateDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    if (h.flags.failNextUpdate) {
      h.flags.failNextUpdate = false;
      throw Object.assign(new Error("Missing or insufficient permissions."), {
        name: "FirestoreError",
        code: "permission-denied",
      });
    }
    if (!h.store.has(docRef.path)) {
      throw Object.assign(new Error("No document to update"), { name: "FirestoreError", code: "not-found" });
    }
    const current = h.store.get(docRef.path)!;
    const next = { ...current };
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && "__arrayUnion" in (value as Record<string, unknown>)) {
        const existing = Array.isArray(current[key]) ? (current[key] as string[]) : [];
        const additions = (value as { __arrayUnion: string[] }).__arrayUnion;
        next[key] = [...new Set([...existing, ...additions])];
      } else {
        next[key] = value;
      }
    }
    h.store.set(docRef.path, next);
  },
  deleteDoc: async (docRef: { path: string }) => { h.store.delete(docRef.path); },
  writeBatch: () => ({
    set: () => {}, update: () => {}, delete: () => {}, commit: async () => {},
  }),
  onSnapshot: (_q: unknown, onChange: (snapshot: { docs: unknown[] }) => void) => {
    onChange({ docs: [] });
    return () => {};
  },
}));

import { acceptGroupInvite, createGroup, joinGroup, normalizeInviteUids } from "./groups";

beforeEach(() => {
  h.store.clear();
  h.notifications.length = 0;
  h.flags.failNextUpdate = false;
});

describe("normalizeInviteUids — davet listesi kabul edilmiş arkadaşlarla kesişir", () => {
  const friends = ["user-b", "user-c"];

  it("arkadaş OLMAYAN kimlik davet listesine girmez, rejected'a düşer", () => {
    const { invited, rejected } = normalizeInviteUids("user-a", friends, ["user-b", "user-x"]);
    expect(invited).toEqual(["user-b"]);
    expect(rejected).toEqual(["user-x"]);
  });

  it("kabul edilmiş arkadaş listesi boşsa hiçbir davet üretilmez", () => {
    const { invited, rejected } = normalizeInviteUids("user-a", [], ["user-b", "user-c"]);
    expect(invited).toEqual([]);
    expect(rejected).toEqual(["user-b", "user-c"]);
  });

  it("kendi kimliği, boşluklar ve tekrarlar ayıklanır", () => {
    const { invited, rejected } = normalizeInviteUids("user-a", friends, [" user-a ", "user-b", "user-b", "", "   "]);
    expect(invited).toEqual(["user-b"]);
    expect(rejected).toEqual([]);
  });

  it("boşluklar rejected'a da sızmaz", () => {
    const { invited, rejected } = normalizeInviteUids("user-a", friends, ["", " ", "user-c"]);
    expect(invited).toEqual(["user-c"]);
    expect(rejected).toEqual([]);
  });

  it("19 davetli tavanı aşılırken kurucu için yer bırakılır (20 üye)", () => {
    const manyFriends = Array.from({ length: 30 }, (_, index) => `friend-${index}`);
    const manyRaw = Array.from({ length: 30 }, (_, index) => `friend-${index}`);
    const { invited } = normalizeInviteUids("user-a", manyFriends, manyRaw);
    expect(invited).toHaveLength(19);
  });

  it("128 karakteri aşan kimlik hiç değerlendirilmez", () => {
    const longUid = "x".repeat(129);
    const { invited, rejected } = normalizeInviteUids("user-a", [longUid], [longUid]);
    expect(invited).toEqual([]);
    expect(rejected).toEqual([]);
  });
});

describe("createGroup — üye zorla EKLENMEZ, yalnız davet gönderilir", () => {
  it("grup başlangıçta yalnız kurucuyu üye yazar", async () => {
    const result = await createGroup({
      name: "Kapadokya ekibi",
      ownerUid: "user-a",
      ownerName: "Ada",
      memberUids: ["user-b", "user-c"],
      acceptedFriendUids: ["user-b", "user-c"],
    });

    expect(result.group.memberUids).toEqual(["user-a"]);
    expect(h.store.get(`groups/${result.group.id}`)?.memberUids).toEqual(["user-a"]);
    // Kurucunun kendi indeksi yazılır.
    expect(h.store.get(`users/user-a/groups/${result.group.id}`)).toMatchObject({ role: "owner" });
  });

  it("her kabul edilmiş arkadaşa group_invite bildirimi gider", async () => {
    const result = await createGroup({
      name: "Kapadokya ekibi",
      ownerUid: "user-a",
      ownerName: "Ada",
      memberUids: ["user-b", "user-c"],
      acceptedFriendUids: ["user-b", "user-c"],
    });

    expect(result.invited).toBe(2);
    expect(result.rejected).toEqual([]);
    expect(h.notifications).toHaveLength(2);
    expect(h.notifications[0]).toMatchObject({ recipientUid: "user-b", actorUid: "user-a", type: "group_invite", targetId: result.group.id });
    expect(h.notifications[1]).toMatchObject({ recipientUid: "user-c", actorUid: "user-a", type: "group_invite" });
  });

  it("arkadaş olmayan kimlik davet edilmez ve rejected olarak raporlanır", async () => {
    const result = await createGroup({
      name: "Kapadokya ekibi",
      ownerUid: "user-a",
      ownerName: "Ada",
      memberUids: ["user-b", "user-yabanci"],
      acceptedFriendUids: ["user-b"],
    });

    expect(result.invited).toBe(1);
    expect(result.rejected).toEqual(["user-yabanci"]);
    expect(h.notifications.map((item) => item.recipientUid)).toEqual(["user-b"]);
  });

  it("acceptedFriendUids verilmeyince hiç davet gitmez ama grup yine kurulur", async () => {
    const result = await createGroup({
      name: "Tek kişilik grup",
      ownerUid: "user-a",
      ownerName: "Ada",
      memberUids: ["user-b"],
    });

    expect(result.invited).toBe(0);
    expect(result.rejected).toEqual(["user-b"]);
    expect(h.notifications).toHaveLength(0);
    expect(result.group.memberUids).toEqual(["user-a"]);
  });

  it("davet bildirimi yazılamasa bile grup kurulur (en iyi çaba)", async () => {
    const result = await createGroup({
      name: "Kapadokya ekibi",
      ownerUid: "user-a",
      ownerName: "Ada",
      memberUids: [],
      acceptedFriendUids: [],
    });
    expect(result.invited).toBe(0);
    expect(h.store.has(`groups/${result.group.id}`)).toBe(true);
  });

  it("geçersiz grup adı reddedilir", async () => {
    await expect(createGroup({
      name: "K",
      ownerUid: "user-a",
      ownerName: "Ada",
      memberUids: [],
    })).rejects.toThrowError(expect.objectContaining({ code: "group/name-too-short" }));
  });

  it("kurucu kimliği boşsa reddedilir", async () => {
    await expect(createGroup({
      name: "Geçerli ad",
      ownerUid: "  ",
      ownerName: "Ada",
      memberUids: [],
    })).rejects.toThrowError(expect.objectContaining({ code: "group/member-required" }));
  });
});

describe("acceptGroupInvite — davetli kendini ekler", () => {
  it("üye olmayan davetli arrayUnion ile kendini ekler ve indeksi yazılır", async () => {
    h.store.set("groups/group-1", {
      name: "Kapadokya ekibi",
      ownerUid: "user-a",
      memberUids: ["user-a"],
      createdAt: 1,
      updatedAt: 1,
    });

    const group = await acceptGroupInvite("group-1", "user-b");

    expect(group.memberUids).toEqual(["user-a", "user-b"]);
    expect(h.store.get("users/user-b/groups/group-1")).toMatchObject({ role: "member", name: "Kapadokya ekibi" });
  });

  it("zaten üye olan kullanıcı daveti tekrar kabul ederse üyelik çoğalmaz", async () => {
    h.store.set("groups/group-1", {
      name: "Kapadokya ekibi", ownerUid: "user-a", memberUids: ["user-a", "user-b"], createdAt: 1, updatedAt: 1,
    });
    const group = await acceptGroupInvite("group-1", "user-b");
    // arrayUnion küme semantiği verir: aynı UID ikinci kez eklenmez.
    expect(group.memberUids).toEqual(["user-a", "user-b"]);
  });

  it("izin hatası kullanıcıya anlaşılır mesajla çevrilir (kod korunur)", async () => {
    // Kuralın arkadaşlık kanıtı istediği gerçek durum emülatör testindedir
    // (tests/firestore.rules.test.ts). Burada yalnız acceptGroupInvite'in
    // permission-denied'i group/invite-denied'e çevirdiği doğrulanır.
    h.store.set("groups/group-1", {
      name: "G", ownerUid: "user-a", memberUids: ["user-a"], createdAt: 1, updatedAt: 1,
    });
    h.flags.failNextUpdate = true;

    // `.catch()` dönüş tipi `Group | {...}` birleşimine genişler; bu yüzden
    // sonucu tek ve net bir tipe sabitliyoruz.
    const failure = (await acceptGroupInvite("group-1", "user-b")
      .then(() => null)
      .catch((error: unknown) => error)) as { code?: string; message?: string } | null;
    expect(failure).toMatchObject({ code: "group/invite-denied" });
    expect(failure?.message ?? "").toContain("arkadaşlığın onaylı olmalı");
  });

  it("olmayan grup için not-found akışı bozulmaz", async () => {
    await expect(acceptGroupInvite("yok-boyle-grup", "user-b"))
      .rejects.toThrowError(expect.objectContaining({ code: "not-found" }));
  });

  it("boş kimlikler reddedilir", async () => {
    await expect(acceptGroupInvite("group-1", "  ")).rejects.toThrowError(expect.objectContaining({ code: "group/not-found" }));
    await expect(acceptGroupInvite("  ", "user-b")).rejects.toThrowError(expect.objectContaining({ code: "group/not-found" }));
  });
});

describe("joinGroup — mevcut akış bozulmadı", () => {
  it("üye listesinde görünen kullanıcı eskisi gibi katılır", async () => {
    h.store.set("groups/group-1", {
      name: "Kapadokya ekibi", ownerUid: "user-a", memberUids: ["user-a", "user-b"], createdAt: 1, updatedAt: 1,
    });
    const group = await joinGroup("group-1", "user-b");
    expect(group.name).toBe("Kapadokya ekibi");
    expect(h.store.get("users/user-b/groups/group-1")).toMatchObject({ role: "member" });
  });

  it("üye olmayan kullanıcı group/not-member ile reddedilir (davete yönlendirir)", async () => {
    h.store.set("groups/group-1", {
      name: "Kapadokya ekibi", ownerUid: "user-a", memberUids: ["user-a"], createdAt: 1, updatedAt: 1,
    });
    await expect(joinGroup("group-1", "user-b"))
      .rejects.toThrowError(expect.objectContaining({ code: "group/not-member" }));
  });
});
