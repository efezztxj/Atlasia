/**
 * Atlasia — rota izin hatası regresyon kanıtı.
 *
 * KÖK NEDEN (kanıtlandı): `firestore.rules` içindeki
 *
 *     match /routes/{routeId} {
 *       allow get: if resource.data.visibility in ['public', 'unlisted']
 *                  || (signedIn() && resource.data.authorUid == request.auth.uid);
 *
 * kuralı `resource.data` alanına dokunur. Firestore'da **var olmayan** bir
 * belgeyi okurken `resource` null'dır, kural değerlendirilemez ve SDK
 * `not-found` değil `permission-denied` döndürür. `saveRouteReference` ve
 * `publishRoute` eskiden YAZMADAN ÖNCE her zaman `getDoc(routes/{id})`
 * çağırdığı için, yeni oluşturulan her rota "Missing or insufficient
 * permissions" ile patlıyordu.
 *
 * Bu dosyadaki sahte Firestore söz konusu davranışı birebir taklit eder;
 * dolayısıyla test hem hatayı yeniden üretir hem düzeltmeyi doğrular.
 *
 * NOT: Bu bir birim testidir. Gerçek güvenlik kuralları emülatör testinde
 * (`tests/firestore.rules.test.ts`) koşar; o tur bu sandbox'ta Java 21
 * olmadığı için ÇALIŞTIRILAMADI.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasRoute } from "../types";

const SERVER_TS = "SERVER_TS";

interface Op {
  kind: "set" | "update" | "delete";
  path: string;
  data?: Record<string, unknown>;
}

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const auth = { uid: "user-a" };
  /** Kural reddi sayacı: hangi aşamanın kaç kez reddedildiğini kanıtlamak için. */
  const denials: string[] = [];
  return { store, auth, denials, SERVER_TS: "SERVER_TS" };
});

function denied(rule: string): never {
  h.denials.push(rule);
  throw Object.assign(new Error("Missing or insufficient permissions."), {
    name: "FirestoreError",
    code: "permission-denied",
  });
}

function notFound(path: string): never {
  throw Object.assign(new Error(`No document to update: ${path}`), {
    name: "FirestoreError",
    code: "not-found",
  });
}

/* ─────────────── firestore.rules birebir taklidi ─────────────── */

function validRouteBody(route: unknown): boolean {
  if (!route || typeof route !== "object") return false;
  const value = route as Record<string, unknown>;
  const required = ["id", "routeTitle", "routeSummary", "totalDurationHours",
    "totalDistanceKm", "transport", "vibe", "days", "weatherNote", "alternatives", "createdAt"];
  const allowed = [...required, "dataSources", "origin", "photo", "region"];
  if (!required.every((key) => key in value)) return false;
  if (!Object.keys(value).every((key) => allowed.includes(key))) return false;
  if (typeof value.id !== "string" || value.id.length < 1 || value.id.length > 128) return false;
  if (typeof value.routeTitle !== "string" || !value.routeTitle.length) return false;
  if (typeof value.totalDurationHours !== "number") return false;
  if (typeof value.totalDistanceKm !== "number") return false;
  if (!["walking", "cycling", "driving", "transit"].includes(value.transport as string)) return false;
  if (!Array.isArray(value.days) || value.days.length > 30) return false;
  if (!Array.isArray(value.alternatives)) return false;
  return true;
}

function validRouteDocument(data: Record<string, unknown>): boolean {
  const required = ["authorUid", "visibility", "route", "saveCount", "createdAt", "updatedAt"];
  if (!required.every((key) => key in data)) return false;
  if (!Object.keys(data).every((key) => required.includes(key))) return false;
  if (typeof data.authorUid !== "string" || !data.authorUid.length) return false;
  if (!["private", "unlisted", "public"].includes(data.visibility as string)) return false;
  if (!validRouteBody(data.route)) return false;
  if (!Number.isInteger(data.saveCount) || (data.saveCount as number) < 0) return false;
  // createdAt/updatedAt: serverTimestamp() veya korunmuş mevcut Timestamp.
  return data.createdAt !== undefined && data.updatedAt !== undefined;
}

