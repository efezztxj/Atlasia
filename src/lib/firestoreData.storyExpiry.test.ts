// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  type Raw = Record<string, unknown>;
  type StoredDoc = { data: Raw; hasPendingWrites?: boolean };
  type Constraint = { kind: string; field?: string; op?: string; value?: unknown; dir?: string };
  type QuerySpec = { path: string; constraints: Constraint[] };

  const stories = new Map<string, StoredDoc>();
  const deleteCalls: string[] = [];
  const queries: QuerySpec[] = [];

  const toComparable = (v: unknown): number | string => {
    if (typeof v === "number" || typeof v === "string") return v;
    if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
      return (v as { toMillis: () => number }).toMillis();
    }
    return 0;
  };

  const evaluate = (q: QuerySpec) => {
    queries.push(q);
    let docs = [...stories.entries()].map(([id, stored]) => ({
      id,
      ref: { path: `${q.path}/${id}` },
      metadata: { hasPendingWrites: Boolean(stored.hasPendingWrites) },
      data: () => stored.data,
    }));

    for (const c of q.constraints.filter((x) => x.kind === "where")) {
      docs = docs.filter((item) => {
        const rawVal = item.data()[c.field ?? ""];
        const left = toComparable(rawVal);
        const right = toComparable(c.value);
        if (c.op === "==") return left === right;
        if (c.op === "<") return (left as number) < (right as number);
        if (c.op === ">=") return (left as number) >= (right as number);
        return false;
      });
    }

    const orders = q.constraints.filter((x) => x.kind === "orderBy");
    if (orders.length > 0) {
      docs.sort((a, b) => {
        for (const ord of orders) {
          const av = ord.field === "__name__" ? a.id : toComparable(a.data()[ord.field ?? ""]);
          const bv = ord.field === "__name__" ? b.id : toComparable(b.data()[ord.field ?? ""]);
          const cmp = av === bv ? 0 : av > bv ? 1 : -1;
          if (cmp !== 0) return ord.dir === "desc" ? -cmp : cmp;
        }
        return 0;
      });
    }

    const max = q.constraints.find((x) => x.kind === "limit")?.value as number | undefined;
    if (max !== undefined) docs = docs.slice(0, max);
    return { docs, size: docs.length };
  };

  return {
    stories,
    deleteCalls,
    queries,
    evaluate,
    reset() {
      stories.clear();
      deleteCalls.length = 0;
      queries.length = 0;
    },
  };
});

vi.mock("./firebase", () => ({ db: {}, firebaseConfigured: true }));
vi.mock("./contentIntegrity", () => ({
  withoutSeedPosts: (items: unknown[]) => items,
  withoutSeedStories: (items: unknown[]) => items,
}));
vi.mock("../utils/image", () => ({ compressImageWithinLimit: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  arrayRemove: vi.fn(),
  arrayUnion: vi.fn(),
  collection: (_db: unknown, name: string) => ({ path: name }),
  deleteDoc: async (ref: { path: string }) => {
    fake.deleteCalls.push(ref.path);
    const id = ref.path.split("/").pop() ?? "";
    fake.stories.delete(id);
  },
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  documentId: () => "__name__",
  getDoc: vi.fn(),
  getDocs: async (q: Parameters<typeof fake.evaluate>[0]) => fake.evaluate(q),
  limit: (value: number) => ({ kind: "limit", value }),
  onSnapshot: (q: Parameters<typeof fake.evaluate>[0], next: (snap: ReturnType<typeof fake.evaluate>) => void) => {
    next(fake.evaluate(q));
    return vi.fn();
  },
  orderBy: (field: string, dir = "asc") => ({ kind: "orderBy", field, dir }),
  query: (col: { path: string }, ...constraints: Array<{ kind: string }>) => ({
    path: col.path,
    constraints,
  }),
  serverTimestamp: () => 1,
  setDoc: vi.fn(),
  startAfter: (value: unknown) => ({ kind: "startAfter", value }),
  Timestamp: {
    fromMillis: (ms: number) => ({ toMillis: () => ms }),
  },
  updateDoc: vi.fn(),
  where: (field: string, op: string, value: unknown) => ({ kind: "where", field, op, value }),
  writeBatch: vi.fn(),
}));

import {
  isStoryExpired,
  purgeExpiredStories,
  STORY_TTL_MS,
  subscribeStories,
} from "./firestoreData";
import type { Story } from "../types";

