/**
 * P4 — Verilerimi indir testleri. Firestore sahte (in-memory) bir istemciyle
 * çalışır: sayfalama (limit + imleç), sahiplik filtresi ve hata yayılımı burada
 * sınanır. Canlı ağa gidilmez; kurallar tests/firestore.rules.test.ts içindedir.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const local = new Map<string, string>();
  const state = { failPath: null as string | null, getDocsCalls: 0 };
  return { store, local, state };
});

type Constraint =
  | { type: "where"; field: string; value: unknown }
  | { type: "limit"; n: number }
  | { type: "after"; cursor: { id: string } }
  | { type: "order" };

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("../utils/storage", () => ({
  storageGet: (key: string) => h.local.get(key) ?? null,
}));
vi.mock("firebase/firestore", () => {
  const docRef = (path: string) => ({ path, id: path.split("/").at(-1) ?? "" });
  const snapFor = (path: string) => {
    const data = h.store.get(path);
    return { id: path.split("/").at(-1) ?? "", exists: () => data !== undefined, data: () => data };
  };
  return {
    collection: (_db: unknown, path: string) => ({ kind: "collection", path }),
    collectionGroup: (_db: unknown, name: string) => ({ kind: "group", path: name }),
    doc: (_db: unknown, ...segments: string[]) => docRef(segments.join("/")),
    documentId: () => ({ type: "order" }),
    orderBy: () => ({ type: "order" }),
    where: (field: string, _op: string, value: unknown): Constraint => ({ type: "where", field, value }),
    limit: (n: number): Constraint => ({ type: "limit", n }),
    startAfter: (cursor: { id: string }): Constraint => ({ type: "after", cursor }),
    query: (ref: { kind: string; path: string }, ...constraints: Constraint[]) => ({ ref, constraints }),
    getDoc: async (ref: { path: string }) => snapFor(ref.path),
    getDocs: async (q: { ref: { kind: string; path: string }; constraints: Constraint[] }) => {
      h.state.getDocsCalls += 1;
      if (h.state.failPath && q.ref.path === h.state.failPath) {
        throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
      }
      const isGroup = q.ref.kind === "group";
      const name = q.ref.path;
      let rows = [...h.store.entries()]
        .filter(([key]) => {
          const parts = key.split("/");
          if (isGroup) return parts.length % 2 === 0 && parts.at(-2) === name;
          return key.startsWith(`${name}/`) && parts.length === name.split("/").length + 1;
        })
        .map(([key, data]) => ({ id: key.split("/").at(-1) ?? "", key, data }));
      for (const c of q.constraints) {
        if (c.type === "where") rows = rows.filter((row) => row.data[c.field] === c.value);
      }
      rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      const after = q.constraints.find((c): c is Extract<Constraint, { type: "after" }> => c.type === "after");
      if (after) rows = rows.filter((row) => row.id > after.cursor.id);
      const limitC = q.constraints.find((c): c is Extract<Constraint, { type: "limit" }> => c.type === "limit");
      if (limitC) rows = rows.slice(0, limitC.n);
      const docs = rows.map((row) => ({ id: row.id, ref: docRef(row.key), data: () => row.data }));
      return { size: docs.length, docs };
    },
  };
});

import { collectDeviceExport, buildAccountExport, exportAccountData, serializeAccountExport, toExportValue } from "./accountExport";

const UID = "me-1";

function ts(iso: string) {
  return { toDate: () => new Date(iso) };
}

beforeEach(() => {
  h.store.clear();
  h.local.clear();
  h.state.failPath = null;
  h.state.getDocsCalls = 0;
});

describe("Verilerimi indir — dönüşüm ve gövde", () => {
  it("Timestamp değerleri ISO metnine çevrilir; iç içe alanlar korunur", () => {
    const value = toExportValue({
      createdAt: ts("2026-10-22T10:00:00.000Z"),
      nested: [{ at: ts("2026-01-02T03:04:05.000Z"), label: "a" }],
      missing: undefined,
      flag: true,
    });
    expect(value).toEqual({
      createdAt: "2026-10-22T10:00:00.000Z",
      nested: [{ at: "2026-01-02T03:04:05.000Z", label: "a" }],
      flag: true,
    });
  });

  it("geçersiz tarih hata verir; sessizce boş yazılmaz", () => {
    expect(() => toExportValue({ at: ts("yanlış-tarih") })).toThrow(/Tarih alanı/);
  });

  it("gövde şema sürümünü, oluşturma zamanını ve koleksiyon dizilerini taşır", () => {
    const file = buildAccountExport(
      { uid: UID, backend: "firebase", account: { displayName: "Gezgin", email: "g@example.com" } },
      { places: [{ id: "p1", title: "Kordon" }] },
      new Date("2026-10-22T09:00:00.000Z"),
    );
    expect(file).toEqual({
      schemaVersion: 1,
      exportedAt: "2026-10-22T09:00:00.000Z",
      uid: UID,
      backend: "firebase",
      account: { displayName: "Gezgin", email: "g@example.com" },
      collections: { places: [{ id: "p1", title: "Kordon" }] },
    });
    expect(JSON.parse(serializeAccountExport(file)).collections.places).toHaveLength(1);
  });
});

describe("Verilerimi indir — cihaz hesabı (yerel veri)", () => {
  it("yalnız bu uid'nin yerel gönderilerini alır; başkasının kaydı girmez", () => {
    h.local.set("atlasia.places.v2", JSON.stringify([
      { id: "p1", authorUid: UID, title: "Benim" },
      { id: "p2", authorUid: "other", title: "Başkası" },
    ]));
    h.local.set("atlasia.posts.v2", JSON.stringify([{ id: "s1", authorUid: UID, text: "Gönderi" }]));

    const collections = collectDeviceExport(UID);

    expect(collections.places).toEqual([{ id: "p1", authorUid: UID, title: "Benim" }]);
    expect(collections.posts).toEqual([{ id: "s1", authorUid: UID, text: "Gönderi" }]);
    expect(collections.stories).toEqual([]);
  });

  it("bozuk yerel veri hata verir (sessiz boş dosya yok)", () => {
    h.local.set("atlasia.places.v2", "{bozuk");
    expect(() => collectDeviceExport(UID)).toThrow(/okunamadı/);
  });

  it("cihaz yolunda Firestore'a hiç istek gitmez", async () => {
    await exportAccountData({ uid: UID, backend: "device", account: null });
    expect(h.state.getDocsCalls).toBe(0);
  });
});

describe("Verilerimi indir — Firestore (sayfalı okuma, sahiplik, hata)", () => {
  it("45 kendi gönderisini 3 sayfada okur; başkasının gönderisi girmez; tarih ISO olur", async () => {
    for (let i = 0; i < 45; i += 1) {
      h.store.set(`places/p${String(i).padStart(2, "0")}`, { authorUid: UID, title: `Yer ${i}`, createdAt: ts("2026-10-01T00:00:00.000Z") });
    }
    h.store.set("places/other-1", { authorUid: "other", title: "Başkası" });

    const file = await exportAccountData({ uid: UID, backend: "firebase" });

    const places = file.collections.places;
    expect(places).toHaveLength(45);
    expect(places.every((row) => row.authorUid === UID)).toBe(true);
    expect(places[0]).toMatchObject({ id: "p00", createdAt: "2026-10-01T00:00:00.000Z" });
    expect(new Set(places.map((row) => row.id)).size).toBe(45);
  });

  it("grup mesajlarında yalnız kendi mesajlarını alır ve grup kimliğini ekler", async () => {
    h.store.set(`users/${UID}/groups/g1`, { groupId: "g1", role: "member" });
    h.store.set("groups/g1/messages/m1", { senderUid: UID, text: "Benim" });
    h.store.set("groups/g1/messages/m2", { senderUid: "other", text: "Başkasının" });

    const file = await exportAccountData({ uid: UID, backend: "firebase" });

    expect(file.collections["groups/messages"]).toEqual([
      expect.objectContaining({ id: "m1", groupId: "g1", senderUid: UID, text: "Benim" }),
    ]);
  });

  it("arkadaş dizini yalnız karşı tarafın uid ve adını taşır (sahiplik: kendi listesi)", async () => {
    h.store.set(`users/${UID}/friends/f1`, { uid: "f1", name: "Arkadaş", since: ts("2026-03-01T00:00:00.000Z") });

    const file = await exportAccountData({ uid: UID, backend: "firebase" });

    expect(file.collections["users/friends"]).toEqual([
      expect.objectContaining({ id: "f1", uid: "f1", name: "Arkadaş", since: "2026-03-01T00:00:00.000Z" }),
    ]);
  });

  it("bir koleksiyon okunamazsa hata yayılır ve dosya üretilmez", async () => {
    h.state.failPath = "feedback";
    await expect(exportAccountData({ uid: UID, backend: "firebase" })).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("boş uid geçersiz sayılır ve hiçbir okuma yapılmaz", async () => {
    await expect(exportAccountData({ uid: "  ", backend: "firebase" })).rejects.toMatchObject({ code: "auth/required" });
    expect(h.state.getDocsCalls).toBe(0);
  });
});
