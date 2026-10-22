import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  type Raw = Record<string, unknown>;
  type Doc = { id: string; ref: { path: string }; data: () => Raw };
  type QueryData = { path: string; constraints: Array<{ kind: string; field?: string; value?: unknown; dir?: string }> };
  const rows = new Map<string, Raw>();
  const snapshots: Array<(value: { docs: Doc[]; size: number }) => void> = [];
  const pending: Array<{ resolve: (value: { docs: Doc[]; size: number }) => void; query: QueryData }> = [];
  let deferReads = false;
  const makeDocs = (q: QueryData): Doc[] => {
    let result = [...rows.entries()].filter(([path]) => path.startsWith(`${q.path}/`) && path.slice(q.path.length + 1).split("/").length === 1)
      .map(([path, data]) => ({ id: path.slice(q.path.length + 1), ref: { path }, data: () => data }));
    const order = q.constraints.filter((x) => x.kind === "orderBy");
    result.sort((a, b) => {
      for (const item of order) {
        const av = item.field === "__name__" ? a.id : a.data()[item.field ?? ""];
        const bv = item.field === "__name__" ? b.id : b.data()[item.field ?? ""];
        const cmp = av === bv ? a.id.localeCompare(b.id) : (av as number) - (bv as number);
        if (cmp) return item.dir === "desc" ? -cmp : cmp;
      }
      return 0;
    });
    const cursor = q.constraints.find((x) => x.kind === "startAfter")?.value as Doc | undefined;
    if (cursor) {
      const index = result.findIndex((doc) => doc.id === cursor.id);
      result = index < 0 ? result : result.slice(index + 1);
    }
    const max = q.constraints.find((x) => x.kind === "limit")?.value as number | undefined;
    return max ? result.slice(0, max) : result;
  };
  return {
    rows, snapshots, pending,
    setDefer(value: boolean) { deferReads = value; },
    query(path: string, constraints: QueryData["constraints"]): QueryData { return { path, constraints }; },
    makeDocs,
    notify(index = 0) { snapshots[index]?.({ docs: makeDocs({ path: "places", constraints: [{ kind: "limit", value: 50 }] }), size: Math.min(rows.size, 50) }); },
    resolvePending(index = 0) { const item = pending[index]; if (!item) return; const docs = makeDocs(item.query); item.resolve({ docs, size: docs.length }); },
    read(q: QueryData): Promise<{ docs: Doc[]; size: number }> {
      if (!deferReads) { const docs = makeDocs(q); return Promise.resolve({ docs, size: docs.length }); }
      return new Promise((resolve) => pending.push({ resolve, query: q }));
    },
    onSnapshot(q: QueryData, next: (value: { docs: Doc[]; size: number }) => void) { snapshots.push(next); next({ docs: makeDocs(q), size: Math.min(rows.size, Number(q.constraints.find((x) => x.kind === "limit")?.value ?? rows.size)) }); return vi.fn(); },
  };
});

vi.mock("./firebase", () => ({ db: {}, firebaseConfigured: true }));
vi.mock("./contentIntegrity", () => ({ withoutSeedPosts: (items: unknown[]) => items, withoutSeedStories: (items: unknown[]) => items }));
vi.mock("../utils/image", () => ({ compressImageWithinLimit: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  arrayRemove: vi.fn(), arrayUnion: vi.fn(), collection: (_db: unknown, name: string) => ({ path: name }),
  deleteDoc: vi.fn(), doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }), documentId: () => "__name__",
  getDoc: vi.fn(), getDocs: (q: Parameters<typeof fake.read>[0]) => fake.read(q), limit: (value: number) => ({ kind: "limit", value }),
  onSnapshot: (q: Parameters<typeof fake.onSnapshot>[0], next: Parameters<typeof fake.onSnapshot>[1]) => fake.onSnapshot(q, next),
  orderBy: (field: string, dir: string) => ({ kind: "orderBy", field, dir }), query: (collection: { path: string }, ...constraints: Array<{ kind: string; field?: string; value?: unknown; dir?: string }>) => fake.query(collection.path, constraints),
  serverTimestamp: () => 1, setDoc: vi.fn(), startAfter: (value: unknown) => ({ kind: "startAfter", value }), Timestamp: {}, updateDoc: vi.fn(), where: (field: string, _op: string, value: unknown) => ({ kind: "where", field, value }), writeBatch: vi.fn(),
}));