const NOW = 1_760_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  fake.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("24 saatlik story süresi ve fiziksel silme", () => {
  it("normal oturum yalnız kendi 24 saati aşmış story'lerini tek alanlı authorUid sorgusuyla kalıcı siler; canlı ve bekleyen yazıları korur", async () => {
    fake.stories.set("own-expired", {
      data: { author: "vixo", authorUid: "u1", text: "Dünkü iz", accent: "leaf", createdAt: NOW - STORY_TTL_MS - 1, kind: "user" },
    });
    fake.stories.set("own-edge-live", {
      data: { author: "vixo", authorUid: "u1", text: "Tam sınırda", accent: "leaf", createdAt: NOW - STORY_TTL_MS, kind: "user" },
    });
    fake.stories.set("own-fresh", {
      data: { author: "vixo", authorUid: "u1", text: "Yeni iz", accent: "sun", createdAt: NOW - 60_000, kind: "user" },
    });
    fake.stories.set("own-pending", {
      data: { author: "vixo", authorUid: "u1", text: "Henüz yazılıyor", accent: "sea", createdAt: null, kind: "user" },
      hasPendingWrites: true,
    });
    fake.stories.set("other-expired", {
      data: { author: "baskasi", authorUid: "u2", text: "Başkasının eski izi", accent: "clay", createdAt: NOW - STORY_TTL_MS - 50_000, kind: "user" },
    });

    const deleted = await purgeExpiredStories({ uid: "u1", moderator: false, now: NOW });

    expect(deleted).toBe(1);
    expect(fake.deleteCalls).toEqual(["stories/own-expired"]);
    expect(fake.stories.has("own-expired")).toBe(false);
    expect(fake.stories.has("own-edge-live")).toBe(true);
    expect(fake.stories.has("own-fresh")).toBe(true);
    expect(fake.stories.has("own-pending")).toBe(true);
    expect(fake.stories.has("other-expired")).toBe(true);
    // Bileşik indeks gerektirmeyen tek alanlı authorUid sorgusu kullanıldığını doğrula
    expect(fake.queries).toHaveLength(1);
    expect(fake.queries[0].constraints.filter((c) => c.kind === "where")).toHaveLength(1);
  });

  it("moderatör oturumu tüm kullanıcıların 24 saati aşmış story'lerini de kalıcı olarak süpürür", async () => {
    fake.stories.set("own-expired", {
      data: { author: "vixo", authorUid: "u1", text: "Kendi eski", accent: "leaf", createdAt: NOW - STORY_TTL_MS - 5_000, kind: "user" },
    });
    fake.stories.set("other-expired", {
      data: { author: "gezgin2", authorUid: "u2", text: "Başkasının eski", accent: "clay", createdAt: NOW - STORY_TTL_MS - 90_000, kind: "user" },
    });
    fake.stories.set("other-live", {
      data: { author: "gezgin3", authorUid: "u3", text: "Canlı iz", accent: "sun", createdAt: NOW - 10_000, kind: "user" },
    });

    const deleted = await purgeExpiredStories({ uid: "u1", moderator: true, now: NOW });

    expect(deleted).toBe(2);
    expect(fake.deleteCalls).toEqual(["stories/own-expired", "stories/other-expired"]);
    expect([...fake.stories.keys()]).toEqual(["other-live"]);
  });

  it("subscribeStories 24 saat dolduğu anda story'yi görünümden düşürür ve onExpire geri çağrısını tetikler", () => {
    fake.stories.set("soon-expiring", {
      data: { author: "vixo", authorUid: "u1", text: "Bitmek üzere", accent: "leaf", createdAt: NOW - STORY_TTL_MS + 30_000, kind: "user" },
    });
    fake.stories.set("still-live", {
      data: { author: "vixo", authorUid: "u1", text: "Devam ediyor", accent: "sun", createdAt: NOW - 60_000, kind: "user" },
    });

    const visibleSnapshots: string[][] = [];
    const expiredCallbacks: string[][] = [];
    const unsub = subscribeStories(
      (page) => visibleSnapshots.push(page.items.map((item: Story) => item.id)),
      undefined,
      (expired) => expiredCallbacks.push(expired.map((item) => item.id)),
    );

    expect(visibleSnapshots.at(-1)).toEqual(["still-live", "soon-expiring"]);
    expect(expiredCallbacks).toEqual([]);

    vi.advanceTimersByTime(60_000);

    expect(visibleSnapshots.at(-1)).toEqual(["still-live"]);
    expect(expiredCallbacks).toEqual([["soon-expiring"]]);
    expect(isStoryExpired(0, NOW)).toBe(false);

    unsub();
  });
});
