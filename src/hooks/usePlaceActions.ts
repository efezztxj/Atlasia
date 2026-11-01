/**
 * Atlasia — yer gezinme ve yer CRUD eylemleri (F2-1b).
 *
 * NEDEN VAR: `Explorer.tsx` içinde harita üzerindeki "seç / uç / filtrele /
 * ara / sıfırla" davranışı ile "ekle / kaydet / sil" davranışı iki ayrı yığın
 * hâlinde, ~150 satır boyunca dosyanın ortasında duruyordu. İkisi de aynı üç
 * kaynağa bağlı: harita tutamacı (`mapRef`), görünür yer listesi ve panel
 * bayrakları.
 *
 * KORUNAN DAVRANIŞ (birebir):
 *  · `focusPlace` uçar + etiketi bölgeye çeker; seçim yan panelleri kapatır.
 *  · `handleCycle` boş listede hiçbir şey yapmaz; döngü modüler aritmetikle
 *    sarar (baştan sona, sondan başa).
 *  · `handleSearchPick` yer sonucunda panel açar, **yer olmayan** sonuçta
 *    etiketi yazar ve haritayı konumlandırır (bbox varsa sığdırır).
 *  · `handleSave` misafiri kayda çağırır (T5), taslak yoksa sessizce döner.
 *  · `handleDelete` yalnız yönetilebilir izi siler; onay yoksa `false` döner;
 *    hata Türkçe mesajla toast'a yazılır ve `false` döner.
 */
import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { CategoryId, Place, ViewState } from "../types";
import type { MapViewHandle } from "../components/MapView";
import type { SearchResult } from "../utils/geo";
import { analytics } from "../lib/analytics";
import { requestConfirm } from "../components/ConfirmDialog";
import { placeDeleteErrorMessage } from "../lib/firestoreValue";

export interface PlaceNavigationArgs {
  allPlaces: Place[];
  visiblePlaces: Place[];
  current: Place | null | undefined;
  mapRef: RefObject<MapViewHandle | null>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setSpin: Dispatch<SetStateAction<boolean>>;
  setHeroCompact: Dispatch<SetStateAction<boolean>>;
  setLocationLabel: Dispatch<SetStateAction<string>>;
  setPanelOpen: Dispatch<SetStateAction<boolean>>;
  setStoryPlace: Dispatch<SetStateAction<Place | null>>;
  setStreetPlace: Dispatch<SetStateAction<Place | null>>;
  setAtlasOpen: Dispatch<SetStateAction<boolean>>;
  setDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setFeedOpen: Dispatch<SetStateAction<boolean>>;
  setRecordsOpen: Dispatch<SetStateAction<boolean>>;
  setCategory: Dispatch<SetStateAction<CategoryId | null>>;
  setFeaturedIdx: Dispatch<SetStateAction<number>>;
}

export interface PlaceNavigation {
  focusPlace: (place: Place, zoom?: number) => void;
  handleSelect: (id: string) => void;
  handleCategory: (category: CategoryId | null) => void;
  handleCycle: (direction: 1 | -1) => void;
  handleSearchPick: (result: SearchResult) => void;
  handleReset: () => void;
  handleDrawerPick: (place: Place) => void;
  handleFeedGoTo: (lng: number, lat: number, label: string) => void;
}

