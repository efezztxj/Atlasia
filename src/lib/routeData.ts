import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AtlasRoute, AtlasTrack, Place, RouteVisibility } from "../types";

const SAVED_PAGE_SIZE = 100;
const ROUTE_PAGE_SIZE = 40;

export interface SavedCollectionSnapshot {
  places: Place[];
  routes: AtlasRoute[];
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
        const routeSnapshot = await getDoc(doc(firestore, "routes", saved.id));
        if (!routeSnapshot.exists()) return null;
        const data = routeSnapshot.data();
        if (!data.route || typeof data.route !== "object") return null;
        return data.route as AtlasRoute;
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
  else await setDoc(ref, { place, savedAt: serverTimestamp() });
}

export async function saveRouteReference(uid: string, route: AtlasRoute): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const savedRef = doc(db, "users", uid, "savedRoutes", route.id);
  const routeRef = doc(db, "routes", route.id);
  const [saved, published] = await Promise.all([getDoc(savedRef), getDoc(routeRef)]);
  if (saved.exists()) return;
  if (!published.exists()) {
    await publishRoute(uid, route, "private");
  }
  await setDoc(savedRef, { routeId: route.id, savedAt: serverTimestamp() });
}

export async function removeSavedRoute(uid: string, routeId: string): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  await deleteDoc(doc(db, "users", uid, "savedRoutes", routeId));
}

export async function publishRoute(uid: string, route: AtlasRoute, visibility: RouteVisibility): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const ref = doc(db, "routes", route.id);
  const existing = await getDoc(ref);
  const routeData = { ...route, id: route.id };
  await setDoc(ref, {
    authorUid: uid,
    visibility,
    route: routeData,
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: false });
}

export async function getPublishedRoute(routeId: string): Promise<{ route: AtlasRoute; authorUid: string; visibility: RouteVisibility } | null> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const snapshot = await getDoc(doc(db, "routes", routeId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (!data.route || typeof data.route !== "object") return null;
  return { route: data.route as AtlasRoute, authorUid: data.authorUid as string, visibility: data.visibility as RouteVisibility };
}

export async function listPublicRoutes(): Promise<AtlasRoute[]> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  const snapshot = await getDocs(query(
    collection(db, "routes"), where("visibility", "==", "public"), limit(ROUTE_PAGE_SIZE),
  ));
  return snapshot.docs.flatMap((item) => {
    const route = item.data().route;
    return route && typeof route === "object" ? [route as AtlasRoute] : [];
  });
}

export async function createTrack(uid: string, track: AtlasTrack): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  await setDoc(doc(db, "tracks", track.id), {
    ...track,
    authorUid: uid,
    createdAt: serverTimestamp(),
  });
}

export async function deleteTrack(trackId: string): Promise<void> {
  if (!db) throw new Error("Firestore yapılandırılmamış.");
  await deleteDoc(doc(db, "tracks", trackId));
}
