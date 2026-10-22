import { useEffect } from "react";
import { Crosshair, Globe2, MapPin, Plus, Tags, X } from "lucide-react";
import { CATEGORIES, CATEGORY_MAP } from "../data/categories";
import type { CategoryId, Place } from "../types";
import { cn } from "../utils/cn";
import { PlaceThumb } from "./BottomPanel";

interface Props {
  open: boolean;
  onClose: () => void;
  places: Place[];
  category: CategoryId | null;
  onCategory: (c: CategoryId | null) => void;
  onPick: (p: Place) => void;
  isMine: (p: Place) => boolean;
  onAdd: () => void;
  showLabels: boolean;
  terrainEnabled: boolean;
   onToggleLabels: () => void;
  onToggleTerrain: () => void;
  onOpenLocation: () => void;
  locationReady: boolean;
}

export default function Drawer({ open, onClose, places, category, onCategory, onPick, isMine, onAdd, showLabels, terrainEnabled, onToggleLabels, onToggleTerrain, onOpenLocation, locationReady }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden={!open}
        aria-label="Menüyü kapat"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-hidden={!open}
        // Kapalı çekmecenin düğmeleri Tab sırasından çıkar (ekran dışında görünmez odak olmasın).
        inert={!open}
        className={cn(
          "fixed top-0 right-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-40 flex w-full max-w-[400px] flex-col border-l border-sun/30 bg-ink-2/95 shadow-2xl shadow-black/70 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:bottom-0",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-sun uppercase">Keşfet</p>
            <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
              Haritadaki tüm izler
            </h3>
            <p className="mt-1 text-[12px] text-mint/60">{places.length} yer · rehber ve gezgin keşifleri</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="grid size-11 place-items-center rounded-full text-mint/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <button type="button" onClick={onAdd} className="btn-gold mx-6 mb-4 flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full text-[13px] font-bold text-ink md:hidden">
          <Plus className="size-4" />İz bırak
        </button>

        <button
          type="button"
          onClick={onOpenLocation}
          className={cn(
            "mx-6 mb-2 flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-[12px] md:hidden",
            locationReady ? "border-leaf/60 bg-leaf/10 text-leaf" : "border-leaf/35 text-mint",
          )}
        >
          <Crosshair className="size-4" />Konum{locationReady ? " hazır" : ""}
        </button>

        <div className="mx-6 mb-4 flex shrink-0 gap-2 md:hidden" aria-label="Görünüm seçenekleri">
          <button type="button" onClick={onToggleLabels} aria-pressed={showLabels} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-2 text-[12px]", showLabels ? "border-sun/55 bg-sun/10 text-sun" : "border-leaf/30 text-mint")}>
            <Tags className="size-4" />Yer adları
          </button>
          <button type="button" onClick={onToggleTerrain} aria-pressed={terrainEnabled} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-2 text-[12px]", terrainEnabled ? "border-sun/55 bg-sun/10 text-sun" : "border-leaf/30 text-mint")}>
            <Globe2 className="size-4" />3B arazi
          </button>
        </div>

        <div className="no-scrollbar fade-x flex gap-1.5 overflow-x-auto px-6 pb-3">
          <button
            onClick={() => onCategory(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition",
              category === null
                ? "border-sun bg-sun/15 text-sun"
                : "border-white/10 text-mint/70 hover:text-white",
            )}
          >
            Tümü
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategory(category === c.id ? null : c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition",
                category === c.id
                  ? "border-sun bg-sun/15 text-sun"
                  : "border-white/10 text-mint/70 hover:text-white",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <ul className="thin-scroll flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {places.length === 0 && (
            <li className="px-3 py-10 text-center text-[13px] text-mint/55">Bu kategoride henüz keşif yok.</li>
          )}
          {places.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/[0.06]"
              >
                <PlaceThumb place={p} className="size-[60px] shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-white">{p.title}</span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-mint/55">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{p.region}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-[10.5px]">
                    <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-mint/75">
                      {CATEGORY_MAP[p.category].label}
                    </span>
                    {p.kind === "user" && (
                      <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-leaf">{isMine(p) ? "Senin izin" : "Gezgin izi"}</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
