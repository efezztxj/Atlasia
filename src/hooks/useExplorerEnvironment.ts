/**
 * Atlasia — Explorer'ın "ortam" durumu (F1-5).
 *
 * NEDEN VAR: ekran/motion medya sorguları, bildirim aboneliği, karşılama
 * (onboarding) bayrağı, hassas konum etiketi ve veri hatası şeridinin
 * kapatılması `Explorer.tsx` içinde beş ayrı yere dağılmıştı. Hepsi "ortam"
 * sınıfında: kullanıcı eylemiyle değil, tarayıcı/oturum olayıyla değişir.
 *
 * KORUNAN DAVRANIŞ (birebir):
 *  · `smallScreen` eşiği 767 px (CSS `max-width: 767px` ile aynı).
 *  · Bildirim aboneliği yalnız bulut hesabında bağlanır (denetim K-14:
 *    cihaz hesabının uid'si Auth'ta yok, her açılışta reddedilen okuma üretiyordu).
 *  · Karşılama yalnız hiç görülmediyse VE cihazda rota yoksa açılır.
 */
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { subscribeNotifications, type AppNotification } from "../lib/notifications";
import { storageGet, storageSet } from "../utils/storage";

/** Cihazda oluşturulmuş ilk rota anahtarı (karşılama kapısı). */
export const FIRST_ROUTE_KEY = "atlasia.metrics.firstRoute.v1";
const ONBOARDING_KEY = "atlasia.onboardingSeen";

export interface ExplorerEnvironmentArgs {
  uid: string | undefined;
  cloudEnabled: boolean;
}

export interface ExplorerEnvironment {
  smallScreen: boolean;
  reducedMotion: boolean;
  notifications: AppNotification[];
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  onboarding: boolean;
  dismissOnboarding: () => void;
  preciseLabel: string | null;
  setPreciseLabel: Dispatch<SetStateAction<string | null>>;
  locationLabel: string;
  setLocationLabel: Dispatch<SetStateAction<string>>;
  dismissedDataError: Error | null;
  setDismissedDataError: Dispatch<SetStateAction<Error | null>>;
}

export function useExplorerEnvironment({ uid, cloudEnabled }: ExplorerEnvironmentArgs): ExplorerEnvironment {
  const [smallScreen, setSmallScreen] = useState(() => window.innerWidth < 768);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [onboarding, setOnboarding] = useState(
    () => !storageGet(ONBOARDING_KEY) && !storageGet(FIRST_ROUTE_KEY),
  );
  const [preciseLabel, setPreciseLabel] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("Dünya");
  const [dismissedDataError, setDismissedDataError] = useState<Error | null>(null);

  useEffect(() => {
    const screen = window.matchMedia("(max-width: 767px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncScreen = () => setSmallScreen(screen.matches);
    const syncMotion = () => setReducedMotion(motion.matches);
    screen.addEventListener("change", syncScreen);
    motion.addEventListener("change", syncMotion);
    return () => { screen.removeEventListener("change", syncScreen); motion.removeEventListener("change", syncMotion); };
  }, []);

  // Denetim K-14: cihaz hesabının uid'si Firebase Auth'ta yok; bu dinleyici
  // her açılışta reddedilen bir okuma denemesi üretiyordu. Bulut kapısı
  // useCollections ile aynı (isCloudAccount) ve hata artık loglanıyor.
  useEffect(() => {
    if (!uid || !cloudEnabled) { setNotifications([]); return; }
    const unsub = subscribeNotifications(uid, setNotifications, (error) => {
      console.warn("[Atlasia] Bildirimler dinlenemedi:", error);
    });
    return () => unsub();
  }, [uid, cloudEnabled]);

  // Onboarding (T8): ilk girişte üç seçenekli sade karşılama. Cihazda bir rota
  // oluşturulduysa karşılama bir daha gösterilmez — panel aktivasyona bağlı,
  // yalnız "görüldü" bayrağına değil.
  const dismissOnboarding = useCallback(() => {
    storageSet(ONBOARDING_KEY, "1");
    setOnboarding(false);
  }, []);

  return {
    smallScreen, reducedMotion,
    notifications, setNotifications,
    onboarding, dismissOnboarding,
    preciseLabel, setPreciseLabel,
    locationLabel, setLocationLabel,
    dismissedDataError, setDismissedDataError,
  };
}
