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
  // currentUid: null → kurallar kapalı (eski testler); bir uid verilince grup okuma/yazma kuralı taklit edilir.
  const state = { currentUid: null as string | null, clock: 0 };
  return { store, notifications, state, nextId: () => `id-${++counter}` };
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
  arrayUnion: (...values: unknown[]) => ({ __arrayUnion: values }),
  serverTimestamp: () => ({ __serverTs: true, toMillis: () => Date.now() }),
  setDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    // Gerçek kural: users/{uid}/groups/{groupId} için update kapalı; var olan
    // indekse ikinci setDoc permission-denied alır.
    if (/^users\/[^/]+\/groups\/[^/]+$/.test(docRef.path) && h.store.has(docRef.path)) {
      throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    }
    h.store.set(docRef.path, data);
  },
  deleteDoc: async (docRef: { path: string }) => { h.store.delete(docRef.path); },
  getDoc: async (docRef: { path: string }) => {
    // "gizli-" ile başlayan grup belgesi: üye olmayanın gerçek Firestore'da
    // alacağı permission-denied hatasını taklit et.
    if (docRef.path.includes("gizli-")) {
      throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    }
    // Gerçek kural: grup belgesini yalnız üyesi okur (uid açıksa).
    if (h.state.currentUid !== null && /^groups\/[^/]+$/.test(docRef.path)) {
      const members = (h.store.get(docRef.path)?.memberUids as string[] | undefined) ?? [];
      if (h.store.has(docRef.path) && !members.includes(h.state.currentUid)) {
        throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
      }
    }
    return {
      exists: () => h.store.has(docRef.path),
      data: () => h.store.get(docRef.path),
      id: docRef.path.split("/").at(-1),
      ref: docRef,
    };
  },
  getDocs: async (q: { path: string }) => {
    const docs = [...h.store.entries()]
      .filter(([key]) => key.startsWith(`${q.path}/`))
      .filter(([key]) => key.slice(q.path.length + 1).split("/").length === 1)
      .map(([key, data]) => ({ id: key.slice(q.path.length + 1), ref: { path: key }, data: () => data }));
    return { size: docs.length, docs };
  },
  updateDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    const current = h.store.get(docRef.path) ?? {};
    const union = data.memberUids as { __arrayUnion?: string[] } | undefined;
    const next: Record<string, unknown> = { ...current, ...data };
    if (union?.__arrayUnion) next.memberUids = [...new Set([...((current.memberUids as string[] | undefined) ?? []), ...union.__arrayUnion])];
    h.store.set(docRef.path, next);
  },
  writeBatch: () => {
    const sets: Array<[string, Record<string, unknown>]> = [];
    const updates: Array<[string, Record<string, unknown>]> = [];
    const deletes: string[] = [];
    return {
      set: (docRef: { path: string }, data: Record<string, unknown>) => { sets.push([docRef.path, data]); },
      update: (docRef: { path: string }, data: Record<string, unknown>) => { updates.push([docRef.path, data]); },
      delete: (docRef: { path: string }) => { deletes.push(docRef.path); },
      commit: async () => {
        // Kural taklidi (uid açıkken): üyelik eklemek için kod, kendi deneme belgesinden
        // okunmalı; sayaç ≤5 ve kod eşleşmeli; grup belgesi üye olmayana aitse ek alan yok.
        for (const [path, data] of updates) {
          const inviteDeletePath = deletes.find((item) => /\/invites\//.test(item));
          const viaInvite = inviteDeletePath !== undefined && h.store.has(inviteDeletePath);
          const memberUnion = data.memberUids as { __arrayUnion?: string[] } | undefined;
          if (h.state.currentUid !== null && !viaInvite && /^groups\/[^/]+$/.test(path) && memberUnion?.__arrayUnion) {
            const groupId = path.split("/")[1];
            const group = h.store.get(path) ?? {};
            const attempt = h.store.get(`groups/${groupId}/joinAttempts/${h.state.currentUid}`);
            const members = (group.memberUids as string[] | undefined) ?? [];
            const ok = attempt !== undefined
              && attempt.code === group.joinCode
              && Number(attempt.attempts) <= 5
              && !members.includes(h.state.currentUid);
            if (!ok) throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
          }
        }
        deletes.forEach((path) => h.store.delete(path));
        sets.forEach(([path, data]) => h.store.set(path, data));
        updates.forEach(([path, data]) => {
          const current = h.store.get(path) ?? {};
          const next: Record<string, unknown> = { ...current, ...data };
          const union = data.memberUids as { __arrayUnion?: string[] } | undefined;
          if (union?.__arrayUnion) {
            next.memberUids = [...new Set([...((current.memberUids as string[] | undefined) ?? []), ...union.__arrayUnion])];
          }
          h.store.set(path, next);
        });
      },
    };
  },
  onSnapshot: (_query: unknown, onChange: (snapshot: { size: number; docs: unknown[] }) => void) => {
    onChange({ size: 0, docs: [] });
    return () => {};
  },
}));