export function usePlaceNavigation(args: PlaceNavigationArgs): PlaceNavigation {
  const {
    allPlaces, visiblePlaces, current, mapRef,
    setActiveId, setSpin, setHeroCompact, setLocationLabel, setPanelOpen,
    setStoryPlace, setStreetPlace, setAtlasOpen, setDrawerOpen, setFeedOpen,
    setRecordsOpen, setCategory, setFeaturedIdx,
  } = args;

  const focusPlace = useCallback((p: Place, zoom = 8) => {
    setActiveId(p.id);
    setSpin(false);
    setLocationLabel(p.region);
    mapRef.current?.flyTo(p.lng, p.lat, zoom);
  }, [setSpin, setActiveId, setLocationLabel, mapRef]);

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
    [allPlaces, focusPlace, setAtlasOpen, setDrawerOpen, setFeedOpen, setPanelOpen, setRecordsOpen, setStoryPlace, setStreetPlace],
  );

  const handleCategory = (c: CategoryId | null) => {
    setCategory(c);
    setActiveId(null);
    setFeaturedIdx(0);
  };

  const handleCycle = (dir: 1 | -1) => {
    if (!visiblePlaces.length) return;
    const idx = Math.max(0, visiblePlaces.findIndex((p) => p.id === current?.id));
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

  const handleDrawerPick = (p: Place) => {
    setDrawerOpen(false);
    setPanelOpen(true);
    focusPlace(p);
    setStoryPlace(p);
    setStreetPlace(null);
    setFeedOpen(false);
    setAtlasOpen(false);
  };

  /** Akıştaki bir gönderi ya da story'nin konumuna uç. */
  const handleFeedGoTo = useCallback((lng: number, lat: number, label: string) => {
    setSpin(false);
    setActiveId(null);
    setLocationLabel(label);
    mapRef.current?.flyTo(lng, lat, 9);
    if (window.innerWidth < 1024) setFeedOpen(false);
  }, [setSpin, setFeedOpen, setActiveId, setLocationLabel, mapRef]);

  return { focusPlace, handleSelect, handleCategory, handleCycle, handleSearchPick, handleReset, handleDrawerPick, handleFeedGoTo };
}

/** `handleSave`'in aldığı form verisi (AddDiscoveryModal sözleşmesi). */
export interface PlaceDraftInput {
  title: string;
  category: CategoryId;
  note: string;
  author: string;
  region: string;
  photo?: string;
}

export interface PlaceCrudArgs {
  draft: { lng: number; lat: number } | null;
  setDraft: Dispatch<SetStateAction<{ lng: number; lat: number } | null>>;
  activeId: string | null;
  guest: boolean;
  cloudAccount: boolean;
  view: ViewState;
  /** Bulut ya da cihaz yerine yazan depo (useFirestoreAtlasData / yerel). */
  addPlace: (input: Omit<Place, "id" | "kind" | "createdAt">) => Promise<Place>;
  removePlace: (id: string) => Promise<void>;
  canManagePlace: (place: Place) => boolean;
  askAccount: (message: string, intent?: "place" | "route" | "feed") => void;
  closePanels: () => void;
  focusPlace: (place: Place, zoom?: number) => void;
  setToast: (message: string | null) => void;
  setAddMode: Dispatch<SetStateAction<boolean>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setCategory: Dispatch<SetStateAction<CategoryId | null>>;
  setFeaturedIdx: Dispatch<SetStateAction<number>>;
  setPanelOpen: Dispatch<SetStateAction<boolean>>;
  setDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setStoryPlace: Dispatch<SetStateAction<Place | null>>;
  setStreetPlace: Dispatch<SetStateAction<Place | null>>;
  setSpin: Dispatch<SetStateAction<boolean>>;
}

export interface PlaceCrud {
  startAdd: () => void;
  handleMapClick: (lng: number, lat: number) => void;
  handleSave: (data: PlaceDraftInput) => Promise<void>;
  handleDelete: (place: Place) => Promise<boolean>;
}

export function usePlaceCrud(args: PlaceCrudArgs): PlaceCrud {
  const {
    draft, setDraft, activeId, guest, cloudAccount, view, addPlace, removePlace,
    canManagePlace, askAccount, closePanels, focusPlace, setToast, setAddMode,
    setActiveId, setCategory, setFeaturedIdx, setPanelOpen, setDrawerOpen,
    setStoryPlace, setStreetPlace, setSpin,
  } = args;

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

  const handleSave = async (data: PlaceDraftInput) => {
    if (!draft) return;
    if (guest) { askAccount("İz kaydetmek için bir hesap aç ya da giriş yap."); return; }
    const created = await addPlace({
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
      await removePlace(p.id);
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

  return { startAdd, handleMapClick, handleSave, handleDelete };
}
