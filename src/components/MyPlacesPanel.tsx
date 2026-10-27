import { useMemo, useState } from "react";
import { ArrowRight, Loader2, MapPin, Search, SearchX, Sparkles, Trash2, X } from "lucide-react";
import type { Place } from "../types";
import { normalize } from "../utils/text";
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
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return places;
    return places.filter((place) => normalize(`${place.title} ${place.region}`).includes(needle));
  }, [places, query]);

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
      className="atlas-sheet mobile-fullscreen fixed inset-0 z-[55] flex flex-col overflow-hidden bg-[#031c16] md:hidden"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2">
        <div className="min-w-0">
          <h2 id="my-places-title" className="font-display text-lg font-semibold">İzlerim</h2>
          <p className="mt-0.5 text-[12px] text-mint/70">Haritaya bıraktığın izler</p>
        </div>
        <span className="shrink-0 rounded-full bg-sun/12 px-2.5 py-1 text-[12px] font-bold text-sun ring-1 ring-sun/35">{places.length} iz</span>
        <button type="button" onClick={onClose} aria-label="İzlerimi kapat" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/5"><X size={18} /></button>
      </header>

      {places.length > 0 && (
        <div className="shrink-0 px-3 pb-2">
          <label className="flex min-h-11 items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.04] px-4 transition focus-within:border-sun/55">
            <Search size={16} className="shrink-0 text-sun" aria-hidden />
            <span className="sr-only">İzlerinde ara</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="İzlerinde ara: yer veya bölge"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-mint outline-none placeholder:text-mint/70"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Aramayı temizle" className="grid size-8 shrink-0 place-items-center rounded-full text-mint/70 hover:bg-white/10 hover:text-mint">
                <X size={14} />
              </button>
            )}
          </label>
          {query.trim() && (
            <p role="status" className="px-1 pt-2 text-[12px] text-mint/70">{filtered.length} sonuç bulundu</p>
          )}
        </div>
      )}

      {places.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-leaf/10 text-leaf"><Sparkles size={22} /></span>
          <h3 className="mt-4 font-display text-lg font-semibold">Henüz bir izin yok</h3>
          <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-mint/65">Haritada sarı artıya dokunup sevdiğin bir noktaya ilk izini bırakabilirsin.</p>
          <button type="button" onClick={onClose} className="btn-gold mt-5 min-h-11 rounded-full px-5 text-sm font-semibold text-ink">Haritaya dön</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-sun/10 text-sun ring-1 ring-sun/35"><SearchX size={22} /></span>
          <h3 className="mt-4 font-display text-lg font-semibold">Sonuç bulunamadı</h3>
          <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-mint/70">“{query.trim()}” ile eşleşen izin yok. Farklı bir yer veya bölge adı dene.</p>
          <button type="button" onClick={() => setQuery("")} className="btn-gold mt-5 min-h-11 rounded-full px-5 text-sm font-semibold text-ink">Aramayı temizle</button>
        </div>
      ) : (
        <ul className="thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {filtered.map((place) => (
            <li key={place.id} className="pressable overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.025] transition hover:border-sun/45">
              <div className="flex gap-3 p-3">
                <PlaceImage place={place} compact className="size-[68px] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-white">{place.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] text-mint/60"><MapPin size={12} className="shrink-0 text-leaf" /><span className="truncate">{place.region}</span></p>
                  {place.note && <p className="mt-1 line-clamp-1 text-[12px] leading-snug text-mint/70">{place.note}</p>}
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
