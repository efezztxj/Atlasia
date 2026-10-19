/**
 * Adım 13/16 kanıt testi: Firestore istemci katmanı, sahte (in-memory) bir
 * Firestore üzerinde çalıştırılır. Kuralların kendisi `tests/firestore.rules.test.ts`
 * içinde emülatörle sınanır; burada amaç silme/bildirme yükünün doğru yazıldığını
 * ve yalnız sahibin verisinin kalktığını göstermektir.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const ref = (path: string) => ({ path });
  const snapOf = (path: string, filters: Array<{ field: string; value: unknown }> = []) => {
    const docs = [...store.entries()]
      .filter(([key]) => key.startsWith(`${path}/`))
      .filter(([key]) => key.slice(path.length + 1).split("/").length === 1)
      .filter(([, data]) => filters.every((filter) => data[filter.field] === filter.value))
      .map(([key, data]) => ({ id: key.slice(path.length + 1), ref: ref(key), data: () => data }));
    return { size: docs.length, docs };
  };
  return { store, ref, snapOf };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("./auth", () => ({ getAtlasAuth: async () => ({ currentUser: null }) }));
vi.mock("./notifications", () => ({
  createNotification: async () => "nt-mock",
}));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  doc: (_db: unknown, ...segments: string[]) => h.ref(segments.join("/")),
  query: (target: { path: string }, ...constraints: Array<{ field?: string; value?: unknown; limit?: number }>) => ({
    path: target.path,
    filters: constraints.filter((item) => typeof item.field === "string"),
  }),
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  limit: (value: number) => ({ limit: value }),
  orderBy: () => ({}),
  serverTimestamp: () => "SERVER_TS",
  getDoc: async (docRef: { path: string }) => ({
    id: docRef.path.split("/").at(-1),
    exists: () => h.store.has(docRef.path),
    data: () => h.store.get(docRef.path),
    ref: docRef,
  }),
  getDocs: async (q: { path: string; filters?: Array<{ field: string; value: unknown }> }) => h.snapOf(q.path, q.filters ?? []),
  setDoc: async (docRef: { path: string }, data: Record<string, unknown>) => { h.store.set(docRef.path, data); },
  deleteDoc: async (docRef: { path: string }) => { h.store.delete(docRef.path); },
  updateDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    h.store.set(docRef.path, { ...(h.store.get(docRef.path) ?? {}), ...data });
  },
  writeBatch: () => {
    const deletes: string[] = [];
    const sets: Array<[string, Record<string, unknown>]> = [];
    return {
      delete: (docRef: { path: string }) => { deletes.push(docRef.path); },
      set: (docRef: { path: string }, data: Record<string, unknown>) => { sets.push([docRef.path, data]); },
      update: (docRef: { path: string }, data: Record<string, unknown>) => {
        h.store.set(docRef.path, { ...(h.store.get(docRef.path) ?? {}), ...data });
      },
      commit: async () => {
        deletes.forEach((path) => h.store.delete(path));
        sets.forEach(([path, data]) => h.store.set(path, data));
      },
    };
  },
  onSnapshot: () => () => {},
}));

import { createReport, deleteUserData } from "./moderation";

beforeEach(() => {
  h.store.clear();
});

describe("moderasyon yazımı ve hesap verisi silme", () => {
  it("içerik bildirimi rapor dokümanına yalnız gerekli alanlarla yazılır", async () => {
    const id = await createReport({
      targetType: "post",
      targetId: "post-1",
      targetOwnerUid: "owner-1",
      reason: "spam",
      details: "Tekrarlanan reklam",
    }, "member-1");

    const stored = h.store.get(`reports/${id}`);
    expect(stored).toMatchObject({
      reporterUid: "member-1",
      targetType: "post",
      targetId: "post-1",
      targetOwnerUid: "owner-1",
      reason: "spam",
      details: "Tekrarlanan reklam",
      createdAt: "SERVER_TS",
    });
    expect(Object.keys(stored ?? {}).sort()).toEqual([
      "createdAt", "details", "reason", "reporterUid", "targetId", "targetOwnerUid", "targetType",
    ]);
  });

  it("geçersiz rapor yazılmadan reddedilir", async () => {
    await expect(createReport({ targetType: "post", targetId: " ", reason: "spam" }, "member-1"))
      .rejects.toMatchObject({ code: "report/target-invalid" });
    await expect(createReport({ targetType: "post", targetId: "post-1", reason: "begenmedim" as never }, "member-1"))
      .rejects.toMatchObject({ code: "report/reason-invalid" });
    expect(h.store.size).toBe(0);
  });

  it("hesap silmede yalnız o kullanıcının verisi kalkar, başkasınınki kalır", async () => {
    h.store.set("places/p1", { authorUid: "u1", title: "Benim izim" });
    h.store.set("places/p2", { authorUid: "u2", title: "Başkasının izi" });
    h.store.set("posts/po1", { authorUid: "u1", text: "Benim gönderim" });
    h.store.set("stories/s1", { authorUid: "u1", text: "Benim story'm" });
    h.store.set("reports/r1", { reporterUid: "u1", reason: "spam" });
    h.store.set("blocks/b1", { blockerUid: "u1", blockedUid: "u2" });
    h.store.set("users/u1/groups/g1", { groupId: "g1", name: "Ekip", role: "owner" });
    h.store.set("users/u1/notifications/n1", { recipientUid: "u1", title: "Eski bildirim" });
    h.store.set("groups/g1", {
      name: "Ekip",
      ownerUid: "u1",
      memberUids: ["u1", "u2"],
      createdAt: 1,
      updatedAt: 1,
    });
    h.store.set("groups/g1/messages/m1", { senderUid: "u1", text: "Benim mesajım" });
    h.store.set("groups/g1/messages/m2", { senderUid: "u2", text: "Arkadaşımın mesajı" });

    const counts = await deleteUserData("u1");

    expect(counts).toMatchObject({ places: 1, posts: 1, stories: 1, reports: 1, blocks: 1 });
    expect([...h.store.keys()].filter((key) => key.startsWith("places/"))).toEqual(["places/p2"]);
    expect(h.store.has("posts/po1")).toBe(false);
    expect(h.store.has("stories/s1")).toBe(false);
    expect(h.store.has("reports/r1")).toBe(false);
    expect(h.store.has("blocks/b1")).toBe(false);
    expect(h.store.has("users/u1/groups/g1")).toBe(false);
    expect(h.store.has("users/u1/notifications/n1")).toBe(false);
    // Grup sahibiydi: grup dokümanı ve kendi mesajı kalkar; arkadaşının mesajı kalır.
    expect(h.store.has("groups/g1")).toBe(false);
    expect(h.store.has("groups/g1/messages/m1")).toBe(false);
    expect(h.store.has("groups/g1/messages/m2")).toBe(true);
  });

  it("grup sahibi olmayan üye silinince gruptan çıkarılır, grup yaşar", async () => {
    h.store.set("users/u2/groups/g1", { groupId: "g1", name: "Ekip", role: "member" });
    h.store.set("groups/g1", {
      name: "Ekip",
      ownerUid: "u1",
      memberUids: ["u1", "u2"],
      createdAt: 1,
      updatedAt: 1,
    });

    await deleteUserData("u2");

    expect(h.store.has("groups/g1")).toBe(true);
    expect(h.store.get("groups/g1")?.memberUids).toEqual(["u1"]);
    expect(h.store.has("users/u2/groups/g1")).toBe(false);
  });
});
