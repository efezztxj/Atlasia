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
  // Bir koleksiyonun okuması permission-denied ile düşürülür (hata yutulmamalı testi).
  const failure: { failCollection: string | null } = { failCollection: null };
  return { store, ref, snapOf, failure };
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
  getDocs: async (q: { path: string; filters?: Array<{ field: string; value: unknown }> }) => {
    if (h.failure.failCollection && q.path === h.failure.failCollection) {
      throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    }
    return h.snapOf(q.path, q.filters ?? []);
  },
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
  h.failure.failCollection = null;
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
    await expect(createReport({ targetType: "post", targetId: "post-1", reason: "begenmedim" }, "member-1"))
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

    const report = await deleteUserData("u1");
    const counts = Object.fromEntries(report.steps.map((item) => [item.step, item.deleted]));

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

  it("doğrulama kayıtları silinemezse hesap silme hata verir; sessizce 0 dönüp Auth'u silmez", async () => {
    h.store.set("verifications/v1", { uid: "u1", placeId: "p1", status: "still_open" });
    h.failure.failCollection = "verifications";
    await expect(deleteUserData("u1")).rejects.toMatchObject({
      code: "data/delete-incomplete",
      steps: expect.arrayContaining([{ step: "verifications", deleted: 0, failed: true, error: "permission-denied" }]),
    });
    expect(h.store.has("verifications/v1")).toBe(true);
  });

  // Regresyon: eski kod grup/bildirim temizlik hatasını console.warn ile yutuyor, sonra
  // Auth hesabı siliniyordu. Yeni kodda hata toplanır ve hesap silme durur.
  it("grup üyeliği temizlenemezse hata yutulmaz ve hesap silme durur", async () => {
    h.store.set("users/u1/groups/g1", { groupId: "g1", name: "Ekip", role: "member" });
    h.failure.failCollection = "users/u1/groups";
    await expect(deleteUserData("u1")).rejects.toMatchObject({
      code: "data/delete-incomplete",
      steps: expect.arrayContaining([{ step: "groups", deleted: 0, failed: true, error: "permission-denied" }]),
    });
  });

  it("rota sayacını, arkadaşlığı, profili ve kayıtlı rotayı sahibin verisi olarak siler; başkasınınkine dokunmaz", async () => {
    h.store.set("routes/r1", { authorUid: "u1", saveCount: 0 });
    h.store.set("routes/r9", { authorUid: "u9", saveCount: 2 });
    h.store.set("tracks/t1", { authorUid: "u1" });
    h.store.set("tracks/t9", { authorUid: "u9" });
    h.store.set("users/u1/savedRoutes/r9", { routeId: "r9", savedAt: 1 });
    h.store.set("users/u1/friends/u2", { friendUid: "u2", friendName: "Bora", since: 1 });
    h.store.set("friendships/u1_u2", { users: ["u1", "u2"] });
    h.store.set("friendships/u3_u9", { users: ["u3", "u9"] });
    h.store.set("userProfiles/u1", { uid: "u1", displayName: "Ada" });
    h.store.set("userProfiles/u9", { uid: "u9", displayName: "Can" });

    const report = await deleteUserData("u1");

    expect(report.ok).toBe(true);
    const deleted = Object.fromEntries(report.steps.map((item) => [item.step, item.deleted]));
    expect(deleted.routes).toBe(1);
    expect(deleted.tracks).toBe(1);
    expect(deleted["users/savedRoutes"]).toBe(1);
    expect(deleted["users/friends+friendships"]).toBe(1);
    expect(deleted.userProfiles).toBe(1);
    expect(report.steps.every((item) => item.failed === false)).toBe(true);
    expect(h.store.has("routes/r1")).toBe(false);
    expect(h.store.has("tracks/t1")).toBe(false);
    expect(h.store.has("users/u1/savedRoutes/r9")).toBe(false);
    expect(h.store.get("routes/r9")?.saveCount).toBe(1);
    expect(h.store.has("users/u1/friends/u2")).toBe(false);
    expect(h.store.has("friendships/u1_u2")).toBe(false);
    expect(h.store.has("userProfiles/u1")).toBe(false);
    expect(h.store.has("routes/r9")).toBe(true);
    expect(h.store.has("tracks/t9")).toBe(true);
    expect(h.store.has("friendships/u3_u9")).toBe(true);
    expect(h.store.has("userProfiles/u9")).toBe(true);
  });
});
