/**
 * Atlasia — panel orkestrasyonu (F1-6, adım 2).
 *
 * NEDEN VAR: `Explorer.tsx` içinde kayıtlar, rota düzenleyici, profil, izlerim,
 * çekmece, raporlar, bildirimler, ekleme modalı, ayarlar, karşılama, yer
 * ayrıntısı, sokak bakışı ve moderasyon uyarıları **tek bir koşullu blokta**
 * (228 satır) duruyordu. Hepsi "açık mı?" sorusuna göre çizilir; kendi kararı
 * yoktur. Karar `Explorer`'da kalır, çizim burada.
 *
 * SÖZLEŞME: Bu bileşen durum **sahibi değildir**; hiçbir `useState` kurmaz,
 * hiçbir veri aboneliği açmaz. Prop adları `Explorer` içindeki adlarla birebir
 * aynıdır ve panel bayrakları/setter'ları doğrudan kancalardan gelir
 * (`PanelStack`, `ModerationInbox`, `DiscoveryFlow`, `MapLayerPrefs`), böylece
 * aynı tip iki yerde yazılmaz.
 */
import { Suspense, lazy } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AtlasRoute, CategoryId, Place, UploadPhotoKind } from "../../types";
import type { VerificationStatus } from "../../utils/freshness";
import type { RouteVisibility } from "../../types";
import type { PanelStack as PanelFlags } from "../../hooks/usePanelStack";
import type { ModerationInbox } from "../../hooks/useModerationInbox";
import type { DiscoveryFlow } from "../../hooks/useDiscoveryFlow";
import type { MapLayerPrefs } from "../../hooks/useMapLayerPrefs";
import type { ExplorerEnvironment } from "../../hooks/useExplorerEnvironment";
import type { SettingsContentProps } from "../SettingsPanel";
import SettingsPanel from "../SettingsPanel";
import Onboarding from "../Onboarding";
import RecordsDock from "../RecordsDock";
import RouteEditor from "../RouteEditor";
import NotificationsPanel from "../NotificationsPanel";
import { analytics } from "../../lib/analytics";
import { MobileTabBar } from "./DockChrome";
import { storageGet, storageSet } from "../../utils/storage";
import { FIRST_ROUTE_KEY } from "../../hooks/useExplorerEnvironment";
import type {
  Announcement, Appeal, AppealStatus, Ban, BanDuration, Report, ReportStatus, TargetHistory, Warning,
} from "../../lib/moderation";

const ProfilePanel = lazy(() => import("../ProfilePanel"));
const MyPlacesPanel = lazy(() => import("../MyPlacesPanel"));
const Drawer = lazy(() => import("../Drawer"));
const StreetPeek = lazy(() => import("../StreetPeek"));
const AddDiscoveryModal = lazy(() => import("../AddDiscoveryModal"));
const PlaceDetails = lazy(() => import("../PlaceDetails"));
const ReportsPanel = lazy(() => import("../ReportsPanel"));
const SuspensionNotice = lazy(() => import("../SuspensionNotice"));
const WarningNotice = lazy(() => import("../ModerationNotices").then((m) => ({ default: m.WarningNotice })));
const AnnouncementBanner = lazy(() => import("../ModerationNotices").then((m) => ({ default: m.AnnouncementBanner })));

type ConfirmPlace = (place: Place) => Promise<boolean>;

