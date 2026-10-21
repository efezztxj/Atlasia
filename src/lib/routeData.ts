import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type DocumentReference,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { isPermissionDenied, withoutUndefined } from "./firestoreValue";
import type { AtlasRoute, AtlasTrack, Place, RouteLeg, RouteVisibility } from "../types";
import { decodePolyline, encodePolyline } from "../utils/polyline";

const SAVED_PAGE_SIZE = 100;
const ROUTE_PAGE_SIZE = 40;

export interface SavedCollectionSnapshot {
  places: Place[];
  routes: AtlasRoute[];
}

export interface PublicRouteRecord {
  route: AtlasRoute;
  authorUid: string;
  saveCount: number;
}

/**
 * Firestore iç içe dizileri (dizi içinde dizi) desteklemez. `RouteLeg.coords`
 * `[lng, lat][]` olduğu için bacaklar yazılırken koordinatlar encoded polyline
 * metnine çevrilir, okunurken geri açılır. Bacaksız rotalar aynen kalır.
 */
type StoredLeg = Omit<RouteLeg, "coords"> & { coordsPolyline: string };

export function toFirestoreRoute(route: AtlasRoute): Record<string, unknown> {
  const days = route.days.map((day) => {
    if (!day.legs) return day;
    const legs: StoredLeg[] = day.legs.map(({ coords, ...leg }) => ({ ...leg, coordsPolyline: encodePolyline(coords) }));
    return { ...day, legs };
  });
  return withoutUndefined({ ...route, id: route.id, days }) as unknown as Record<string, unknown>;
}

export function fromFirestoreRoute(raw: unknown): AtlasRoute | null {
  if (!raw || typeof raw !== "object") return null;
  const route = raw as AtlasRoute;
  if (!Array.isArray(route.days)) return route;
  const days = route.days.map((day) => {
    if (!Array.isArray(day.legs)) return day;
    const legs = (day.legs as Array<RouteLeg & { coordsPolyline?: unknown }>).map((leg) => {
      if (Array.isArray(leg.coords)) return leg;
      const { coordsPolyline, ...rest } = leg;
      return { ...rest, coords: typeof coordsPolyline === "string" ? decodePolyline(coordsPolyline) : [] } as RouteLeg;
    });
    return { ...day, legs };
  });
  return { ...route, days };
}

/**
 * `routes/{id}` kuralları `resource.data` okur. Belge yoksa `resource` null olur ve
 * Firestore okumayı `permission-denied` ile reddeder; başkasının özel rotası da aynı
 * cevabı verir. Bu iki durumda "bu hesap için okunabilir rota yok" (null) döner,
 * diğer hatalar aynen yükselir. Kurallar gevşetilmez.
 */
async function readRouteIfVisible(ref: DocumentReference): Promise<DocumentSnapshot | null> {
  try {
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot : null;
  } catch (failure) {
    if (isPermissionDenied(failure)) return null;
    throw failure;
  }
}

function routeWriteError(failure: unknown): Error {
  const message = isPermissionDenied(failure)
    ? "Rota kaydedilemedi: bu rota için yazma iznin yok. Rota başka bir hesaba ait olabilir; bulut (e-posta) hesabıyla giriş yaptığını da kontrol et."
    : failure instanceof Error && failure.message
      ? failure.message
      : "Rota kaydedilemedi. Bağlantını kontrol edip tekrar dene.";
  return Object.assign(new Error(message), { cause: failure });
}

export function subscribeSavedCollections(
  uid: string,
  onChange: (snapshot: SavedCollectionSnapshot) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const firestore = db;
  let places: Place[] = [];
  let routes: AtlasRoute[] = [];
  let placesReady = false;
  let routesReady = false;
  const emit = () => { if (placesReady && routesReady) onChange({ places, routes }); };
  const placesQuery = query(collection(db, "users", uid, "savedPlaces"), limit(SAVED_PAGE_SIZE));
  const routesQuery = query(collection(db, "users", uid, "savedRoutes"), limit(SAVED_PAGE_SIZE));
  const stopPlaces = onSnapshot(placesQuery, (snapshot) => {
    places = snapshot.docs.flatMap((item) => {
      const value = item.data().place;
      return value && typeof value === "object" ? [value as Place] : [];
    });
    placesReady = true;
    emit();
  }, onError);
  const stopRoutes = onSnapshot(routesQuery, async (snapshot) => {
    try {
      const found = await Promise.all(snapshot.docs.map(async (saved) => {
        // Sahibi silmiş ya da özele çekmiş rota tüm koleksiyonu düşürmesin; yalnız atlanır.
        const routeSnapshot = await readRouteIfVisible(doc(firestore, "routes", saved.id));
        const data = routeSnapshot?.data();
        if (!data) return null;
        return fromFirestoreRoute(data.route);
      }));
      routes = found.filter((route): route is AtlasRoute => route !== null);
      routesReady = true;
      emit();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Kayıtlı rotalar yüklenemedi."));
    }
  }, onError);
  return () => { stopPlaces(); stopRoutes(); };
}

export async function toggleSavedPlace(uid: string, place: Place): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const ref = doc(db, "users", uid, "savedPlaces", place.id);
  const existing = await getDoc(ref);
  if (existing.exists()) await deleteDoc(ref);
  else await setDoc(ref, { place: withoutUndefined(place), savedAt: serverTimestamp() });
}

