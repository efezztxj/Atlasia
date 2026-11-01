/**
 * Atlasia — oturum açmış keşif kabuğu.
 *
 * App.tsx'teki kapı yalnız landing/giriş ekranını tanır; harita, paneller,
 * Firestore bağlantıları ve moderasyon kodu buraya aittir. Bu modül statik
 * import edilirse Firebase SDK'sı yeniden ilk yükleme grafiğine girer, bu
 * yüzden App.tsx onu `lazy()` ile çağırır (bkz. config/lazyLoading.test.ts).
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { MapViewHandle } from "./MapView";
import BottomPanel from "./BottomPanel";
const SocialPanel = lazy(() => import("./SocialPanel"));
const AtlasAssistant = lazy(() => import("./AtlasAssistant"));
import ConfirmDialogHost from "./ConfirmDialog";
import { useAuth } from "../contexts/AuthContext";
import { analytics } from "../lib/analytics";
import { CollectionsProvider, isCloudAccount } from "../hooks/useCollections";
import { useGeolocation } from "../hooks/useGeolocation";
import { useLocationFlow } from "../hooks/useLocationFlow";
import { useAtlasData } from "../hooks/useAtlasData";
import { useFirestoreAtlasData } from "../hooks/useFirestoreAtlasData";
import { useTheme } from "../hooks/useTheme";
import { useMapLayerPrefs } from "../hooks/useMapLayerPrefs";
import { useDiscoveryFlow } from "../hooks/useDiscoveryFlow";
import { useModerationActions } from "../hooks/useModerationActions";
import { usePlaceCrud, usePlaceNavigation } from "../hooks/usePlaceActions";
import { useExplorerEnvironment } from "../hooks/useExplorerEnvironment";
import { useExplorerLifecycle } from "../hooks/useExplorerLifecycle";
import { useExplorerDerived } from "../hooks/useExplorerDerived";
import { MapScene } from "./explorer/MapScene";
import { buildSettingsContent } from "./explorer/settingsContent";
import { AddModeBanner, DataErrorBanner, ToastBanner } from "./explorer/OverlayPanels";
import { PanelStack } from "./explorer/PanelStack";
import { useModerationInbox, useModeratorAccess } from "../hooks/useModerationInbox";
import { usePanelStack } from "../hooks/usePanelStack";
import type { InstallAppController } from "../hooks/useInstallApp";
// A3: SDK başlatan `lib/firebase` yerine SDK'sız kapı. Explorer zaten Firestore
// kullanıyor ama bu import yüzünden SDK, yapılandırma okuması için de değil,
// modül yüklenirken başlatılıyordu; kapı dosyası hiçbir SDK import etmez.
import { isCloudReady, firebaseConfigSummary } from "../lib/firebaseConfig";
import type { PlaceViewport } from "../lib/firestoreData";
import { freshnessReaderUid } from "../lib/verifications";
import type { AtlasRoute, Place, ViewState } from "../types";
import { storageGet, storageSet } from "../utils/storage";
import { decodePolyline } from "../utils/polyline";
import { routeDrawLegs } from "../utils/routeLegs";
import { useBlocks } from "../hooks/useBlocks";
import { useFreshness } from "../hooks/useFreshness";
import { markNotificationRead, markAllRead } from "../lib/notifications";
import {
  markWarningRead,
} from "../lib/moderation";
import type { SocialTarget } from "../utils/inviteLink";
import { useMobileBackClose } from "../hooks/useMobileBackClose";
import { startAppCheck } from "../lib/firebase";

// App Check (reCAPTCHA Enterprise ~350 KB + `_GRECAPTCHA` çerezi) yalnız
// Firestore/Storage için gerekir; landing'de başlatılmaz. Bu parça indirilip
// çalıştırıldığı anda, ilk Firestore okumasından önce bir kez başlatılır.
startAppCheck();

// Profil paneli yalnız açılınca yüklenir (ilk paket bütçesi).
// Yer detayı paneli yalnız bir yer seçilince açılır; advices/panel kodu
// başlangıç grafiğinde durmasın (bundle bütçesi marjı dar).
// Yürüyüş kaydı yalnız "Yürüyüş kaydı" düğmesine basılınca açılır;
// iz toplama/sadeleştirme kodu (utils/track) başlangıç grafiğinde durmaz.
// Raporlar/moderasyon paneli ayrı parça: kuyruk yalnız ihtiyaç anında yüklenir.
/** T5: misafirken engellenen eylem; hesap açılınca tüketilir. */
const PENDING_INTENT_KEY = "atlasia.pendingIntent.v1";
type PendingIntent = "place" | "route" | "feed" | "none";
/** Cihazda ilk rota oluşturuldu mu (T2 aktivasyon bayrağı). */


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
  // F2-1a: moderasyon eylemleri kancada (kural yetkisi sunucuda kalır).
  const {
    handleReportStatus, handleBan, handleLiftBan, handleWarn, handleTakedown,
    handleResolveAppeal, handleCreateAnnouncement, handleDeleteAnnouncement,
    handleAppeal, handleFetchHistory,
  } = useModerationActions({ uid: user?.uid, queue });

  const activeWarning = myWarnings.find((warning) => !warning.read) ?? null;
  const myAppeal = myAppeals[0] ?? null;
  const latestAnnouncement = announcements[0] ?? null;

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

  // F1-6 adım 4: açılış/yaşam döngüsü bağlantıları (yazar adı, profil dizini,
  // paylaşılan rota, arkadaşlık uzlaştırma, ?tab= kısayolu, davet) kancada.
  useExplorerLifecycle({
    user, notifications, setResumeRoute, setAtlasOpen, setToast, setSpin, setAddMode,
    setDrawerOpen, setFeedOpen, setRecordsOpen, setProfileOpen, setMyPlacesOpen,
    setSettingsOpen, setStoryPlace, setStreetPlace, setNotificationsOpen, setPanelOpen, openSocial,
  });
  // F2-1c: konum akışı (uçuş, ters ad, izin/hata toast'ları, temizleme) kancada.
  const { precise, handleLocate, handleAllowLocation, handleShowLocation, handleClearLocation } = useLocationFlow({
    geo, mapRef, preciseLabel, setPreciseLabel, setLocationLabel, setToast,
    setSpin, setActiveId, openSettings, closeSettings, setProfileOpen,
  });

  // F1-6 adım 5: saf türetmeler (görünür yerler, sahiplik, açık yer, yakınlık,
  // yazar filtresi, okunmamış sayacı) kancada; adlar aynı kaldı.
  const {
    allPlaces, canManagePlace, myPlaces, visiblePlaces, activePlace, liveStoryPlace, current,
    nearby, heroHidden, filteredPosts, filteredStories, visibleNotifications, unreadCount,
  } = useExplorerDerived({
    discoveries, freshness, uid: user?.uid, remoteReady: remote.ready, category, featuredIdx,
    activeId, storyPlace, view, rawPosts, rawStories, notifications, isBlocked,
  });
  // F2-1b: yer gezinme eylemleri kancada (uçuş, seçim, filtre, arama, sıfırlama).
  const { focusPlace, handleSelect, handleCategory, handleCycle, handleSearchPick, handleReset, handleDrawerPick, handleFeedGoTo } =
    usePlaceNavigation({
      allPlaces, visiblePlaces, current, mapRef,
      setActiveId, setSpin, setHeroCompact, setLocationLabel, setPanelOpen,
      setStoryPlace, setStreetPlace, setAtlasOpen, setDrawerOpen, setFeedOpen,
      setRecordsOpen, setCategory, setFeaturedIdx,
    });

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

  // F2-1b: ekle/kaydet/sil de kancada; misafir kapısı ve onay akışı aynı.
  const { startAdd, handleMapClick, handleSave, handleDelete } = usePlaceCrud({
    draft, setDraft, activeId, guest, cloudAccount, view,
    addPlace: cloud.addPlace, removePlace: cloud.removePlace,
    canManagePlace, askAccount, closePanels, focusPlace, setToast, setAddMode,
    setActiveId, setCategory, setFeaturedIdx, setPanelOpen, setDrawerOpen,
    setStoryPlace, setStreetPlace, setSpin,
  });

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
  const mobileTab = myPlacesOpen ? "İzlerim" : recordsOpen ? "Kaydet" : feedOpen ? "Topluluk" : profileOpen ? "Profil" : "Keşfet";
  // F1-6 adım 6: ayarlar içeriği saf aktarım; karar `buildSettingsContent`te.
  const settingsContentProps = buildSettingsContent({
    theme, setTheme, installApp, mapBounds: mapViewport?.bounds ?? null, geo, preciseLabel,
    onAllowLocation: handleAllowLocation, onClearLocation: handleClearLocation,
    onShowLocation: handleShowLocation, cloudAccount, moderator,
    openReports: () => { closePanels(); setReportsOpen(true); },
    openAdmin: () => { closePanels(); setAdminOpen(true); },
  });


  return (
    <div
      className="space-bg relative h-dvh w-full overflow-hidden"
      style={{ "--discovery-occupied-space": `${discoverySpace}px` } as CSSProperties}
    >
      <a href="#harita" className="skip-link">
        İçeriğe geç
      </a>
      {/* Harita sahnesi (F1-6 adım 3) — çizim MapScene'de, karar burada. */}
      <MapScene
        {...{
        activeId, addMode, allPlaces, askAccount, atlasOpen, baseMap, closePanels, draft,
        drawAtlasRoute, focusPlace, geo, guest, handleClearLocation, handleLocate, handleMapClick,
        handleReset, handleSearchPick, handleSelect, heroCompact, heroHidden, labels, layersOpen,
        mapRef, notificationsOpen, openAtlas, openProfile, openRecords, openSettings, panelOpen,
        precise, reducedMotion, searchOpen, setAtlasOpen, setBaseMap, setDrawerOpen,
        setHeroCompact, setLabels, setLayersOpen, setMapViewport, setNotificationsOpen,
        setResumeRoute, setSearchOpen, setSpin, setStoryPlace, setTerrain, setToast,
        setTrackRecorderOpen, setView, setWeatherHour, setWeatherMode, spin, startAdd, terrain,
        theme, toggleWeather, trackPreviewDrawn, trackRecorderOpen, unreadCount, user, view,
        visiblePlaces, weather, weatherHour, weatherMode, weatherStatus,
        }}
      />
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
