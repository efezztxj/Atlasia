/**
 * Bildirim IO sözleşmesi: yollar, alan sınırları ve "kimseye yazma" davranışı.
 *
 * Neden gerekli: bildirimler firestore.rules'ta ilişki kanıtına bağlı; istemci
 * yanlış alan yazarsa kural reddeder ve kullanıcı sessizce bildirim kaybeder.
 * Burada yalnız yazılan yol ve alan kümesi doğrulanır (davranış kopyası değil).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const stats = { unsubs: 0, batchCommits: 0, updates: [] as string[] };
  const docsFor = (path: string, constraints: Array<{ limit?: number }> = []) => {
    const docs = [...store.entries()]
      .filter(([key]) => key.startsWith(`${path}/`))
      .filter(([key]) => key.slice(path.length + 1).split("/").length === 1)
      .map(([key, data]) => ({ id: key.slice(path.length + 1), data: () => data }));
    const lim = constraints.find((item) => typeof item.limit === "number")?.limit;
    return typeof lim === "number" ? docs.slice(0, lim) : docs;
  };
  return { store, stats, docsFor };
});

vi.mock("./firebase", () => ({ db: {}, firebaseConfigured: true, isCloudReady: true }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, path: string) => ({ path }),
  query: (target: { path: string }, ...constraints: Array<{ limit?: number }>) => ({ path: target.path, constraints }),
  orderBy: (field: string, direction: string) => ({ field, direction }),
  limit: (value: number) => ({ limit: value }),
  serverTimestamp: () => "SERVER_TS",
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => { h.store.set(ref.path, data); },
  updateDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    h.stats.updates.push(ref.path);
    h.store.set(ref.path, { ...(h.store.get(ref.path) ?? {}), ...data });
  },
  deleteDoc: async (ref: { path: string }) => { h.store.delete(ref.path); },
  onSnapshot: (
    q: { path: string; constraints?: Array<{ limit?: number }> },
    onChange: (snapshot: { docs: ReturnType<typeof h.docsFor> }) => void,
  ) => {
    onChange({ docs: h.docsFor(q.path, q.constraints ?? []) });
    return () => { h.stats.unsubs += 1; };
  },
  writeBatch: (_db: unknown) => {
    const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
    return {
      update: (ref: { path: string }, data: Record<string, unknown>) => {
        h.stats.updates.push(ref.path);
        writes.push({ path: ref.path, data });
      },
      commit: async () => {
        h.stats.batchCommits += 1;
        for (const write of writes) h.store.set(write.path, { ...(h.store.get(write.path) ?? {}), ...write.data });
      },
    };
  },
}));

import {
  createNotification,
  deleteNotification,
  markAllRead,
  markNotificationRead,
  subscribeNotifications,
  type AppNotification,
} from "./notifications";

const notification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: "nt-1",
  recipientUid: "me",
  actorUid: "you",
  type: "friend_request",
  title: "istek",
  body: "gövde",
  read: false,
  createdAt: 1,
  ...overrides,
});

beforeEach(() => {
  h.store.clear();
  h.stats.unsubs = 0;
  h.stats.batchCommits = 0;
  h.stats.updates = [];
});

describe("createNotification", () => {
  it("alıcı yoluna yazar ve zorunlu alanları koyar", async () => {
    const id = await createNotification({
      recipientUid: " me ",
      actorUid: "you",
      type: "friend_request",
      title: "istek",
      body: "gövde",
    });

    expect([...h.store.keys()]).toEqual([`users/me/notifications/${id}`]);
    const written = h.store.get(`users/me/notifications/${id}`)!;
    expect(written).toMatchObject({
      recipientUid: "me",
      actorUid: "you",
      type: "friend_request",
      read: false,
      createdAt: "SERVER_TS",
    });
    expect(written).not.toHaveProperty("targetId");
  });

  it("başlık 200, gövde 500 karakterde kırpılır (kural/indeks sınırı)", async () => {
    const id = await createNotification({
      recipientUid: "me",
      actorUid: "you",
      type: "system",
      title: "t".repeat(400),
      body: "b".repeat(900),
    });

    const written = h.store.get(`users/me/notifications/${id}`)!;
    expect(String(written.title)).toHaveLength(200);
    expect(String(written.body)).toHaveLength(500);
  });

  it("targetId varsa yazılır, yoksa alan hiç oluşmaz", async () => {
    const withTarget = await createNotification({
      recipientUid: "me",
      actorUid: "you",
      type: "group_invite",
      title: "davet",
      body: "grup",
      targetId: "g1",
    });

    expect(h.store.get(`users/me/notifications/${withTarget}`)!.targetId).toBe("g1");
  });

  it("boş alıcıyı sessizce yazmaz, hata verir", async () => {
    await expect(createNotification({
      recipientUid: "   ",
      actorUid: "you",
      type: "system",
      title: "x",
      body: "y",
    })).rejects.toThrow("Alıcı gerekli.");
    expect(h.store.size).toBe(0);
  });
});

describe("subscribeNotifications", () => {
  it("en fazla 50 kayıt ister (kota koruması)", () => {
    let received: AppNotification[] = [];
    // 60 kayıt koy: tavan uygulanmazsa 60 gelirdi.
    for (let index = 0; index < 60; index += 1) {
      h.store.set(`users/me/notifications/nt-${index}`, { type: "system", createdAt: index });
    }

    const unsubscribe = subscribeNotifications("me", (items) => { received = items; });

    expect(received).toHaveLength(50);
    unsubscribe();
    expect(h.stats.unsubs).toBe(1);
  });

  it("boş alıcıda abone olmaz ama yine de çağrılabilir bir işlev döner", () => {
    const onChange = vi.fn();

    const unsubscribe = subscribeNotifications("  ", onChange);

    expect(onChange).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("eksik alanlı belgeyi çökmeden normalize eder", () => {
    let received: AppNotification[] = [];
    h.store.set("users/me/notifications/bozuk", { title: 5, read: "evet" });

    subscribeNotifications("me", (items) => { received = items; });

    expect(received[0]).toMatchObject({ id: "bozuk", type: "system", title: "", body: "", read: false, createdAt: 0 });
  });
});

describe("okundu işaretleri", () => {
  it("tek bildirimi okundu yapar", async () => {
    h.store.set("users/me/notifications/nt-1", { read: false });

    await markNotificationRead("me", "nt-1");

    expect(h.store.get("users/me/notifications/nt-1")!.read).toBe(true);
  });

  it("markAllRead yalnız okunmamışları tek partide yazar", async () => {
    await markAllRead("me", [
      notification({ id: "a", read: false }),
      notification({ id: "b", read: true }),
      notification({ id: "c", read: false }),
    ]);

    expect(h.stats.batchCommits).toBe(1);
    expect(h.stats.updates.sort()).toEqual(["users/me/notifications/a", "users/me/notifications/c"]);
  });

  it("hepsi okunmuşsa boş yazma yapmaz", async () => {
    await markAllRead("me", [notification({ read: true })]);

    expect(h.stats.batchCommits).toBe(0);
  });

  it("silme belgeyi kaldırır", async () => {
    h.store.set("users/me/notifications/nt-1", { read: false });

    await deleteNotification("me", "nt-1");

    expect(h.store.has("users/me/notifications/nt-1")).toBe(false);
  });
});