/**
 * allow get taklidi.
 *
 * İNCE NOKTA: `routes/{id}` ve `tracks/{id}` kuralları `resource.data` alanına
 * dokunur, bu yüzden VAR OLMAYAN belgede kural değerlendirilemez ve Firestore
 * `permission-denied` döndürür (kök neden). Buna karşılık
 * `users/{uid}/savedRoutes/{id}` kuralı yalnız `request.auth.uid == uid` der ve
 * `resource`'a hiç dokunmaz; eksik belge normal biçimde `not-exists` döner.
 * Bu ayrımı taklit etmezsek transaction içindeki meşru `savedRef` okuması da
 * yanlışlıkla reddedilir.
 */
function rulesGet(path: string): Record<string, unknown> | null {
  const existing = h.store.get(path);
  if (!existing) {
    const touchesResourceData = path.startsWith("routes/") || path.startsWith("tracks/");
    if (touchesResourceData) denied(`get ${path} (belge yok, resource null)`);
    if (path.startsWith("users/") && path.split("/")[1] !== h.auth.uid) denied(`get ${path} (own-scoped değil)`);
    return null;
  }
  if (path.startsWith("routes/")) {
    const visible = ["public", "unlisted"].includes(existing.visibility as string);
    const owner = h.auth.uid === existing.authorUid;
    if (!visible && !owner) denied(`get ${path} (private, sahip değil)`);
  } else if (path.startsWith("users/")) {
    if (path.split("/")[1] !== h.auth.uid) denied(`get ${path} (own-scoped değil)`);
  } else if (path.startsWith("tracks/")) {
    if (existing.authorUid !== h.auth.uid) denied(`get ${path} (iz sahibi değil)`);
  }
  return existing;
}

/**
 * Rota yazımı: belge yoksa `create`, varsa `update` kuralı.
 *
 * `update` kuralının İKİ dalı vardır ve bunlar farklı sahiplik ister:
 *   - sahip dalı : authorUid == auth.uid && saveCount DEĞİŞMEDİ && updatedAt == request.time
 *   - sayaç dalı : routeCounterChange(routeId) → SAHİPLİK ARANMAZ; yalnız
 *                  değişen anahtarlar {saveCount, updatedAt} olur ve aynı
 *                  transaction'da savedRoutes belgesi eklenmiş(+1) veya
 *                  kaldırılmış(-1) olmalıdır (exists/existsAfter).
 * Sahip olmayan kullanıcının açık bir rotanın sayacını artırabilmesi bu ikinci
 * daldan gelir; bu yüzden "sahip değil" reddi yalnız sahip dalına uygulanır.
 */
function rulesWriteRoutes(
  routeId: string,
  path: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
  staged: Map<string, Record<string, unknown>>,
): void {
  if (!before) {
    // allow create
    if (after.authorUid !== h.auth.uid) denied(`create ${path} (authorUid != auth.uid)`);
    if ((after.route as Record<string, unknown>)?.id !== routeId) denied(`create ${path} (route.id != routeId)`);
    if (after.saveCount !== 0) denied(`create ${path} (saveCount != 0)`);
    if (after.createdAt !== SERVER_TS) denied(`create ${path} (createdAt != request.time)`);
    if (after.updatedAt !== SERVER_TS) denied(`create ${path} (updatedAt != request.time)`);
    if (!validRouteDocument(after)) denied(`create ${path} (validRouteDocument)`);
    return;
  }
  // allow update — ortak ön koşullar
  if (after.authorUid !== before.authorUid) denied(`update ${path} (authorUid değişti)`);
  if (after.createdAt !== before.createdAt) denied(`update ${path} (createdAt değişti)`);
  if ((after.route as Record<string, unknown>)?.id !== routeId) denied(`update ${path} (route.id != routeId)`);
  if (!validRouteDocument(after)) denied(`update ${path} (validRouteDocument)`);

  const savedPath = `users/${h.auth.uid}/savedRoutes/${routeId}`;
  const changed = Object.keys(after).filter((key) => JSON.stringify(after[key]) !== JSON.stringify(before[key]));
  const beforeSaveCount = before.saveCount as number;
  const afterSaveCount = after.saveCount as number;

  const ownerBranch = before.authorUid === h.auth.uid
    && afterSaveCount === beforeSaveCount
    && after.updatedAt === SERVER_TS;

  // routeCounterChange: exists/existsAfter transaction'ın bitmiş hâline bakar.
  const addedSavedRoute = !h.store.has(savedPath) && staged.has(savedPath);
  const removedSavedRoute = h.store.has(savedPath) && !staged.has(savedPath);
  const counterBranch = changed.every((key) => key === "saveCount" || key === "updatedAt")
    && after.updatedAt === SERVER_TS
    && (
      (addedSavedRoute && afterSaveCount === beforeSaveCount + 1)
      || (removedSavedRoute && beforeSaveCount > 0 && afterSaveCount === beforeSaveCount - 1)
    );

  if (!ownerBranch && !counterBranch) denied(`update ${path} (saveCount/updatedAt kuralı)`);
}

