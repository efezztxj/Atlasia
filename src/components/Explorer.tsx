/**
 * Atlasia — oturum açmış keşif kabuğu.
 *
 * App.tsx'teki kapı yalnız landing/giriş ekranını tanır; harita, paneller,
 * Firestore bağlantıları ve moderasyon kodu buraya aittir. Bu modül statik
 * import edilirse Firebase SDK'sı yeniden ilk yükleme grafiğine girer, bu
 * yüzden App.tsx onu `lazy()` ile çağırır (bkz. config/lazyLoading.test.ts).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { MapViewHandle } from "./MapView";
import Header from "./Header";
import Hero from "./Hero";
import SearchBox from "./SearchBox";
import MapControls from "./MapControls";
import BottomPanel from "./BottomPanel";
import type { SettingsContentProps } from "./SettingsPanel";
const NearbyAudioGuide = lazy(() => import("./NearbyAudioGuide"));
const SocialPanel = lazy(() => import("./SocialPanel"));
const AtlasAssistant = lazy(() => import("./AtlasAssistant"));
import ConfirmDialogHost, { requestConfirm } from "./ConfirmDialog";
import { useAuth } from "../contexts/AuthContext";
import { analytics } from "../lib/analytics";
import { CollectionsProvider, isCloudAccount } from "../hooks/useCollections";
import { GUIDE_PLACES } from "../data/places";
import { parseShortcutTab, stripShortcutParam } from "../utils/appShortcut";
import { formatAccuracy, useGeolocation } from "../hooks/useGeolocation";
import { useAtlasData } from "../hooks/useAtlasData";
import { useFirestoreAtlasData } from "../hooks/useFirestoreAtlasData";
import { useTheme } from "../hooks/useTheme";
import { useMapLayerPrefs } from "../hooks/useMapLayerPrefs";
import { useDiscoveryFlow } from "../hooks/useDiscoveryFlow";
import { useExplorerEnvironment } from "../hooks/useExplorerEnvironment";
import { MapSurfaceHints } from "./explorer/MapCanvas";
import { AddModeBanner, DataErrorBanner, MobileSearchSheet, ToastBanner } from "./explorer/OverlayPanels";
import { WalkFab } from "./explorer/DockChrome";
import { PanelStack } from "./explorer/PanelStack";
import { useModerationInbox, useModeratorAccess } from "../hooks/useModerationInbox";
import { usePanelStack } from "../hooks/usePanelStack";
import type { InstallAppController } from "../hooks/useInstallApp";
// A3: SDK başlatan `lib/firebase` yerine SDK'sız kapı. Explorer zaten Firestore
// kullanıyor ama bu import yüzünden SDK, yapılandırma okuması için de değil,
// modül yüklenirken başlatılıyordu; kapı dosyası hiçbir SDK import etmez.
import { isCloudReady, firebaseConfigSummary } from "../lib/firebaseConfig";
import type { PlaceViewport } from "../lib/firestoreData";
import { ROUTE_OPEN_MESSAGES, openPublishedRoute } from "../lib/publishedRouteOpen";
import { placeDeleteErrorMessage } from "../lib/firestoreValue";
import { freshnessReaderUid } from "../lib/verifications";
import { readShareTokenFromUrl } from "../utils/shareLinkUrl";
import type { AtlasRoute, CategoryId, Place, ViewState } from "../types";
import { haversineKm, reverseName, type SearchResult } from "../utils/geo";
import { storageGet, storageSet } from "../utils/storage";
import { decodePolyline } from "../utils/polyline";
import { routeDrawLegs } from "../utils/routeLegs";
import { useBlocks } from "../hooks/useBlocks";
import { useFreshness } from "../hooks/useFreshness";
import { markNotificationRead, markAllRead } from "../lib/notifications";
import {
  banUser,
  createAnnouncement,
  createAppeal,
  deleteAnnouncement,
  fetchTargetHistory,
  liftBan,
  logModAction,
  markWarningRead,
  notifyReportActioned,
  resolveAppeal,
  setReportStatus,
  takedownReportTarget,
  warnUser,
  type AppealStatus,
  type BanDuration,
  type Report,
  type ReportStatus,
} from "../lib/moderation";
import { takePendingInvite, type SocialTarget } from "../utils/inviteLink";
import { useMobileBackClose } from "../hooks/useMobileBackClose";
// friendships zaten ilk pakette (moderation.ts); dinamik import bölmez.
import { ensureFriendIndex } from "../lib/friendships";
import { startAppCheck } from "../lib/firebase";

// App Check (reCAPTCHA Enterprise ~350 KB + `_GRECAPTCHA` çerezi) yalnız
// Firestore/Storage için gerekir; landing'de başlatılmaz. Bu parça indirilip
// çalıştırıldığı anda, ilk Firestore okumasından önce bir kez başlatılır.
startAppCheck();

const MapView = lazy(() => import("./MapView"));
// Profil paneli yalnız açılınca yüklenir (ilk paket bütçesi).
// Yer detayı paneli yalnız bir yer seçilince açılır; advices/panel kodu
// başlangıç grafiğinde durmasın (bundle bütçesi marjı dar).
// Yürüyüş kaydı yalnız "Yürüyüş kaydı" düğmesine basılınca açılır;
// iz toplama/sadeleştirme kodu (utils/track) başlangıç grafiğinde durmaz.
const TrackRecorderPanel = lazy(() => import("./TrackRecorderPanel"));
const MapLayersSheet = lazy(() => import("./MapLayersSheet"));
// Raporlar/moderasyon paneli ayrı parça: kuyruk yalnız ihtiyaç anında yüklenir.
/** T5: misafirken engellenen eylem; hesap açılınca tüketilir. */
const PENDING_INTENT_KEY = "atlasia.pendingIntent.v1";
type PendingIntent = "place" | "route" | "feed" | "none";
/** Cihazda ilk rota oluşturuldu mu (T2 aktivasyon bayrağı). */

function MapLoadingSkeleton() {
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-ink"
      role="status"
      aria-label="Harita yükleniyor"
    >
      <div className="flex flex-col items-center gap-3 text-mint/75">
        <span className="size-12 animate-pulse rounded-full border border-leaf/40 bg-leaf/10" />
        <span className="text-sm">Harita hazırlanıyor…</span>
      </div>
    </div>
  );
}

