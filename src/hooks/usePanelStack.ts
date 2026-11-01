/**
 * Atlasia — panel yığını (F1-2).
 *
 * NEDEN VAR: `Explorer.tsx` 58 `useState` taşıyordu (bkz. `moduleSize.test.ts`
 * borç defteri). Panel açık/kapalı bayrakları — 14 durum — Explorer'ın en
 * dağınık kümesiydi: her yeni panel (profil, izlerim, bildirimler, yönetim,
 * arama…) aynı dosyaya üç satır ekliyordu.
 *
 * KORUNAN ÜRÜN KARARLARI (AGENTS.md): tek alt keşif paneli (`panelOpen`),
 * kapalı panelin kaybolmaması, mobil geri tuşunun LIFO sırası. Bu kanca yalnız
 * **sahipliği** taşır; sıra ve davranış `Explorer` içindeki `closeTopLayer` /
 * `closePanels` fonksiyonlarında aynen durur.
 */
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

export interface PanelStack {
  /** Alt keşif paneli (masaüstünde açık başlar, mobilde kapalı). */
  panelOpen: boolean;
  setPanelOpen: Dispatch<SetStateAction<boolean>>;
  /** Keşif kartının kapladığı yükseklik; 1 px altındaki titremeler yutulur. */
  discoverySpace: number;
  /** Ham setter: panel kapandığında boşluğu sıfırlamak için (0 yazımı). */
  setDiscoverySpace: Dispatch<SetStateAction<number>>;
  handleDiscoverySpaceChange: (space: number) => void;
  drawerOpen: boolean;
  setDrawerOpen: Dispatch<SetStateAction<boolean>>;
  feedOpen: boolean;
  setFeedOpen: Dispatch<SetStateAction<boolean>>;
  atlasOpen: boolean;
  setAtlasOpen: Dispatch<SetStateAction<boolean>>;
  recordsOpen: boolean;
  setRecordsOpen: Dispatch<SetStateAction<boolean>>;
  trackRecorderOpen: boolean;
  setTrackRecorderOpen: Dispatch<SetStateAction<boolean>>;
  profileOpen: boolean;
  setProfileOpen: Dispatch<SetStateAction<boolean>>;
  myPlacesOpen: boolean;
  setMyPlacesOpen: Dispatch<SetStateAction<boolean>>;
  notificationsOpen: boolean;
  setNotificationsOpen: Dispatch<SetStateAction<boolean>>;
  reportsOpen: boolean;
  setReportsOpen: Dispatch<SetStateAction<boolean>>;
  adminOpen: boolean;
  setAdminOpen: Dispatch<SetStateAction<boolean>>;
  searchOpen: boolean;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  settingsOpen: boolean;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  /** Tüm panelleri kapatır (katman/hikâye gibi diğer kümeler buraya dahil değil). */
  closeAllPanels: () => void;
}

export function usePanelStack(): PanelStack {
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 768);
  const [discoverySpace, setDiscoverySpace] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [trackRecorderOpen, setTrackRecorderOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [myPlacesOpen, setMyPlacesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 1 px altındaki titremeler yutulur: keşif kartı yeniden boyutlandıkça
  // panelin alt boşluğu zıplamasın (taşınmadan önceki davranışla aynı).
  const handleDiscoverySpaceChange = useCallback((space: number) => {
    setDiscoverySpace((current) => (Math.abs(current - space) < 1 ? current : space));
  }, []);

  // NOT: `panelOpen` bilinçli olarak kapanmıyor — "kapalı panel masaüstünde ve
  // mobilde tamamen kaybolmaz" ürün kararı gereği alt panel açık kalır.
  const closeAllPanels = useCallback(() => {
    setDrawerOpen(false);
    setFeedOpen(false);
    setAtlasOpen(false);
    setRecordsOpen(false);
    setProfileOpen(false);
    setMyPlacesOpen(false);
    setSettingsOpen(false);
    setNotificationsOpen(false);
    setReportsOpen(false);
    setAdminOpen(false);
    setSearchOpen(false);
    setTrackRecorderOpen(false);
  }, []);

  return {
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
    settingsOpen, setSettingsOpen,
    closeAllPanels,
  };
}