/** savedRoutes create kuralı: savedRouteCounterIncreased (getAfter semantiği). */
function rulesWriteSavedRoutes(routeId: string, path: string, before: Record<string, unknown> | undefined, after: Record<string, unknown>, staged: Map<string, Record<string, unknown>>): void {
  if (path.split("/")[1] !== h.auth.uid) denied(`write ${path} (own-scoped değil)`);
  if (!before) {
    const keys = Object.keys(after);
    if (keys.length !== 2 || !keys.includes("routeId") || !keys.includes("savedAt")) denied(`create ${path} (hasOnly routeId,savedAt)`);
    if (after.routeId !== routeId) denied(`create ${path} (routeId != docId)`);
    if (after.savedAt !== SERVER_TS) denied(`create ${path} (savedAt != request.time)`);
    // savedRouteCounterIncreased: getAfter(route).saveCount == get(route).saveCount + 1
    const routePath = `routes/${routeId}`;
    const current = h.store.get(routePath);
    const next = staged.get(routePath);
    if (!current) denied(`create ${path} (savedRouteCounterIncreased: rota yok)`);
    if (!next) denied(`create ${path} (savedRouteCounterIncreased: rota aynı batch'te güncellenmedi)`);
    if (next.saveCount !== (current!.saveCount as number) + 1) denied(`create ${path} (saveCount +1 değil)`);
    return;
  }
  denied(`update ${path} (savedRoutes update kapalı)`);
}

function rulesWriteTracks(path: string, before: Record<string, unknown> | undefined, after: Record<string, unknown>): void {
  if (!before) {
    if (after.authorUid !== h.auth.uid) denied(`create ${path} (authorUid)`);
    return;
  }
  if (before.authorUid !== h.auth.uid) denied(`update ${path} (sahip değil)`);
}

