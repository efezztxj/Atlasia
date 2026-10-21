/**
 * P16 — rota/track veri katmanı IO karakterizasyonu.
 *
 * Sahte Firestore; sorgu filtre/limiti, increment ve transaction atomikliğini
 * de uygular. Özellikle sayaç tutarlılığı, sahiplik yarışı ve orphan kayıt
 * temizliği gerçek üretim fonksiyonlarıyla kilitlenir.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const stats = { unsubscribes: 0 };

  const isIncrement = (value: unknown): value is { __increment: number } =>
    Boolean(
      value &&
        typeof value === "object" &&
        "__increment" in value &&
        typeof (value as { __increment: unknown }).__increment === "number",
    );

  const mergeUpdate = (
    current: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Record<string, unknown> => {
    const next = { ...current };
    Object.entries(data).forEach(([field, value]) => {
      next[field] = isIncrement(value)
        ? (typeof current[field] === "number" ? current[field] : 0) + value.__increment
        : value;
    });
    return next;
  };

  const snapshotOf = (
    source: Map<string, Record<string, unknown>>,
    path: string,
    dataOverride?: Record<string, unknown>,
  ) => ({
    id: path.split("/").at(-1) ?? "",
    exists: () => dataOverride !== undefined || source.has(path),
    data: () => dataOverride ?? source.get(path),
    ref: { path },
  });

  const docsFor = (
    path: string,
    constraints: Array<{ field?: string; value?: unknown; limit?: number }> = [],
  ) => {
    let docs = [...store.entries()]
      .filter(([key]) => key.startsWith(`${path}/`))
      .filter(([key]) => key.slice(path.length + 1).split("/").length === 1)
      .map(([key, data]) => ({ id: key.slice(path.length + 1), ref: { path: key }, data: () => data }));
    const filters = constraints.filter((item) => typeof item.field === "string");
    docs = docs.filter((item) => filters.every((filter) => item.data()[filter.field!] === filter.value));
    const limit = constraints.find((item) => typeof item.limit === "number")?.limit;
    return typeof limit === "number" ? docs.slice(0, limit) : docs;
  };

  const findUndefined = (value: unknown, path = ""): string | null => {
    if (value === undefined) return path || "(kök)";
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const found = findUndefined(value[index], `${path}[${index}]`);
        if (found) return found;
      }
      return null;
    }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        const found = findUndefined(item, path ? `${path}.${key}` : key);
        if (found) return found;
      }
    }
    return null;
  };

  // Gerçek SDK: "Nested arrays are not supported" — dizi içinde dizi yazılamaz.
  const findNestedArray = (value: unknown, path = "", inArray = false): string | null => {
    if (Array.isArray(value)) {
      if (inArray) return path || "(kök)";
      for (let index = 0; index < value.length; index += 1) {
        const found = findNestedArray(value[index], `${path}[${index}]`, true);
        if (found) return found;
      }
      return null;
    }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        const found = findNestedArray(item, path ? `${path}.${key}` : key, false);
        if (found) return found;
      }
    }
    return null;
  };

  return { store, stats, mergeUpdate, snapshotOf, docsFor, findUndefined, findNestedArray };
});

vi.mock("./firebase", () => ({ db: {}, firebaseApp: {}, firebaseConfigured: true, isCloudReady: true }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  query: (
    target: { path: string },
    ...constraints: Array<{ field?: string; value?: unknown; limit?: number }>
  ) => ({ path: target.path, constraints }),
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  limit: (value: number) => ({ limit: value }),
  orderBy: () => ({}),
  serverTimestamp: () => "SERVER_TS",
  increment: (value: number) => ({ __increment: value }),
  getDoc: async (docRef: { path: string }) => {
    if (docRef.path.endsWith("/gizli-route")) {
      throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    }
    if (docRef.path.endsWith("/hata-get")) {
      throw Object.assign(new Error("Firestore okuma hatası"), { code: "unavailable" });
    }
    // Gerçek kurallar: routes/{id} get kuralı resource.data okur; belge yoksa
    // resource null olduğundan okuma permission-denied ile reddedilir.
    if (docRef.path.startsWith("routes/") && !h.store.has(docRef.path)) {
      throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    }
    return h.snapshotOf(h.store, docRef.path);
  },
  getDocs: async (q: { path: string; constraints?: Array<{ field?: string; value?: unknown; limit?: number }> }) => {
    const docs = h.docsFor(q.path, q.constraints ?? []);
    return { size: docs.length, docs };
  },
  setDoc: async (docRef: { path: string }, data: Record<string, unknown>) => {
    if (docRef.path === "tracks/izin-hatasi" || docRef.path === "routes/izin-yok-yazma") {
      throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    }
    if (docRef.path === "tracks/ag-hatasi") {
      throw Object.assign(new Error("Backend unavailable"), { code: "unavailable" });
    }
    // Gerçek SDK gibi: herhangi bir derinlikte undefined alan yazımı reddedilir.
    const undefinedPath = h.findUndefined(data);
    if (undefinedPath) {
      throw new Error(`Function setDoc() called with invalid data. Unsupported field value: undefined (found in field ${undefinedPath})`);
    }
    const nestedPath = h.findNestedArray(data);
    if (nestedPath) {
      throw new Error(`Function setDoc() called with invalid data. Nested arrays are not supported (found in field ${nestedPath})`);
    }
    h.store.set(docRef.path, data);
  },
  deleteDoc: async (docRef: { path: string }) => {
    h.store.delete(docRef.path);
  },
  runTransaction: async (
    _db: unknown,
    callback: (transaction: {
      get: (docRef: { path: string }) => Promise<ReturnType<typeof h.snapshotOf>>;
      set: (docRef: { path: string }, data: Record<string, unknown>) => void;
      update: (docRef: { path: string }, data: Record<string, unknown>) => void;
      delete: (docRef: { path: string }) => void;
    }) => Promise<unknown>,
  ) => {
    const txStore = new Map(h.store);
    const transaction = {
      get: async (docRef: { path: string }) => {
        if (docRef.path === "routes/yaris-route") {
          return h.snapshotOf(txStore, docRef.path, {
            ...(txStore.get(docRef.path) ?? {}),
            authorUid: "baskasi",
          });
        }
        return h.snapshotOf(txStore, docRef.path);
      },
      set: (docRef: { path: string }, data: Record<string, unknown>) => {
        txStore.set(docRef.path, data);
      },
      update: (docRef: { path: string }, data: Record<string, unknown>) => {
        const current = txStore.get(docRef.path);
        if (!current) {
          throw Object.assign(new Error("No document to update."), { code: "not-found" });
        }
        txStore.set(docRef.path, h.mergeUpdate(current, data));
      },
      delete: (docRef: { path: string }) => {
        txStore.delete(docRef.path);
      },
    };
    const result = await callback(transaction);
    h.store.clear();
    txStore.forEach((value, key) => h.store.set(key, value));
    return result;
  },
  onSnapshot: (
    q: { path: string; constraints?: Array<{ field?: string; value?: unknown; limit?: number }> },
    onChange: (snapshot: { docs: ReturnType<typeof h.docsFor> }) => unknown,
  ) => {
    void onChange({ docs: h.docsFor(q.path, q.constraints ?? []) });
    return () => {
      h.stats.unsubscribes += 1;
    };
  },
}));

import type { AtlasRoute, AtlasTrack, Place } from "../types";
import { buildTrackDraft, recordDwellPoint, type DwellState } from "../utils/track";
import { resolveTrackShare, routeLeaksRawTrack } from "../utils/trackPrivacy";
import {
  createTrack,
  deleteTrack,
  getPublishedRoute,
  listOwnedTracks,
  listPublicRoutes,
  publishRoute,
  removeRouteFromLibrary,
  removeSavedRoute,
  saveRouteReference,
  subscribeSavedCollections,
  toggleSavedPlace,
  type SavedCollectionSnapshot,
} from "./routeData";

const yer = (id: string): Place => ({
  id,
  title: `Yer ${id}`,
  region: "İzmir",
  category: "history",
  lng: 27.14,
  lat: 38.42,
  note: "Şğİı karakterli not",
  author: "efe",
  kind: "user",
});

const rota = (id: string): AtlasRoute => ({
  id,
  routeTitle: `Rota ${id}`,
  routeSummary: "Özet",
  totalDurationHours: 3,
  totalDistanceKm: 12.5,
  transport: "walking",
  vibe: "sakin",
  days: [],
  weatherNote: null,
  alternatives: [],
  createdAt: 42,
});

const iz = (id: string): AtlasTrack => ({
  id,
  authorUid: "eski-yazar",
  startedAt: 1_000,
  endedAt: 2_000,
  distanceKm: 4.2,
  polyline: "abc",
  stops: [],
  accuracy: { sampleCount: 3, meanMeters: 5, maxMeters: 9 },
  createdAt: 777,
});

const rotaBelgesi = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  authorUid: "yazar-1",
  visibility: "private",
  route: rota(id),
  saveCount: 0,
  createdAt: 111,
  updatedAt: 222,
  ...extra,
});

beforeEach(() => {
  h.store.clear();
  h.stats.unsubscribes = 0;
});

describe("routeData kayıtlı koleksiyon aboneliği", () => {
  it("iki alt koleksiyon hazır olunca geçerli yer/rota çiftini tek snapshot verir", async () => {
    h.store.set("users/u1/savedPlaces/p1", { place: yer("p1") });
    h.store.set("users/u1/savedPlaces/bozuk", { place: "nesne değil" });
    h.store.set("users/u1/savedRoutes/r1", { routeId: "r1" });
    h.store.set("users/u1/savedRoutes/kayip", { routeId: "kayip" });
    h.store.set("users/u1/savedRoutes/bozuk", { routeId: "bozuk" });
    h.store.set("routes/r1", rotaBelgesi("r1"));
    h.store.set("routes/bozuk", { route: "nesne değil" });

    const snapshots: SavedCollectionSnapshot[] = [];
    const errors: Error[] = [];
    const unsubscribe = subscribeSavedCollections(
      "u1",
      (snapshot) => snapshots.push(snapshot),
      (error) => errors.push(error),
    );

    await vi.waitFor(() => expect(snapshots).toHaveLength(1));
    expect(errors).toEqual([]);
    expect(snapshots[0].places.map((item) => item.id)).toEqual(["p1"]);
    expect(snapshots[0].routes.map((item) => item.id)).toEqual(["r1"]);
    unsubscribe();
    expect(h.stats.unsubscribes).toBe(2);
  });

  it("rota belgesi okunamazsa hatayı onError'a taşır, yarım koleksiyon yayınlamaz", async () => {
    h.store.set("users/u1/savedPlaces/p1", { place: yer("p1") });
    h.store.set("users/u1/savedRoutes/hata-get", { routeId: "hata-get" });

    const snapshots: SavedCollectionSnapshot[] = [];
    const errors: Error[] = [];
    subscribeSavedCollections(
      "u1",
      (snapshot) => snapshots.push(snapshot),
      (error) => errors.push(error),
    );

    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0].message).toBe("Firestore okuma hatası");
    expect(snapshots).toEqual([]);
  });
});

describe("routeData kayıt/yayın yazımları", () => {
  it("toggleSavedPlace ilk dokunuşta yazar, ikinci dokunuşta kaldırır", async () => {
    const place = yer("p1");

    await toggleSavedPlace("u1", place);
    expect(h.store.get("users/u1/savedPlaces/p1")).toEqual({ place, savedAt: "SERVER_TS" });

    await toggleSavedPlace("u1", place);
    expect(h.store.has("users/u1/savedPlaces/p1")).toBe(false);
  });

  it("publishRoute yeni rotada sayaç/zamanları başlatır; güncellerken geçerli sayacı ve createdAt'i korur", async () => {
    const route = rota("r-yeni");

    await publishRoute("yazar-9", route, "unlisted");
    expect(h.store.get("routes/r-yeni")).toEqual({
      authorUid: "yazar-9",
      visibility: "unlisted",
      route,
      saveCount: 0,
      createdAt: "SERVER_TS",
      updatedAt: "SERVER_TS",
    });

    h.store.set("routes/r-eski", { saveCount: 7, createdAt: 111, route: rota("r-eski") });
    await publishRoute("yazar-9", rota("r-eski"), "public");
    expect(h.store.get("routes/r-eski")).toMatchObject({
      authorUid: "yazar-9",
      visibility: "public",
      saveCount: 7,
      createdAt: 111,
      updatedAt: "SERVER_TS",
    });

    h.store.set("routes/r-bozuk-sayac", { saveCount: "çok", createdAt: "eski-zaman", route: rota("r-bozuk-sayac") });
    await publishRoute("yazar-9", rota("r-bozuk-sayac"), "private");
    expect(h.store.get("routes/r-bozuk-sayac")).toMatchObject({
      saveCount: 0,
      createdAt: "eski-zaman",
    });
  });

  it("saveRouteReference yayınlanmamış rotayı önce private yayımlar, sonra sayacı 1 yapar", async () => {
    const route = rota("r1");

    await saveRouteReference("okuyucu-1", route);

    expect(h.store.get("routes/r1")).toMatchObject({
      authorUid: "okuyucu-1",
      visibility: "private",
      saveCount: 1,
    });
    expect(h.store.get("users/okuyucu-1/savedRoutes/r1")).toEqual({
      routeId: "r1",
      savedAt: "SERVER_TS",
    });
  });

  it("saveRouteReference zaten kayıtlıysa sayacı ikinci kez artırmaz", async () => {
    h.store.set("routes/r1", rotaBelgesi("r1", { saveCount: 4 }));
    h.store.set("users/u1/savedRoutes/r1", { routeId: "r1", savedAt: 10, marker: "dokunma" });

    await saveRouteReference("u1", rota("r1"));

    expect(h.store.get("routes/r1")?.saveCount).toBe(4);
    expect(h.store.get("users/u1/savedRoutes/r1")).toMatchObject({ marker: "dokunma", savedAt: 10 });
  });

  it("saveRouteReference geçersiz sayaçta kayıt yazmadan reddeder", async () => {
    h.store.set("routes/r1", rotaBelgesi("r1", { saveCount: 1.5 }));

    await expect(saveRouteReference("u1", rota("r1"))).rejects.toThrow(
      "Rota kayıt sayacı geçersiz.",
    );
    expect(h.store.has("users/u1/savedRoutes/r1")).toBe(false);
    expect(h.store.get("routes/r1")?.saveCount).toBe(1.5);
  });

  it("removeSavedRoute kaydı kaldırıp sayacı bir azaltır; kayıt yoksa dokunmaz", async () => {
    h.store.set("routes/r1", rotaBelgesi("r1", { saveCount: 3 }));
    h.store.set("users/u1/savedRoutes/r1", { routeId: "r1" });

    await removeSavedRoute("u1", "r1");
    expect(h.store.has("users/u1/savedRoutes/r1")).toBe(false);
    expect(h.store.get("routes/r1")).toMatchObject({ saveCount: 2, updatedAt: "SERVER_TS" });

    await removeSavedRoute("u1", "r1");
    expect(h.store.get("routes/r1")?.saveCount).toBe(2);
  });

  it("removeSavedRoute ana rota silinmişse orphan kaydı yine kaldırır", async () => {
    h.store.set("users/u1/savedRoutes/r-kayip", { routeId: "r-kayip" });

    await expect(removeSavedRoute("u1", "r-kayip")).resolves.toBeUndefined();
    expect(h.store.has("users/u1/savedRoutes/r-kayip")).toBe(false);
  });

  it("removeRouteFromLibrary sahibin rotasını ve kendi kaydını birlikte siler", async () => {
    h.store.set("routes/r1", rotaBelgesi("r1", { authorUid: "u1", saveCount: 9 }));
    h.store.set("users/u1/savedRoutes/r1", { routeId: "r1" });

    await removeRouteFromLibrary("u1", "r1");

    expect(h.store.has("routes/r1")).toBe(false);
    expect(h.store.has("users/u1/savedRoutes/r1")).toBe(false);
  });

  it("removeRouteFromLibrary başkasının rotasında yalnız kaydı/sayacı düşürür", async () => {
    h.store.set("routes/r1", rotaBelgesi("r1", { authorUid: "yazar-2", saveCount: 3 }));
    h.store.set("users/u1/savedRoutes/r1", { routeId: "r1" });

    await removeRouteFromLibrary("u1", "r1");

    expect(h.store.has("routes/r1")).toBe(true);
    expect(h.store.get("routes/r1")?.saveCount).toBe(2);
    expect(h.store.has("users/u1/savedRoutes/r1")).toBe(false);
  });

  it("removeRouteFromLibrary sahiplik transaction içinde değişmişse silme yapmaz", async () => {
    h.store.set("routes/yaris-route", rotaBelgesi("yaris-route", { authorUid: "u1", saveCount: 5 }));
    h.store.set("users/u1/savedRoutes/yaris-route", { routeId: "yaris-route" });

    await expect(removeRouteFromLibrary("u1", "yaris-route")).rejects.toThrow(
      "Rota sahipliği değişti; silme yapılmadı.",
    );
    expect(h.store.has("routes/yaris-route")).toBe(true);
    expect(h.store.has("users/u1/savedRoutes/yaris-route")).toBe(true);
  });

  it("removeRouteFromLibrary permission-denied'da güvenli kayıt kaldırma yoluna düşer", async () => {
    h.store.set("routes/gizli-route", rotaBelgesi("gizli-route", { authorUid: "yazar-2", saveCount: 4 }));
    h.store.set("users/u1/savedRoutes/gizli-route", { routeId: "gizli-route" });

    await removeRouteFromLibrary("u1", "gizli-route");

    expect(h.store.has("routes/gizli-route")).toBe(true);
    expect(h.store.get("routes/gizli-route")?.saveCount).toBe(3);
    expect(h.store.has("users/u1/savedRoutes/gizli-route")).toBe(false);
  });
});

describe("routeData üretim regresyonları (2026-10-21)", () => {
  it("toggleSavedPlace undefined isteğe bağlı alanları (place.image) ayıklayarak yazar", async () => {
    const place: Place = { ...yer("p-mvi5ljx2-09z6"), image: undefined, gallery: ["a.jpg", undefined as unknown as string] };

    await expect(toggleSavedPlace("u1", place)).resolves.toBeUndefined();

    const written = h.store.get("users/u1/savedPlaces/p-mvi5ljx2-09z6") as { place: Record<string, unknown> };
    expect("image" in written.place).toBe(false);
    expect(written.place.gallery).toEqual(["a.jpg"]);
    expect(written.place.title).toBe("Yer p-mvi5ljx2-09z6");
    expect(place.image).toBeUndefined();
    expect("image" in place).toBe(true);
  });

  it("yürüyüş taslağı (durak yok, origin undefined) bağlantılı rota olarak yayınlanır ve kaydedilir", async () => {
    const draft: AtlasRoute = { ...rota("route-yuruyus"), totalDistanceKm: 0, origin: undefined };

    await publishRoute("u1", draft, "unlisted");
    await saveRouteReference("u1", draft);

    const stored = h.store.get("routes/route-yuruyus") as { route: Record<string, unknown>; visibility: string; saveCount: number };
    expect(stored.visibility).toBe("unlisted");
    expect("origin" in stored.route).toBe(false);
    expect(stored.saveCount).toBe(1);
    expect(h.store.get("users/u1/savedRoutes/route-yuruyus")).toEqual({ routeId: "route-yuruyus", savedAt: "SERVER_TS" });
  });

  it("P17 yürüyüş taslağı bacaklı (coords [lng,lat][]) olarak yayınlanır; okununca bacak geri açılır", async () => {
    const coords: [number, number][] = [[27.14, 38.42], [27.1412, 38.4207], [27.143, 38.4211]];
    const draft: AtlasRoute = {
      ...rota("route-bacakli"),
      days: [{
        dayNumber: 1,
        title: "Yürüyüş",
        summary: "Kayıt",
        stops: [],
        polyline: "x",
        legs: [{ id: "leg-1", coords, mode: "walking", distanceKm: 0.3, durationMinutes: 5 }],
      }],
    };

    await publishRoute("u1", draft, "private");

    const stored = h.store.get("routes/route-bacakli") as { route: { days: Array<{ legs: Array<Record<string, unknown>> }> } };
    expect("coords" in stored.route.days[0].legs[0]).toBe(false);
    expect(typeof stored.route.days[0].legs[0].coordsPolyline).toBe("string");

    const read = await getPublishedRoute("route-bacakli");
    expect(read?.route.days[0].legs?.[0]).toMatchObject({ id: "leg-1", mode: "walking", distanceKm: 0.3 });
    expect(read?.route.days[0].legs?.[0].coords).toEqual(coords);
    expect("coordsPolyline" in (read?.route.days[0].legs?.[0] ?? {})).toBe(false);
    expect(draft.days[0].legs?.[0].coords).toEqual(coords); // girdi mutasyona uğramaz
  });

  it("publishRoute yazma izni reddinde ham Firebase metni yerine Türkçe hata verir ve cause korur", async () => {
    const failure = (await publishRoute("u1", rota("izin-yok-yazma"), "public").catch((error: unknown) => error)) as Error & { cause?: { code?: string } };

    expect(failure.message).toContain("bu rota için yazma iznin yok");
    expect(failure.cause?.code).toBe("permission-denied");
  });

  it("kayıtlı rotalardan biri silinmiş/okunamazsa abonelik hata vermez, o rotayı atlar", async () => {
    h.store.set("users/u1/savedRoutes/r1", { routeId: "r1" });
    h.store.set("users/u1/savedRoutes/silinmis", { routeId: "silinmis" });
    h.store.set("routes/r1", rotaBelgesi("r1"));

    const snapshots: SavedCollectionSnapshot[] = [];
    const errors: Error[] = [];
    subscribeSavedCollections("u1", (snapshot) => snapshots.push(snapshot), (error) => errors.push(error));

    await vi.waitFor(() => expect(snapshots).toHaveLength(1));
    expect(errors).toEqual([]);
    expect(snapshots[0].routes.map((item) => item.id)).toEqual(["r1"]);
  });
});

describe("routeData okuma/listeler ve track işlemleri", () => {
  it("getPublishedRoute geçerli belgeyi açar; eksik/bozuk belgede null döner", async () => {
    const route = rota("r1");
    h.store.set("routes/r1", { route, authorUid: "yazar-1", visibility: "public" });
    h.store.set("routes/bozuk", { route: 42, authorUid: "yazar-1", visibility: "private" });

    await expect(getPublishedRoute("r1")).resolves.toEqual({
      route,
      authorUid: "yazar-1",
      visibility: "public",
    });
    await expect(getPublishedRoute("bozuk")).resolves.toBeNull();
    await expect(getPublishedRoute("yok")).resolves.toBeNull();
  });

  it("listPublicRoutes yalnız public geçerli rotaları saveCount azalan sıralar", async () => {
    h.store.set("routes/r1", rotaBelgesi("r1", { visibility: "public", saveCount: 2, authorUid: "a1" }));
    h.store.set("routes/r2", rotaBelgesi("r2", { visibility: "private", saveCount: 99 }));
    h.store.set("routes/r3", { visibility: "public", route: "bozuk", saveCount: 50 });
    h.store.set("routes/r4", { visibility: "public", route: rota("r4") });
    h.store.set("routes/r5", rotaBelgesi("r5", { visibility: "public", saveCount: 5, authorUid: "a5" }));

    const result = await listPublicRoutes();

    expect(result.map((item) => item.route.id)).toEqual(["r5", "r1", "r4"]);
    expect(result.at(-1)).toMatchObject({ authorUid: "", saveCount: 0 });
  });

  it("listOwnedTracks yalnız sahibin izlerini belge kimliğiyle döndürür", async () => {
    h.store.set("tracks/t1", { ...iz("yanlis-id"), authorUid: "u1" });
    h.store.set("tracks/t2", { ...iz("t2"), authorUid: "u2" });
    h.store.set("tracks/t3", { ...iz("t3"), authorUid: "u1" });

    const result = await listOwnedTracks("u1");

    expect(result.map((item) => item.id)).toEqual(["t1", "t3"]);
    expect(result.every((item) => item.authorUid === "u1")).toBe(true);
  });

  it("createTrack yazar kimliğini oturumla ve zamanı sunucuyla ezerek yazar; deleteTrack kaldırır", async () => {
    const track = iz("t1");

    await createTrack("u-yeni", track);
    expect(h.store.get("tracks/t1")).toMatchObject({
      id: "t1",
      authorUid: "u-yeni",
      polyline: "abc",
      createdAt: "SERVER_TS",
    });

    await deleteTrack("t1");
    expect(h.store.has("tracks/t1")).toBe(false);
  });

  it("createTrack izin ve diğer Firestore hatalarını cause korunarak Türkçeleştirir", async () => {
    const permissionError = (await createTrack("u1", iz("izin-hatasi")).catch(
      (error: unknown) => error,
    )) as Error & { cause?: { code?: string } };
    expect(permissionError.message).toContain("Buluta kaydetme izni reddedildi");
    expect(permissionError.cause?.code).toBe("permission-denied");

    const networkError = (await createTrack("u1", iz("ag-hatasi")).catch(
      (error: unknown) => error,
    )) as Error & { cause?: { code?: string } };
    expect(networkError.message).toContain("İz buluta kaydedilemedi");
    expect(networkError.cause?.code).toBe("unavailable");
    expect(h.store.size).toBe(0);
  });
});

describe("P17-Tur2 · yürüyüş taslağı yayın → geri okuma (uçtan uca)", () => {
  it("gerçek taslak yayınlanır, ham iz paylaşılmaz, bacaklar coordsPolyline ile geri açılır", async () => {
    // 1) Kayıttan taslak üret (ağ yok): iki nokta arası 5 dk yürüyüş + 4 dk mola.
    const points = [
      { lng: 27.14, lat: 38.42, accuracy: 5, timestamp: 1_700_000_000_000 },
      { lng: 27.14001, lat: 38.42001, accuracy: 5, timestamp: 1_700_000_060_000 },
      { lng: 27.14002, lat: 38.42, accuracy: 5, timestamp: 1_700_000_240_000 },
      { lng: 27.142, lat: 38.4206, accuracy: 5, timestamp: 1_700_000_300_000 },
      { lng: 27.144, lat: 38.4212, accuracy: 6, timestamp: 1_700_000_360_000 },
    ];
    const dwell = points.reduce(recordDwellPoint, { candidate: null, stops: [] } as DwellState);
    const { track, route } = buildTrackDraft({
      points,
      dwell,
      uid: "u1",
      trackId: "track-p17-uctan-uca",
      stopNames: ["Kordon"],
      now: 1_700_000_500_000,
    });

    // 2) Paylaşım kararı: ham iz değil, taslak rota.
    const decision = resolveTrackShare(route, { userInitiated: true, visibility: "unlisted", shareConsent: true });
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(routeLeaksRawTrack(decision.route)).toEqual([]);

    // 3) Yayınla + kayıt referansı (gerçek fonksiyonlar, sahte Firestore).
    await publishRoute("u1", decision.route, decision.visibility);
    await saveRouteReference("u1", decision.route);

    // 4) Belge ham iz taşımaz; bacaklar `coordsPolyline` metnine çevrilmiş.
    const stored = h.store.get(`routes/${route.id}`) as {
      route: { days: Array<{ legs?: Array<Record<string, unknown>>; stops: Array<Record<string, unknown>> }> };
      visibility: string;
      saveCount: number;
    };
    expect(stored.visibility).toBe("unlisted");
    expect(stored.saveCount).toBe(1);
    expect(stored.route.days[0].legs?.[0].coords).toBeUndefined();
    expect(typeof stored.route.days[0].legs?.[0].coordsPolyline).toBe("string");
    expect(routeLeaksRawTrack(stored.route)).toEqual([]);

    // 5) Geri oku: bacak koordinatları açılır ve yayınlanan geometriyle aynıdır.
    const read = await getPublishedRoute(route.id);
    expect(read?.route.id).toBe(route.id);
    expect(read?.route.days[0].legs?.[0].coords).toEqual(decision.route.days[0].legs?.[0].coords);
    expect(read?.route.days[0].legs?.[0].mode).toBe("walking");
    expect(read?.route.days[0].stops.map((stop) => stop.name)).toEqual(["Kordon"]);
    expect(track.stops).toHaveLength(1);
    // Ham iz koleksiyonuna hiçbir şey yazılmadı.
    expect([...h.store.keys()].some((key) => key.startsWith("tracks/"))).toBe(false);
  });
});
