import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Compass, Crosshair, MapPin, MousePointerClick, Plus, UserRound, UsersRound, X } from "lucide-react";
import type { BaseMapStyle, MapViewHandle } from "./components/MapView";
import Header from "./components/Header";
import Hero from "./components/Hero";
import SearchBox from "./components/SearchBox";
import MapControls from "./components/MapControls";
import BottomPanel from "./components/BottomPanel";
import AddDiscoveryModal from "./components/AddDiscoveryModal";
import Drawer from "./components/Drawer";
import SocialPanel from "./components/SocialPanel";
import SettingsPanel from "./components/SettingsPanel";
import AtlasAssistant from "./components/AtlasAssistant";
import Onboarding from "./components/Onboarding";
import PlaceDetails from "./components/PlaceDetails";
import StreetPeek from "./components/StreetPeek";
import AccountAccess, { EmailVerification, ProfileSetup } from "./components/AccountAccess";
import ProfilePanel from "./components/ProfilePanel";
import MyPlacesPanel from "./components/MyPlacesPanel";
import NearbyAudioGuide from "./components/NearbyAudioGuide";
import LandingPage from "./components/LandingPage";
import RecordsDock from "./components/RecordsDock";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CollectionsProvider } from "./hooks/useCollections";
import { GUIDE_PLACES } from "./data/places";
import { formatAccuracy, useGeolocation } from "./hooks/useGeolocation";
import { useAtlasData } from "./hooks/useAtlasData";
import { useFirestoreAtlasData } from "./hooks/useFirestoreAtlasData";
import { useTheme } from "./hooks/useTheme";
import { useInstallApp, type InstallAppController } from "./hooks/useInstallApp";
import { isCloudReady, firebaseConfigSummary } from "./lib/firebase";
import type { PlaceViewport } from "./lib/firestoreData";
import type { AtlasRoute, CategoryId, Place, ViewState } from "./types";
import { haversineKm, reverseName, type SearchResult } from "./utils/geo";
import { storageGet, storageSet } from "./utils/storage";
import { useBlocks } from "./hooks/useBlocks";
import { useFreshness } from "./hooks/useFreshness";
import { subscribeNotifications, markNotificationRead, markAllRead, type AppNotification } from "./lib/notifications";
import NotificationsPanel from "./components/NotificationsPanel";

const MapView = lazy(() => import("./components/MapView"));
const MAP_STYLE_KEY = "atlasia.mapStyle.v1";

function initialMapStyle(): BaseMapStyle {
  const saved = storageGet(MAP_STYLE_KEY);
  return saved === "dark" || saved === "street" || saved === "topographic" ? saved : "satellite";
}

