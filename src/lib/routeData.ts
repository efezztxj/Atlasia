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
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  firestoreErrorCode,
  isNotFound,
  isPermissionDenied,
  stagedError,
} from "./firestoreErrors";
import type { AtlasRoute, AtlasTrack, Place, RouteVisibility } from "../types";

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
 * Kayıtlarım'ın hangi veri kaynağı hata verdi? Sekme bazlı ayrım için zorunlu:
 * tek bir ortak hata metni dört sekmenin hepsine yayılıyordu ve kullanıcı
 * "her sekme bozuk" sanıyordu.
 */
export type SavedCollectionSource =
  | "saved-places"
  | "saved-routes"
  | "saved-routes/detail";

export type SavedCollectionsErrorHandler = (error: Error, source: SavedCollectionSource) => void;

/**
 * Ön-okuma sonucu. Firestore'da **var olmayan** bir belgeyi okumak `not-found`
 * değil `permission-denied` üretir, çünkü `match /routes/{id}` içindeki
 * `allow get` kuralı `resource.data.visibility` alanına dokunur ve `resource`
 * null'dır. Yeni rota oluşturan herkes bu yüzden "Missing or insufficient
 * permissions" görüyordu.
 *
 * `denied` bu iki durumu ayırmaz — ayıramayız — ama doğru davranış aynıdır:
 * belgeyi yok say, yazmayı dene, **nihai kararı Firestore kuralları versin**.
 * Başkasına ait mevcut bir rota yazma denemesi `update` kuralından döner
 * (`authorUid` ve `createdAt` koruması), yani ezme riski yoktur.
 */
export interface ProbeResult {
  exists: boolean;
  data: DocumentData | null;
  /** Okuma kuralı reddetti: belge yok olabilir ya da bize kapalı olabilir. */
  denied: boolean;
}

/** Rota belgesini kural ihlali yaratmadan yoklar. `permission-denied` hata değildir. */
export async function probeRouteDocument(routeId: string): Promise<ProbeResult> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  try {
    const snapshot = await getDoc(doc(db, "routes", routeId));
    return { exists: snapshot.exists(), data: snapshot.exists() ? snapshot.data() : null, denied: false };
  } catch (failure) {
    if (isPermissionDenied(failure)) return { exists: false, data: null, denied: true };
    // Ağ/oturum hatası gibi gerçek sorunlar sessizce "yok" sayılmaz.
    throw stagedError(failure, "route/probe");
  }
}

/**
 * Yeni bir rota belgesi yazarken `saveCount: 0` ve `createdAt: serverTimestamp()`
 * gerekir (create kuralı). Mevcut kendi rotamızı güncellerken bu iki alan
 * KORUNMALIDIR (update kuralı), aksi halde sayaç sıfırlanır veya yazım reddedilir.
 */
function routePayload(uid: string, route: AtlasRoute, visibility: RouteVisibility, existing: DocumentData | null) {
  const routeData = { ...route, id: route.id };
  const existingCount = existing && typeof existing.saveCount === "number" ? existing.saveCount : null;
  return {
    authorUid: uid,
    visibility,
    route: routeData,
    saveCount: existingCount ?? 0,
    createdAt: existing && existing.createdAt !== undefined ? existing.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function subscribeSavedCollections(
  uid: string,
  onChange: (snapshot: SavedCollectionSnapshot) => void,
  onError: SavedCollectionsErrorHandler,
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
  }, (failure) => onError(stagedError(failure, "saved-places/subscribe"), "saved-places"));

  const stopRoutes = onSnapshot(routesQuery, async (snapshot) => {
    try {
      // Her referans AYRI okunur ve tekil hata listeyi çökertmez. Kaydı silinmiş
      // ya da sahibi tarafından private'a çekilmiş bir rota, `routes/{id}` get
      // kuralından `permission-denied` döner; eskiden bu tek hata tüm
      // "Kaydettiklerim" sekmesini boşaltıp izin hatası gösteriyordu.
      const found = await Promise.all(snapshot.docs.map(async (saved) => {
        try {
          const routeSnapshot = await getDoc(doc(firestore, "routes", saved.id));
          if (!routeSnapshot.exists()) return null;
          const data = routeSnapshot.data();
          if (!data.route || typeof data.route !== "object") return null;
          return data.route as AtlasRoute;
        } catch (detailFailure) {
          // Tek bir rota detayının okunamaması LİSTEYİ çökertmez; eskiden
          // Promise.all reddedildiği için "Kaydettiklerim" sekmesinin tamamı
          // "Missing or insufficient permissions" ile boşalıyordu.
          // Hata yine raporlanır (kaynak: saved-routes/detail) ama `route/probe`
          // aşamasında sınıflandığı için genuinePermissionProblem=false gelir ve
          // üst katman bunu kullanıcıya ölümcül hata olarak göstermez.
          onError(stagedError(detailFailure, "route/probe", false), "saved-routes/detail");
          return null;
        }
      }));
      routes = found.filter((route): route is AtlasRoute => route !== null);
      routesReady = true;
      emit();
    } catch (error) {
      onError(stagedError(error, "saved-routes/subscribe"), "saved-routes");
    }
  }, (failure) => onError(stagedError(failure, "saved-routes/subscribe"), "saved-routes"));

  return () => { stopPlaces(); stopRoutes(); };
}