/** Tek yazım için kural denetimi. `staged` transaction'ın bitmiş hâlidir (getAfter). */
function applyRules(op: Op, staged: Map<string, Record<string, unknown>>): void {
  const before = h.store.get(op.path);
  if (op.kind === "delete") {
    if (!before) return;
    if (op.path.startsWith("routes/")) {
      if (before.authorUid !== h.auth.uid) denied(`delete ${op.path} (sahip değil)`);
    } else if (op.path.startsWith("tracks/")) {
      if (before.authorUid !== h.auth.uid) denied(`delete ${op.path} (sahip değil)`);
    } else if (op.path.startsWith("users/")) {
      if (op.path.split("/")[1] !== h.auth.uid) denied(`delete ${op.path} (own-scoped değil)`);
      // savedRoutes delete: savedRouteCounterDecreased
      if (op.path.includes("/savedRoutes/")) {
        const routeId = op.path.split("/").pop()!;
        const routePath = `routes/${routeId}`;
        const next = staged.get(routePath);
        const current = h.store.get(routePath);
        const stillExists = staged.has(routePath);
        if (stillExists && current && next
          && (next.saveCount as number) !== (current.saveCount as number) - 1) {
          denied(`delete ${op.path} (savedRouteCounterDecreased)`);
        }
      }
    }
    return;
  }

  const after = op.kind === "update"
    ? { ...(before ?? {}), ...resolveData(before, op.data) }
    : resolveData(before, op.data);

  if (op.path.startsWith("routes/")) {
    rulesWriteRoutes(op.path.split("/")[1], op.path, before, after, staged);
  } else if (op.path.includes("/savedRoutes/")) {
    rulesWriteSavedRoutes(op.path.split("/").pop()!, op.path, before, after, staged);
  } else if (op.path.startsWith("tracks/")) {
    rulesWriteTracks(op.path, before, after);
  } else if (op.path.startsWith("users/")) {
    if (op.path.split("/")[1] !== h.auth.uid) denied(`write ${op.path} (own-scoped değil)`);
  }
}

/**
 * `increment(n)` sentinel'ini gerçek sayıya çevirir.
 *
 * ÖNEMLİ: çözümleme commit anındaki mevcut değere göre yapılmalıdır; op'u
 * oluştururken değil. Aksi hâlde `saveCount` bir nesne olarak kalır ve hem
 * `validRouteDocument` (int bekler) hem `saveCount == resource.data.saveCount - 1`
 * karşılaştırması yanlışlıkla reddeder — gerçek Firestore'da geçecek bir yazım
 * testte patlar.
 */
function resolveData(before: Record<string, unknown> | undefined, data: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!data) return {};
  return Object.fromEntries(Object.entries(data).map(([key, value]) => {
    if (value && typeof value === "object" && "__increment" in (value as Record<string, unknown>)) {
      const current = typeof before?.[key] === "number" ? (before![key] as number) : 0;
      return [key, current + (value as { __increment: number }).__increment];
    }
    return [key, value];
  }));
}

function commit(ops: Op[]): void {
  // Firestore transaction semantiği: önce tüm yazımların bitmiş hâli hesaplanır
  // (getAfter), sonra her yazımın kuralı bu bitmiş hâle karşı denetlenir.
  const staged = new Map(h.store);
  for (const op of ops) {
    if (op.kind === "delete") staged.delete(op.path);
    else if (op.kind === "update") staged.set(op.path, { ...(staged.get(op.path) ?? {}), ...resolveData(staged.get(op.path), op.data) });
    else staged.set(op.path, resolveData(staged.get(op.path), op.data));
  }
  for (const op of ops) applyRules(op, staged);
  for (const [path, data] of staged) h.store.set(path, data);
  for (const path of h.store.keys()) if (!staged.has(path)) h.store.delete(path);
}

/* ─────────────── firebase/firestore sahte SDK ─────────────── */

