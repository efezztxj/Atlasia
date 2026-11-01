/**
 * Atlasia — konum akışı (F2-1c).
 *
 * NEDEN VAR: `Explorer.tsx` içinde konumun haritaya çizilmesi, ters ad
 * çözümlemesi ("Kordon"), izin/hata toast'ları ve "konumu temizle" üç ayrı
 * yığında duruyordu (iki `useRef`, üç `useEffect`, dört işleyici). Hepsi tek
 * bir kaynağa bağlı: `geo` (useGeolocation) + harita tutamacı.
 *
 * KORUNAN DAVRANIŞ (birebir):
 *  · İlk düzeltme (fix) geldiğinde harita kullanıcıya uçar, döndürme durur,
 *    seçim kalkar ve **bir kez** "Konumun bulundu · ±X m" toast'ı çıkar.
 *  · Düzeltme kaybolursa işaret haritadan silinir, bayraklar sıfırlanır.
 *  · Ters ad çözümlemesi yalnız **0,25 km**'den fazla hareket edince çalışır;
 *    aborted istek sonucu yazmaz (yarış koşulu koruması).
 *  · İzin kapatıldığında/ zaman aşımında/ kullanılamadığında tek satır uyarı.
 *  · Temizleme: `geo.clear()`, bayraklar, etiket "Dünya", harita işareti kalkar.
 */
import { useCallback, useEffect, useMemo, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { MapViewHandle } from "../components/MapView";
import { formatAccuracy, type useGeolocation } from "./useGeolocation";
import { haversineKm, reverseName } from "../utils/geo";

export interface PreciseLocation {
  label: string;
  lng: number;
  lat: number;
  accuracy: number;
}

export interface LocationFlowArgs {
  geo: ReturnType<typeof useGeolocation>;
  mapRef: RefObject<MapViewHandle | null>;
  preciseLabel: string | null;
  setPreciseLabel: Dispatch<SetStateAction<string | null>>;
  setLocationLabel: Dispatch<SetStateAction<string>>;
  setToast: (message: string | null) => void;
  setSpin: Dispatch<SetStateAction<boolean>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  /** Konum ayarları aynı panelde: "konumu kullan" düğmesi oraya götürür. */
  openSettings: () => void;
  closeSettings: () => void;
  setProfileOpen: Dispatch<SetStateAction<boolean>>;
}

export interface LocationFlow {
  precise: PreciseLocation | null;
  handleLocate: () => void;
  handleAllowLocation: () => void;
  handleShowLocation: () => void;
  handleClearLocation: () => void;
}

export function useLocationFlow(args: LocationFlowArgs): LocationFlow {
  const {
    geo, mapRef, preciseLabel, setPreciseLabel, setLocationLabel, setToast,
    setSpin, setActiveId, openSettings, closeSettings, setProfileOpen,
  } = args;

  const announced = useRef(false);
  const geocodedAt = useRef<{ lng: number; lat: number } | null>(null);

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

  // Konum ve depolama aynı paneli paylaşır; düzeltme gelmesi paneli kapatmaz.
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
  }, [geo.fix, setSpin, setActiveId, setToast, setPreciseLabel, mapRef]);

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

  // Hata durumlarını kullanıcıya anlat.
  useEffect(() => {
    if (geo.status === "denied" && announced.current) {
      setToast("Konum izni kapatıldı.");
    }
    if (geo.status === "timeout") setToast("Konum zaman aşımına uğradı, tekrar dene.");
    if (geo.status === "unavailable") setToast("Konum şu an alınamıyor.");
  }, [geo.status, setToast]);

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
  }, [geo, setToast, setLocationLabel, setPreciseLabel, mapRef]);

  return { precise, handleLocate, handleAllowLocation, handleShowLocation, handleClearLocation };
}
