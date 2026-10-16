/**
 * KOD-02 kabul testleri — gerçek `useFirestoreAtlasData` hook'u çalıştırılır.
 *
 * Sınırlar (açık):
 * - React: bu paket jsdom/react-testing-library içermez. Hook, `vi.mock("react")` ile
 *   sınırlı bir hook çalışma zamanına bağlanır (useState/useRef/useMemo/useCallback/
 *   useEffect). Bileşen ağacı, DOM ve React'in eşzamanlı (concurrent) zamanlaması yoktur.
 * - Firebase: `firebase/firestore` ve `lib/firebase` modülleri bellek içi bir taklitle
 *   değiştirilir. Gerçek `lib/firestoreData.ts` kodu (sayfalama, arrayUnion/arrayRemove
 *   sonrası likedBy hesabı, getDoc → updateDoc akışı) çalışır. Snapshot'lar yalnızca
 *   testin çağırdığı `flushSnapshots()` ile teslim edilir; böylece "yeni snapshot gelmeden"
 *   durumu kesin olarak sınanır.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── React hook çalışma zamanı (sınırlı) ───
const rt = vi.hoisted(() => {
  type Slot = {
    kind: "state" | "ref" | "memo" | "effect";
    value?: any;
    deps?: unknown[];
    cleanup?: (() => void) | void;
    set?: (v: any) => void;
  };
  type Inst = {
    fn: (p: any) => any;
    props: any;
    hooks: Slot[];
    idx: number;
    pendingEffects: Array<() => void>;
    dirty: boolean;
    rendering: boolean;
    mounted: boolean;
    result: any;
  };
  let current: Inst | null = null;

  const must = (): Inst => {
    if (!current) throw new Error("hook, render dışında çağrıldı");
    return current;
  };
  const depsChanged = (a: unknown[] | undefined, b: unknown[] | undefined) => {
    if (!a || !b || a.length !== b.length) return true;
    return a.some((v, i) => !Object.is(v, b[i]));
  };
  const slotAt = (inst: Inst, make: () => Slot): Slot => {
    const i = inst.idx++;
    if (!inst.hooks[i]) inst.hooks[i] = make();
    return inst.hooks[i];
  };

  const runInst = (inst: Inst) => {
    if (inst.rendering) {
      inst.dirty = true;
      return;
    }
    inst.rendering = true;
    try {
      let guard = 0;
      do {
        inst.dirty = false;
        inst.idx = 0;
        inst.pendingEffects = [];
        const prev = current;
        current = inst;
        try {
          inst.result = inst.fn(inst.props);
        } finally {
          current = prev;
        }
        const effects = inst.pendingEffects;
        inst.pendingEffects = [];
        for (const run of effects) run();
        if (++guard > 100) throw new Error("hook çalışma zamanı sonsuz döngüde");
      } while (inst.dirty);
    } finally {
      inst.rendering = false;
    }
  };

  const React = {
    useState(init: any) {
      const inst = must();
      const slot = slotAt(inst, () => {
        const s: Slot = { kind: "state", value: typeof init === "function" ? init() : init };
        s.set = (v: any) => {
          const next = typeof v === "function" ? v(s.value) : v;
          if (Object.is(next, s.value)) return;
          s.value = next;
          if (inst.mounted) runInst(inst);
        };
        return s;
      });
      return [slot.value, slot.set];
    },
    useRef(init: any) {
      const inst = must();
      const slot = slotAt(inst, () => ({ kind: "ref", value: { current: init } }));
      return slot.value;
    },
    useMemo(fn: () => any, deps: unknown[]) {
      const inst = must();
      const slot = slotAt(inst, () => ({ kind: "memo" }));
      if (depsChanged(slot.deps, deps)) {
        slot.value = fn();
        slot.deps = deps;
      }
      return slot.value;
    },
    useCallback(fn: any, deps: unknown[]) {
      const inst = must();
      const slot = slotAt(inst, () => ({ kind: "memo" }));
      if (depsChanged(slot.deps, deps)) {
        slot.value = fn;
        slot.deps = deps;
      }
      return slot.value;
    },
    useEffect(fn: () => (() => void) | void, deps: unknown[]) {
      const inst = must();
      const slot = slotAt(inst, () => ({ kind: "effect" }));
      if (depsChanged(slot.deps, deps)) {
        slot.deps = deps;
        inst.pendingEffects.push(() => {
          if (typeof slot.cleanup === "function") slot.cleanup();
          slot.cleanup = fn();
        });
      }
    },
  };

  const renderHook = (fn: (p: any) => any, props: any) => {
    const inst: Inst = {
      fn,
      props,
      hooks: [],
      idx: 0,
      pendingEffects: [],
      dirty: false,
      rendering: false,
      mounted: true,
      result: undefined,
    };
    runInst(inst);
    return {
      get result() {
        return inst.result;
      },
      rerender(next: any) {
        inst.props = next;
        runInst(inst);
      },
      unmount() {
        inst.mounted = false;
        for (const slot of inst.hooks) {
          if (slot.kind === "effect" && typeof slot.cleanup === "function") {
            slot.cleanup();
            slot.cleanup = undefined;
          }
        }
      },
    };
  };

  return { React, renderHook };
});

// ─── Firebase sınırı: bellek içi Firestore taklidi ───
const fsim = vi.hoisted(() => {
  type Data = Record<string, any>;
  type Ref = { path: string; id: string; col: string };
  type Item = { id: string; data: Data };
  interface Listener {
    q: any;
    onNext: (s: any) => void;
  }
  interface PendingWrite {
    ref: Ref;
    patch: Data;
    resolve: () => void;
    reject: (e: unknown) => void;
  }

  const store = new Map<string, Map<string, Data>>();
  const listeners = new Set<Listener>();
  let pending: PendingWrite[] = [];
  let writeMode: "auto" | "manual" = "auto";
  let failNext: unknown = null;
  let updateCalls = 0;

  const colMap = (name: string) => {
    let m = store.get(name);
    if (!m) {
      m = new Map();
      store.set(name, m);
    }
    return m;
  };

  const snapOf = (col: string, item: Item) => ({
    id: item.id,
    ref: { path: `${col}/${item.id}`, id: item.id, col },
    data: () => ({ ...item.data }),
    __data: item.data,
  });
  const snapshotOf = (col: string, items: Item[]) => {
    const docs = items.map((it) => snapOf(col, it));
    return { docs, size: docs.length, empty: docs.length === 0 };
  };

  const sortValue = (it: Item, field: any) =>
    field && typeof field === "object" && field.t === "docId" ? it.id : it.data[field as string];

  const evaluate = (q: any): Item[] => {
    const m = colMap(q.col);
    let items: Item[] = [...m.entries()].map(([id, data]) => ({ id, data: { ...data } }));
    const orders = q.cs.filter((c: any) => c.t === "orderBy");
    const cmp = (a: Item, b: Item) => {
      for (const o of orders) {
        const va = sortValue(a, o.field);
        const vb = sortValue(b, o.field);
        if (va === vb) continue;
        const r = (va as any) > (vb as any) ? 1 : -1;
        return o.dir === "desc" ? -r : r;
      }
      return 0;
    };
    items.sort(cmp);
    for (const w of q.cs.filter((c: any) => c.t === "where")) {
      items = items.filter((it) => {
        const v = it.data[w.field];
        if (w.op === ">=") return (v as number) >= (w.value as { toMillis: () => number }).toMillis();
        return v === w.value;
      });
    }
    const after = q.cs.find((c: any) => c.t === "startAfter");
    if (after) {
      const cur = after.snap.__data as Data;
      const curItem: Item = { id: after.snap.id, data: cur };
      items = items.filter((it) => cmp(it, curItem) > 0);
    }
    const lim = q.cs.find((c: any) => c.t === "limit");
    if (lim) items = items.slice(0, lim.n);
    return items;
  };

  const applyPatch = (ref: Ref, patch: Data) => {
    const data = colMap(ref.col).get(ref.id);
    if (!data) throw new Error("fake-firestore: belge yok");
    for (const [key, value] of Object.entries(patch)) {
      if (value && typeof value === "object" && "fieldOp" in value) {
        const cur: unknown[] = Array.isArray(data[key]) ? [...data[key]] : [];
        if (value.fieldOp === "union") {
          for (const v of value.vals) if (!cur.includes(v)) cur.push(v);
        } else {
          const next = cur.filter((v) => !value.vals.includes(v));
          cur.length = 0;
          cur.push(...next);
        }
        data[key] = cur;
      } else {
        data[key] = value;
      }
    }
  };

  const module = {
    arrayUnion: (...vals: unknown[]) => ({ fieldOp: "union", vals }),
    arrayRemove: (...vals: unknown[]) => ({ fieldOp: "remove", vals }),
    collection: (_db: unknown, name: string) => ({ name }),
    doc: (_db: unknown, col: string, id: string): Ref => ({ path: `${col}/${id}`, id, col }),
    documentId: () => ({ t: "docId" }),
    orderBy: (field: unknown, dir: "asc" | "desc" = "asc") => ({ t: "orderBy", field, dir }),
    limit: (n: number) => ({ t: "limit", n }),
    startAfter: (snap: unknown) => ({ t: "startAfter", snap }),
    where: (field: string, op: string, value: unknown) => ({ t: "where", field, op, value }),
    query: (col: { name: string }, ...cs: any[]) => ({ col: col.name, cs }),
    getDocs: (q: any) => Promise.resolve(snapshotOf(q.col, evaluate(q))),
    getDoc: (ref: Ref) => {
      const data = colMap(ref.col).get(ref.id);
      return Promise.resolve({
        id: ref.id,
        ref,
        exists: () => data !== undefined,
        data: () => (data ? { ...data } : undefined),
      });
    },
    onSnapshot: (q: any, onNext: (s: any) => void, _onError?: (e: Error) => void) => {
      const listener: Listener = { q, onNext };
      listeners.add(listener);
      queueMicrotask(() => {
        if (listeners.has(listener)) onNext(snapshotOf(q.col, evaluate(q)));
      });
      return () => {
        listeners.delete(listener);
      };
    },
    updateDoc: (ref: Ref, patch: Data) => {
      updateCalls += 1;
      if (failNext !== null) {
        const e = failNext;
        failNext = null;
        return Promise.reject(e);
      }
      if (writeMode === "manual") {
        return new Promise<void>((resolve, reject) => {
          pending.push({
            ref,
            patch,
            resolve: () => {
              applyPatch(ref, patch);
              resolve();
            },
            reject,
          });
        });
      }
      applyPatch(ref, patch);
      return Promise.resolve();
    },
    deleteDoc: async () => {},
    setDoc: async () => {},
    serverTimestamp: () => 0,
    Timestamp: class {
      static fromMillis(ms: number) {
        return { toMillis: () => ms };
      }
    },
  };

  const api = {
    module,
    db: { __fakeDb: true },
    seedPost(id: string, data: Data) {
      colMap("posts").set(id, { ...data });
    },
    getPost(id: string) {
      const d = colMap("posts").get(id);
      return d ? { ...d } : undefined;
    },
    flushSnapshots() {
      for (const l of [...listeners]) {
        // Snapshot teslimi için koleksiyon adı sorgudan okunur.
        l.onNext(snapshotOf(l.q.col, evaluate(l.q)));
      }
    },
    listenerCount: () => listeners.size,
    setWriteMode(mode: "auto" | "manual") {
      writeMode = mode;
    },
    pendingCount: () => pending.length,
    resolveWrite(index: number) {
      const w = pending[index];
      if (!w) throw new Error("bekleyen yazma yok");
      pending = pending.filter((_, i) => i !== index);
      w.resolve();
    },
    rejectWrite(index: number, error: unknown) {
      const w = pending[index];
      if (!w) throw new Error("bekleyen yazma yok");
      pending = pending.filter((_, i) => i !== index);
      w.reject(error);
    },
    failNextWrite(error: unknown) {
      failNext = error;
    },
    updateCalls: () => updateCalls,
    reset() {
      store.clear();
      listeners.clear();
      pending = [];
      writeMode = "auto";
      failNext = null;
      updateCalls = 0;
    },
  };
  return api;
});

vi.mock("react", () => rt.React);
vi.mock("firebase/firestore", () => fsim.module);
vi.mock("../lib/firebase", () => ({
  db: fsim.db,
  firebaseConfigured: true,
  isCloudReady: true,
  firebaseApp: {},
  firebaseConfigSummary: {},
}));

// Sınır mock'ları kurulduktan sonra gerçek modüller içe aktarılır.
const { useFirestoreAtlasData } = await import("./useFirestoreAtlasData");

type Hook = ReturnType<typeof useFirestoreAtlasData>;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const pad = (i: number) => `post-${String(i).padStart(2, "0")}`;

/** 52 kullanıcı gönderisi: ilk sayfa 50 (post-51..post-02), eski sayfa 2 (post-01, post-00). */
function seedPosts(count = 52, overrides: Record<string, Record<string, unknown>> = {}) {
  for (let i = 0; i < count; i += 1) {
    const id = pad(i);
    fsim.seedPost(id, {
      author: "Gezgin",
      authorUid: "owner",
      text: id,
      createdAt: i + 1,
      likes: 0,
      likedBy: [],
      kind: "user",
      replies: [],
      ...(overrides[id] ?? {}),
    });
  }
}

