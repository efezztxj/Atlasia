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
  const snapOfGroup = (name: string, filters: Array<{ field: string; value: unknown }> = []) => {
    const docs = [...store.entries()]
      .filter(([key]) => key.split("/").length % 2 === 0 && key.split("/").at(-2) === name)
      .filter(([, data]) => filters.every((filter) => data[filter.field] === filter.value))
      .map(([key, data]) => ({ id: key.split("/").at(-1) ?? "", ref: ref(key), data: () => data }));
    return { size: docs.length, docs };
  };
  // Bir koleksiyonun okuması permission-denied ile düşürülür (hata yutulmamalı testi).
  const failure: { failCollection: string | null } = { failCollection: null };
  return { store, ref, snapOf, snapOfGroup, failure };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("./auth", () => ({ getAtlasAuth: async () => ({ currentUser: null }) }));
vi.mock("./notifications", () => ({
  createNotification: async () => "nt-mock",
}));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  doc: (_db: unknown, ...segments: string[]) => h.ref(segments.join("/")),
  query: (target: { path: string; group?: boolean }, ...constraints: Array<{ field?: string; value?: unknown; limit?: number }>) => ({
    path: target.path,
    group: target.group === true,
    limit: constraints.find((item) => typeof item.limit === "number")?.limit,
    filters: constraints.filter((item) => typeof item.field === "string"),
  }),
  collectionGroup: (_db: unknown, name: string) => ({ path: name, group: true }),
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
  getDocs: async (q: { path: string; group?: boolean; limit?: number; filters?: Array<{ field: string; value: unknown }> }) => {
    if (h.failure.failCollection && q.path === h.failure.failCollection) {
      throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    }
    const snap = q.group ? h.snapOfGroup(q.path, q.filters ?? []) : h.snapOf(q.path, q.filters ?? []);
    if (typeof q.limit === "number" && snap.docs.length > q.limit) {
      return { size: q.limit, docs: snap.docs.slice(0, q.limit) };
    }
    return snap;
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
    // Grup sahibiydi: grup dokümanı ve tüm mesajları kalkar.
    expect(h.store.has("groups/g1")).toBe(false);
    expect(h.store.has("groups/g1/messages/m1")).toBe(false);
    // Grup sahibi grubu silince yetim mesajlar da kalkar (görev 6); başkasının mesajı dahil.
    expect(h.store.has("groups/g1/messages/m2")).toBe(false);
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
    h.store.set("feedback/fb1", { uid: "u1", category: "bug", message: "x", appVersion: "0.1.0" });
    h.store.set("feedback/fb9", { uid: "u9", category: "bug", message: "y", appVersion: "0.1.0" });
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
    expect(h.store.has("feedback/fb1")).toBe(false);
    expect(h.store.has("feedback/fb9")).toBe(true);
  });
  it("3a: kullanıcının engelleme alt koleksiyonu (users/{uid}/blocks) silinir", async () => {
    h.store.set("users/u1/blocks/u9", { blockedId: "u9", blockerUid: "u1" });
    h.store.set("users/u2/blocks/u9", { blockedId: "u9", blockerUid: "u2" });

    const report = await deleteUserData("u1");

    expect(report.steps.find((item) => item.step === "users/blocks")).toMatchObject({ deleted: 1, failed: false });
    expect(h.store.has("users/u1/blocks/u9")).toBe(false);
    expect(h.store.has("users/u2/blocks/u9")).toBe(true);
  });

  it("3b: kullanıcının başkalarının gönderilerindeki yanıtları silinir; başkasının yanıtı kalır", async () => {
    h.store.set("posts/p9/replies/r1", { authorUid: "u1", text: "Katılıyorum" });
    h.store.set("posts/p9/replies/r2", { authorUid: "u2", text: "Ben de" });

    const report = await deleteUserData("u1");

    expect(report.steps.find((item) => item.step === "replies")).toMatchObject({ deleted: 1, failed: false });
    expect(h.store.has("posts/p9/replies/r1")).toBe(false);
    expect(h.store.has("posts/p9/replies/r2")).toBe(true);
  });

  it("3c: grup indeksi 50'den fazlaysa tüm sayfalar işlenir ve indeks boşalır", async () => {
    for (let i = 0; i < 60; i += 1) {
      h.store.set(`users/u1/groups/g${i}`, { groupId: `g${i}`, name: "Ekip", role: "member" });
      h.store.set(`groups/g${i}`, { name: "Ekip", ownerUid: "u9", memberUids: ["u9", "u1"], createdAt: 1, updatedAt: 1 });
    }

    const report = await deleteUserData("u1");

    expect(report.steps.find((item) => item.step === "groups")).toMatchObject({ failed: false });
    expect([...h.store.keys()].filter((key) => key.startsWith("users/u1/groups/"))).toEqual([]);
    expect(h.store.get("groups/g59")?.memberUids).toEqual(["u9"]);
  });

  it("3d: katılma denemesi yalnız pencere dolmuşsa silinir; açık pencere 'kept' olarak raporlanır", async () => {
    const now = Date.now();
    h.store.set("users/u1/groups/gx", { groupId: "gx", name: "A", role: "member" });
    h.store.set("users/u1/groups/gy", { groupId: "gy", name: "B", role: "member" });
    h.store.set("groups/gx", { name: "A", ownerUid: "u9", memberUids: ["u9", "u1"], createdAt: 1, updatedAt: 1 });
    h.store.set("groups/gy", { name: "B", ownerUid: "u9", memberUids: ["u9", "u1"], createdAt: 1, updatedAt: 1 });
    // gx: pencere 20 dk önce açıldı → dolmuş → silinir.
    h.store.set("groups/gx/joinAttempts/u1", { code: "123456", attempts: 3, at: now - 20 * 60_000, windowStart: now - 20 * 60_000 });
    // gy: pencere 5 dk önce açıldı → açık → kalır ve raporlanır.
    h.store.set("groups/gy/joinAttempts/u1", { code: "654321", attempts: 2, at: now - 5 * 60_000, windowStart: now - 5 * 60_000 });

    const report = await deleteUserData("u1");

    expect(report.steps.find((item) => item.step === "groups")).toMatchObject({ failed: false, kept: 1 });
    expect(h.store.has("groups/gx/joinAttempts/u1")).toBe(false);
    expect(h.store.has("groups/gy/joinAttempts/u1")).toBe(true);
  });

  it("3e: gelen grup davetleri ve grubun davet kaydı birlikte silinir; başkasınınki kalır", async () => {
    h.store.set("users/u1/groupInvites/g3", { groupId: "g3", groupName: "Üçüncü", inviterUid: "u9" });
    h.store.set("groups/g3/invites/u1", { invitedUid: "u1", inviterUid: "u9", groupId: "g3" });
    h.store.set("groups/g3/invites/u2", { invitedUid: "u2", inviterUid: "u9", groupId: "g3" });

    const report = await deleteUserData("u1");

    expect(report.steps.find((item) => item.step === "users/groupInvites")).toMatchObject({ deleted: 1, failed: false });
    expect(h.store.has("users/u1/groupInvites/g3")).toBe(false);
    expect(h.store.has("groups/g3/invites/u1")).toBe(false);
    expect(h.store.has("groups/g3/invites/u2")).toBe(true);
  });

  it("görev 6: kullanıcının kurucu olduğu grup silinirken tüm mesajlar (başkasınınki dahil) önce temizlenir", async () => {
    h.store.set("users/u1/groups/g4", { groupId: "g4", name: "Dört", role: "owner" });
    h.store.set("groups/g4", { name: "Dört", ownerUid: "u1", memberUids: ["u1", "u2"], createdAt: 1, updatedAt: 1 });
    h.store.set("groups/g4/messages/m1", { senderUid: "u1", text: "a" });
    h.store.set("groups/g4/messages/m2", { senderUid: "u2", text: "b" });

    await deleteUserData("u1");

    expect(h.store.has("groups/g4")).toBe(false);
    expect([...h.store.keys()].filter((key) => key.startsWith("groups/g4/"))).toEqual([]);
  });
});
