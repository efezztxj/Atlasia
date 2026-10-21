import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { firebaseConfigured } from "../lib/firebase";
import {
  publishRoute,
  removeRouteFromLibrary,
  saveRouteReference,
  subscribeSavedCollections,
  toggleSavedPlace,
} from "../lib/routeData";
import type { AtlasRoute, Place, RouteVisibility } from "../types";
import { resolveTrackShare } from "../utils/trackPrivacy";
import { storageGet, storageSet } from "../utils/storage";

interface CollectionState {
  savedPlaces: Place[];
  savedRoutes: AtlasRoute[];
  loading: boolean;
  error: string | null;
  savePlace: (place: Place) => void;
  saveRoute: (route: AtlasRoute) => void;
  publishRoute: (route: AtlasRoute, visibility: RouteVisibility) => Promise<void>;
  removeRoute: (id: string) => void;
  isSaved: (id: string) => boolean;
}

const Context = createContext<CollectionState | null>(null);
function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(storageGet(key) ?? "null") ?? fallback; } catch { return fallback; }
}

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const prefix = `atlasia.member.${user!.uid}`;
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => firebaseConfigured ? [] : read(`${prefix}.places`, []));
  const [savedRoutes, setSavedRoutes] = useState<AtlasRoute[]>(() => firebaseConfigured ? [] : read(`${prefix}.routes`, []));
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      storageSet(`${prefix}.places`, JSON.stringify(savedPlaces));
      storageSet(`${prefix}.routes`, JSON.stringify(savedRoutes));
    }
  }, [prefix, savedPlaces, savedRoutes]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    setLoading(true);
    setError(null);
    return subscribeSavedCollections(user!.uid, (snapshot) => {
      setSavedPlaces(snapshot.places);
      setSavedRoutes(snapshot.routes);
      setLoading(false);
    }, (failure) => {
      setError(failure.message);
      setLoading(false);
    });
  }, [user]);

  const savePlace = (place: Place) => {
    if (!firebaseConfigured) {
      setSavedPlaces((current) => current.some((item) => item.id === place.id) ? current.filter((item) => item.id !== place.id) : [place, ...current]);
      return;
    }
    void toggleSavedPlace(user!.uid, place).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : "Yer kaydedilemedi.");
    });
  };

  const saveRoute = (route: AtlasRoute) => {
    if (!firebaseConfigured) {
      setSavedRoutes((current) => [route, ...current.filter((item) => item.id !== route.id)].slice(0, 40));
      return;
    }
    void saveRouteReference(user!.uid, route).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : "Rota kaydedilemedi.");
    });
  };

  /**
   * P16 #1: yerel modda (`firebaseConfigured=false`) bulut zinciri **çağrılmaz**.
   * Yerelde yayın diye bir şey yoktur; rota cihazda saklanır ve kullanıcıya
   * yayımlanamadığı açıkça söylenir. Böylece sahte "yayınlandı" bağlantısı
   * üretilmez, ağ bağımlılığı olmayan modda hata da oluşmaz.
   */
  const publish = async (route: AtlasRoute, visibility: RouteVisibility) => {
    // Tek gizlilik kapısı: ham iz alanları taşınmaz, yayın açık kullanıcı
    // eylemiyle yapılır (bu fonksiyon yalnız "Yayınla/Kaydet" düğmesinden çağrılır).
    const decision = resolveTrackShare(route, { userInitiated: true, visibility, shareConsent: true });
    if (!decision.ok) throw new Error(decision.reason);
    if (!firebaseConfigured) {
      setSavedRoutes((current) => [route, ...current.filter((item) => item.id !== route.id)].slice(0, 40));
      throw new Error(
        "Bulut hesabı bağlı değil: rota bu cihazda kaydedildi, yayımlanamadı. Yayımlamak için bulut (e-posta) hesabıyla giriş yap.",
      );
    }
    await publishRoute(user!.uid, decision.route, decision.visibility);
    await saveRouteReference(user!.uid, decision.route);
  };

  const removeRoute = (id: string) => {
    if (!firebaseConfigured) {
      setSavedRoutes((current) => current.filter((route) => route.id !== id));
      return;
    }
    void removeRouteFromLibrary(user!.uid, id).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : "Rota kaydı kaldırılamadı.");
    });
  };

  return <Context.Provider value={{ savedPlaces, savedRoutes, loading, error, savePlace, saveRoute, publishRoute: publish, removeRoute, isSaved: (id) => savedPlaces.some((place) => place.id === id) }}>{children}</Context.Provider>;
}

export function useCollections() {
  const state = useContext(Context);
  if (!state) throw new Error("CollectionsProvider is required.");
  return state;
}
