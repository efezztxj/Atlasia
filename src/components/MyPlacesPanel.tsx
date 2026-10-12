import { useState } from "react";
import { ArrowRight, Loader2, MapPin, Sparkles, Trash2, X } from "lucide-react";
import type { Place } from "../types";
import { CATEGORY_MAP } from "../data/categories";
import PlaceImage from "./PlaceImage";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props {
  places: Place[];
  onClose: () => void;
  onPlace: (place: Place) => void;
  onDelete: (place: Place) => Promise<boolean>;
}

const dateLabel = (value?: number) => {
  if (!value) return "Tarih bilgisi yok";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(value);
};

export default function MyPlacesPanel({ places, onClose, onPlace, onDelete }: Props) {
  const panelRef = usePanelAccess(true, onClose);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const remove = async (place: Place) => {
    if (removingId) return;
    setRemovingId(place.id);
    await onDelete(place);
    setRemovingId(null);
  };

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="my-places-title"
      className="atlas-sheet fixed inset-x-3 top-[76px] bottom-[calc(62px+env(safe-area-inset-bottom))] z-[45] flex flex-col overflow-hidden rounded-[26px] border border-leaf/25 bg-[#031c16] shadow-2xl md:hidden"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
        <div className="min-w-0">
          <h2 id="my-places-title" className="font-display text-lg font-semibold">İzlerim</h2>
          <p className="mt-0.5 text-[12px] text-mint/65">Haritaya bıraktığın {places.length} iz</p>
        </div>
        <button type="button" onClick={onClose} aria-label="İzlerimi kapat" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/5"><X size={18} /></button>
      </header>

      {places.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-leaf/10 text-leaf"><Sparkles size={22} /></span>
          <h3 className="mt-4 font-display text-lg font-semibold">Henüz bir izin yok</h3>
          <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-mint/65">Haritada sarı artıya dokunup sevdiğin bir noktaya ilk izini bırakabilirsin.</p>
          <button type="button" onClick={onClose} className="mt-5 min-h-11 rounded-full bg-sun px-5 text-sm font-semibold text-ink">Haritaya dön</button>
        </div>
      ) : (
        <ul className="thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {places.map((place) => (
            <li key={place.id} className="overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.025]">
              <div className="flex gap-3 p-3">
                <PlaceImage place={place} compact className="size-[68px] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-white">{place.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] text-mint/60"><MapPin size={12} className="shrink-0 text-leaf" /><span className="truncate">{place.region}</span></p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-leaf">{CATEGORY_MAP[place.category].label}</span>
                    <span className="text-mint/40">{dateLabel(place.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] border-t border-white/[0.07]">
                <button type="button" onClick={() => onPlace(place)} className="flex min-h-11 items-center justify-between px-4 text-[12.5px] font-semibold text-sun">Haritada gör <ArrowRight size={14} /></button>
                <button type="button" disabled={removingId !== null} onClick={() => void remove(place)} aria-label={`${place.title} izini sil`} className="grid min-h-11 w-12 place-items-center border-l border-white/[0.07] text-red-200/75 transition hover:bg-red-400/10 hover:text-red-200 disabled:opacity-40">
                  {removingId === place.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
