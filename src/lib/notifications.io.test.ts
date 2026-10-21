/**
 * P16 — bildirim IO karakterizasyonu.
 *
 * Firestore istemcisi groups.io/moderation.io desenindeki gibi bellek içi
 * sahteyle değiştirilir. Amaç; yol, yük kırpma, normalizasyon ve toplu
 * okundu işaretleme davranışını gerçek ağa gitmeden kilitlemektir.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const stats = { batchCommits: 0, unsubscribes: 0 };

  const millis = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (
      value &&
      typeof value === "object" &&
      "toMillis" in value &&
      typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
      return (value as { toMillis: () => number }).toMillis();
    }
    return 0;
  };

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
      docs = docs.sort((a, b) =>
        order.direction === "asc"
          ? millis(a.data().createdAt) - millis(b.data().createdAt)
          : millis(b.data().createdAt) - millis(a.data().createdAt),
      );
    }
    const limit = constraints.find((item) => typeof item.limit === "number")?.limit;
    return typeof limit === "number" ? docs.slice(0, limit) : docs;
  };

  return { store, stats, docsFor };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  query: (
    target: { path: string },
    ...constraints: Array<{ field?: string; direction?: string; limit?: number }>
  ) => ({ path: target.path, constraints }),
  orderBy: (field: string, direction: string) => ({ field, direction }),
  limit: (value: number) => ({ limit: value }),
  serverTimestamp: () => "SERVER_TS",
  setDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    h.store.set(docRef.path, data);
  },
  updateDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    h.store.set(docRef.path, { ...(h.store.get(docRef.path) ?? {}), ...data });
  },
  deleteDoc: async (docRef: { path: string }) => {
    h.store.delete(docRef.path);
  },
  writeBatch: () => {
    const updates: Array<[string, Record<string, unknown>]> = [];
    return {
      update: (docRef: { path: string }, data: Record<string, unknown>) => {
        updates.push([docRef.path, data]);
      },
      commit: async () => {
        h.stats.batchCommits += 1;
        updates.forEach(([path, data]) =>
          h.store.set(path, { ...(h.store.get(path) ?? {}), ...data }),
        );
      },
    };
  },
  onSnapshot: (
    q: { path: string; constraints?: Array<{ field?: string; direction?: string; limit?: number }> },
    onChange: (snapshot: { docs: ReturnType<typeof h.docsFor> }) => void,
  ) => {
    onChange({ docs: h.docsFor(q.path, q.constraints ?? []) });
    return () => {
      h.stats.unsubscribes += 1;
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

beforeEach(() => {
  h.store.clear();
  h.stats.batchCommits = 0;
  h.stats.unsubscribes = 0;
});

describe("bildirim IO sözleşmesi", () => {
  it("oluşturmada alıcı yolu, kırpma ve varsayılan okunmadı durumu korunur", async () => {
    const id = await createNotification({
      recipientUid: "  user-1  ",
      actorUid: "user-2",
      type: "group_invite",
      title: "İğ".repeat(120),
      body: "şĞ".repeat(300),
      targetId: "group-1",
    });

    expect(id).toMatch(/^nt-/);
    const stored = h.store.get(`users/user-1/notifications/${id}`);
    expect(stored).toMatchObject({
      recipientUid: "user-1",
      actorUid: "user-2",
      type: "group_invite",
      read: false,
      createdAt: "SERVER_TS",
      targetId: "group-1",
    });
    expect((stored?.title as string).length).toBe(200);
    expect((stored?.body as string).length).toBe(500);
  });

  it("hedef yoksa targetId alanı yazılmaz; boş alıcı yazmadan reddedilir", async () => {
    const id = await createNotification({
      recipientUid: "user-1",
      actorUid: "system",
      type: "system",
      title: "Merhaba",
      body: "Atlasia'ya hoş geldin.",
      read: true,
    });
    const stored = h.store.get(`users/user-1/notifications/${id}`);
    expect(stored).toMatchObject({ read: true });
    expect(stored).not.toHaveProperty("targetId");

    const size = h.store.size;
    await expect(
      createNotification({
        recipientUid: "   ",
        actorUid: "system",
        type: "system",
        title: "Başlık",
        body: "Gövde",
      }),
    ).rejects.toThrow("Alıcı gerekli.");
    expect(h.store.size).toBe(size);
  });

  it("abonelik eksik alanları güvenli varsayılanlarla normalize eder", () => {
    h.store.set("users/user-1/notifications/n-eski", {});
    h.store.set("users/user-1/notifications/n-yeni", {
      recipientUid: "user-1",
      actorUid: "user-2",
      type: "group_message",
      title: "Ekip",
      body: "Selam İrem",
      targetId: "group-1",
      read: true,
      createdAt: { toMillis: () => 123_456 },
    });

    const received: AppNotification[][] = [];
    const unsubscribe = subscribeNotifications("user-1", (items) => received.push(items));

    expect(received).toEqual([
      [
        {
          id: "n-yeni",
          recipientUid: "user-1",
          actorUid: "user-2",
          type: "group_message",
          title: "Ekip",
          body: "Selam İrem",
          targetId: "group-1",
          read: true,
          createdAt: 123_456,
        },
        {
          id: "n-eski",
          recipientUid: "",
          actorUid: "",
          type: "system",
          title: "",
          body: "",
          targetId: undefined,
          read: false,
          createdAt: 0,
        },
      ],
    ]);
    unsubscribe();
    expect(h.stats.unsubscribes).toBe(1);
  });

  it("boş alıcı aboneliği sessiz no-op döndürür", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeNotifications("   ", onChange);
    expect(onChange).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("tekil okundu değişimi ve silme yalnız hedef belgeyi etkiler", async () => {
    h.store.set("users/user-1/notifications/n1", { read: false });
    h.store.set("users/user-1/notifications/n2", { read: false });

    await markNotificationRead("user-1", "n1");
    expect(h.store.get("users/user-1/notifications/n1")?.read).toBe(true);
    await markNotificationRead("user-1", "n1", false);
    expect(h.store.get("users/user-1/notifications/n1")?.read).toBe(false);

    await deleteNotification("user-1", "n1");
    expect(h.store.has("users/user-1/notifications/n1")).toBe(false);
    expect(h.store.has("users/user-1/notifications/n2")).toBe(true);
  });

  it("toplu okundu işlemi yalnız okunmamışları tek batch ile günceller", async () => {
    const notifications: AppNotification[] = [
      { id: "n1", recipientUid: "user-1", actorUid: "u2", type: "system", title: "1", body: "", read: false, createdAt: 1 },
      { id: "n2", recipientUid: "user-1", actorUid: "u2", type: "system", title: "2", body: "", read: true, createdAt: 2 },
      { id: "n3", recipientUid: "user-1", actorUid: "u2", type: "system", title: "3", body: "", read: false, createdAt: 3 },
    ];
    notifications.forEach((item) =>
      h.store.set(`users/user-1/notifications/${item.id}`, { read: item.read, marker: item.id }),
    );

    await markAllRead("user-1", notifications);

    expect(h.stats.batchCommits).toBe(1);
    expect(h.store.get("users/user-1/notifications/n1")).toMatchObject({ read: true, marker: "n1" });
    expect(h.store.get("users/user-1/notifications/n2")).toMatchObject({ read: true, marker: "n2" });
    expect(h.store.get("users/user-1/notifications/n3")).toMatchObject({ read: true, marker: "n3" });

    await markAllRead("user-1", notifications.map((item) => ({ ...item, read: true })));
    expect(h.stats.batchCommits).toBe(1);
  });
});