export async function toggleSavedPlace(uid: string, place: Place): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const ref = doc(db, "users", uid, "savedPlaces", place.id);
  // `savedPlaces` alt koleksiyonu yalnız sahibine açıktır, bu yüzden ön-okuma
  // burada güvenlidir; yine de hata aşaması etiketlenir.
  const existing = await getDoc(ref).catch((failure) => {
    throw stagedError(failure, "saved-places/probe");
  });
  try {
    if (existing.exists()) await deleteDoc(ref);
    else await setDoc(ref, { place, savedAt: serverTimestamp() });
  } catch (failure) {
    throw stagedError(failure, "saved-places/write");
  }
}

/**
 * Rotayı kütüphaneye ekler. Akış:
 *   1. Rota belgesini yokla (reddedilirse "yok" say — kanıt: rules `allow get`).
 *   2. Belge yoksa sahibi olarak private yayınla. Başkasına aitse YAYINLAMA.
 *   3. Tek transaction'da referansı yaz ve sayacı +1 artır.
 *
 * Aşama 2 ile aşama 3 ayrı Firestore işlemleridir ve hata mesajı hangisinin
 * patladığını söyler.
 */
export async function saveRouteReference(uid: string, route: AtlasRoute): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const firestore = db;
  const savedRef = doc(firestore, "users", uid, "savedRoutes", route.id);
  const routeRef = doc(firestore, "routes", route.id);

  const probe = await probeRouteDocument(route.id);
  if (!probe.exists) {
    // Belge yok ya da bize kapalı. Kapalıysa create/update kuralı yazmayı
    // reddeder; böylece başkasının rotası ezilmez.
    await publishRoute(uid, route, "private");
  }

  try {
    await runTransaction(firestore, async (transaction) => {
      const saved = await transaction.get(savedRef);
      if (saved.exists()) return;
      const currentRoute = await transaction.get(routeRef);
      if (!currentRoute.exists()) {
        throw stagedError(
          Object.assign(new Error("Rota kaydı bulunamadı; yeniden yayınlamayı dene."), { code: "not-found" }),
          "route/save-reference",
        );
      }
      const saveCount = currentRoute.data().saveCount;
      if (typeof saveCount !== "number" || !Number.isInteger(saveCount) || saveCount < 0) {
        throw stagedError(
          Object.assign(new Error("Rota kayıt sayacı geçersiz."), { code: "failed-precondition" }),
          "route/counter",
        );
      }
      transaction.set(savedRef, { routeId: route.id, savedAt: serverTimestamp() });
      transaction.update(routeRef, { saveCount: saveCount + 1, updatedAt: serverTimestamp() });
    });
  } catch (failure) {
    // Transaction içindeki kendi etiketli hatalarımızı yeniden sarmıyoruz.
    if (failure instanceof Error && failure.name === "AtlasiaStagedError") throw failure;
    throw stagedError(failure, "route/save-reference");
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
    if (isNotFound(failure)) {
      // Rota sahibi dokümanı silmiş olabilir; orphan kayıt yine tek dokunuşla kaldırılabilir.
      await deleteDoc(savedRef).catch((orphanFailure) => {
        throw stagedError(orphanFailure, "route/remove-reference");
      });
      return;
    }
    if (isPermissionDenied(failure)) {
      // Rota belgesi bize kapalı (silinmiş ya da başkasının private rotası).
      // Referans bizim own-scoped belgemizdir; sayaç güncellemesi olmadan da silinebilir.
      await deleteDoc(savedRef).catch((orphanFailure) => {
        throw stagedError(orphanFailure, "route/remove-reference");
      });
      return;
    }
    throw stagedError(failure, "route/remove-reference");
  }
}