function MapLoadingSkeleton() {
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-[#031b16]"
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

function placeDeleteErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code ?? (error as Error)?.message ?? "";
  if (code === "place/not-owner" || code.includes("permission-denied")) return "Bu iz başka bir hesaba ait. Yalnızca bırakan hesap silebilir.";
  if (code === "place/owner-missing") return "Bu eski izin sahiplik kaydı eksik. Güvenli taşıma yapılmadan silinemez.";
  if (code.includes("unavailable") || code.includes("network")) return "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.";
  return "İz silinemedi. Kayıt korunuyor; biraz sonra tekrar deneyebilirsin.";
}

function Explorer({ installApp }: { installApp: InstallAppController }) {
  const mapRef = useRef<MapViewHandle>(null);
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [mapViewport, setMapViewport] = useState<PlaceViewport | null>(null);

  // Yerel veri yalnız yapılandırmasız mod ve ilk canlı liste görünümü için yedektir.
  const local = useAtlasData(user!.uid);
  const remote = useFirestoreAtlasData({
    uid: user!.uid,
    enabled: isCloudReady,
    viewport: mapViewport,
  });
  // Bulut yapılandırılmışsa yazma/silme işlemleri her zaman Firestore'a gider.
  // İlk canlı snapshot gelene kadar yalnız görünür liste için yerel içerik kullanılır;
  // böylece açılış anındaki hızlı bir işlem cihazda mahsur kalmaz.
  const cloud = isCloudReady
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
        hasMorePosts: false,
        hasMoreStories: false,
        loadingMorePosts: false,
        loadingMoreStories: false,
        loadMorePosts: async () => {},
        loadMoreStories: async () => {},
      };

  // Kullanıcıya bulut bağlantısı durumunu bildir
  useEffect(() => {
    if (isCloudReady && !remote.ready && remote.error) {
      setToast("Canlı veriler yüklenemedi. Yeni işlemler için bağlantını kontrol et.");
      console.warn("[Atlasia] Config özeti:", firebaseConfigSummary);
    } else if (!isCloudReady) {
      setToast("Firebase yapılandırması eksik, yerel veri kullanılıyor.");
      console.warn("[Atlasia] Config özeti:", firebaseConfigSummary);
    }
  }, [remote.ready, remote.error]);
  const { blockedSet, isBlocked } = useBlocks(user?.uid);
  const freshness = useFreshness(user?.uid);
  const rawDiscoveries = cloud.places;
  const rawPosts = cloud.posts;
  const rawStories = cloud.stories;
  const discoveries = rawDiscoveries.filter((pl) => !isBlocked(pl.authorUid));
  const filteredPosts = rawPosts.filter((po) => !isBlocked(po.authorUid));
  const filteredStories = rawStories.filter((st) => !isBlocked(st.authorUid));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<{ lng: number; lat: number } | null>(null);
  const [spin, setSpin] = useState(true);
  const [labels, setLabels] = useState(true);
  const [terrain, setTerrain] = useState(true);
  const [baseMap, setBaseMap] = useState<BaseMapStyle>(initialMapStyle);
  const [view, setView] = useState<ViewState>({ zoom: 2, lng: 30, lat: 30 });
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 768);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [myPlacesOpen, setMyPlacesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [resumeRoute, setResumeRoute] = useState<AtlasRoute | null>(null);
  const [smallScreen, setSmallScreen] = useState(() => window.innerWidth < 768);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [storyPlace, setStoryPlace] = useState<Place | null>(null);
  const [streetPlace, setStreetPlace] = useState<Place | null>(null);
  const [locationLabel, setLocationLabel] = useState("Dünya");
  const [toast, setToast] = useState<string | null>(null);

  // --- Konum izni ---
  const geo = useGeolocation();
  const [preciseLabel, setPreciseLabel] = useState<string | null>(null);
  const geocodedAt = useRef<{ lng: number; lat: number } | null>(null);
  const announced = useRef(false);

  useEffect(() => {
    const screen = window.matchMedia("(max-width: 767px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncScreen = () => setSmallScreen(screen.matches);
    const syncMotion = () => setReducedMotion(motion.matches);
    screen.addEventListener("change", syncScreen);
    motion.addEventListener("change", syncMotion);
    return () => { screen.removeEventListener("change", syncScreen); motion.removeEventListener("change", syncMotion); };
  }, []);

  useEffect(() => { if (user?.displayName) storageSet("atlasia.author", user.displayName); }, [user?.displayName]);
  useEffect(() => { storageSet(MAP_STYLE_KEY, baseMap); }, [baseMap]);

  const closePanels = () => {
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
  };

  const openRecords = () => { closePanels(); setRecordsOpen(true); };
  const openProfile = () => { closePanels(); setProfileOpen(true); };
  const openAtlas = () => { closePanels(); setResumeRoute(null); setSpin(false); setAtlasOpen(true); };

  const openSettings = useCallback(() => {
    setDrawerOpen(false);
    setFeedOpen(false);
    setAtlasOpen(false);
    setRecordsOpen(false);
    setProfileOpen(false);
    setMyPlacesOpen(false);
    setStoryPlace(null);
    setStreetPlace(null);
    setNotificationsOpen(false);
    setSettingsOpen(true);
  }, []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    if (!user?.uid) { setNotifications([]); return; }
    const unsub = subscribeNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user?.uid]);
  const visibleNotifications = notifications.filter((item) => !isBlocked(item.actorUid));
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;
  const handleMarkAllRead = () => { if (user?.uid) void markAllRead(user.uid, notifications); };
  const handleNotificationRead = (id: string) => { if (user?.uid) void markNotificationRead(user.uid, id, true); };
  const clearPendingGroup = useCallback(() => setPendingGroupId(null), []);
  const openGroupFromNotification = useCallback((groupId: string) => {
    closePanels();
    setFeedOpen(true);
    setPendingGroupId(groupId);
  }, []);

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
  }, [geo.fix]);

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
  }, [geo.fix]);

  // Hata durumlarını kullanıcıya anlat
  useEffect(() => {
    if (geo.status === "denied" && announced.current) {
      setToast("Konum izni kapatıldı.");
    }
    if (geo.status === "timeout") setToast("Konum zaman aşımına uğradı, tekrar dene.");
    if (geo.status === "unavailable") setToast("Konum şu an alınamıyor.");
  }, [geo.status]);

  // Onboarding: ilk girişte üç seçenekli sade karşılama
  const [onboarding, setOnboarding] = useState(() => !storageGet("atlasia.onboardingSeen"));
  const dismissOnboarding = useCallback(() => {
    storageSet("atlasia.onboardingSeen", "1");
    setOnboarding(false);
  }, []);

  // Toast otomatik kapansın
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Esc ile ekleme modundan çık
  useEffect(() => {
    if (!addMode) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddMode(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addMode]);

  const allPlaces = useMemo(
    () => freshness.withFreshness([...discoveries, ...GUIDE_PLACES]),
    [discoveries, freshness],
  );
  const canManagePlace = useCallback(
    (place: Place) => place.kind === "user" && (place.authorUid ? place.authorUid === user!.uid : !remote.ready),
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
  }, []);

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
    [allPlaces, focusPlace],
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
    setActiveId(null);
    setLocationLabel("Dünya");
    mapRef.current?.reset();
  };

  const handleLocate = useCallback(() => openSettings(), [openSettings]);

  const handleAllowLocation = useCallback(() => {
    setToast("Konumun aranıyor…");
    geo.request();
  }, [geo]);

  const handleShowLocation = () => {
    if (!geo.fix) return;
    setSpin(false);
    setActiveId(null);
    setLocationLabel(preciseLabel ?? "Konumun");
    mapRef.current?.showMe(geo.fix.lng, geo.fix.lat, geo.fix.accuracy, true);
    closeSettings();
  };

  const handleClearLocation = useCallback(() => {
    geo.clear();
    announced.current = false;
    geocodedAt.current = null;
    setPreciseLabel(null);
    setLocationLabel("Dünya");
    mapRef.current?.clearMe();
    setToast("Konum işareti kaldırıldı.");
  }, [geo]);

  const startAdd = () => {
    closePanels();
    setSpin(false);
    setDrawerOpen(false);
    setAddMode(true);
  };

  const handleMapClick = useCallback((lng: number, lat: number) => {
    setAddMode(false);
    setDraft({ lng, lat });
  }, []);

  const handleSave = async (data: {
    title: string;
    category: CategoryId;
    note: string;
    author: string;
    region: string;
    photo?: string;
  }) => {
    if (!draft) return;
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
    setDraft(null);
    setCategory(null);
    setPanelOpen(true);
    focusPlace(created, Math.max(view.zoom, 8));
    setToast(isCloudReady ? "İzin Atlasia haritasına eklendi." : "İzin bu cihazdaki haritana eklendi.");
  };

  const handleDelete = async (p: Place): Promise<boolean> => {
    if (!canManagePlace(p)) {
      setToast("Yalnızca kendi izlerini silebilirsin.");
      return false;
    }
    if (!window.confirm(`“${p.title}” izini kalıcı olarak silmek istiyor musun?`)) return false;
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
  }, []);

  const heroHidden = view.zoom > 3.4;
  const dockVisible = !recordsOpen && !profileOpen && !myPlacesOpen && !storyPlace && !atlasOpen && !settingsOpen && !drawerOpen && !feedOpen;
  const discoveryPanelVisible = dockVisible;
  const mobileExplore = () => { closePanels(); setPanelOpen(true); };
  const openMyPlaces = () => { closePanels(); setMyPlacesOpen(true); };
  const mobileTab = myPlacesOpen ? "İzlerim" : recordsOpen ? "Kaydet" : feedOpen ? "Topluluk" : profileOpen ? "Profil" : "Keşfet";

  return (
    <div className="space-bg relative h-screen w-full overflow-hidden">
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
            onUserInteract={() => setSpin(false)}
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
          <Hero hidden={heroHidden} />
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
        <div className="fixed inset-0 z-[60] md:hidden">
          <button type="button" aria-label="Aramayı kapat" onClick={() => setSearchOpen(false)} className="absolute inset-0 bg-black/55" />
          <div className="mobile-search-sheet absolute inset-x-3 top-[calc(64px+env(safe-area-inset-top))] rounded-[24px] border border-leaf/30 bg-[#031d17] p-3 shadow-2xl">
            <SearchBox
              places={allPlaces}
              onPick={(result) => { setSearchOpen(false); handleSearchPick(result); }}
              onOpenFilters={() => { setSearchOpen(false); setDrawerOpen(true); }}
            />
          </div>
        </div>
      )}

      <MapControls
        onZoomIn={() => {
          setSpin(false);
          mapRef.current?.zoomIn();
        }}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onReset={handleReset}
        onLocate={handleLocate}
        onToggleLabels={() => setLabels((v) => !v)}
        onToggleTerrain={() => setTerrain((v) => !v)}
        labels={labels}
        terrain={terrain}
      />

      <NearbyAudioGuide
        location={precise}
        places={GUIDE_PLACES}
        onOpenPlace={(place) => {
          closePanels();
          focusPlace(place, 15);
          setStoryPlace(place);
        }}
      />

      {/* İpucu + atıf */}
      <div className="pointer-events-none absolute right-8 bottom-[30%] z-10 hidden flex-col items-end gap-2 text-right lg:flex">
        <p className="flex items-center gap-2 text-[10.5px] font-medium tracking-[0.16em] text-mint/70 uppercase">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-leaf" />
          </span>
          Haritayı tut, döndür, keşfet
        </p>
        {precise && (
          <button
            onClick={handleClearLocation}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-leaf/25 bg-ink/80 px-3 py-1.5 text-[11px] text-mint/85 backdrop-blur-xl transition hover:border-leaf/60 hover:text-white"
            title="Konum işaretini kaldır"
          >
            <Crosshair className="size-3.5 text-leaf" />
            <span className="max-w-[180px] truncate">{precise.label}</span>
            <span className="text-mint/50">{formatAccuracy(precise.accuracy)}</span>
            <X className="size-3" />
          </button>
        )}
      </div>
      <p role="contentinfo" className="pointer-events-none absolute inset-x-0 bottom-[2px] z-20 hidden px-2 text-center text-[11px] leading-none text-mint/45 md:block">
        Harita © Esri, OpenFreeMap, OpenMapTiles ve OpenStreetMap katkıcıları · Yükseklik verisi: AWS Terrain Tiles
      </p>

      {/* Ekleme modu bandı */}
      {addMode && (
        <div className="animate-rise absolute top-[88px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-leaf/40 bg-ink/90 py-2 pr-2 pl-4 text-[12.5px] text-mint shadow-xl shadow-black/50 backdrop-blur-xl">
          <MousePointerClick className="size-4 shrink-0 text-leaf" />
          <span>Keşfini bırakmak istediğin noktaya dokun</span>
          <button
            onClick={() => {
              if (precise) {
                setAddMode(false);
                setDraft({ lng: precise.lng, lat: precise.lat });
                return;
              }
              openSettings();
            }}
            title="Keşfi bulunduğun tam noktaya bırak"
            className="flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf/10 px-3 py-1.5 text-[12px] font-semibold text-leaf transition hover:bg-leaf/20"
          >
            <Crosshair className="size-3.5" />
            Tam konumum
          </button>
          <button
            onClick={() => setAddMode(false)}
            className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/20"
          >
            <X className="size-3.5" /> İptal
          </button>
        </div>
      )}

      {discoveryPanelVisible && <BottomPanel
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
        onOpenFeed={() => { closePanels(); setFeedOpen(true); }}
        accuracy={precise?.accuracy ?? null}
        locating={geo.status === "locating" || geo.status === "refining"}
      />}

      <AtlasAssistant
        open={atlasOpen}
        onOpen={openAtlas}
        onClose={() => setAtlasOpen(false)}
        places={allPlaces}
        view={view}
        selectedPlace={activePlace}
        hasLocation={!!precise}
        resumeRoute={resumeRoute}
        dockExpanded={panelOpen && dockVisible}
        origin={{
          lat: precise?.lat ?? view.lat,
          lng: precise?.lng ?? view.lng,
          label: precise?.label ?? locationLabel,
        }}
        onPreview={(coords) => mapRef.current?.drawRoute(coords, true)}
        onDraw={(coords) => mapRef.current?.drawRoute(coords, false)}
        onPulse={(lng, lat) => {
          setSpin(false);
          mapRef.current?.pulseAt(lng, lat);
        }}
        onFit={(coords) => mapRef.current?.fitCoords(coords)}
      />

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
        hasMorePosts={cloud.hasMorePosts}
        hasMoreStories={cloud.hasMoreStories}
        loadingMorePosts={cloud.loadingMorePosts}
        loadingMoreStories={cloud.loadingMoreStories}
        onLoadMorePosts={cloud.loadMorePosts}
        onLoadMoreStories={cloud.loadMoreStories}
        clientId={cloud.clientId}
        currentUid={user!.uid}
        uploadPhoto={cloud.uploadPhoto}
        onAddPost={cloud.addPost}
        onRemovePost={cloud.removePost}
        onAddReply={cloud.addReply}
        onToggleLike={cloud.toggleLike}
        onAddStory={cloud.addStory}
        onRemoveStory={cloud.removeStory}
        blockedSet={blockedSet}
        isBlocked={isBlocked}
        pendingGroupId={pendingGroupId}
        onGroupOpened={clearPendingGroup}
      />

      {recordsOpen && <RecordsDock onClose={() => setRecordsOpen(false)} onPlace={(place) => { closePanels(); focusPlace(place); setStoryPlace(place); }} onRoute={(route) => { closePanels(); setResumeRoute(route); setAtlasOpen(true); }} />}
      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} onRecords={openRecords} />}
      {myPlacesOpen && (
        <MyPlacesPanel
          places={myPlaces}
          onClose={() => setMyPlacesOpen(false)}
          onPlace={(place) => {
            closePanels();
            setPanelOpen(true);
            focusPlace(place);
            setStoryPlace(place);
          }}
          onDelete={handleDelete}
        />
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdd={startAdd}
        showLabels={labels}
        terrainEnabled={terrain}
        onToggleLabels={() => setLabels((value) => !value)}
        onToggleTerrain={() => setTerrain((value) => !value)}
        onOpenLocation={() => { closePanels(); openSettings(); }}
        locationReady={!!geo.fix}
        places={visiblePlaces}
        category={category}
        onCategory={handleCategory}
        onPick={handleDrawerPick}
        isMine={canManagePlace}
      />

      {notificationsOpen && (
        <NotificationsPanel notifications={visibleNotifications} unreadCount={unreadCount} onClose={() => setNotificationsOpen(false)} onMarkAllRead={handleMarkAllRead} onMarkRead={handleNotificationRead} onOpenGroup={openGroupFromNotification} />
      )}

      {draft && (
        <AddDiscoveryModal
          draft={draft}
          uploadPhoto={cloud.uploadPhoto}
          onClose={() => setDraft(null)}
          onSave={handleSave}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          onClose={closeSettings}
          theme={theme}
          onTheme={setTheme}
          baseMap={baseMap}
          onBaseMap={setBaseMap}
          installApp={installApp}
          location={{
            supported: geo.supported,
            secure: geo.secure,
            permission: geo.permission,
            status: geo.status,
            fix: geo.fix,
            label: preciseLabel,
          }}
          onAllowLocation={handleAllowLocation}
          onClearLocation={handleClearLocation}
          onShowLocation={handleShowLocation}
        />
      )}

      {onboarding && (
        <Onboarding
          onClose={dismissOnboarding}
          onNearby={() => {
            dismissOnboarding();
            handleLocate();
          }}
          onRoute={() => {
            dismissOnboarding();
            setAtlasOpen(true);
          }}
          onLeave={() => {
            dismissOnboarding();
            startAdd();
          }}
        />
      )}

      {liveStoryPlace && (
        <PlaceDetails
          place={liveStoryPlace}
          onClose={() => setStoryPlace(null)}
          onStreet={() => {
            const place = liveStoryPlace;
            if (!place) return;
            if (smallScreen) setStoryPlace(null);
            setStreetPlace(place);
          }}
          onPlan={() => {
            const place = liveStoryPlace;
            if (!place) return;
            closePanels();
            focusPlace(place);
            setAtlasOpen(true);
          }}
          canDelete={canManagePlace(liveStoryPlace)}
          onDelete={() => handleDelete(liveStoryPlace)}
          onVerify={(status, note) => {
            const target = liveStoryPlace;
            if (!target) return Promise.resolve();
            return freshness.verify(target.id, status, note);
          }}
        />
      )}
      {streetPlace && !atlasOpen && (
        <StreetPeek
          place={streetPlace}
          corner={storyPlace ? "left" : "right"}
          onClose={() => setStreetPlace(null)}
        />
      )}

      <nav aria-label="Mobil ana menü" className="mobile-tab-bar fixed inset-x-0 bottom-0 z-40 flex h-[calc(56px+env(safe-area-inset-bottom))] items-start justify-around border-t border-leaf/20 bg-[#041d17] pb-[env(safe-area-inset-bottom)] md:hidden">
        {[
          { label: "Keşfet", icon: Compass, action: mobileExplore },
          { label: "Kaydet", icon: Bookmark, action: openRecords },
          { label: "Topluluk", icon: UsersRound, action: () => { closePanels(); setFeedOpen(true); } },
          { label: "Profil", icon: UserRound, action: openProfile },
          { label: "İzlerim", icon: MapPin, action: openMyPlaces },
        ].map(({ label, icon: Icon, action }) => (
          <button key={label} type="button" onClick={action} aria-current={mobileTab === label ? "page" : undefined} className="mobile-tab-item flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-mint">
            <Icon size={16} strokeWidth={1.8} />{label}
          </button>
        ))}
      </nav>

      {/* Ortadaki artı: pin bırak */}
      <button
        type="button"
        onClick={startAdd}
        aria-label="Haritaya iz bırak"
        className="mobile-add-fab fixed bottom-[calc(66px+env(safe-area-inset-bottom))] left-1/2 z-30 grid size-[46px] -translate-x-1/2 place-items-center rounded-full bg-sun text-[#10241A] shadow-xl shadow-black/40 transition active:scale-95 md:hidden"
      >
        <Plus className="size-[22px]" strokeWidth={2.4} />
      </button>

      {toast && (
        <div
          role="status"
          className="mobile-toast animate-rise absolute top-[88px] left-1/2 z-50 -translate-x-1/2 rounded-full border border-leaf/30 bg-ink-2/95 px-5 py-2.5 text-[13px] whitespace-nowrap text-mint shadow-xl shadow-black/60 backdrop-blur-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function AuthGate({ installApp }: { installApp: InstallAppController }) {
  const { user, checking } = useAuth();
  const [accessOpen, setAccessOpen] = useState(false);
  const previousUser = useRef(user);

  useEffect(() => {
    if (previousUser.current && !user) setAccessOpen(false);
    previousUser.current = user;
  }, [user]);

  if (checking) {
    return <div className="grid h-dvh place-items-center bg-[#020f0d]"><p className="font-display text-3xl font-semibold text-mint">atlasia<span className="text-sun">.</span></p></div>;
  }
  if (!user) return accessOpen ? <AccountAccess /> : <LandingPage onStart={() => setAccessOpen(true)} />;
  if (user.requiresEmailVerification) return <EmailVerification />;
  if (!user.displayName?.trim()) return <ProfileSetup />;
  return <CollectionsProvider key={user.uid}><Explorer installApp={installApp} /></CollectionsProvider>;
}

export default function App() {
  const installApp = useInstallApp();
  return <AuthProvider><AuthGate installApp={installApp} /></AuthProvider>;
}
