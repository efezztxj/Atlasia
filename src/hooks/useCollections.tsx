import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  /**
   * Yayınlama tek gizlilik kapısından geçer. `shareConsent`, çağıran arayüzün
   * onay kutusundan gelir; private dışı görünürlükte onaysız yayın **çalışmaz**
   * (kapı hata fırlatır). Varsayılanı yoktur: her çağıran bilinçli geçirir.
   */
  publishRoute: (route: AtlasRoute, visibility: RouteVisibility, shareConsent: boolean) => Promise<void>;
  removeRoute: (id: string) => void;
  isSaved: (id: string) => boolean;
}

const Context = createContext<CollectionState | null>(null);
function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(storageGet(key) ?? "null") ?? fallback; } catch { return fallback; }
}

/**
 * Bu oturum Firestore'a gerçekten girebilir mi? Yapılandırılmış derlemede
 * **cihaz hesabının** uid'si Firebase Auth'ta yoktur; Rules `request.auth`
 * istediği için her okuma/yazma `permission-denied` alır. Yalnız
 * `firebaseConfigured`a bakmak cihaz kullanıcısını sessizce ne bulut ne
 * yerel çalışan bir durumda bırakırdı (Madde 12 bulgusu). Bulut/yerel
 * ayrımı gereken her yer bu tek koşulu kullanır; doğruluk tablosu
 * useCollections testleriyle kilitlidir.
 */
export function isCloudAccount(backend: "firebase" | "device" | undefined): boolean {
  return firebaseConfigured && backend === "firebase";
}

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const prefix = `atlasia.member.${user!.uid}`;
  // Karar (c) ayrımı: bulut hesabı `users/{uid}` altında eşitlenir,
  // cihaz hesabı bilinçli olarak cihazda kalır. (Madde 12)
  const cloudCollections = isCloudAccount(user!.backend);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => cloudCollections ? [] : read(`${prefix}.places`, []));
  const [savedRoutes, setSavedRoutes] = useState<AtlasRoute[]>(() => cloudCollections ? [] : read(`${prefix}.routes`, []));
  const [loading, setLoading] = useState(cloudCollections);
  const [error, setError] = useState<string | null>(null);
  /**
   * İŞ 1c · #61 p8 — koleksiyon izolasyonu.
   *
   * `useState` başlangıç değeri yalnız ilk render'da çalışır; aynı oturumda
   * hesap değişirse (çıkış → başka hesapla giriş) önceki kullanıcının listesi
   * ekranda kalıyor ve aşağıdaki kalıcılaştırma efekti onu **yeni** kullanıcının
   * anahtarına yazabiliyordu (veri karışması). Çözüm: uid değişiminde state
   * o kullanıcının anahtarından yeniden kurulur; kalıcılaştırma yalnız state'in
   * ait olduğu anahtar güncel anahtarla aynıyken çalışır.
   */
  const hydratedPrefix = useRef(prefix);

  useEffect(() => {
    hydratedPrefix.current = prefix;
    setSavedPlaces(cloudCollections ? [] : read(`${prefix}.places`, []));
    setSavedRoutes(cloudCollections ? [] : read(`${prefix}.routes`, []));
    setLoading(cloudCollections);
    setError(null);
    // Yalnız hesap/anahtar değişiminde çalışır.
  }, [prefix, cloudCollections]);

  useEffect(() => {
    // State başka bir hesaba aitse yazma: yeni kullanıcının anahtarını kirletme.
    if (hydratedPrefix.current !== prefix) return;
    if (!cloudCollections) {
      storageSet(`${prefix}.places`, JSON.stringify(savedPlaces));
      storageSet(`${prefix}.routes`, JSON.stringify(savedRoutes));
    }
  }, [cloudCollections, prefix, savedPlaces, savedRoutes]);

  useEffect(() => {
    if (!cloudCollections) return;
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
  }, [cloudCollections, user]);

  const savePlace = (place: Place) => {
    if (!cloudCollections) {
      setSavedPlaces((current) => current.some((item) => item.id === place.id) ? current.filter((item) => item.id !== place.id) : [place, ...current]);
      return;
    }
    void toggleSavedPlace(user!.uid, place).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : "Yer kaydedilemedi.");
    });
  };

  const saveRoute = (route: AtlasRoute) => {
    if (!cloudCollections) {
      setSavedRoutes((current) => [route, ...current.filter((item) => item.id !== route.id)].slice(0, 40));
      return;
    }
    void saveRouteReference(user!.uid, route).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : "Rota kaydedilemedi.");
    });
  };

  /**
   * P16 #1: yerel modda (`firebaseConfigured=false` veya cihaz hesabı) bulut
   * zinciri **çağrılmaz**. Yerelde yayın diye bir şey yoktur; rota cihazda
   * saklanır ve kullanıcıya yayımlanamadığı açıkça söylenir. Böylece sahte
   * "yayınlandı" bağlantısı üretilmez, ağ bağımlılığı olmayan modda hata da
   * oluşmaz.
   */
  const publish = async (route: AtlasRoute, visibility: RouteVisibility, shareConsent: boolean) => {
    // Tek gizlilik kapısı: ham iz alanları taşınmaz, yayın açık kullanıcı
    // eylemiyle yapılır (bu fonksiyon yalnız "Yayınla/Kaydet" düğmesinden çağrılır).
    // Onay burada uydurulmaz; arayüzdeki onay kutusunun değeri aynen geçer.
    const decision = resolveTrackShare(route, { userInitiated: true, visibility, shareConsent });
    if (!decision.ok) throw new Error(decision.reason);
    if (!cloudCollections) {
      setSavedRoutes((current) => [decision.route, ...current.filter((item) => item.id !== decision.route.id)].slice(0, 40));
      throw new Error(
        "Bulut hesabı bağlı değil: rota bu cihazda kaydedildi, yayımlanamadı. Yayımlamak için bulut (e-posta) hesabıyla giriş yap.",
      );
    }
    await publishRoute(user!.uid, decision.route, decision.visibility);
    await saveRouteReference(user!.uid, decision.route);
  };

  const removeRoute = (id: string) => {
    if (!cloudCollections) {
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
