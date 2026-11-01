/**
 * Atlasia — Explorer'ın açılış ve yaşam döngüsü bağlantıları (F1-6, adım 4).
 *
 * NEDEN VAR: `Explorer.tsx` içinde altı ayrı `useEffect` bloğu, yalnızca
 * "sayfa açıldı/açıkken bir şey değişti" olaylarına tepki veriyordu: yazar adı
 * önbelleği, profil dizini eşitlemesi, paylaşılan rota bağlantısı, kabul edilen
 * arkadaşlık isteği, manifest kısayolu (`?tab=`) ve davet bağlantısı. Hiçbiri
 * çizim üretmiyor; bu yüzden ayrı bir kancada toplandılar.
 *
 * SÖZLEŞME: Kanca durum **sahibi değildir** — yalnız `Explorer`'ın verdiği
 * setter'ları çağırır. Ağ işleri tembel `import()` ile yapılır; ilk paket
 * bütçesi korunur (bkz. `config/lazyLoading.test.ts`).
 */
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { storageSet } from "../utils/storage";
import { readShareTokenFromUrl } from "../utils/shareLinkUrl";
import { ROUTE_OPEN_MESSAGES, openPublishedRoute } from "../lib/publishedRouteOpen";
import { parseShortcutTab, stripShortcutParam } from "../utils/appShortcut";
import { takePendingInvite, type SocialTarget } from "../utils/inviteLink";
import { ensureFriendIndex } from "../lib/friendships";
import type { AppNotification } from "../lib/notifications";
import type { ProfileSyncUser } from "../lib/profileSync";
import type { AtlasRoute, Place } from "../types";

export interface ExplorerLifecycleDeps {
  user: ProfileSyncUser | null;
  notifications: AppNotification[];
  setResumeRoute: Dispatch<SetStateAction<AtlasRoute | null>>;
  setAtlasOpen: Dispatch<SetStateAction<boolean>>;
  setToast: Dispatch<SetStateAction<string | null>>;
  setSpin: (value: boolean) => void;
  /** Manifest kısayolu: "add" için ekleme modu. */
  setAddMode: Dispatch<SetStateAction<boolean>>;
  setDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setFeedOpen: Dispatch<SetStateAction<boolean>>;
  setRecordsOpen: Dispatch<SetStateAction<boolean>>;
  setProfileOpen: Dispatch<SetStateAction<boolean>>;
  setMyPlacesOpen: Dispatch<SetStateAction<boolean>>;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setStoryPlace: Dispatch<SetStateAction<Place | null>>;
  setStreetPlace: Dispatch<SetStateAction<Place | null>>;
  setNotificationsOpen: (open: boolean) => void;
  setPanelOpen: (open: boolean) => void;
  openSocial: (target: SocialTarget) => void;
}

/**
 * Kancanın kurduğu bağlantılar. Dönüş değeri yok: her blok kendi setter'ını
 * çağırır. Davranış testi `useExplorerLifecycle.test.ts` içinde.
 */