/** Kanca dışında kalan, `Explorer`'a özgü el/veri parçaları. */
export interface PanelStackExtras {
  settingsOpen: boolean;
  setStoryPlace: Dispatch<SetStateAction<Place | null>>;
  setStreetPlace: Dispatch<SetStateAction<Place | null>>;
  setAtlasOpen: Dispatch<SetStateAction<boolean>>;
  setNotificationsOpen: (open: boolean) => void;
  /** Filtrelenmiş yer listesi (çekmece + yer ayrıntısı). */
  visiblePlaces: Place[];
  myPlaces: Place[];
  /** Açık yer ayrıntısı; engellenmiş yazar varsa `null`. */
  liveStoryPlace: Place | null;
  storyPlace: Place | null;
  streetPlace: Place | null;
  smallScreen: boolean;
  locationReady: boolean;
  uid: string;
  cloudAccount: boolean;
  guest: boolean;
  moderator: boolean;
  unreadCount: number;
  visibleNotifications: Parameters<typeof NotificationsPanel>[0]["notifications"];
  settingsContentProps: SettingsContentProps;
  labels: boolean;
  terrain: boolean;
  setLabels: Dispatch<SetStateAction<boolean>>;
  setTerrain: Dispatch<SetStateAction<boolean>>;
  closePanels: () => void;
  closeSettings: () => void;
  openRecords: () => void;
  openMyPlaces: () => void;
  openProfile: () => void;
  openAtlas: () => void;
  openSettings: () => void;
  startAdd: () => void;
  askAccount: (message: string, intent?: "place" | "route" | "feed") => void;
  focusPlace: (place: Place, zoom?: number) => void;
  canManagePlace: (place: Place) => boolean;
  handleDelete: ConfirmPlace;
  handleCategory: (category: CategoryId | null) => void;
  handleDrawerPick: (place: Place) => void;
  handleSave: (data: {
    title: string;
    category: CategoryId;
    note: string;
    author: string;
    region: string;
    photo?: string;
  }) => void | Promise<void>;
  uploadPhoto: (file: File, kind: UploadPhotoKind) => Promise<string>;
  verify: (id: string, status: VerificationStatus, note?: string) => Promise<void>;
  drawAtlasRoute: (route: AtlasRoute, preview: boolean) => void;
  markWarningRead: (warningId: string) => Promise<void>;
  handleLocate: () => void;
  mobileTab: string;
  mobileExplore: () => void;
  handleAppeal: (message: string) => Promise<void>;
  logout: () => void;
  activeWarning: Warning | null;
  myBan: Ban | null;
  myAppeal: Appeal | null;
  latestAnnouncement: Announcement | null;
  // --- moderasyon eylemleri (ReportsPanel sözleşmesi) ---
  handleReportStatus: (reportId: string, status: ReportStatus, note?: string) => Promise<void>;
  handleBan: (report: Report, days: BanDuration, reason: string) => Promise<void>;
  handleLiftBan: (uid: string) => Promise<void>;
  handleWarn: (report: Report, reason: string) => Promise<void>;
  handleTakedown: (report: Report) => Promise<void>;
  handleResolveAppeal: (appealId: string, status: Exclude<AppealStatus, "open">) => Promise<void>;
  handleCreateAnnouncement: (title: string, body: string) => Promise<void>;
  handleDeleteAnnouncement: (announcementId: string) => Promise<void>;
  handleFetchHistory: (uid: string) => Promise<TargetHistory>;
  handleMarkAllRead: () => void;
  handleNotificationRead: (id: string) => void;
  openGroupFromNotification: (groupId: string) => void;
  openFriendsFromNotification: () => void;
}

export type PanelStackProps =
  & Pick<PanelFlags, "adminOpen" | "atlasOpen" | "drawerOpen" | "myPlacesOpen" | "notificationsOpen" | "profileOpen" | "recordsOpen" | "reportsOpen" | "setAdminOpen" | "setAtlasOpen" | "setDrawerOpen" | "setFeedOpen" | "setMyPlacesOpen" | "setNotificationsOpen" | "setPanelOpen" | "setProfileOpen" | "setRecordsOpen" | "setReportsOpen" | "settingsOpen">
  & Pick<ModerationInbox, "announcements" | "appeals" | "bans" | "dismissedAnnouncement" | "modActions" | "myBan" | "myReports" | "myReportsError" | "queue" | "queueError" | "queueLoading" | "setDismissedAnnouncement">
  & Pick<DiscoveryFlow, "addMode" | "category" | "draft" | "routeEditorRoute" | "setDraft" | "setResumeRoute" | "setRouteEditorRoute" | "setToast">
  & Pick<ExplorerEnvironment, "dismissOnboarding" | "onboarding" | "smallScreen">
  & Pick<MapLayerPrefs, "labels" | "setLabels" | "setTerrain" | "terrain">
  & PanelStackExtras;