function ExplorerScreen({ installApp }: { installApp: InstallAppController }) {
  const mapRef = useRef<MapViewHandle>(null);
  // Adım 11: her günün bacağı varsa rota mod ayrımlı çizilir (patika kesikli,
  // yol düz); yoksa durak durak düz çizgiye düşer.
  const drawAtlasRoute = (route: AtlasRoute, preview: boolean) => {
    // Rota + yağış: durakların varış havası planlayıcıda zaten hesaplanmış
    // (`stop.weather`). Hava katmanı bunu ek ağ isteği olmadan işaretler.
    // Önizlemede işaret yok — kullanıcı henüz onaylamadı.
    window.dispatchEvent(new CustomEvent("atlasia:weather-stops", {
      detail: preview
        ? []
        : route.days.flatMap((day) => day.stops).map((stop) => ({
          lat: stop.lat,
          lng: stop.lng,
          rainy: stop.weather?.risk === "rainy",
        })),
    }));
    const legs = routeDrawLegs(route);
    if (legs) {
      mapRef.current?.drawRouteLegs(legs, preview);
      return;
    }
    const coords = route.days.flatMap((day) => decodePolyline(day.polyline));
    if (coords.length > 1) mapRef.current?.drawRoute(coords, preview);
  };
  const { user, logout, requireAccount } = useAuth();
  // T4: misafir = oturum açmamış ama haritayı kullanan kişi. Yazma yolları
  // burada kapanır; sunucu tarafında da `request.auth == null` olduğu için
  // kurallar yazmayı reddeder (fail-closed) — kural gevşetmesi yok.
  const guest = !user;
  // T2 huni adımı: harita açılışı (oturumda bir kez). Misafir modu (T4)
  // ayrı sayılır: "kayıt duvarı olmadan haritayı açtı" oranı buradan okunur.
  useEffect(() => { analytics.mapOpen({ guest }); }, [guest]);

  const { theme, setTheme } = useTheme();

  const [mapViewport, setMapViewport] = useState<PlaceViewport | null>(null);

  // Yerel veri yalnız yapılandırmasız mod ve ilk canlı liste görünümü için yedektir.
  const local = useAtlasData(user?.uid ?? "", { persist: Boolean(user) });
  // Cihaz hesabı Firestore'a giremez (Rules request.auth ister): okuma/yazma
  // ancak bulut hesabıyla uzaktan olur; cihaz hesabı baştan sona yerel çalışır.
  const cloudAccount = user ? isCloudAccount(user.backend) : false;
  // Moderatör bayrağı veri kancasına parametre olduğu için en üstte gerekir.
  const { moderator, setModerator } = useModeratorAccess(user?.uid, cloudAccount);
  // F1-5: ortam durumu (ekran/motion, bildirimler, karşılama, konum etiketi).
  const {
    smallScreen, reducedMotion, notifications,
    onboarding, dismissOnboarding, preciseLabel, setPreciseLabel,
    locationLabel, setLocationLabel, dismissedDataError, setDismissedDataError,
  } = useExplorerEnvironment({ uid: user?.uid, cloudEnabled: cloudAccount });
  const remote = useFirestoreAtlasData({
    uid: user?.uid ?? "",
    enabled: cloudAccount || guest,
    viewport: mapViewport,
    guest,
    moderator,
  });
  // Bulut hesabı varsa yazma/silme işlemleri her zaman Firestore'a gider.
  // İlk canlı snapshot gelene kadar yalnız görünür liste için yerel içerik kullanılır;
  // böylece açılış anındaki hızlı bir işlem cihazda mahsur kalmaz.
  const cloud = (cloudAccount || guest)
    ? {
        ...remote,
        places: remote.ready ? remote.places : local.places,
        posts: remote.ready ? remote.posts : local.posts,
        stories: remote.ready ? remote.stories : local.stories,
      }
    : {
        ...local,
        ready: true,
        error: null,
        retry: () => {},
        hasMorePosts: false,
        hasMoreStories: false,
        loadingMorePosts: false,
        loadingMoreStories: false,
        loadMorePosts: async () => {},
        loadMoreStories: async () => {},
      };

  const showDataErrorBanner = (cloudAccount || guest)
    && isCloudReady
    && remote.error !== null
    && remote.error !== dismissedDataError;

  const {
    category, setCategory, activeId, setActiveId, featuredIdx, setFeaturedIdx,
    addMode, setAddMode, draft, setDraft, toast, setToast,
    resumeRoute, setResumeRoute, routeEditorRoute, setRouteEditorRoute,
  } = useDiscoveryFlow();
  // NOT: `toast` 3.2 sn sonra kendiliğinden kapanır ve Esc ekleme modundan
  // çıkar — ikisi de kancanın içinde (bkz. useDiscoveryFlow).
  // Kullanıcıya bulut bağlantısı durumunu bildir
  useEffect(() => {
    if (cloudAccount && !remote.ready && remote.error) {
      console.warn("[Atlasia] Config özeti:", firebaseConfigSummary);
    } else if (!isCloudReady) {
      setToast("Firebase yapılandırması eksik, yerel veri kullanılıyor.");
      console.warn("[Atlasia] Config özeti:", firebaseConfigSummary);
    }
  }, [cloudAccount, remote.ready, remote.error, setToast]);
  const { blockedSet, isBlocked } = useBlocks(user?.uid);
  // Tazelik okuması giriş şartlı (kural: signedIn); cihaz hesabında abone olunmaz.
  const freshness = useFreshness(freshnessReaderUid(user));
  const rawDiscoveries = cloud.places;
  const rawPosts = cloud.posts;
  const rawStories = cloud.stories;
  const discoveries = rawDiscoveries.filter((pl) => !isBlocked(pl.authorUid));
  const filteredPosts = rawPosts.filter((po) => !isBlocked(po.authorUid));
  const filteredStories = rawStories.filter((st) => !isBlocked(st.authorUid));
  const [settingsOpen, setSettingsOpen] = useState(false);
  // F1-1: harita katmanı tercihleri (spin/heroCompact/labels/terrain/weather*/
  // layersOpen/baseMap) artık kendi kancasında; adlar aynı kaldığı için
  // aşağıdaki tüm çağrı yerleri değişmedi.
  const {
    spin, setSpin,
    heroCompact, setHeroCompact,
    labels, setLabels,
    terrain, setTerrain,
    weather,
    weatherStatus,
    weatherMode, setWeatherMode,
    weatherHour, setWeatherHour,
    layersOpen, setLayersOpen,
    baseMap, setBaseMap,
    toggleWeather,
  } = useMapLayerPrefs();
  const [view, setView] = useState<ViewState>({ zoom: 2, lng: 30, lat: 30 });
  // F1-2: panel yığını (14 bayrak) kendi kancasında; adlar aynı kaldığı için
  // aşağıdaki tüm çağrı yerleri ve LIFO sırası değişmedi.
  const {
    panelOpen, setPanelOpen,
    discoverySpace, setDiscoverySpace, handleDiscoverySpaceChange,
    drawerOpen, setDrawerOpen,
    feedOpen, setFeedOpen,
    atlasOpen, setAtlasOpen,
    recordsOpen, setRecordsOpen,
    trackRecorderOpen, setTrackRecorderOpen,
    profileOpen, setProfileOpen,
    myPlacesOpen, setMyPlacesOpen,
    notificationsOpen, setNotificationsOpen,
    reportsOpen, setReportsOpen,
    adminOpen, setAdminOpen,
    searchOpen, setSearchOpen,
    closeAllPanels,
  } = usePanelStack();

  /**
   * T5 — kayıt duvarı sonrası ilk değer. Misafirken engellenen eylem
   * hatırlanır ve hesap açılınca **aynı yere** dönülür: "kaydoldum, şimdi ne
   * olacak?" sorusunun cevabı boş harita olmaz.
   */
  useEffect(() => {
    if (guest) return;
    const raw = storageGet(PENDING_INTENT_KEY);
    if (!raw) return;
    storageSet(PENDING_INTENT_KEY, "");
    const [pending, stamp] = raw.split("|");
    // 30 dakikadan eski niyet bayat sayılır: kullanıcı artık başka bir iş için
    // giriş yapmış olabilir.
    if (!stamp || Date.now() - Number(stamp) > 30 * 60 * 1000) return;
    if (pending === "place") {
      setToast("Hesabın hazır. Haritada bir noktaya dokunup ilk izini bırak.");
      setAddMode(true);
    } else if (pending === "feed") {
      setToast("Hesabın hazır. Topluluk akışında ilk paylaşımını yapabilirsin.");
      setFeedOpen(true);
    } else if (pending === "route") {
      // T8: rota niyeti yalnız sözle karşılanmaz — asistan açılır, kullanıcı
      // ilk rotasını yazmaya hazır bulur (T5'in "aynı yere dön" sözü).
      setToast("Hesabın hazır. Atlas AI'a nereye gitmek istediğini yaz, rotanı çizsin.");
      setAtlasOpen(true);
    }
    // Yalnız oturum açılışında bir kez: `guest` false olduktan sonra tekrar çalışmaz.
  }, [guest, setAtlasOpen, setFeedOpen, setAddMode, setToast]);
  /**
   * İz kaydının haritaya çizdiği önizleme çizgisi açık mı? Boş önizleme veya
   * panel kapanışı bu çizgiyi kaldırmalı; aksi hâlde atılan taslak haritada
   * "hayalet rota" olarak kalır (denetim K-01). Yalnız kayıtçının çizdiği
   * önizlemeyi temizlemek için tutulur; Atlas rota çizimine dokunmaz.
   */
  const trackPreviewDrawn = useRef(false);
  const {
    myReports, myReportsError,
    queue, queueLoading, queueError,
    bans, myBan, myWarnings, myAppeals, appeals, modActions,
    announcements, dismissedAnnouncement, setDismissedAnnouncement,
  } = useModerationInbox({ uid: user?.uid, cloudEnabled: cloudAccount, reportsOpen, adminOpen, moderator, setModerator });
  const [socialTarget, setSocialTarget] = useState<SocialTarget | null>(null);
  const [storyPlace, setStoryPlace] = useState<Place | null>(null);
  const [streetPlace, setStreetPlace] = useState<Place | null>(null);

  // --- Konum izni ---
  const geo = useGeolocation();
  const geocodedAt = useRef<{ lng: number; lat: number } | null>(null);
  const announced = useRef(false);

  // --- Mobil geri tuşu ---
  // Telefonda geri tuşu/kenar jesti uygulamadan çıkarmak yerine ekranda en
  // üstte duran katmanı kapatır. Sıra, katmanların görsel yığınıyla aynıdır:
  // önce tam ekran katmanlar, en sonda harita üstündeki keşif kartı.
  // NOT: `useCallback` DEĞİL — bağımlılıkların tamamı değer olduğu için kimlik
  // zaten her render'da değişiyordu; düz fonksiyon aynı davranışı 34 satır daha kısa verir.
  const closeTopLayer = (): (() => void) | null => {
    if (storyPlace) return () => setStoryPlace(null);
    if (streetPlace) return () => setStreetPlace(null);
    if (routeEditorRoute) return () => setRouteEditorRoute(null);
    if (draft) return () => setDraft(null);
    if (addMode) return () => setAddMode(false);
    if (searchOpen) return () => setSearchOpen(false);
    if (notificationsOpen) return () => setNotificationsOpen(false);
    if (trackRecorderOpen) return () => setTrackRecorderOpen(false);
    if (settingsOpen) return () => setSettingsOpen(false);
    if (activeId) return () => setActiveId(null);
    if (feedOpen) return () => setFeedOpen(false);
    if (profileOpen) return () => setProfileOpen(false);
    if (recordsOpen) return () => setRecordsOpen(false);
    if (myPlacesOpen) return () => setMyPlacesOpen(false);
    if (atlasOpen) return () => setAtlasOpen(false);
    if (drawerOpen) return () => setDrawerOpen(false);
    if (panelOpen) return () => setPanelOpen(false);
    return null;
  };
  // Yalnız telefonda: masaüstünde tarayıcı geçmişi kirletilmez.
  const backLayerClose = smallScreen ? closeTopLayer() : null;
  useMobileBackClose(!!backLayerClose, () => backLayerClose?.());

  useEffect(() => { if (user?.displayName) storageSet("atlasia.author", user.displayName); }, [user?.displayName]);
  // Arkadaş aramasında görünmek için profil dizine yazılır (ad değişmediyse yazım yok).
  // Kapı profileSync'te: cihaz hesabı buluta yazmaz, uygun olmayan ad denenmez.
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
      // P20 fragment'tadır (#r=); eski ?r= biçimi de okunur. Yayınlanmış
      // rotanın ?route= bağlantısı (Adım 5) öncelikli ve değişmedi.
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
        // P20: rota bağlantının içinde gelir. Doğrulama shareLink'te; burada
        // yalnız önizleme açılır — kaydetmek kullanıcının açık eylemidir.
        // Açma/doğrulama kodu (fflate dahil) tembel yüklenir: ilk paket bütçesi.
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

  // F1-2: panel bayraklarının kapanışı kancada (`closeAllPanels`); katman ve
  // hikâye kapatmaları burada kalır çünkü onlar başka kümelere ait.
  const closePanels = useCallback(() => {
    closeAllPanels();
    setLayersOpen(false);
    setStoryPlace(null);
    setStreetPlace(null);
  }, [closeAllPanels, setLayersOpen, setStoryPlace, setStreetPlace]);

  const openRecords = () => { closePanels(); setRecordsOpen(true); };
  const openProfile = () => {
    if (guest) { askAccount("Profil ve kayıtlar için bir hesap aç ya da giriş yap."); return; }
    closePanels();
    setProfileOpen(true);
  };
  const openAtlas = () => { closePanels(); setResumeRoute(null); setSpin(false); setAtlasOpen(true); };

  const openSettings = useCallback(() => {
    closeAllPanels();
    setLayersOpen(false);
    setStoryPlace(null);
    setStreetPlace(null);
    setReportsOpen(false);
    setSettingsOpen(true);
  }, [closeAllPanels, setLayersOpen, setStoryPlace, setStreetPlace, setReportsOpen, setSettingsOpen]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  /**
   * Raporlar / moderasyon (denetim K-07, AY-03).
   * - Raporlarım: kural gereği herkes yalnız kendi raporlarını okur.
   * - Kuyruk: yalnız `moderators/{uid}` belgesi olan hesapta; belge istemciden
   *   yazılamaz (Console'da elle). Kural dağıtılmamışsa sorgu `false` döner ve
   *   sekme görünmez (fail-closed).
   */
  const handleReportStatus = useCallback(async (reportId: string, status: ReportStatus, note?: string) => {
    if (!user?.uid) throw new Error("Oturum bulunamadı.");
    await setReportStatus(reportId, status, user.uid, note);
    void logModAction({ action: "report_status", reportId, detail: status });
    if (status === "actioned") {
      const report = queue.find((item) => item.id === reportId);
      if (report && report.status !== "actioned") {
        void notifyReportActioned(report, user.uid).catch((error) => {
          console.warn("[Atlasia] Rapor sonucu bildirimi gönderilemedi:", error);
        });
      }
    }
  }, [user?.uid, queue]);

  const handleBan = useCallback(async (report: Report, days: BanDuration, reason: string) => {
    const target = report.targetOwnerUid ?? (report.targetType === "user" ? report.targetId : undefined);
    if (!target) throw new Error("Bu raporun sahibi belirlenemedi; ban atılamaz.");
    await banUser({ uid: target, reason, reportId: report.id, days });
    void logModAction({ action: "ban", targetType: report.targetType, targetId: report.targetId, targetOwnerUid: target, reportId: report.id, detail: reason });
  }, []);

  const handleLiftBan = useCallback(async (uid: string) => {
    await liftBan(uid);
    void logModAction({ action: "lift_ban", targetOwnerUid: uid });
  }, []);

  const handleWarn = useCallback(async (report: Report, reason: string) => {
    const target = report.targetOwnerUid ?? (report.targetType === "user" ? report.targetId : undefined);
    if (!target) throw new Error("Bu raporun sahibi belirlenemedi; uyarı gönderilemez.");
    await warnUser({ uid: target, reason, reportId: report.id });
  }, []);

  const handleTakedown = useCallback(async (report: Report) => {
    await takedownReportTarget(report);
    // İçerik gittiyse rapor da kapanır: durum + raporlayana bildirim.
    await handleReportStatus(report.id, "actioned", "İçerik kalıcı olarak kaldırıldı.");
  }, [handleReportStatus]);

  const handleResolveAppeal = useCallback(async (appealId: string, status: Exclude<AppealStatus, "open">) => {
    await resolveAppeal(appealId, status);
  }, []);

  const handleCreateAnnouncement = useCallback(async (title: string, body: string) => {
    await createAnnouncement(title, body);
  }, []);

  const handleDeleteAnnouncement = useCallback(async (announcementId: string) => {
    await deleteAnnouncement(announcementId);
  }, []);

  const handleAppeal = useCallback(async (message: string) => {
    await createAppeal(message);
  }, []);

  const handleFetchHistory = useCallback((targetUid: string) => fetchTargetHistory(targetUid), []);

  const activeWarning = myWarnings.find((warning) => !warning.read) ?? null;
  const myAppeal = myAppeals[0] ?? null;
  const latestAnnouncement = announcements[0] ?? null;

  // Kabul edilen arkadaşlık isteği: karşı taraf benim listeme yazamaz (kural);
  // "friend_accepted" bildirimi gelince kendi listemi ben tamamlarım.
  const reconciledFriendsRef = useRef(new Set<string>());
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const pending = notifications.filter((item) => item.type === "friend_accepted" && item.actorUid && !reconciledFriendsRef.current.has(item.actorUid));
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
  }, [notifications, user?.uid]);
  const visibleNotifications = notifications.filter((item) => !isBlocked(item.actorUid));
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;
  const handleMarkAllRead = () => { if (user?.uid) void markAllRead(user.uid, notifications); };
  const handleNotificationRead = (id: string) => { if (user?.uid) void markNotificationRead(user.uid, id, true); };
  const clearSocialTarget = useCallback(() => setSocialTarget(null), []);
  const openSocial = useCallback((target: SocialTarget) => {
    closePanels();
    setFeedOpen(true);
    setSocialTarget(target);
  }, [closePanels, setFeedOpen]);
  const openGroupFromNotification = useCallback((groupId: string) => openSocial({ kind: "group", groupId }), [openSocial]);
  const openFriendsFromNotification = useCallback(() => openSocial({ kind: "friends" }), [openSocial]);
  // Davet bağlantısı (main.tsx açılışta yakalar; giriş sonrası burada tüketilir).
  useEffect(() => {
    const invite = takePendingInvite();
    if (invite) openSocial({ kind: "invite", invite });
  }, [openSocial]);

  const precise = useMemo(
    () =>
      geo.fix
        ? {
            label: preciseLabel ?? "Tam konumun",
            lng: geo.fix.lng,
            lat: geo.fix.lat,
            accuracy: geo.fix.accuracy,
          }
        : null,
    [geo.fix, preciseLabel],
  );

  // Location and storage share one panel; receiving a fix does not close it.
  useEffect(() => {
    const fix = geo.fix;
    if (!fix) {
      mapRef.current?.clearMe();
      announced.current = false;
      geocodedAt.current = null;
      setPreciseLabel(null);
      return;
    }

    const first = !announced.current;
    mapRef.current?.showMe(fix.lng, fix.lat, fix.accuracy, first);
    if (first) {
      announced.current = true;
      setSpin(false);
      setActiveId(null);
      setToast(`Konumun bulundu · ${formatAccuracy(fix.accuracy)}`);
    }
  }, [geo.fix, setSpin, setActiveId, setToast, setPreciseLabel]);

  useEffect(() => {
    const fix = geo.fix;
    if (!fix) return;
    const last = geocodedAt.current;
    const moved = !last || haversineKm(last.lat, last.lng, fix.lat, fix.lng) > 0.25;
    if (!moved) return;
    const ctrl = new AbortController();
    reverseName(fix.lat, fix.lng, ctrl.signal).then((name) => {
      if (ctrl.signal.aborted || !name) return;
      geocodedAt.current = { lng: fix.lng, lat: fix.lat };
      setPreciseLabel(name);
      setLocationLabel(name);
    });
    return () => ctrl.abort();
  }, [geo.fix, setSpin, setLocationLabel, setPreciseLabel]);

  // Hata durumlarını kullanıcıya anlat
  useEffect(() => {
    if (geo.status === "denied" && announced.current) {
      setToast("Konum izni kapatıldı.");
    }
    if (geo.status === "timeout") setToast("Konum zaman aşımına uğradı, tekrar dene.");
    if (geo.status === "unavailable") setToast("Konum şu an alınamıyor.");
  }, [geo.status, setToast]);


  const allPlaces = useMemo(
    () => freshness.withFreshness([...discoveries, ...GUIDE_PLACES]),
    [discoveries, freshness],
  );
  const canManagePlace = useCallback(
    (place: Place) => Boolean(user) && place.kind === "user" && (place.authorUid ? place.authorUid === user!.uid : !remote.ready),
    [remote.ready, user],
  );
  const myPlaces = useMemo(() => discoveries.filter(canManagePlace), [discoveries, canManagePlace]);
  const visiblePlaces = useMemo(
    () => (category ? allPlaces.filter((p) => p.category === category) : allPlaces),
    [allPlaces, category],
  );

  const activePlace = activeId ? allPlaces.find((p) => p.id === activeId) : undefined;
  // Tazelik verisi canlı değiştiğinde açık detay paneli de güncel özeti gösterir.
  const liveStoryPlace = storyPlace
    ? allPlaces.find((item) => item.id === storyPlace.id) ?? storyPlace
    : null;
  const current =
    activePlace ??
    (visiblePlaces.length ? visiblePlaces[featuredIdx % visiblePlaces.length] : undefined);

  const nearby = useMemo(() => {
    if (view.zoom < 3.2) return discoveries.length;
    const km =
      ((window.innerWidth / 1024) * 40075 * Math.max(Math.cos((view.lat * Math.PI) / 180), 0.2)) /
      2 ** view.zoom;
    return discoveries.filter((d) => haversineKm(view.lat, view.lng, d.lat, d.lng) <= km).length;
  }, [discoveries, view]);

  const focusPlace = useCallback((p: Place, zoom = 8) => {
    setActiveId(p.id);
    setSpin(false);
    setLocationLabel(p.region);
    mapRef.current?.flyTo(p.lng, p.lat, zoom);
  }, [setSpin, setActiveId, setLocationLabel]);

  const handleSelect = useCallback(
    (id: string) => {
      const p = allPlaces.find((x) => x.id === id);
      if (!p) return;
      setPanelOpen(true);
      focusPlace(p);
      setStoryPlace(p);
      setStreetPlace(null);
      setAtlasOpen(false);
      setDrawerOpen(false);
      setFeedOpen(false);
      setRecordsOpen(false);
    },
    [allPlaces, focusPlace, setAtlasOpen, setDrawerOpen, setFeedOpen, setPanelOpen, setRecordsOpen],
  );

  const handleCategory = (c: CategoryId | null) => {
    setCategory(c);
    setActiveId(null);
    setFeaturedIdx(0);
  };

  const handleCycle = (dir: 1 | -1) => {
    if (!visiblePlaces.length) return;
    const idx = Math.max(
      0,
      visiblePlaces.findIndex((p) => p.id === current?.id),
    );
    const next = (idx + dir + visiblePlaces.length) % visiblePlaces.length;
    setActiveId(null);
    setFeaturedIdx(next);
  };

  const handleSearchPick = (r: SearchResult) => {
    setSpin(false);
    if (r.place) {
      setCategory(null);
      setPanelOpen(true);
      focusPlace(r.place);
      setStoryPlace(r.place);
      setStreetPlace(null);
      setFeedOpen(false);
      setAtlasOpen(false);
      return;
    }
    setActiveId(null);
    setLocationLabel(r.label);
    if (r.bbox) mapRef.current?.fitBox(r.bbox);
    else mapRef.current?.flyTo(r.lng, r.lat, 10);
  };

  const handleReset = () => {
    setSpin(true);
    setHeroCompact(false);
    setActiveId(null);
    setLocationLabel("Dünya");
    mapRef.current?.reset();
  };

  const handleLocate = useCallback(() => openSettings(), [openSettings]);

  const handleAllowLocation = useCallback(() => {
    setToast("Konumun aranıyor…");
    geo.request();
  }, [geo, setToast]);

  const handleShowLocation = () => {
    if (!geo.fix) return;
    setSpin(false);
    setActiveId(null);
    setLocationLabel(preciseLabel ?? "Konumun");
    mapRef.current?.showMe(geo.fix.lng, geo.fix.lat, geo.fix.accuracy, true);
    closeSettings();
    setProfileOpen(false);
  };

  const handleClearLocation = useCallback(() => {
    geo.clear();
    announced.current = false;
    geocodedAt.current = null;
    setPreciseLabel(null);
    setLocationLabel("Dünya");
    mapRef.current?.clearMe();
    setToast("Konum işareti kaldırıldı.");
  }, [geo, setToast, setLocationLabel, setPreciseLabel]);

  /**
   * Misafir bir yazma eylemine kalkarsa: kısa bilgi + giriş/kayıt ekranı.
   * Eylem geri alınmaz, sayfa durumu korunur; hesap açılınca kullanıcı aynı
   * haritaya döner (T5: kayıt sonrası ilk değer için doğru zemin).
   */
  const askAccount = useCallback((intent: string, resume: PendingIntent = "none") => {
    setToast(intent);
    // T5: niyet hatırlanır; hesap açılınca kullanıcı aynı eyleme geri döner.
    // Zaman damgasıyla: günler sonra açılan oturumda beklenmedik eylem başlamasın.
    if (resume !== "none") storageSet(PENDING_INTENT_KEY, `${resume}|${Date.now()}`);
    requireAccount(intent);
  }, [requireAccount, setToast]);

  const startAdd = () => {
    if (guest) { askAccount("İz eklemek için bir hesap aç ya da giriş yap.", "place"); return; }
    closePanels();
    setSpin(false);
    setDrawerOpen(false);
    setAddMode(true);
  };

  const handleMapClick = useCallback((lng: number, lat: number) => {
    setAddMode(false);
    setDraft({ lng, lat });
  }, [setAddMode, setDraft]);

  const handleSave = async (data: {
    title: string;
    category: CategoryId;
    note: string;
    author: string;
    region: string;
    photo?: string;
  }) => {
    if (!draft) return;
    if (guest) { askAccount("İz kaydetmek için bir hesap aç ya da giriş yap."); return; }
    const created = await cloud.addPlace({
      title: data.title,
      region: data.region,
      category: data.category,
      lng: draft.lng,
      lat: draft.lat,
      note: data.note || "Bu keşif için henüz bir ipucu bırakılmadı.",
      author: data.author || "Gezgin",
      photo: data.photo,
    });
    analytics.placeCreated({
      account: cloudAccount ? "cloud" : "device",
      category: data.category,
      hasPhoto: Boolean(data.photo),
    });
    setDraft(null);
    setCategory(null);
    setPanelOpen(true);
    focusPlace(created, Math.max(view.zoom, 8));
    setToast(cloudAccount ? "İzin Atlasia haritasına eklendi." : "İzin bu cihazdaki haritana eklendi.");
  };

  const handleDelete = async (p: Place): Promise<boolean> => {
    if (!canManagePlace(p)) {
      setToast("Yalnızca kendi izlerini silebilirsin.");
      return false;
    }
    const accepted = await requestConfirm({
      title: "İzi sil",
      message: `“${p.title}” izini kalıcı olarak silmek istiyor musun?`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!accepted) return false;
    try {
      await cloud.removePlace(p.id);
      if (activeId === p.id) setActiveId(null);
      setStoryPlace((currentPlace) => currentPlace?.id === p.id ? null : currentPlace);
      setStreetPlace((currentPlace) => currentPlace?.id === p.id ? null : currentPlace);
      setFeaturedIdx(0);
      setToast("İzin haritadan silindi.");
      return true;
    } catch (error) {
      console.error("[Atlasia] Pin silinemedi:", error);
      setToast(placeDeleteErrorMessage(error));
      return false;
    }
  };

  const handleDrawerPick = (p: Place) => {
    setDrawerOpen(false);
    setPanelOpen(true);
    focusPlace(p);
    setStoryPlace(p);
    setStreetPlace(null);
    setFeedOpen(false);
    setAtlasOpen(false);
  };

  /** Akıştaki bir gönderi ya da story'nin konumuna uç */
  const handleFeedGoTo = useCallback((lng: number, lat: number, label: string) => {
    setSpin(false);
    setActiveId(null);
    setLocationLabel(label);
    mapRef.current?.flyTo(lng, lat, 9);
    if (window.innerWidth < 1024) setFeedOpen(false);
  }, [setSpin, setFeedOpen, setActiveId, setLocationLabel]);

  const heroHidden = view.zoom > 3.4;
  // Keşif kartı yalnız ekranı bütünüyle kaplayan katmanlarda gizlenir.
  // Profil / İzlerim / Topluluk / Atlas AI açıldığında kart yerinde kalır
  // (kullanıcı isteği 2026-10-25 ve 2026-10-27): panel kapanınca "kart nerede?"
  // boşluğu oluşmuyor, PC'de Atlas AI açıldığında alt keşif paneli kapanmıyor.
  // Masaüstünde sağdan açılan panel kartı örtmesin diye kart sola kaydırılır.
  const dockVisible = !recordsOpen && !storyPlace && !settingsOpen && !drawerOpen;
  useEffect(() => {
    if (!dockVisible) setDiscoverySpace(0);
  }, [dockVisible, setDiscoverySpace]);
  const mobileExplore = () => { closePanels(); setHeroCompact(false); setPanelOpen(true); };
  const openMyPlaces = () => { closePanels(); setMyPlacesOpen(true); };
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
  }, [setSpin, setAtlasOpen, setDrawerOpen, setFeedOpen, setMyPlacesOpen, setNotificationsOpen, setPanelOpen, setProfileOpen, setRecordsOpen, setAddMode]);
  const mobileTab = myPlacesOpen ? "İzlerim" : recordsOpen ? "Kaydet" : feedOpen ? "Topluluk" : profileOpen ? "Profil" : "Keşfet";
  const settingsContentProps: SettingsContentProps = {
    theme,
    onTheme: setTheme,
    installApp,
    mapBounds: mapViewport?.bounds ?? null,
    location: {
      supported: geo.supported,
      secure: geo.secure,
      permission: geo.permission,
      status: geo.status,
      fix: geo.fix,
      label: preciseLabel,
    },
    onAllowLocation: handleAllowLocation,
    onClearLocation: handleClearLocation,
    onShowLocation: handleShowLocation,
    // Raporlar yalnız bulut hesabında anlamlı (cihaz hesabı Firestore'a yazmaz).
    onOpenReports: cloudAccount
      ? () => { closePanels(); setReportsOpen(true); }
      : undefined,
    onOpenAdmin: cloudAccount && moderator
      ? () => { closePanels(); setAdminOpen(true); }
      : undefined,
  };

  return (
    <div
      className="space-bg relative h-dvh w-full overflow-hidden"
      style={{ "--discovery-occupied-space": `${discoverySpace}px` } as CSSProperties}
    >
      <a href="#harita" className="skip-link">
        İçeriğe geç
      </a>
      <main id="harita" aria-label="Keşif haritası" className="contents" tabIndex={-1}>
        <Suspense fallback={<MapLoadingSkeleton />}>
          <MapView
            ref={mapRef}
            places={visiblePlaces}
            activeId={activeId}
            onSelect={handleSelect}
            addMode={addMode}
            onMapClick={handleMapClick}
            showLabels={labels}
            terrainEnabled={terrain}
            baseMap={baseMap}
            theme={theme}
            spin={spin && !reducedMotion && !addMode && !draft}
            onUserInteract={() => { setSpin(false); setHeroCompact(true); }}
            onViewChange={setView}
            onViewportChange={setMapViewport}
          />
        </Suspense>
      </main>

      <Header
        onOpenDrawer={() => { closePanels(); setDrawerOpen(true); }}
        onAdd={startAdd}
        addMode={addMode}
        placeCount={allPlaces.length}
        locationReady={!!geo.fix}
        onOpenSettings={() => openSettings()}
        onOpenRecords={openRecords}
        onOpenProfile={openProfile}
        onOpenNotifications={() => {
          if (guest) { askAccount("Bildirimler için bir hesap aç ya da giriş yap."); return; }
          const next = !notificationsOpen;
          closePanels();
          setNotificationsOpen(next);
        }}
         onOpenSearch={() => { closePanels(); setSearchOpen(true); }}
         notificationsOpen={notificationsOpen}
         profileName={user?.displayName ?? ""}
         unreadCount={unreadCount}
       />

      {/* Hero - her ekranda göster, sadece mobil için özel stil */}
      <nav
        aria-label="Karşılama"
        className="mobile-home-content pointer-events-none absolute inset-x-0 top-[68px] z-30 px-3 pt-3 md:top-[72px] md:z-10 md:px-8 md:pt-12"
      >
        <div className="mx-auto flex max-w-[1340px] flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-5">
          <Hero hidden={heroHidden} compact={heroCompact} />
          {/* SearchBox sadece masaüstünde */}
          <div className="hidden md:order-2 md:block">
            <SearchBox
              places={allPlaces}
              onPick={handleSearchPick}
            onOpenFilters={() => { closePanels(); setDrawerOpen(true); }}
            />
          </div>
        </div>
      </nav>

      {/* Mobil arama sayfası */}
      {searchOpen && (
        <MobileSearchSheet
          places={allPlaces}
          onPick={(result) => { setSearchOpen(false); handleSearchPick(result); }}
          onClose={() => setSearchOpen(false)}
          onOpenFilters={() => { setSearchOpen(false); setDrawerOpen(true); }}
        />
      )}

      <MapControls
        onZoomIn={() => {
          setSpin(false);
          mapRef.current?.zoomIn();
        }}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onReset={handleReset}
        onLocate={handleLocate}
        onOpenLayers={() => {
          const next = !layersOpen;
          closePanels();
          setLayersOpen(next);
        }}
        layersOpen={layersOpen}
        onToggleTrackRecorder={() => setTrackRecorderOpen((open) => !open)}
        trackRecorderOpen={trackRecorderOpen}
        onToggleAtlas={() => (atlasOpen ? setAtlasOpen(false) : openAtlas())}
        atlasOpen={atlasOpen}
        hiddenOnMobile={panelOpen}
      />

      {/* Harita üstü eylem çifti — sol: yürüyüş kaydı (nötr cam), sağ: Atlas AI.
          Ekle artık alt çubuğun ortasında; ölçüler index.css →
          .mobile-walk-fab / .mobile-tab-add / .atlas-launcher. */}
      {!trackRecorderOpen && (
        <WalkFab
          panelOpen={panelOpen}
          onClick={() => {
            if (guest) { askAccount("Yürüyüş kaydı için bir hesap aç ya da giriş yap."); return; }
            setTrackRecorderOpen(true);
          }}
        />
      )}
      {layersOpen && (
        <Suspense fallback={null}>
          <MapLayersSheet
            open={layersOpen}
            onClose={() => setLayersOpen(false)}
            baseMap={baseMap}
            onBaseMap={setBaseMap}
            labels={labels}
            onToggleLabels={() => setLabels((v) => !v)}
            terrain={terrain}
            onToggleTerrain={() => setTerrain((v) => !v)}
            weather={weather}
            onToggleWeather={toggleWeather}
            weatherStatus={weatherStatus}
            weatherMode={weatherMode}
            onWeatherMode={setWeatherMode}
            weatherHour={weatherHour}
            onWeatherHour={setWeatherHour}
            onReset={handleReset}
          />
        </Suspense>
      )}


      {trackRecorderOpen && (
        <Suspense fallback={null}>
          <TrackRecorderPanel
            uid={user?.uid ?? ""}
            cloudAccount={user?.backend === "firebase"}
            onClose={() => {
              setTrackRecorderOpen(false);
              // Panel kapanırken yarım kalan önizleme haritada kalmamalı (K-01).
              if (trackPreviewDrawn.current) {
                mapRef.current?.clearRoute();
                trackPreviewDrawn.current = false;
              }
            }}
            onPreview={(coords) => {
              if (coords.length < 2) {
                // drawRoute boş koordinatta sessizce döner; temizlik ayrı yapılır.
                if (trackPreviewDrawn.current) mapRef.current?.clearRoute();
                trackPreviewDrawn.current = false;
                return;
              }
              mapRef.current?.drawRoute(coords, true);
              trackPreviewDrawn.current = true;
            }}
            onFinished={(track, route) => {
              trackPreviewDrawn.current = false;
              if (routeDrawLegs(route)) drawAtlasRoute(route, false);
              else mapRef.current?.drawRoute(decodePolyline(track.polyline), false);
              setResumeRoute(route);
              setTrackRecorderOpen(false);
              setAtlasOpen(true);
              setToast("İz gizli olarak kaydedildi. Yürüyüş taslağı hazır.");
            }}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <NearbyAudioGuide
          location={precise}
          places={GUIDE_PLACES}
          onOpenPlace={(place) => {
            closePanels();
            focusPlace(place, 15);
            setStoryPlace(place);
          }}
        />
      </Suspense>

      {/* İpucu + atıf (F1-6: harita yüzeyi kromu ayrı dosyada) */}
      <MapSurfaceHints precise={precise} onClearLocation={handleClearLocation} />

      {/* M-18: Kalıcı canlı veri hata şeridi + Yeniden dene */}
      {showDataErrorBanner && (
        <DataErrorBanner
          onRetry={() => {
            setDismissedDataError(null);
            cloud.retry();
          }}
          onDismiss={() => setDismissedDataError(remote.error)}
        />
      )}

      {/* Ekleme modu bandı */}
      {addMode && (
        <AddModeBanner
          onUseHere={() => {
            if (precise) {
              setAddMode(false);
              setDraft({ lng: precise.lng, lat: precise.lat });
              return;
            }
            openSettings();
          }}
          onCancel={() => setAddMode(false)}
        />
      )}

      {dockVisible && <BottomPanel
        open={panelOpen}
        onToggle={() => setPanelOpen((v) => !v)}
        category={category}
        onCategory={handleCategory}
        current={current}
        isActive={!!activePlace && activePlace.id === current?.id}
        locationLabel={locationLabel}
        nearby={nearby}
        total={discoveries.length}
        onShow={(p) => {
          focusPlace(p);
          if (smallScreen) {
            setPanelOpen(false);
          } else {
            setStoryPlace(p);
            setStreetPlace(null);
            setFeedOpen(false);
          }
        }}
        onCycle={handleCycle}
        canDelete={canManagePlace}
        onDelete={handleDelete}
        onAdd={startAdd}
        shifted={feedOpen}
        shiftedLeft={profileOpen || atlasOpen || layersOpen}
        onOpenFeed={() => { closePanels(); setFeedOpen(true); }}
        accuracy={precise?.accuracy ?? null}
        locating={geo.status === "locating" || geo.status === "refining"}
        onOccupiedSpaceChange={handleDiscoverySpaceChange}
      />}

      <Suspense fallback={null}>
      <AtlasAssistant
        open={atlasOpen}
        onOpen={openAtlas}
        onClose={() => setAtlasOpen(false)}
        places={allPlaces}
        view={view}
        selectedPlace={activePlace}
        hasLocation={!!precise}
        resumeRoute={resumeRoute}
        dockExpanded={false}
        hiddenOnMobile={panelOpen}
        onOpenRouteEditor={(route) => {
          if (guest) { askAccount("Rota oluşturmak için bir hesap aç ya da giriş yap.", "route"); return; }
          setRouteEditorRoute(route);
        }}
        origin={{
          lat: precise?.lat ?? view.lat,
          lng: precise?.lng ?? view.lng,
          label: precise?.label ?? locationLabel,
        }}
        onPreview={(coords, route) => (route ? drawAtlasRoute(route, true) : mapRef.current?.drawRoute(coords, true))}
        onDraw={(coords, route) => (route ? drawAtlasRoute(route, false) : mapRef.current?.drawRoute(coords, false))}
        onPulse={(lng, lat) => {
          setSpin(false);
          mapRef.current?.pulseAt(lng, lat);
        }}
        onFit={(coords) => mapRef.current?.fitCoords(coords)}
      />
      </Suspense>

      <Suspense fallback={null}>
      <SocialPanel
        open={feedOpen}
        onOpen={() => { closePanels(); setFeedOpen(true); }}
        onClose={() => setFeedOpen(false)}
        view={view}
        locationLabel={locationLabel}
        onGoTo={handleFeedGoTo}
        precise={precise}
        onRequestPrecise={handleLocate}
        posts={filteredPosts}
        stories={filteredStories}
        loading={(cloudAccount || guest) && isCloudReady && !remote.ready && !remote.error}
        loadError={(cloudAccount || guest) && isCloudReady && remote.error ? "Canlı akış yüklenemedi." : null}
        onRetryLoad={cloud.retry}
        hasMorePosts={cloud.hasMorePosts}
        hasMoreStories={cloud.hasMoreStories}
        loadingMorePosts={cloud.loadingMorePosts}
        loadingMoreStories={cloud.loadingMoreStories}
        onLoadMorePosts={cloud.loadMorePosts}
        onLoadMoreStories={cloud.loadMoreStories}
        clientId={cloud.clientId}
        currentUid={user?.uid ?? ""}
        moderator={moderator}
        uploadPhoto={cloud.uploadPhoto}
        onAddPost={guest ? () => askAccount("Paylaşmak için bir hesap aç ya da giriş yap.", "feed") : cloud.addPost}
        onRemovePost={cloud.removePost}
        onAddReply={guest ? async () => { askAccount("Yanıt yazmak için bir hesap aç ya da giriş yap."); } : cloud.addReply}
        onLoadReplies={cloud.loadPostReplies}
        onToggleLike={guest ? async () => { askAccount("Beğenmek için bir hesap aç ya da giriş yap."); } : cloud.toggleLike}
        onAddStory={guest ? () => askAccount("Hikâye paylaşmak için bir hesap aç ya da giriş yap.") : cloud.addStory}
        onRemoveStory={cloud.removeStory}
        blockedSet={blockedSet}
        isBlocked={isBlocked}
        socialTarget={socialTarget}
        onSocialTargetHandled={clearSocialTarget}
      />
      </Suspense>

      {/* Panel orkestrasyonu (F1-6 adım 2) — karar burada, çizim PanelStack'te. */}
      <PanelStack
        {...{
        activeWarning, addMode, adminOpen, announcements, appeals, askAccount, atlasOpen, bans,
        canManagePlace, category, closePanels, closeSettings, cloudAccount, dismissOnboarding,
        dismissedAnnouncement, draft, drawAtlasRoute, drawerOpen, focusPlace, guest, handleAppeal,
        handleBan, handleCategory, handleCreateAnnouncement, handleDelete,
        handleDeleteAnnouncement, handleDrawerPick, handleFetchHistory, handleLiftBan,
        handleLocate, handleMarkAllRead, handleNotificationRead, handleReportStatus,
        handleResolveAppeal, handleSave, handleTakedown, handleWarn, labels, latestAnnouncement,
        liveStoryPlace, logout, markWarningRead, mobileExplore, mobileTab, modActions, moderator,
        myAppeal, myBan, myPlaces, myPlacesOpen, myReports, myReportsError, notificationsOpen,
        onboarding, openAtlas, openFriendsFromNotification, openGroupFromNotification,
        openMyPlaces, openProfile, openRecords, openSettings, profileOpen, queue, queueError,
        queueLoading, recordsOpen, reportsOpen, routeEditorRoute, setAdminOpen, setAtlasOpen,
        setDismissedAnnouncement, setDraft, setDrawerOpen, setFeedOpen, setLabels, setMyPlacesOpen,
        setNotificationsOpen, setPanelOpen, setProfileOpen, setRecordsOpen, setReportsOpen,
        setResumeRoute, setRouteEditorRoute, setStoryPlace, setStreetPlace, setTerrain, setToast,
        settingsContentProps, settingsOpen, smallScreen, startAdd, storyPlace, streetPlace,
        terrain, unreadCount, visibleNotifications, visiblePlaces,
        locationReady: !!geo.fix,
        verify: (id, status, note) => freshness.verify(id, status, note),
        uploadPhoto: cloud.uploadPhoto,
        uid: user?.uid ?? "",
        }}
      />

      {toast && <ToastBanner toast={toast} />}

      <ConfirmDialogHost />
    </div>
  );
}


/**
 * Koleksiyonlar (kaydedilenler/rotalar) oturuma bağlıdır; sağlayıcı hesap
 * değişince yeniden kurulsun diye `key` ile sarılır.
 */
export default function Explorer({ installApp }: { installApp: InstallAppController }) {
  const { user } = useAuth();
  return (
    <CollectionsProvider key={user?.uid ?? "guest"}>
      <ExplorerScreen installApp={installApp} />
    </CollectionsProvider>
  );
}