vi.mock("./firebase", () => ({ db: { id: "fake" }, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  doc: (first: unknown, ...rest: string[]) => {
    if (first && typeof first === "object" && "path" in first) {
      return { path: `${(first as { path: string }).path}/${rest.join("/")}` };
    }
    return { path: rest.join("/") };
  },
  query: (target: { path: string }, ...constraints: Array<Record<string, unknown>>) => {
    const built: { path: string; field?: string; value?: unknown; limit?: number } = { path: target.path };
    for (const constraint of constraints) {
      if (!constraint || typeof constraint !== "object") continue;
      if ("field" in constraint) { built.field = constraint.field as string; built.value = constraint.value; }
      if ("limit" in constraint) built.limit = constraint.limit as number;
    }
    return built;
  },
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  limit: (value: number) => ({ limit: value }),
  orderBy: () => ({}),
  serverTimestamp: () => SERVER_TS,
  increment: (amount: number) => ({ __increment: amount }),

  getDoc: async (ref: { path: string }) => {
    const data = rulesGet(ref.path);
    return { exists: () => data !== undefined && data !== null, data: () => data, id: ref.path.split("/").pop(), ref };
  },

  getDocs: async (q: { path: string; field?: string; value?: unknown; limit?: number }) => {
    // list kuralları: routes'ta visibility==public filtresi, tracks'ta authorUid.
    let entries = [...h.store.entries()].filter(([key]) => key.startsWith(`${q.path}/`))
      .filter(([key]) => key.slice(q.path.length + 1).split("/").length === 1);
    if (q.path === "routes") {
      entries = entries.filter(([, data]) => data.visibility === q.value);
    }
    if (q.path === "tracks") {
      if (q.value !== h.auth.uid) return { size: 0, docs: [] };
      entries = entries.filter(([, data]) => data.authorUid === q.value);
    }
    if (typeof q.limit === "number") entries = entries.slice(0, q.limit);
    const docs = entries.map(([key, data]) => ({ id: key.slice(q.path.length + 1), ref: { path: key }, data: () => data }));
    return { size: docs.length, docs };
  },

  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    const resolved = Object.fromEntries(Object.entries(data).map(([key, value]) => (
      [key, value && typeof value === "object" && "__increment" in (value as object)
        ? ((h.store.get(ref.path)?.[key] as number ?? 0) + (value as { __increment: number }).__increment)
        : value]
    )));
    commit([{ kind: "set", path: ref.path, data: resolved }]);
  },

  updateDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    if (!h.store.has(ref.path)) notFound(ref.path);
    const resolved = Object.fromEntries(Object.entries(data).map(([key, value]) => (
      [key, value && typeof value === "object" && "__increment" in (value as object)
        ? ((h.store.get(ref.path)?.[key] as number ?? 0) + (value as { __increment: number }).__increment)
        : value]
    )));
    commit([{ kind: "update", path: ref.path, data: resolved }]);
  },

  deleteDoc: async (ref: { path: string }) => { commit([{ kind: "delete", path: ref.path }]); },

  runTransaction: async (_db: unknown, body: (tx: unknown) => Promise<void>) => {
    const ops: Op[] = [];
    const tx = {
      get: async (ref: { path: string }) => {
        // Transaction okuması da kural denetiminden geçer.
        const data = rulesGet(ref.path);
        return { exists: () => data !== undefined && data !== null, data: () => data, ref };
      },
      set: (ref: { path: string }, data: Record<string, unknown>) => { ops.push({ kind: "set", path: ref.path, data }); },
      update: (ref: { path: string }, data: Record<string, unknown>) => { ops.push({ kind: "update", path: ref.path, data }); },
      delete: (ref: { path: string }) => { ops.push({ kind: "delete", path: ref.path }); },
    };
    await body(tx);
    commit(ops);
  },

  onSnapshot: (
    q: { path: string; limit?: number },
    onChange: (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void,
    onError?: (failure: Error) => void,
  ) => {
    try {
      if (q.path.split("/")[1] && q.path.startsWith("users/") && q.path.split("/")[1] !== h.auth.uid) {
        denied(`list ${q.path} (own-scoped değil)`);
      }
      let entries = [...h.store.entries()].filter(([key]) => key.startsWith(`${q.path}/`))
        .filter(([key]) => key.slice(q.path.length + 1).split("/").length === 1);
      if (typeof q.limit === "number") entries = entries.slice(0, q.limit);
      onChange({
        docs: entries.map(([key, data]) => ({ id: key.slice(q.path.length + 1), data: () => data })),
      });
    } catch (failure) {
      onError?.(failure as Error);
    }
    return () => {};
  },
}));

import {
  listOwnedTracks,
  listPublicRoutes,
  probeRouteDocument,
  publishRoute,
  removeRouteFromLibrary,
  removeSavedRoute,
  saveRouteReference,
  subscribeSavedCollections,
} from "./routeData";

