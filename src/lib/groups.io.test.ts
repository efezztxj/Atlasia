/**
 * Adım 16 kanıt testi: iki kullanıcı aynı grupta mesajlaşır; her mesaj karşı
 * tarafa bildirim üretir, gönderene üretmez. Firestore istemcisi in-memory
 * sahte ile değiştirilir; gerçek güvenlik kuralları emülatör testindedir.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const notifications: Array<Record<string, unknown>> = [];
  let counter = 0;
  return { store, notifications, nextId: () => `id-${++counter}` };
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
    if (first && typeof first === "object" && "path" in first) {
      const base = (first as { path: string }).path;
      return { path: `${base}/${h.nextId()}` };
    }
    return { path: rest.join("/") };
  },
  query: (target: { path: string }) => ({ path: target.path }),
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  limit: (value: number) => ({ limit: value }),
  orderBy: () => ({}),
  serverTimestamp: () => "SERVER_TS",
  setDoc: async (docRef: { path: string }, data: Record<string, unknown>) => { h.store.set(docRef.path, data); },
  deleteDoc: async (docRef: { path: string }) => { h.store.delete(docRef.path); },
  getDoc: async (docRef: { path: string }) => ({
    exists: () => h.store.has(docRef.path),
    data: () => h.store.get(docRef.path),
    id: docRef.path.split("/").at(-1),
    ref: docRef,
  }),
  getDocs: async (q: { path: string }) => {
    const docs = [...h.store.entries()]
      .filter(([key]) => key.startsWith(`${q.path}/`))
      .filter(([key]) => key.slice(q.path.length + 1).split("/").length === 1)
      .map(([key, data]) => ({ id: key.slice(q.path.length + 1), ref: { path: key }, data: () => data }));
    return { size: docs.length, docs };
  },
  updateDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    h.store.set(docRef.path, { ...(h.store.get(docRef.path) ?? {}), ...data });
  },
  writeBatch: () => {
    const sets: Array<[string, Record<string, unknown>]> = [];
    const updates: Array<[string, Record<string, unknown>]> = [];
    return {
      set: (docRef: { path: string }, data: Record<string, unknown>) => { sets.push([docRef.path, data]); },
      update: (docRef: { path: string }, data: Record<string, unknown>) => { updates.push([docRef.path, data]); },
      delete: (docRef: { path: string }) => { h.store.delete(docRef.path); },
      commit: async () => {
        sets.forEach(([path, data]) => h.store.set(path, data));
        updates.forEach(([path, data]) => h.store.set(path, { ...(h.store.get(path) ?? {}), ...data }));
      },
    };
  },
  onSnapshot: (_query: unknown, onChange: (snapshot: { size: number; docs: unknown[] }) => void) => {
    onChange({ size: 0, docs: [] });
    return () => {};
  },
}));

import { deleteGroupMessage, sendGroupMessage, visibleMessages, type Group } from "./groups";

const group: Group = {
  id: "group-1",
  name: "Kapadokya ekibi",
  ownerUid: "user-a",
  memberUids: ["user-a", "user-b"],
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(() => {
  h.store.clear();
  h.notifications.length = 0;
});

describe("grup sohbeti (iki kullanıcı)", () => {
  it("A'nın mesajı grupta saklanır, B'ye bildirim gider, A'ya gitmez", async () => {
    h.store.set("groups/group-1", {
      name: group.name,
      ownerUid: group.ownerUid,
      memberUids: group.memberUids,
      createdAt: 1,
      updatedAt: 1,
    });

    const sent = await sendGroupMessage(group, { uid: "user-a", name: "Ada" }, "  Selam Bora!  ");

    const messagePath = [...h.store.keys()].find((key) => key.startsWith("groups/group-1/messages/"));
    expect(messagePath).toBeDefined();
    expect(h.store.get(messagePath!)).toMatchObject({
      senderUid: "user-a",
      senderName: "Ada",
      text: "Selam Bora!",
      createdAt: "SERVER_TS",
    });
    expect(h.store.get("groups/group-1")?.lastMessage).toMatchObject({
      text: "Selam Bora!",
      senderUid: "user-a",
      senderName: "Ada",
    });
    expect(h.notifications).toEqual([expect.objectContaining({
      recipientUid: "user-b",
      actorUid: "user-a",
      type: "group_message",
      title: "Kapadokya ekibi",
      body: "Ada: Selam Bora!",
      targetId: "group-1",
    })]);
    expect(sent.text).toBe("Selam Bora!");
  });

  it("B'nin yanıtı aynı gruba yazılır ve bildirim bu kez A'ya gider", async () => {
    h.store.set("groups/group-1", {
      name: group.name,
      ownerUid: group.ownerUid,
      memberUids: group.memberUids,
      createdAt: 1,
      updatedAt: 1,
    });

    await sendGroupMessage(group, { uid: "user-a", name: "Ada" }, "Selam");
    h.notifications.length = 0;
    await sendGroupMessage(group, { uid: "user-b", name: "Bora" }, "Selam, buradayım");

    const messages = [...h.store.entries()].filter(([key]) => key.startsWith("groups/group-1/messages/"));
    expect(messages).toHaveLength(2);
    expect(messages.map(([, data]) => data.senderUid).sort()).toEqual(["user-a", "user-b"]);
    const reply = messages.find(([, data]) => data.senderUid === "user-b");
    expect(reply?.[1]).toMatchObject({ text: "Selam, buradayım" });
    expect(h.notifications).toEqual([expect.objectContaining({ recipientUid: "user-a", actorUid: "user-b" })]);
    expect(h.store.get("groups/group-1")?.lastMessage).toMatchObject({ senderUid: "user-b" });
  });

  it("engellenen kullanıcının mesajı görünümden düşer, silinen mesaj depodan kalkar", async () => {
    const sent = await sendGroupMessage(group, { uid: "user-b", name: "Bora" }, "Rahatsız edici mesaj");
    const messages = [{ ...sent, id: sent.id }];
    expect(visibleMessages(messages, new Set(["user-b"]))).toHaveLength(0);

    await deleteGroupMessage(group.id, sent.id);
    expect(h.store.has(`groups/group-1/messages/${sent.id}`)).toBe(false);
  });
});