import {
  acceptGroupInvite,
  deleteGroupMessage,
  GROUP_NOT_MEMBER_MESSAGE,
  joinGroup,
  joinGroupWithCode,
  sendGroupMessage,
  visibleMessages,
  type Group,
} from "./groups";

const group: Group = {
  id: "group-1",
  name: "Kapadokya ekibi",
  ownerUid: "user-a",
  memberUids: ["user-a", "user-b"],
  joinCode: "123456",
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(() => {
  h.store.clear();
  h.notifications.length = 0;
  h.state.currentUid = null;
  h.state.clock = 0;
});

describe("grup sohbeti (iki kullanıcı)", () => {
  it("üyesi olduğu gruba katılır ve indeksi yazılır", async () => {
    h.store.set("groups/group-1", {
      name: group.name,
      ownerUid: group.ownerUid,
      memberUids: group.memberUids,
      createdAt: 1,
      updatedAt: 1,
    });

    const joined = await joinGroup("group-1", "user-b");

    expect(joined.id).toBe("group-1");
    expect(h.store.get("users/user-b/groups/group-1")).toMatchObject({ groupId: "group-1", role: "member" });
  });

  it("üyesi olmadığı grupta permission hatası Türkçe ve kodlu reddedilir", async () => {
    // "gizli-group" belgesi mock'ta permission-denied üretir (üye olmayan için gerçek davranış).
    await expect(joinGroup("gizli-group", "user-x")).rejects.toMatchObject({
      code: "group/not-member",
      message: GROUP_NOT_MEMBER_MESSAGE,
    });
  });

  it("kimliği boşluklu yapıştırılsa da katılır; zaten listedeki gruba tekrar katılmak indeksi yeniden yazmaz", async () => {
    h.store.set("groups/group-1", {
      name: group.name,
      ownerUid: group.ownerUid,
      memberUids: group.memberUids,
      createdAt: 1,
      updatedAt: 1,
    });

    const first = await joinGroup("  group-1 \n", "user-b");
    expect(first.id).toBe("group-1");
    const index = h.store.get("users/user-b/groups/group-1");
    expect(index).toMatchObject({ groupId: "group-1", role: "member" });

    // İkinci katılım (veya kurucunun kendi grubuna katıl demesi) izin hatası üretmemeli.
    await expect(joinGroup("group-1", "user-b")).resolves.toMatchObject({ id: "group-1" });
    await expect(joinGroup("group-1", "user-a")).resolves.toMatchObject({ id: "group-1" });
    await expect(joinGroup("group-1", "user-a")).resolves.toMatchObject({ id: "group-1" });
    expect(h.store.get("users/user-b/groups/group-1")).toBe(index);
    expect(h.store.get("users/user-a/groups/group-1")).toMatchObject({ role: "owner" });
  });

  it("boş kimlikte Firestore'a gitmeden reddeder", async () => {
    await expect(joinGroup("   ", "user-b")).rejects.toMatchObject({ code: "group/not-found" });
  });

  it("var olmayan grup bulunamadı hatası verir", async () => {
    await expect(joinGroup("olmayan-grup", "user-x")).rejects.toMatchObject({
      code: "group/not-found",
    });
  });

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
      createdAt: expect.objectContaining({ __serverTs: true }),
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

describe("okumasız katılma (grup belgesi üyeliği zorunlu, Firestore kuralı taklidi)", () => {
  const seedCodeGroup = () =>
    h.store.set("groups/kod-grubu", {
      name: "Kod grubu",
      ownerUid: "user-a",
      memberUids: ["user-a"],
      joinCode: "123456",
      createdAt: 1,
      updatedAt: 1,
    });

  it("üye olmayan kod ile katılır: gruba okuma yok, önce deneme yazılır, sonra tek batch", async () => {
    seedCodeGroup();
    h.state.currentUid = "user-x";
    const joined = await joinGroupWithCode("kod-grubu", "123456", "user-x");
    expect(joined.memberUids).toEqual(["user-a", "user-x"]);
    expect(h.store.get("users/user-x/groups/kod-grubu")).toMatchObject({ role: "member" });
  });

  it("yanlış kod: üye eklenmez ve deneme sayacı kalıcı olarak artar", async () => {
    seedCodeGroup();
    h.state.currentUid = "user-x";
    await expect(joinGroupWithCode("kod-grubu", "999999", "user-x")).rejects.toMatchObject({ code: "group/bad-code" });
    expect(h.store.get("groups/kod-grubu")?.memberUids).toEqual(["user-a"]);
    expect(h.store.get("groups/kod-grubu/joinAttempts/user-x")).toMatchObject({ code: "999999", attempts: 1 });
    await expect(joinGroupWithCode("kod-grubu", "999999", "user-x")).rejects.toMatchObject({ code: "group/bad-code" });
    expect(h.store.get("groups/kod-grubu/joinAttempts/user-x")).toMatchObject({ attempts: 2 });
  });

  it("aynı pencerede 6. deneme yerel olarak group/locked; pencere dolunca yeniden başlar ve doğru kod katılır", async () => {
    seedCodeGroup();
    h.state.currentUid = "user-x";
    h.store.set("groups/kod-grubu/joinAttempts/user-x", {
      code: "000000",
      at: { toMillis: () => Date.now() },
      attempts: 5,
      windowStart: { toMillis: () => Date.now() },
    });
    await expect(joinGroupWithCode("kod-grubu", "123456", "user-x")).rejects.toMatchObject({ code: "group/locked" });
    expect(h.store.get("groups/kod-grubu")?.memberUids).toEqual(["user-a"]);

    // Pencere 16 dk önce başlamış gibi: pencere doldu, sayaç 1'e döner
    h.store.set("groups/kod-grubu/joinAttempts/user-x", {
      code: "000000",
      at: { toMillis: () => Date.now() },
      attempts: 5,
      windowStart: { toMillis: () => Date.now() - 16 * 60 * 1000 },
    });
    await expect(joinGroupWithCode("kod-grubu", "123456", "user-x")).resolves.toMatchObject({ id: "kod-grubu" });
  });

  it("kod-katılma: üye olmayan grup belgesini okuyamaz (kural taklidi) ama katılım okumasız başarılı olur", async () => {
    seedCodeGroup();
    h.state.currentUid = "user-x";
    // Grup belgesini doğrudan okumak üye olmayanda permission-denied döner:
    await expect(joinGroup("kod-grubu", "user-x")).rejects.toMatchObject({ code: "group/not-member" });
    await expect(joinGroupWithCode("kod-grubu", "123456", "user-x")).resolves.toMatchObject({ id: "kod-grubu" });
  });

  it("davet kabulü: grup adı davet aynasından okunur, grup belgesi katılımdan önce okunmaz", async () => {
    h.store.set("groups/davet-grubu", { name: "Davet", ownerUid: "user-a", memberUids: ["user-a"], createdAt: 1, updatedAt: 1 });
    h.store.set("groups/davet-grubu/invites/user-x", { invitedUid: "user-x", inviterUid: "user-a", groupId: "davet-grubu", groupName: "Davet" });
    h.store.set("users/user-x/groupInvites/davet-grubu", { invitedUid: "user-x", inviterUid: "user-a", groupId: "davet-grubu", groupName: "Davet" });
    h.state.currentUid = "user-x";
    const accepted = await acceptGroupInvite("davet-grubu", "user-x");
    expect(accepted.memberUids).toEqual(["user-a", "user-x"]);
    expect(h.store.get("users/user-x/groups/davet-grubu")).toMatchObject({ name: "Davet", role: "member" });
    expect(h.store.has("users/user-x/groupInvites/davet-grubu")).toBe(false);
  });

  it("davet aynası yoksa okumadan group/invite-not-found döner", async () => {
    h.state.currentUid = "user-x";
    await expect(acceptGroupInvite("yok", "user-x")).rejects.toMatchObject({ code: "group/invite-not-found" });
  });
});