function routeFixture(id: string, overrides: Partial<AtlasRoute> = {}): AtlasRoute {
  return {
    id,
    routeTitle: "Efes yürüyüşü",
    routeSummary: "Magnesia Kapısı'ndan Büyük Tiyatro'ya.",
    totalDurationHours: 3,
    totalDistanceKm: 2.1,
    transport: "walking",
    vibe: "tarih",
    days: [{ title: "Gün 1", stops: [] }],
    weatherNote: null,
    alternatives: [],
    createdAt: 1_700_000_000_000,
    ...overrides,
  } as AtlasRoute;
}

function seedPublishedRoute(id: string, authorUid: string, visibility: string, saveCount = 0, createdAt: unknown = "TS-1") {
  h.store.set(`routes/${id}`, {
    authorUid,
    visibility,
    route: routeFixture(id),
    saveCount,
    createdAt,
    updatedAt: "TS-0",
  });
}

beforeEach(() => {
  h.store.clear();
  h.denials.length = 0;
  h.auth.uid = "user-a";
});

describe("rota ön-okuması: var olmayan belge permission-denied döner (kök neden)", () => {
  it("getDoc reddi probeRouteDocument tarafından 'yok' olarak yorumlanır, hata fırlatmaz", async () => {
    const probe = await probeRouteDocument("route-yeni");
    expect(probe.exists).toBe(false);
    expect(probe.denied).toBe(true);
    expect(probe.data).toBeNull();
    expect(h.denials.some((entry) => entry.includes("belge yok"))).toBe(true);
  });

  it("başkasının private rotası da denied döner ama exists=false kalır (ezme yok)", async () => {
    seedPublishedRoute("route-gizli", "user-b", "private");
    const probe = await probeRouteDocument("route-gizli");
    expect(probe.denied).toBe(true);
    expect(probe.exists).toBe(false);
  });

  it("kendi rotamız ve açık rota okunabilir", async () => {
    seedPublishedRoute("route-mine", "user-a", "private");
    seedPublishedRoute("route-public", "user-b", "public");
    expect((await probeRouteDocument("route-mine")).exists).toBe(true);
    expect((await probeRouteDocument("route-public")).exists).toBe(true);
  });
});

describe("yeni rota yayınlama (eskiden her zaman permission-denied ile patlardı)", () => {
  it("publishRoute ön-okuma reddedilse de create-şekilli yazımla rotayı oluşturur", async () => {
    const route = routeFixture("route-yeni");
    await expect(publishRoute("user-a", route, "private")).resolves.toBeUndefined();

    const saved = h.store.get("routes/route-yeni");
    expect(saved).toBeDefined();
    expect(saved?.authorUid).toBe("user-a");
    expect(saved?.visibility).toBe("private");
    expect(saved?.saveCount).toBe(0);
    expect(saved?.createdAt).toBe(SERVER_TS);
    expect(saved?.updatedAt).toBe(SERVER_TS);
  });

  it("mevcut kendi rotasını güncellerken saveCount ve createdAt KORUNUR (sayaç sıfırlanmaz)", async () => {
    seedPublishedRoute("route-var", "user-a", "private", 7, "TS-ORIJINAL");
    await publishRoute("user-a", routeFixture("route-var", { routeTitle: "Güncel başlık" }), "public");

    const saved = h.store.get("routes/route-var")!;
    expect(saved.saveCount).toBe(7);
    expect(saved.createdAt).toBe("TS-ORIJINAL");
    expect(saved.visibility).toBe("public");
    expect((saved.route as Record<string, unknown>).routeTitle).toBe("Güncel başlık");
  });

  it("başkasının private rotası EZİLMEZ; sahipliği adıyla anan net hata üretir", async () => {
    seedPublishedRoute("route-baskasinin", "user-b", "private", 3, "TS-B");
    await expect(publishRoute("user-a", routeFixture("route-baskasinin"), "private"))
      .rejects.toThrow(/başka bir kayda ait/);
    // Orijinal belge dokunulmamış kalmalı.
    expect(h.store.get("routes/route-baskasinin")).toMatchObject({ authorUid: "user-b", saveCount: 3, createdAt: "TS-B" });
  });

  it("validRouteDocument'u ihlal eden gövde create aşamasında reddedilir — son kararı kurallar verir", async () => {
    // İstemci ön-okumayı tolere etse bile kural ihlalini geçemez: transport
    // kapalı listede değil → validRouteBody false → create denied.
    const invalid = routeFixture("route-bozuk", { transport: "helicopter" as unknown as AtlasRoute["transport"] });
    await expect(publishRoute("user-a", invalid, "private")).rejects.toThrow();
    expect(h.store.has("routes/route-bozuk")).toBe(false);
    expect(h.denials.some((entry) => entry.includes("validRouteDocument"))).toBe(true);
  });
});

