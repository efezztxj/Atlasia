import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { firebaseConfigured } from "../lib/firebase";
import {
  publishRoute,
  removeRouteFromLibrary,
  saveRouteReference,
  subscribeSavedCollections,
  toggleSavedPlace,
} from "../lib/routeData";
import { classifyFailure, firestoreErrorCode, type RouteStage } from "../lib/firestoreErrors";
import {
  dedupeRecordsErrors,
  isSharedRecordsError,
  tabForSavedSource,
  type RecordsError,
  type RecordsTab,
} from "../lib/recordsErrors";
import type { AtlasRoute, Place, RouteVisibility } from "../types";
import { storageGet, storageSet } from "../utils/storage";

/** Yazma eylemleri: hata hangi sekmeye yazılacak, çağıran bildirir. */
export type CollectionWriteAction =
  | "savePlace"
  | "togglePlace"
  | "saveRoute"
  | "removeRoute"
  | "deleteTrack";

interface CollectionState {
  savedPlaces: Place[];
  savedRoutes: AtlasRoute[];
  loading: boolean;
  /**
   * @deprecated Sekme ayırmayan tek hata metni. Yerine `errors` kullan.
   * Geriye dönük uyumluluk için korunuyor (ProfilePanel/AtlasAssistant).
   */
  error: string | null;
  /** Kaynak bazlı, sekme kapsamlı hata listesi. */
  errors: RecordsError[];
  savePlace: (place: Place, activeTab?: RecordsTab) => Promise<void>;
  saveRoute: (route: AtlasRoute, activeTab?: RecordsTab) => Promise<void>;
  publishRoute: (route: AtlasRoute, visibility: RouteVisibility) => Promise<void>;
  removeRoute: (id: string, activeTab?: RecordsTab) => Promise<void>;
  clearError: (tab?: RecordsTab) => void;
  isSaved: (id: string) => boolean;
}

const Context = createContext<CollectionState | null>(null);
function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(storageGet(key) ?? "null") ?? fallback; } catch { return fallback; }
}