import { subscribeOwnedPlaces } from "./firestoreData";

function seed(count: number) {
  fake.rows.clear();
  for (let index = 1; index <= count; index += 1) {
    fake.rows.set(`places/p${String(index).padStart(3, "0")}`, { title: `Place ${index}`, authorUid: "u1", createdAt: count - index, lng: 1, lat: 1 });
  }
}

beforeEach(() => {
  seed(51); fake.snapshots.length = 0; fake.pending.length = 0; fake.setDefer(false);
});

describe("Firestore sayfalama IO sözleşmesi", () => {
  it("cursor sonrasında ikinci sayfayı getirir ve sayfa sınırında tekrarsız birleştirir", async () => {
    const results: string[][] = [];
    subscribeOwnedPlaces("u1", (places) => results.push(places.map((p) => p.id)));
    await vi.waitFor(() => expect(results.at(-1)).toHaveLength(51));
    expect(results.at(-1)).toEqual(Array.from({ length: 51 }, (_, i) => `p${String(i + 1).padStart(3, "0")}`));
  });

  it("eşit zaman damgalarında document id ikinci sıralama anahtarıyla cursor sınırını korur", async () => {
    for (const [path, data] of fake.rows) fake.rows.set(path, { ...data, createdAt: 7 });
    const results: string[][] = [];
    subscribeOwnedPlaces("u1", (places) => results.push(places.map((p) => p.id)));
    await vi.waitFor(() => expect(results.at(-1)).toHaveLength(51));
    expect(results.at(-1)).toEqual(Array.from({ length: 51 }, (_, i) => `p${String(51 - i).padStart(3, "0")}`));
  });

  it("gerçek silme sonrası sonraki kayıt sayfa sınırını doldurur; eski snapshot nesnesini korumaz", async () => {
    seed(101);
    const results: string[][] = [];
    subscribeOwnedPlaces("u1", (places) => results.push(places.map((p) => p.id)));
    await vi.waitFor(() => expect(results.at(-1)).toHaveLength(101));
    fake.rows.delete("places/p001");
    fake.snapshots[0]({ docs: fake.makeDocs(fake.query("places", [{ kind: "orderBy", field: "createdAt", dir: "desc" }, { kind: "orderBy", field: "__name__", dir: "desc" }, { kind: "limit", value: 50 }])), size: 50 });
    await vi.waitFor(() => expect(results.at(-1)).toHaveLength(100));
    expect(results.at(-1)).not.toContain("p001");
    expect(results.at(-1)).toContain("p051");
    expect(results.at(-1)).toContain("p101");
  });

  it("yeni ilk snapshot gelirken bekleyen sonraki sayfa eski nesli geçersiz kılar", async () => {
    fake.setDefer(true);
    const results: string[][] = [];
    subscribeOwnedPlaces("u1", (places) => results.push(places.map((p) => p.id)));
    await vi.waitFor(() => expect(fake.pending).toHaveLength(1));
    fake.rows.set("places/p000", { title: "new", authorUid: "u1", createdAt: 1000, lng: 1, lat: 1 });
    fake.snapshots[0]({ docs: fake.makeDocs(fake.query("places", [{ kind: "orderBy", field: "createdAt", dir: "desc" }, { kind: "limit", value: 50 }])), size: 50 });
    await vi.waitFor(() => expect(fake.pending).toHaveLength(2));
    fake.resolvePending(0);
    await Promise.resolve();
    expect(results).toEqual([]);
    fake.resolvePending(1);
    await vi.waitFor(() => expect(results).toHaveLength(1));
    expect(results[0]).toContain("p000");
  });
});