describe("saveRouteReference: rota belgesi + kütüphane referansı + sayaç transaction'ı ayrı aşamalardır", () => {
  it("yeni rotayı oluşturur, referansı yazar ve sayacı 1'e çıkarır", async () => {
    const route = routeFixture("route-yeni");
    await expect(saveRouteReference("user-a", route)).resolves.toBeUndefined();

    expect(h.store.get("routes/route-yeni")).toMatchObject({ authorUid: "user-a", saveCount: 1 });
    expect(h.store.get("users/user-a/savedRoutes/route-yeni")).toMatchObject({ routeId: "route-yeni", savedAt: SERVER_TS });
  });

  it("başkasının AÇIK rotasını kendi rotasını oluşturmadan kaydeder ve sayacı artırır", async () => {
    seedPublishedRoute("route-public", "user-b", "public", 4);
    await saveRouteReference("user-a", routeFixture("route-public"));

    expect(h.store.get("routes/route-public")).toMatchObject({ authorUid: "user-b", saveCount: 5, createdAt: "TS-1" });
    expect(h.store.get("users/user-a/savedRoutes/route-public")).toBeDefined();
  });

  it("aynı rota ikinci kez kaydedilmez; sayaç çift artmaz (idempotent)", async () => {
    const route = routeFixture("route-yeni");
    await saveRouteReference("user-a", route);
    await saveRouteReference("user-a", route);
    expect(h.store.get("routes/route-yeni")).toMatchObject({ saveCount: 1 });
  });

  it("başkasının PRIVATE rotası referans bahanesiyle ezilmez", async () => {
    seedPublishedRoute("route-gizli", "user-b", "private", 2, "TS-B");
    await expect(saveRouteReference("user-a", routeFixture("route-gizli"))).rejects.toThrow();
    expect(h.store.get("routes/route-gizli")).toMatchObject({ authorUid: "user-b", saveCount: 2, createdAt: "TS-B" });
    expect(h.store.get("users/user-a/savedRoutes/route-gizli")).toBeUndefined();
  });

  it("hata mesajı başarısız AŞAMAYI adıyla söyler", async () => {
    seedPublishedRoute("route-gizli", "user-b", "private");
    const failure = await saveRouteReference("user-a", routeFixture("route-gizli")).catch((error: unknown) => error);
    expect((failure as { stage?: string }).stage).toBe("route/create");
    expect((failure as { code?: string }).code).toBe("permission-denied");
    expect((failure as Error).message).toMatch(/rota oluşturulurken|başka bir kayda ait/);
  });
});

