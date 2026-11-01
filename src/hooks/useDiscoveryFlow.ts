/**
 * Atlasia — keşif akışı (F1-4).
 *
 * NEDEN VAR: `Explorer.tsx` içinde seçim (aktif yer), kategori filtresi, öne
 * çıkan serit, ekleme modu, harita taslağı, toast, rota devamı ve rota
 * düzenleyici durumları dağınık duruyordu; toast zamanlayıcısı ile Esc
 * kısayolu da dosyanın 600. satırlarındaydı. Bu kanca akışın tamamını tek
 * yerde tutar; `Explorer` yalnız görünümü bağlar.
 *
 * KORUNAN DAVRANIŞ (birebir):
 *  · Toast 3.200 ms sonra kendiliğinden kapanır; yeni toast sayacı sıfırlar.
 *  · Ekleme modunda Esc çıkar (dinleyici yalnız mod açıkken takılır).
 *  · `resumeRoute` (T5: yarım kalan rota) ve `routeEditorRoute` ayrı: biri
 *    "kaldığın yerden devam", öteki elle düzenleme; ikisi karışmamalı.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { AtlasRoute, CategoryId } from "../types";

/** Harita üstünde seçilen nokta (ekleme taslağı). */
export interface DraftPoint {
  lng: number;
  lat: number;
}

export interface DiscoveryFlow {
  category: CategoryId | null;
  setCategory: Dispatch<SetStateAction<CategoryId | null>>;
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  featuredIdx: number;
  setFeaturedIdx: Dispatch<SetStateAction<number>>;
  addMode: boolean;
  setAddMode: Dispatch<SetStateAction<boolean>>;
  draft: DraftPoint | null;
  setDraft: Dispatch<SetStateAction<DraftPoint | null>>;
  toast: string | null;
  setToast: Dispatch<SetStateAction<string | null>>;
  resumeRoute: AtlasRoute | null;
  setResumeRoute: Dispatch<SetStateAction<AtlasRoute | null>>;
  routeEditorRoute: AtlasRoute | null;
  setRouteEditorRoute: Dispatch<SetStateAction<AtlasRoute | null>>;
}

export function useDiscoveryFlow(): DiscoveryFlow {
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<DraftPoint | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resumeRoute, setResumeRoute] = useState<AtlasRoute | null>(null);
  const [routeEditorRoute, setRouteEditorRoute] = useState<AtlasRoute | null>(null);

  // Toast otomatik kapansın.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Esc ile ekleme modundan çık.
  useEffect(() => {
    if (!addMode) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddMode(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addMode]);

  return {
    category, setCategory,
    activeId, setActiveId,
    featuredIdx, setFeaturedIdx,
    addMode, setAddMode,
    draft, setDraft,
    toast, setToast,
    resumeRoute, setResumeRoute,
    routeEditorRoute, setRouteEditorRoute,
  };
}
