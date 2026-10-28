import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { firebaseConfigured } from "../lib/firebaseConfig";
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
  // Misafir (T4) hesabı yok ama haritayı kullanıyor: kayıtlar cihazda `guest`
  // anahtarında tutulur, bulut zinciri hiç kurulmaz. Hesap açılınca anahtar
  // `atlasia.member.<uid>` olur; misafir kayıtları hesaba karışmaz.
  const uid = user?.uid ?? "guest";
  const prefix = `atlasia.member.${uid}`;
  // Karar (c) ayrımı: bulut hesabı `users/{uid}` altında eşitlenir,
  // cihaz hesabı bilinçli olarak cihazda kalır. (Madde 12)
  const cloudCollections = Boolean(user) && isCloudAccount(user!.backend);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => cloudCollections ? [] : read(`${prefix}.places`, []));
  const [savedRoutes, setSavedRoutes] = useState<AtlasRoute[]>(() => cloudCollections ? [] : read(`${prefix}.routes`, []));
  const [loading, setLoading] = useState(cloudCollections);
  const [error, setError] = useState<string | null>(null);
  /**
   * Elimizdeki verinin hangi kullanıcıya ait olduğu. Hesap değişince state
   * effect çalışana kadar eski kullanıcının verisini taşımaya devam eder; bu
   * damga olmadan o veri **yeni kullanıcıya gösterilir** ve yerel modda yeni
   * kullanıcının anahtarına yazılırdı. Damga render sırasında okunur, bu yüzden
   * sızıntı için effect'in çalışması beklenmez.
   */
  const [dataUid, setDataUid] = useState(uid);
  const sameUser = dataUid === uid;
  const visiblePlaces = sameUser ? savedPlaces : [];
  const visibleRoutes = sameUser ? savedRoutes : [];
  const commitPlaces = (next: Place[]) => { setSavedPlaces(next); setDataUid(uid); };
  const commitRoutes = (next: AtlasRoute[]) => { setSavedRoutes(next); setDataUid(uid); };

  useEffect(() => {
    if (cloudCollections || sameUser) return;
    // Yerel modda hesap değişti: yeni kullanıcının kendi kayıtlarını oku.
    setSavedPlaces(read(`${prefix}.places`, []));
    setSavedRoutes(read(`${prefix}.routes`, []));
    setError(null);
    setLoading(false);
    setDataUid(uid);
  }, [cloudCollections, sameUser, prefix, uid]);

  useEffect(() => {
    // Yalnız güncel kullanıcının verisi kalıcılaşır; geçiş anında eski
    // kullanıcının listesi yeni kullanıcının anahtarına yazılmaz.
    if (cloudCollections || !sameUser) return;
    storageSet(`${prefix}.places`, JSON.stringify(savedPlaces));
    storageSet(`${prefix}.routes`, JSON.stringify(savedRoutes));
  }, [cloudCollections, sameUser, prefix, savedPlaces, savedRoutes]);

  useEffect(() => {
    if (!cloudCollections) return;
    setLoading(true);
    setError(null);
    const subscribeUid = uid;
    return subscribeSavedCollections(subscribeUid, (snapshot) => {
      setSavedPlaces(snapshot.places);
      setSavedRoutes(snapshot.routes);
      setLoading(false);
      // Snapshot kendi kullanıcısını damgalar: kapanmış aboneliğin geç gelen
      // yanıtı yeni kullanıcının verisi gibi görünmez.
      setDataUid(subscribeUid);
    }, (failure) => {
      setError(failure.message);
      setLoading(false);
      setDataUid(subscribeUid);
    });
  }, [cloudCollections, uid]);

  const savePlace = (place: Place) => {
    if (!cloudCollections) {
      commitPlaces(visiblePlaces.some((item) => item.id === place.id) ? visiblePlaces.filter((item) => item.id !== place.id) : [place, ...visiblePlaces]);
      return;
    }
    void toggleSavedPlace(uid, place).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : "Yer kaydedilemedi.");
    });
  };

  const saveRoute = (route: AtlasRoute) => {
    if (!cloudCollections) {
      commitRoutes([route, ...visibleRoutes.filter((item) => item.id !== route.id)].slice(0, 40));
      return;
    }
    void saveRouteReference(uid, route).catch((failure: unknown) => {
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
      commitRoutes([decision.route, ...visibleRoutes.filter((item) => item.id !== decision.route.id)].slice(0, 40));
      throw new Error(
        "Bulut hesabı bağlı değil: rota bu cihazda kaydedildi, yayımlanamadı. Yayımlamak için bulut (e-posta) hesabıyla giriş yap.",
      );
    }
    await publishRoute(uid, decision.route, decision.visibility);
    await saveRouteReference(uid, decision.route);
  };

  const removeRoute = (id: string) => {
    if (!cloudCollections) {
      commitRoutes(visibleRoutes.filter((route) => route.id !== id));
      return;
    }
    void removeRouteFromLibrary(uid, id).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : "Rota kaydı kaldırılamadı.");
    });
  };

  return (
    <Context.Provider
      value={{
        savedPlaces: visiblePlaces,
        savedRoutes: visibleRoutes,
        loading: cloudCollections && (loading || !sameUser),
        error: sameUser ? error : null,
        savePlace,
        saveRoute,
        publishRoute: publish,
        removeRoute,
        isSaved: (id) => visiblePlaces.some((place) => place.id === id),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useCollections() {
  const state = useContext(Context);
  if (!state) throw new Error("CollectionsProvider is required.");
  return state;
}