let mounted: Array<{ unmount: () => void }> = [];

function mount(uid = "member-a", enabled = true) {
  const h = rt.renderHook(
    (p: { uid: string; enabled?: boolean }) =>
      useFirestoreAtlasData({ uid: p.uid, enabled: p.enabled ?? true, viewport: null }),
    { uid, enabled },
  );
  mounted.push(h);
  return {
    h,
    get r(): Hook {
      return h.result as Hook;
    },
  };
}

async function mountWithTail(uid = "member-a") {
  const m = mount(uid);
  await flush();
  await m.r.loadMorePosts();
  await flush();
  return m;
}

const likedByOf = (posts: Array<{ id: string; likedBy?: string[] }>, id: string) =>
  posts.find((p) => p.id === id)?.likedBy ?? [];

beforeEach(() => {
  fsim.reset();
});

afterEach(() => {
  for (const h of mounted) h.unmount();
  mounted = [];
});

describe("KOD-02 gerçek hook beğeni ve oturum muhafızı testleri", () => {
  it("1) ilk sayfada bulunan kart için beğeni ve geri alma postHead üzerinden çalışır", async () => {
    seedPosts(5);
    const m = mount("member-a");
    await flush();

    await m.r.toggleLike("post-04");
    expect(likedByOf(m.r.posts, "post-04")).toEqual(["member-a"]);

    await m.r.toggleLike("post-04");
    expect(likedByOf(m.r.posts, "post-04")).toEqual([]);
  });

  it("2) loadMorePosts aynı id'li kartları tekrarlamadan postTail'e ekler", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");

    const ids = m.r.posts.map((p) => p.id);
    expect(ids.length).toBe(52);
    expect(new Set(ids).size).toBe(52);
    expect(ids).toContain("post-00");
    expect(ids).toContain("post-01");
  });

  it("3) ilk sayfada zaten bulunan kart begenildikten sonra snapshot gelirse çift sayılmaz", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");

    await m.r.toggleLike("post-51");
    expect(likedByOf(m.r.posts, "post-51")).toEqual(["member-a"]);

    fsim.flushSnapshots();
    await flush();
    expect(likedByOf(m.r.posts, "post-51")).toEqual(["member-a"]);
    expect(m.r.posts.filter((p) => p.id === "post-51").length).toBe(1);
  });

  it("4) ilk sayfa dışındaki eski kart beğenildiğinde yeni onSnapshot beklemeden hemen güncellenir", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");
    expect(likedByOf(m.r.posts, "post-00")).toEqual([]);

    await m.r.toggleLike("post-00");
    expect(likedByOf(m.r.posts, "post-00")).toEqual(["member-a"]);
    expect(fsim.getPost("post-00")?.likedBy).toEqual(["member-a"]);
  });

  it("5) ilk sayfa dışındaki eski kartta beğeni geri alındığında hemen beğenmemiş durumuna döner", async () => {
    seedPosts(52, { "post-00": { likedBy: ["member-a", "member-b"] } });
    const m = await mountWithTail("member-a");
    expect(likedByOf(m.r.posts, "post-00")).toEqual(["member-a", "member-b"]);

    await m.r.toggleLike("post-00");
    expect(likedByOf(m.r.posts, "post-00")).toEqual(["member-b"]);
    expect(fsim.getPost("post-00")?.likedBy).toEqual(["member-b"]);
  });

  it("6) gecikmeli Firestore yazımı tamamlanana kadar eski kartın beğeni durumu değişmez", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");
    fsim.setWriteMode("manual");

    let settled = false;
    const p = m.r.toggleLike("post-00").then(() => {
      settled = true;
    });
    await flush();

    expect(settled).toBe(false);
    expect(fsim.pendingCount()).toBe(1);
    expect(likedByOf(m.r.posts, "post-00")).toEqual([]);

    fsim.resolveWrite(0);
    await p;
    expect(settled).toBe(true);
    expect(likedByOf(m.r.posts, "post-00")).toEqual(["member-a"]);
  });

  it("7) reddedilen beğeni sahte başarı bırakmaz", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");
    fsim.failNextWrite(new Error("permission-denied"));

    await expect(m.r.toggleLike("post-00")).rejects.toThrow("permission-denied");
    expect(likedByOf(m.r.posts, "post-00")).toEqual([]);
    expect(fsim.getPost("post-00")?.likedBy).toEqual([]);
  });

  it("8) başarılı beğeni sonrası reddedilen geri alma mevcut beğeniyi kaldırmaz", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");

    await m.r.toggleLike("post-00");
    expect(likedByOf(m.r.posts, "post-00")).toEqual(["member-a"]);

    fsim.failNextWrite(new Error("network-error"));
    await expect(m.r.toggleLike("post-00")).rejects.toThrow("network-error");
    expect(likedByOf(m.r.posts, "post-00")).toEqual(["member-a"]);
  });

  it("9) bekleyen yazı reddedildiğinde yerel durum değişmez", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");
    fsim.setWriteMode("manual");

    const p = m.r.toggleLike("post-00");
    await flush();
    expect(fsim.pendingCount()).toBe(1);

    fsim.rejectWrite(0, new Error("write-aborted"));
    await expect(p).rejects.toThrow("write-aborted");
    expect(likedByOf(m.r.posts, "post-00")).toEqual([]);
  });

  it("10) uid değişiminde bekleyen eski beğeni yazısı yeni oturuma taşınmaz", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");
    fsim.setWriteMode("manual");

    const pendingLike = m.r.toggleLike("post-51");
    await flush();
    expect(fsim.pendingCount()).toBe(1);

    // Yazı tamamlanmadan oturum member-b'ye geçer ve yeni snapshot henüz gelmemiştir.
    m.h.rerender({ uid: "member-b", enabled: true });
    await flush();
    expect(likedByOf(m.r.posts, "post-51")).toEqual([]);

    // Eski oturumun yazısı şimdi commit olur; yeni oturumun yerel state'ini kirletmemelidir.
    fsim.resolveWrite(0);
    await pendingLike;
    expect(likedByOf(m.r.posts, "post-51")).toEqual([]);
    expect(fsim.getPost("post-51")?.likedBy).toEqual(["member-a"]);
  });

  it("11) enabled değişiminde (kapat-aç) bekleyen eski beğeni yazısı yeni oturuma taşınmaz", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");
    fsim.setWriteMode("manual");

    const pendingLike = m.r.toggleLike("post-51");
    await flush();
    expect(fsim.pendingCount()).toBe(1);

    // Bulut aboneliği kapatılıp tekrar açılır; yeni oturum ilk sayfasını alır.
    m.h.rerender({ uid: "member-a", enabled: false });
    m.h.rerender({ uid: "member-a", enabled: true });
    await flush();
    expect(likedByOf(m.r.posts, "post-51")).toEqual([]);

    // Eski oturumdan kalan yazı resolve olduğunda yeni oturumun state/ref'ine yazılmamalıdır.
    fsim.resolveWrite(0);
    await pendingLike;
    expect(likedByOf(m.r.posts, "post-51")).toEqual([]);
    expect(fsim.getPost("post-51")?.likedBy).toEqual(["member-a"]);
  });

  it("12) unmount sonrasında geciken beğeni yazısı son görünür sonucu değiştirmez", async () => {
    seedPosts(52);
    const m = await mountWithTail("member-a");
    fsim.setWriteMode("manual");

    const pendingLike = m.r.toggleLike("post-00");
    await flush();
    expect(fsim.pendingCount()).toBe(1);

    m.h.unmount();
    fsim.resolveWrite(0);
    await pendingLike;

    expect(likedByOf(m.r.posts, "post-00")).toEqual([]);
    expect(fsim.getPost("post-00")?.likedBy).toEqual(["member-a"]);
  });

  it("13) unmount edildiğinde tüm Firestore onSnapshot dinleyicilerini temizler", async () => {
    seedPosts(10);
    const m = mount("member-a");
    await flush();
    expect(fsim.listenerCount()).toBeGreaterThan(0);

    m.h.unmount();
    expect(fsim.listenerCount()).toBe(0);
  });
});