export function useExplorerLifecycle({
  user, notifications, setResumeRoute, setAtlasOpen, setToast, setSpin, setAddMode,
  setDrawerOpen, setFeedOpen, setRecordsOpen, setProfileOpen, setMyPlacesOpen,
  setSettingsOpen, setStoryPlace, setStreetPlace, setNotificationsOpen, setPanelOpen, openSocial,
}: ExplorerLifecycleDeps): void {
  useEffect(() => {
    if (user?.displayName) storageSet("atlasia.author", user.displayName);
  }, [user?.displayName]);

  // Arkadaş aramasında görünmek için profil dizine yazılır (ad değişmediyse yazım
  // yok). Kapı profileSync'te: cihaz hesabı buluta yazmaz, uygun olmayan ad denenmez.
  const profileSyncUid = user?.uid;
  const profileSyncBackend = user?.backend;
  const profileSyncName = user?.displayName;
  const profileSyncPhoto = user?.photoURL;
  useEffect(() => {
    if (!profileSyncUid || profileSyncBackend !== "firebase") return;
    void import("../lib/profileSync")
      .then(({ syncProfileForUser }) => syncProfileForUser({
        uid: profileSyncUid,
        backend: profileSyncBackend,
        displayName: profileSyncName,
        photoURL: profileSyncPhoto,
      }))
      .catch((failure: unknown) => console.warn("[Atlasia] Profil arama dizinine yazılamadı:", failure));
  }, [profileSyncUid, profileSyncBackend, profileSyncName, profileSyncPhoto]);

  const handledShareLinkRef = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const openFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const routeId = params.get("route");
      // P20 fragment'tadır (#r=); eski ?r= biçimi de okunur. Yayınlanmış rotanın
      // ?route= bağlantısı (Adım 5) öncelikli ve değişmedi.
      const shareToken = readShareTokenFromUrl(window.location.href);
      const linkKey = routeId ? `route:${routeId}` : shareToken ? `share:${shareToken}` : null;
      // Aynı bağlantı iki kez açılmaz (açılış + hash değişimi çift tetiklemesin).
      if (!linkKey || handledShareLinkRef.current === linkKey) return;
      handledShareLinkRef.current = linkKey;
      if (routeId) {
        void openPublishedRoute(routeId).then((outcome) => {
          if (!active) return;
          if (outcome.status === "opened") {
            setResumeRoute(outcome.route);
            setAtlasOpen(true);
          }
          setToast(outcome.message);
        });
      } else if (shareToken) {
        // P20: rota bağlantının içinde gelir. Doğrulama shareLink'te; burada yalnız
        // önizleme açılır — kaydetmek kullanıcının açık eylemidir. Açma/doğrulama
        // kodu (fflate dahil) tembel yüklenir: ilk paket bütçesi.
        void import("../utils/shareLink").then(({ parseRouteShareLink }) => parseRouteShareLink(shareToken)).then((outcome) => {
          if (!active) return;
          if (outcome.ok) {
            setResumeRoute(outcome.route);
            setAtlasOpen(true);
            setToast(ROUTE_OPEN_MESSAGES.opened);
          } else {
            setToast(outcome.message);
          }
        }, () => {
          if (active) setToast("Paylaşılan rota açılamadı. Bağlantını kontrol edip sayfayı yenile.");
        });
      }
    };
    openFromLocation();
    // Uygulama açıkken adrese yapıştırılan #r= bağlantısı da açılsın.
    window.addEventListener("hashchange", openFromLocation);
    return () => {
      active = false;
      window.removeEventListener("hashchange", openFromLocation);
    };
  }, [setAtlasOpen, setResumeRoute, setToast]);

  // Kabul edilen arkadaşlık isteği: karşı taraf benim listeme yazamaz (kural);
  // "friend_accepted" bildirimi gelince kendi listemi ben tamamlarım.
  const reconciledFriendsRef = useRef(new Set<string>());
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    const pending = notifications.filter(
      (item) => item.type === "friend_accepted" && item.actorUid && !reconciledFriendsRef.current.has(item.actorUid),
    );
    if (pending.length === 0) return;
    pending.forEach((item) => reconciledFriendsRef.current.add(item.actorUid));
    void import("../lib/userProfiles").then(async (profiles) => {
      for (const item of pending) {
        try {
          const profile = await profiles.fetchUserProfile(item.actorUid).catch(() => null);
          await ensureFriendIndex(uid, item.actorUid, profile?.displayName ?? "Gezgin");
        } catch (failure) {
          console.warn("[Atlasia] Arkadaş listesi tamamlanamadı:", failure);
        }
      }
    });
  }, [notifications, uid]);

  // Davet bağlantısı (main.tsx açılışta yakalar; giriş sonrası burada tüketilir).
  useEffect(() => {
    const invite = takePendingInvite();
    if (invite) openSocial({ kind: "invite", invite });
  }, [openSocial]);

  // İŞ 5: manifest kısayolları (?tab=…). Yalnız var olan panelleri açar; panel
  // kapatma mantığı closePanels ile aynı. Parametre okunduktan sonra adresten
  // silinir, yenilemede eylem ikinci kez tetiklenmez.
  const shortcutHandled = useRef(false);
  useEffect(() => {
    if (shortcutHandled.current) return;
    const action = parseShortcutTab(window.location.search);
    if (!action) return;
    shortcutHandled.current = true;
    window.history.replaceState(null, "", stripShortcutParam(window.location.href));
    setDrawerOpen(false);
    setFeedOpen(false);
    setAtlasOpen(false);
    setRecordsOpen(false);
    setProfileOpen(false);
    setMyPlacesOpen(false);
    setSettingsOpen(false);
    setStoryPlace(null);
    setStreetPlace(null);
    setNotificationsOpen(false);
    if (action === "explore") setPanelOpen(true);
    else if (action === "add") { setSpin(false); setAddMode(true); }
    else setProfileOpen(true);
  }, [
    setSpin, setAtlasOpen, setDrawerOpen, setFeedOpen, setMyPlacesOpen, setNotificationsOpen,
    setPanelOpen, setProfileOpen, setRecordsOpen, setAddMode, setSettingsOpen, setStoryPlace,
    setStreetPlace,
  ]);
}