/** Ham hatayı sekme kapsamlı bir `RecordsError` kaydına çevirir. */
function toRecordsError(
  failure: unknown,
  stage: RouteStage,
  tab: RecordsTab,
  scope: RecordsError["scope"],
  owned = true,
): RecordsError {
  const classified = classifyFailure(failure, stage, owned);
  return {
    tab,
    scope: isSharedRecordsError(classified.code, classified.message) ? "shared" : scope,
    message: classified.message,
    code: classified.code,
    genuine: classified.genuinePermissionProblem || !classified.retryable ? classified.genuinePermissionProblem : undefined,
    retryable: classified.retryable,
  };
}

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const prefix = `atlasia.member.${user!.uid}`;
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => firebaseConfigured ? [] : read(`${prefix}.places`, []));
  const [savedRoutes, setSavedRoutes] = useState<AtlasRoute[]>(() => firebaseConfigured ? [] : read(`${prefix}.routes`, []));
  const [loading, setLoading] = useState(firebaseConfigured);
  const [errors, setErrors] = useState<RecordsError[]>([]);
  /** Oturum değişince eski kullanıcının hataları yeni kullanıcıya sızmamalı. */
  const errorsRef = useRef<RecordsError[]>([]);
  errorsRef.current = errors;

  useEffect(() => {
    if (!firebaseConfigured) {
      storageSet(`${prefix}.places`, JSON.stringify(savedPlaces));
      storageSet(`${prefix}.routes`, JSON.stringify(savedRoutes));
    }
  }, [prefix, savedPlaces, savedRoutes]);

  useEffect(() => {
    setErrors([]);
    if (!firebaseConfigured) return;
    setLoading(true);
    return subscribeSavedCollections(user!.uid, (snapshot) => {
      setSavedPlaces(snapshot.places);
      setSavedRoutes(snapshot.routes);
      setLoading(false);
    }, (failure, source) => {
      setLoading(false);
      if (source === "saved-routes/detail") {
        // Tek bir rota belgesi okunamadı (silinmiş ya da bize kapalı). Liste
        // yine de gelir; bu yüzden kullanıcıya ölümcül hata olarak göstermiyoruz
        // ama teşhis için kaydı tutuyoruz.
        console.warn("[Atlasia] Kayıtlı rota detayı okunamadı:", failure);
        return;
      }
      const tab = tabForSavedSource(source);
      const stage: RouteStage = source === "saved-places" ? "saved-places/subscribe" : "saved-routes/subscribe";
      setErrors((current) => dedupeRecordsErrors([
        ...current.filter((item) => !(item.scope === "read" && item.tab === tab)),
        toRecordsError(failure, stage, tab, "read"),
      ]));
    });
  }, [user]);

  /** Yazma hatasını ilgili sekmeye yazar; önceki aynı-sekme yazma hatasını değiştirir. */
  const recordWriteError = useCallback((failure: unknown, stage: RouteStage, tab: RecordsTab) => {
    setErrors((current) => dedupeRecordsErrors([
      ...current.filter((item) => !(item.scope === "write" && item.tab === tab)),
      toRecordsError(failure, stage, tab, "write"),
    ]));
  }, []);

  const clearError = useCallback((tab?: RecordsTab) => {
    setErrors((current) => (tab === undefined ? [] : current.filter((item) => item.tab !== tab)));
  }, []);

  const savePlace = useCallback(async (place: Place, activeTab?: RecordsTab) => {
    const tab: RecordsTab = activeTab ?? "places";
    if (!firebaseConfigured) {
      setSavedPlaces((current) => current.some((item) => item.id === place.id) ? current.filter((item) => item.id !== place.id) : [place, ...current]);
      return;
    }
    try {
      await toggleSavedPlace(user!.uid, place);
      setErrors((current) => current.filter((item) => !(item.scope === "write" && item.tab === "places")));
    } catch (failure) {
      // Yeniden fırlatmıyoruz: çağıranlar (BottomPanel, PlaceDetails, AtlasAssistant)
      // Promise'i yakalamıyor ve tarayıcıda unhandled rejection üretirdi. Hata
      // zaten `errors` listesine sekme kapsamıyla yazıldı; Kayıtlarım oradan okur.
      recordWriteError(failure, "saved-places/write", tab);
    }
  }, [recordWriteError, user]);

  const saveRoute = useCallback(async (route: AtlasRoute, activeTab?: RecordsTab) => {
    const tab: RecordsTab = activeTab ?? "routes";
    if (!firebaseConfigured) {
      setSavedRoutes((current) => [route, ...current.filter((item) => item.id !== route.id)].slice(0, 40));
      return;
    }
    try {
      await saveRouteReference(user!.uid, route);
      setErrors((current) => current.filter((item) => !(item.scope === "write" && item.tab === tab)));
    } catch (failure) {
      recordWriteError(failure, "route/save-reference", tab);
    }
  }, [recordWriteError, user]);

  const publish = useCallback(async (route: AtlasRoute, visibility: RouteVisibility) => {
    try {
      await publishRoute(user!.uid, route, visibility);
      await saveRouteReference(user!.uid, route);
      setErrors((current) => current.filter((item) => !(item.scope === "write" && item.tab === "routes")));
    } catch (failure) {
      // publishRoute ve saveRouteReference kendi aşama etiketlerini taşır;
      // hangisinin patladığını mesajdan okumak mümkündür.
      const stage = (failure as { stage?: RouteStage }).stage ?? "route/create";
      recordWriteError(failure, stage, "routes");
      throw failure;
    }
  }, [recordWriteError, user]);

  const removeRoute = useCallback(async (id: string, activeTab?: RecordsTab) => {
    const tab: RecordsTab = activeTab ?? "routes";
    if (!firebaseConfigured) {
      setSavedRoutes((current) => current.filter((route) => route.id !== id));
      return;
    }
    try {
      await removeRouteFromLibrary(user!.uid, id);
      setErrors((current) => current.filter((item) => !(item.scope === "write" && item.tab === tab)));
    } catch (failure) {
      recordWriteError(failure, "route/remove-reference", tab);
    }
  }, [recordWriteError, user]);

  /** Geriye dönük uyumluluk: en kritik (shared > read > write) hatanın metni. */
  const legacyError = useMemo(() => {
    const shared = errors.find((item) => item.scope === "shared" && item.genuine !== false);
    if (shared) return shared.message;
    const read = errors.find((item) => item.scope === "read" && item.genuine !== false);
    if (read) return read.message;
    const write = errors.find((item) => item.scope === "write" && item.genuine !== false);
    return write?.message ?? null;
  }, [errors]);

  const value = useMemo<CollectionState>(() => ({
    savedPlaces,
    savedRoutes,
    loading,
    error: legacyError,
    errors,
    savePlace,
    saveRoute,
    publishRoute: publish,
    removeRoute,
    clearError,
    isSaved: (id) => savedPlaces.some((place) => place.id === id),
  }), [clearError, errors, legacyError, loading, publish, removeRoute, savePlace, saveRoute, savedPlaces, savedRoutes]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCollections() {
  const state = useContext(Context);
  if (!state) throw new Error("CollectionsProvider is required.");
  return state;
}

/** Teşhis yardımcıları: bileşen dışında da aynı sınıflandırmayı kullanabilmek için. */
export { firestoreErrorCode };