export async function saveRouteReference(uid: string, route: AtlasRoute): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const firestore = db;
  const savedRef = doc(firestore, "users", uid, "savedRoutes", route.id);
  const routeRef = doc(firestore, "routes", route.id);
  const published = await readRouteIfVisible(routeRef);
  if (!published) await publishRoute(uid, route, "private");
  try {
    await runTransaction(firestore, async (transaction) => {
      const saved = await transaction.get(savedRef);
      if (saved.exists()) return;
      const currentRoute = await transaction.get(routeRef);
      if (!currentRoute.exists()) throw new Error("Rota kaydı bulunamadı; yeniden yayınlamayı dene.");
      const saveCount = currentRoute.data().saveCount;
      if (typeof saveCount !== "number" || !Number.isInteger(saveCount) || saveCount < 0) {
        throw new Error("Rota kayıt sayacı geçersiz.");
      }
      transaction.set(savedRef, { routeId: route.id, savedAt: serverTimestamp() });
      transaction.update(routeRef, { saveCount: saveCount + 1, updatedAt: serverTimestamp() });
    });
  } catch (failure) {
    if (isPermissionDenied(failure)) throw routeWriteError(failure);
    throw failure;
  }
}

export async function removeSavedRoute(uid: string, routeId: string): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const firestore = db;
  const savedRef = doc(firestore, "users", uid, "savedRoutes", routeId);
  const routeRef = doc(firestore, "routes", routeId);
  try {
    await runTransaction(firestore, async (transaction) => {
      const saved = await transaction.get(savedRef);
      if (!saved.exists()) return;
      transaction.delete(savedRef);
      transaction.update(routeRef, { saveCount: increment(-1), updatedAt: serverTimestamp() });
    });
  } catch (failure) {
    const code = failure && typeof failure === "object" && "code" in failure && typeof failure.code === "string"
      ? failure.code
      : "";
    if (code !== "not-found") throw failure;
    // Route sahibi dokümanı silmiş olabilir; orphan kayıt yine tek dokunuşla kaldırılabilir.
    await deleteDoc(savedRef);
  }
}

export async function removeRouteFromLibrary(uid: string, routeId: string): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const firestore = db;
  const routeRef = doc(firestore, "routes", routeId);
  try {
    const published = await getDoc(routeRef);
    if (published.exists() && published.data().authorUid === uid) {
      const savedRef = doc(firestore, "users", uid, "savedRoutes", routeId);
      await runTransaction(firestore, async (transaction) => {
        const currentRoute = await transaction.get(routeRef);
        if (!currentRoute.exists() || currentRoute.data().authorUid !== uid) {
          throw new Error("Rota sahipliği değişti; silme yapılmadı.");
        }
        const saved = await transaction.get(savedRef);
        transaction.delete(routeRef);
        if (saved.exists()) transaction.delete(savedRef);
      });
      return;
    }
  } catch (failure) {
    const code = failure && typeof failure === "object" && "code" in failure && typeof failure.code === "string"
      ? failure.code
      : "";
    if (code !== "permission-denied") throw failure;
  }
  await removeSavedRoute(uid, routeId);
}

export async function publishRoute(uid: string, route: AtlasRoute, visibility: RouteVisibility): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const ref = doc(db, "routes", route.id);
  const existing = await readRouteIfVisible(ref);
  const existingData = existing?.data();
  const routeData = toFirestoreRoute(route);
  try {
    await setDoc(ref, {
      authorUid: uid,
      visibility,
      route: routeData,
      saveCount: existingData && typeof existingData.saveCount === "number" ? existingData.saveCount : 0,
      createdAt: existingData ? existingData.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: false });
  } catch (failure) {
    throw routeWriteError(failure);
  }
}

export async function getPublishedRoute(routeId: string): Promise<{ route: AtlasRoute; authorUid: string; visibility: RouteVisibility } | null> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  // Silinmiş, hiç olmamış veya başkasının özel rotası: hepsi "açılamaz" (null).
  const snapshot = await readRouteIfVisible(doc(db, "routes", routeId));
  if (!snapshot) return null;
  const data = snapshot.data();
  if (!data) return null;
  const route = fromFirestoreRoute(data.route);
  if (!route) return null;
  return { route, authorUid: data.authorUid as string, visibility: data.visibility as RouteVisibility };
}

export async function listPublicRoutes(): Promise<PublicRouteRecord[]> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const snapshot = await getDocs(query(
    collection(db, "routes"), where("visibility", "==", "public"), limit(ROUTE_PAGE_SIZE),
  ));
  return snapshot.docs.flatMap((item) => {
    const data = item.data();
    const route = fromFirestoreRoute(data.route);
    if (!route) return [];
    return [{
      route,
      authorUid: typeof data.authorUid === "string" ? data.authorUid : "",
      saveCount: typeof data.saveCount === "number" ? data.saveCount : 0,
    }];
  }).sort((left, right) => right.saveCount - left.saveCount);
}

export async function listOwnedTracks(uid: string): Promise<AtlasTrack[]> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const snapshot = await getDocs(query(
    collection(db, "tracks"), where("authorUid", "==", uid), limit(100),
  ));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as AtlasTrack));
}

export async function createTrack(uid: string, track: AtlasTrack): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  try {
    await setDoc(doc(db, "tracks", track.id), {
      ...withoutUndefined(track),
      authorUid: uid,
      createdAt: serverTimestamp(),
    });
  } catch (failure) {
    // Ham Firebase mesajını kullanıcıya basma; izin reddi (cihaz hesabı veya
    // uyumsuz oturum) ile diğer hata türlerini birbirinden ayır.
    const code = (failure as { code?: string })?.code;
    const message = code === "permission-denied"
      ? "Buluta kaydetme izni reddedildi. Yürüyüş kaydı için bulut (e-posta) hesabıyla giriş yaptığını kontrol et."
      : "İz buluta kaydedilemedi. Bağlantını kontrol edip tekrar dene.";
    throw Object.assign(new Error(message), { cause: failure });
  }
}

export async function deleteTrack(trackId: string): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  await deleteDoc(doc(db, "tracks", trackId));
}