describe("kayıt kaldırma ve orphan referanslar", () => {
  it("removeSavedRoute referansı siler ve sayacı 1 düşürür", async () => {
    seedPublishedRoute("route-public", "user-b", "public", 5);
    await saveRouteReference("user-a", routeFixture("route-public"));
    expect(h.store.get("routes/route-public")).toMatchObject({ saveCount: 6 });

    await removeSavedRoute("user-a", "route-public");
    expect(h.store.get("users/user-a/savedRoutes/route-public")).toBeUndefined();
    expect(h.store.get("routes/route-public")).toMatchObject({ saveCount: 5 });
  });

  it("rota belgesi silinmişse orphan referans yine tek dokunuşla kaldırılır", async () => {
    h.store.set("users/user-a/savedRoutes/route-hayalet", { routeId: "route-hayalet", savedAt: SERVER_TS });
    await expect(removeSavedRoute("user-a", "route-hayalet")).resolves.toBeUndefined();
    expect(h.store.get("users/user-a/savedRoutes/route-hayalet")).toBeUndefined();
  });

  it("removeRouteFromLibrary kendi rotasını ve referansını birlikte siler", async () => {
    await saveRouteReference("user-a", routeFixture("route-mine"));
    await removeRouteFromLibrary("user-a", "route-mine");
    expect(h.store.get("routes/route-mine")).toBeUndefined();
    expect(h.store.get("users/user-a/savedRoutes/route-mine")).toBeUndefined();
  });

  it("removeRouteFromLibrary başkasının rotasını SİLMEZ, yalnız kendi referansını kaldırır", async () => {
    seedPublishedRoute("route-public", "user-b", "public", 9);
    await saveRouteReference("user-a", routeFixture("route-public"));
    await removeRouteFromLibrary("user-a", "route-public");
    expect(h.store.get("routes/route-public")).toMatchObject({ authorUid: "user-b", saveCount: 9 });
    expect(h.store.get("users/user-a/savedRoutes/route-public")).toBeUndefined();
  });
});

describe("Kayıtlarım: hata kaynağı sekme bazında ayrılır, tek hata tüm listeyi çökertmez", () => {
  it("silinmiş bir rota referansı listeyi öldürmez; kalan rotalar gelir", async () => {
    // route-saglam okunabilir (public), route-hayalet belge yok → permission-denied.
    seedPublishedRoute("route-saglam", "user-b", "public", 1);
    h.store.set("users/user-a/savedRoutes/route-saglam", { routeId: "route-saglam", savedAt: SERVER_TS });
    h.store.set("users/user-a/savedRoutes/route-hayalet", { routeId: "route-hayalet", savedAt: SERVER_TS });

    const snapshots: Array<{ places: unknown[]; routes: AtlasRoute[] }> = [];
    const sources: string[] = [];
    subscribeSavedCollections("user-a", (snapshot) => snapshots.push(snapshot), (_failure, source) => sources.push(source));

    // Bekle: routes dinleyicisi async.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(snapshots.length).toBeGreaterThan(0);
    const last = snapshots.at(-1)!;
    expect(last.routes.map((route) => route.id)).toEqual(["route-saglam"]);
    // Detay hatası kaynak adıyla raporlanır, ölümcül liste hatasıyla karışmaz.
    expect(sources).toContain("saved-routes/detail");
    expect(sources).not.toContain("saved-routes");
  });

  it("başka kullanıcının savedPlaces koleksiyonu dinlenemez; hata 'saved-places' kaynağıyla gelir", () => {
    const sources: string[] = [];
    subscribeSavedCollections("user-b", () => {}, (_failure, source) => sources.push(source));
    expect(sources).toContain("saved-places");
    expect(sources).toContain("saved-routes");
  });

  it("public rota listesi ve özel iz listesi ayrı aşama etiketi taşır", async () => {
    seedPublishedRoute("route-public", "user-b", "public", 2);
    seedPublishedRoute("route-private", "user-b", "private", 0);
    const publicRoutes = await listPublicRoutes();
    expect(publicRoutes.map((item) => item.route.id)).toEqual(["route-public"]);
    expect(publicRoutes[0].saveCount).toBe(2);

    h.auth.uid = "user-c";
    const failure = await listOwnedTracks("user-c").then(() => null).catch((error: unknown) => error);
    expect(failure).toBeNull(); // kendi iz sorgusu boş döner, hata değildir
  });

  it("izin hatası gerçek bir yetki sorununda genuine=true olarak sınıflanır", async () => {
    seedPublishedRoute("route-gizli", "user-b", "private");
    const failure = await saveRouteReference("user-a", routeFixture("route-gizli"))
      .catch((error: unknown) => error) as { genuinePermissionProblem?: boolean; code?: string };
    expect(failure.code).toBe("permission-denied");
    expect(failure.genuinePermissionProblem).toBe(true);
  });
});