export function PanelStack(props: PanelStackProps) {
  const {
    activeWarning,
    addMode,
    adminOpen,
    announcements,
    appeals,
    askAccount,
    atlasOpen,
    bans,
    canManagePlace,
    category,
    closePanels,
    closeSettings,
    cloudAccount,
    dismissOnboarding,
    dismissedAnnouncement,
    draft,
    drawAtlasRoute,
    drawerOpen,
    focusPlace,
    guest,
    handleAppeal,
    handleBan,
    handleCategory,
    handleCreateAnnouncement,
    handleDelete,
    handleDeleteAnnouncement,
    handleDrawerPick,
    handleFetchHistory,
    handleLiftBan,
    handleLocate,
    handleMarkAllRead,
    handleNotificationRead,
    handleReportStatus,
    handleResolveAppeal,
    handleSave,
    handleTakedown,
    handleWarn,
    labels,
    latestAnnouncement,
    liveStoryPlace,
    locationReady,
    logout,
    markWarningRead,
    mobileExplore,
    mobileTab,
    modActions,
    moderator,
    myAppeal,
    myBan,
    myPlaces,
    myPlacesOpen,
    myReports,
    myReportsError,
    notificationsOpen,
    onboarding,
    openAtlas,
    openFriendsFromNotification,
    openGroupFromNotification,
    openMyPlaces,
    openProfile,
    openRecords,
    openSettings,
    profileOpen,
    queue,
    queueError,
    queueLoading,
    recordsOpen,
    reportsOpen,
    routeEditorRoute,
    setAdminOpen,
    setAtlasOpen,
    setDismissedAnnouncement,
    setDraft,
    setDrawerOpen,
    setFeedOpen,
    setLabels,
    setMyPlacesOpen,
    setNotificationsOpen,
    setPanelOpen,
    setProfileOpen,
    setRecordsOpen,
    setReportsOpen,
    setResumeRoute,
    setRouteEditorRoute,
    setStoryPlace,
    setStreetPlace,
    setTerrain,
    setToast,
    settingsContentProps,
    settingsOpen,
    smallScreen,
    startAdd,
    storyPlace,
    streetPlace,
    terrain,
    uid,
    unreadCount,
    uploadPhoto,
    verify,
    visibleNotifications,
    visiblePlaces,
  } = props;


  return (
    <>
      {recordsOpen && <RecordsDock onClose={() => setRecordsOpen(false)} onPlace={(place) => { closePanels(); focusPlace(place); setStoryPlace(place); }} onRoute={(route) => { closePanels(); setResumeRoute(route); setAtlasOpen(true); }} />}
      {routeEditorRoute && <RouteEditor
        route={routeEditorRoute}
        onClose={() => setRouteEditorRoute(null)}
        onSaved={(route, visibility: RouteVisibility) => {
          const stops = route.days.reduce((total, day) => total + day.stops.length, 0);
          analytics.routePublished({
            account: cloudAccount ? "cloud" : "device",
            visibility: visibility === "private" ? "private" : "public",
            stops,
          });
          // Aktivasyon metriği: cihazda ilk kez rota oluşturma. Yerel bayrak,
          // aynı kullanıcının sonraki rotalarının sayacı şişirmesini engeller.
          if (!storageGet(FIRST_ROUTE_KEY)) {
            analytics.firstRouteCreated({ account: cloudAccount ? "cloud" : "device", stops });
            storageSet(FIRST_ROUTE_KEY, "1");
          }
          setResumeRoute(route);
          setAtlasOpen(true);
          drawAtlasRoute(route, false);
          setToast(visibility === "private" ? "Rota hesabında özel olarak kaydedildi." : "Rota yayımlandı. Kalıcı bağlantı hazır.");
        }}
      />}
      {profileOpen && (
        <Suspense fallback={null}>
          <ProfilePanel
            onClose={() => setProfileOpen(false)}
            onRecords={openRecords}
            settings={settingsContentProps}
            myPlacesCount={myPlaces.length}
            onMyPlaces={openMyPlaces}
            unreadCount={unreadCount}
            onNotifications={() => { closePanels(); setNotificationsOpen(true); }}
            onAtlasAI={openAtlas}
          />
        </Suspense>
      )}
      {myPlacesOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      <Suspense fallback={null}>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdd={startAdd}
        showLabels={labels}
        terrainEnabled={terrain}
        onToggleLabels={() => setLabels((value) => !value)}
        onToggleTerrain={() => setTerrain((value) => !value)}
        onOpenLocation={() => { closePanels(); openSettings(); }}
        locationReady={locationReady}
        places={visiblePlaces}
        category={category}
        onCategory={handleCategory}
        onPick={handleDrawerPick}
        isMine={canManagePlace}
        onRecords={openRecords}
      />
      </Suspense>

      {(reportsOpen || (adminOpen && moderator)) && (
        <Suspense fallback={null}>
          <ReportsPanel
            open
            admin={adminOpen && moderator}
            onClose={() => { setReportsOpen(false); setAdminOpen(false); }}
            uid={uid}
            moderator={moderator}
            myReports={myReports}
            myReportsError={myReportsError}
            queue={queue}
            queueLoading={queueLoading}
            queueError={queueError}
            onStatus={handleReportStatus}
            bans={bans}
            onBan={handleBan}
            onLiftBan={handleLiftBan}
            onWarn={handleWarn}
            onTakedown={handleTakedown}
            appeals={appeals}
            onResolveAppeal={handleResolveAppeal}
            modActions={modActions}
            announcements={announcements}
            onCreateAnnouncement={handleCreateAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onFetchHistory={handleFetchHistory}
          />
        </Suspense>
      )}

      {notificationsOpen && (
        <NotificationsPanel notifications={visibleNotifications} unreadCount={unreadCount} onClose={() => setNotificationsOpen(false)} onMarkAllRead={handleMarkAllRead} onMarkRead={handleNotificationRead} onOpenGroup={openGroupFromNotification} onOpenFriends={openFriendsFromNotification} />
      )}

      {draft && (
        <Suspense fallback={null}>
        <AddDiscoveryModal
          draft={draft}
          uploadPhoto={uploadPhoto}
          onClose={() => setDraft(null)}
          onSave={handleSave}
        />
        </Suspense>
      )}

      {settingsOpen && (
        <SettingsPanel onClose={closeSettings} {...settingsContentProps} />
      )}

      {onboarding && (
        <Onboarding
          guest={guest}
          onClose={() => {
            analytics.onboardingChoice({ choice: "skip", guest });
            dismissOnboarding();
          }}
          onNearby={() => {
            analytics.onboardingChoice({ choice: "nearby", guest });
            dismissOnboarding();
            handleLocate();
          }}
          onRoute={() => {
            analytics.onboardingChoice({ choice: "route", guest });
            dismissOnboarding();
            // Misafirde rota yayımlamak hesap ister; T5 niyeti kaydedilir ve
            // hesap açılışında Atlas AI'a dönülür.
            if (guest) {
              askAccount("Rota oluşturmak için bir hesap aç ya da giriş yap.", "route");
              return;
            }
            setAtlasOpen(true);
          }}
          onLeave={() => {
            analytics.onboardingChoice({ choice: "leave", guest });
            dismissOnboarding();
            startAdd();
          }}
        />
      )}

      {liveStoryPlace && (
        <Suspense fallback={null}>
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
            onOpenPlace={(next) => {
              focusPlace(next, 16);
              setStoryPlace(next);
            }}
            onVerify={(status, note) => {
              const target = liveStoryPlace;
              if (!target) return Promise.resolve();
              return verify(target.id, status, note);
            }}
          />
        </Suspense>
      )}
      {streetPlace && !atlasOpen && (
        <Suspense fallback={null}>
        <StreetPeek
          place={streetPlace}
          corner={storyPlace ? "left" : "right"}
          onClose={() => setStreetPlace(null)}
        />
        </Suspense>
      )}

      {/* Mobil ana menü (2026-10-25 düzeni) — çizim: DockChrome.tsx */}
      <MobileTabBar
        mobileTab={mobileTab}
        addMode={addMode}
        onExplore={mobileExplore}
        onCommunity={() => { closePanels(); setFeedOpen(true); }}
        onAdd={startAdd}
        onProfile={openProfile}
        onMyPlaces={openMyPlaces}
      />

      {myBan && (
        <Suspense fallback={null}>
          <SuspensionNotice ban={myBan} appeal={myAppeal} onAppeal={handleAppeal} onSignOut={logout} />
        </Suspense>
      )}

      {!myBan && activeWarning && (
        <Suspense fallback={null}>
          <WarningNotice warning={activeWarning} onAcknowledge={markWarningRead} />
        </Suspense>
      )}

      {!myBan && latestAnnouncement && dismissedAnnouncement !== latestAnnouncement.id && (
        <Suspense fallback={null}>
          <AnnouncementBanner
            announcement={latestAnnouncement}
            onDismiss={(id) => { setDismissedAnnouncement(id); storageSet("atlasia.announcement.dismissed", id); }}
          />
        </Suspense>
      )}


    </>
  );
}
