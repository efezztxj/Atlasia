/**
 * Atlasia — harita sahnesi (F1-6, adım 3).
 *
 * NEDEN VAR: `Explorer.tsx` 1.796 satırdan 969'a indi; geriye kalanın büyük
 * kısmı haritanın **kompozisyonu** idi: MapView, başlık, karşılama şeridi,
 * arama, harita kontrolleri, yürüyüş düğmesi, katman sayfası, iz kaydedici ve
 * sesli rehber (177 satır). Bu dosya o kompozisyonu taşır.
 *
 * SÖZLEŞME: Bu bileşen durum sahibi değildir; hiç `useState`/abonelik açmaz.
 * Prop adları `Explorer` içindeki adlarla birebir aynıdır ve panel/katman/akış
 * bayrakları doğrudan kancalardan `Pick<>` ile alınır.
 */
import { Suspense, lazy } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Place, ViewState } from "../../types";
import type { PlaceViewport } from "../../lib/firestoreData";
import type { MapViewHandle } from "../MapView";
import type { useGeolocation } from "../../hooks/useGeolocation";
import type { useAuth } from "../../contexts/AuthContext";
import type { useTheme } from "../../hooks/useTheme";
import type { PanelStack as PanelFlags } from "../../hooks/usePanelStack";
import type { MapLayerPrefs } from "../../hooks/useMapLayerPrefs";
import type { DiscoveryFlow } from "../../hooks/useDiscoveryFlow";
import type { PreciseLocation } from "./MapCanvas";
import { GUIDE_PLACES } from "../../data/places";
import { routeDrawLegs } from "../../utils/routeLegs";
import { decodePolyline } from "../../utils/polyline";
import Header from "../Header";
import Hero from "../Hero";
import SearchBox from "../SearchBox";
import MapControls from "../MapControls";
import { MapSurfaceHints } from "./MapCanvas";
import { MobileSearchSheet } from "./OverlayPanels";
import { WalkFab } from "./DockChrome";

// Harita ve ağır paneller yalnız gerektiğinde yüklenir (ilk boya korunur).
const MapView = lazy(() => import("../MapView"));
const MapLayersSheet = lazy(() => import("../MapLayersSheet"));
const TrackRecorderPanel = lazy(() => import("../TrackRecorderPanel"));
const NearbyAudioGuide = lazy(() => import("../NearbyAudioGuide"));

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

/** Kanca dışında kalan, `Explorer`'a özgü değer ve işleyiciler. */
export interface MapSceneExtras {
  allPlaces: Place[];
  visiblePlaces: Place[];
  guest: boolean;
  searchOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  unreadCount: number;
  mapRef: RefObject<MapViewHandle | null>;
  geo: ReturnType<typeof useGeolocation>;
  user: ReturnType<typeof useAuth>["user"];
  theme: ReturnType<typeof useTheme>["theme"];
  view: ViewState;
  reducedMotion: boolean;
  heroHidden: boolean;
  precise: PreciseLocation | null;
  trackPreviewDrawn: RefObject<boolean>;
  setView: Dispatch<SetStateAction<ViewState>>;
  setMapViewport: Dispatch<SetStateAction<PlaceViewport | null>>;
  setStoryPlace: Dispatch<SetStateAction<Place | null>>;
  closePanels: () => void;
  openSettings: () => void;
  openRecords: () => void;
  openProfile: () => void;
  openAtlas: () => void;
  startAdd: () => void;
  askAccount: (message: string, intent?: "place" | "route" | "feed") => void;
  focusPlace: (place: Place, zoom?: number) => void;
  handleSelect: (id: string) => void;
  handleMapClick: (lng: number, lat: number) => void;
  handleSearchPick: (result: Parameters<typeof SearchBox>[0]["onPick"] extends (r: infer R) => void ? R : never) => void;
  handleReset: () => void;
  handleLocate: () => void;
  handleClearLocation: () => void;
  drawAtlasRoute: (route: Parameters<typeof routeDrawLegs>[0], preview: boolean) => void;
}

export type MapSceneProps =
  & Pick<PanelFlags, "atlasOpen" | "notificationsOpen" | "panelOpen" | "searchOpen" | "setAtlasOpen" | "setDrawerOpen" | "setNotificationsOpen" | "setSearchOpen" | "setTrackRecorderOpen" | "trackRecorderOpen">
  & Pick<MapLayerPrefs, "baseMap" | "heroCompact" | "labels" | "layersOpen" | "setBaseMap" | "setHeroCompact" | "setLabels" | "setLayersOpen" | "setSpin" | "setTerrain" | "setWeatherHour" | "setWeatherMode" | "spin" | "terrain" | "toggleWeather" | "weather" | "weatherHour" | "weatherMode" | "weatherStatus">
  & Pick<DiscoveryFlow, "activeId" | "addMode" | "draft" | "setResumeRoute" | "setToast">
  & MapSceneExtras;

export function MapScene(props: MapSceneProps) {
  const {
    activeId,
    addMode,
    allPlaces,
    askAccount,
    atlasOpen,
    baseMap,
    closePanels,
    draft,
    drawAtlasRoute,
    focusPlace,
    geo,
    guest,
    handleClearLocation,
    handleLocate,
    handleMapClick,
    handleReset,
    handleSearchPick,
    handleSelect,
    heroCompact,
    heroHidden,
    labels,
    layersOpen,
    mapRef,
    notificationsOpen,
    openAtlas,
    openProfile,
    openRecords,
    openSettings,
    panelOpen,
    precise,
    reducedMotion,
    searchOpen,
    setAtlasOpen,
    setBaseMap,
    setDrawerOpen,
    setHeroCompact,
    setLabels,
    setLayersOpen,
    setMapViewport,
    setNotificationsOpen,
    setResumeRoute,
    setSearchOpen,
    setSpin,
    setStoryPlace,
    setTerrain,
    setToast,
    setTrackRecorderOpen,
    setView,
    setWeatherHour,
    setWeatherMode,
    spin,
    startAdd,
    terrain,
    theme,
    toggleWeather,
    trackPreviewDrawn,
    trackRecorderOpen,
    unreadCount,
    user,
    visiblePlaces,
    weather,
    weatherHour,
    weatherMode,
    weatherStatus,
  } = props;

  return (
    <>
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
    </>
  );
}