export async function removeRouteFromLibrary(uid: string, routeId: string): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const firestore = db;
  const routeRef = doc(firestore, "routes", routeId);
  const probe = await probeRouteDocument(routeId);

  if (probe.exists && probe.data?.authorUid === uid) {
    try {
      const savedRef = doc(firestore, "users", uid, "savedRoutes", routeId);
      await runTransaction(firestore, async (transaction) => {
        const currentRoute = await transaction.get(routeRef);
        if (!currentRoute.exists() || currentRoute.data().authorUid !== uid) {
          throw stagedError(
            Object.assign(new Error("Rota sahipliği değişti; silme yapılmadı."), { code: "aborted" }),
            "route/update",
          );
        }
        const saved = await transaction.get(savedRef);
        transaction.delete(routeRef);
        if (saved.exists()) transaction.delete(savedRef);
      });
      return;
    } catch (failure) {
      if (failure instanceof Error && failure.name === "AtlasiaStagedError") throw failure;
      throw stagedError(failure, "route/update");
    }
  }

  // Belge yok, bize kapalı ya da başkasına ait: yalnız kendi referansımızı kaldır.
  await removeSavedRoute(uid, routeId);
}

/**
 * Rotayı yayınlar/günceller.
 *
 * Kök neden düzeltmesi: eskiden bu fonksiyon **her zaman** `getDoc` ile başlardı
 * ve yeni (henüz var olmayan) bir rota için Firestore `permission-denied`
 * döndürdüğü için kayıt hiç oluşturulamıyordu. Artık ön-okuma reddedilirse
 * create-şekilli yazıma geçilir ve kararı kural verir.
 */
export async function publishRoute(uid: string, route: AtlasRoute, visibility: RouteVisibility): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const ref = doc(db, "routes", route.id);
  const probe = await probeRouteDocument(route.id);

  try {
    await setDoc(ref, routePayload(uid, route, visibility, probe.data), { merge: false });
  } catch (failure) {
    if (isPermissionDenied(failure) && probe.denied) {
      // Ön-okuma da reddedilmişti: belge büyük olasılıkla VAR ve bize kapalı.
      // Create-şekilli yazım `update` kuralından döndü (authorUid/createdAt koruması).
      // Yani rotayı EZMEDİK — kararı kural verdi, biz yalnızca net mesaj üretiyoruz.
      throw stagedError(
        failure,
        "route/create",
        false,
        "Bu rota kimliği başka bir kayda ait ve sana kapalı. Rotayı farklı bir kimlikle kaydet.",
      );
    }
    throw stagedError(failure, probe.exists ? "route/update" : "route/create");
  }
}

export async function getPublishedRoute(routeId: string): Promise<{ route: AtlasRoute; authorUid: string; visibility: RouteVisibility } | null> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const probe = await probeRouteDocument(routeId);
  if (!probe.exists || !probe.data) return null;
  const data = probe.data;
  if (!data.route || typeof data.route !== "object") return null;
  return { route: data.route as AtlasRoute, authorUid: data.authorUid as string, visibility: data.visibility as RouteVisibility };
}

export async function listPublicRoutes(): Promise<PublicRouteRecord[]> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  let snapshot;
  try {
    snapshot = await getDocs(query(
      collection(db, "routes"), where("visibility", "==", "public"), limit(ROUTE_PAGE_SIZE),
    ));
  } catch (failure) {
    throw stagedError(failure, "route/list-public", false);
  }
  return snapshot.docs.flatMap((item) => {
    const data = item.data();
    if (!data.route || typeof data.route !== "object") return [];
    return [{
      route: data.route as AtlasRoute,
      authorUid: typeof data.authorUid === "string" ? data.authorUid : "",
      saveCount: typeof data.saveCount === "number" ? data.saveCount : 0,
    }];
  }).sort((left, right) => right.saveCount - left.saveCount);
}

export async function listOwnedTracks(uid: string): Promise<AtlasTrack[]> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  let snapshot;
  try {
    snapshot = await getDocs(query(
      collection(db, "tracks"), where("authorUid", "==", uid), limit(100),
    ));
  } catch (failure) {
    throw stagedError(failure, "track/list");
  }
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as AtlasTrack));
}

export async function createTrack(uid: string, track: AtlasTrack): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  try {
    await setDoc(doc(db, "tracks", track.id), {
      ...track,
      authorUid: uid,
      createdAt: serverTimestamp(),
    });
  } catch (failure) {
    throw stagedError(failure, "track/create");
  }
}

export async function deleteTrack(trackId: string): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  try {
    await deleteDoc(doc(db, "tracks", trackId));
  } catch (failure) {
    throw stagedError(failure, "track/delete");
  }
}

/** Hata kodunu dışa açan küçük yardımcı; çağıranlar `code` alanına güvenebilir. */
export function routeFailureCode(failure: unknown): string {
  return firestoreErrorCode(failure);
}
