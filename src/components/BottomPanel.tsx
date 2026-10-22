import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Map,
  MapPin,
  MessagesSquare,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CATEGORIES } from "../data/categories";
import { formatAccuracy } from "../hooks/useGeolocation";
import type { CategoryId, Place } from "../types";
import { cn } from "../utils/cn";
import PlaceImage from "./PlaceImage";
import { useCollections } from "../hooks/useCollections";

interface Props {
  open: boolean;
  onToggle: () => void;
  category: CategoryId | null;
  onCategory: (c: CategoryId | null) => void;
  current: Place | undefined;
  isActive: boolean;
  locationLabel: string;
  nearby: number;
  total: number;
  onShow: (p: Place) => void;
  onCycle: (dir: 1 | -1) => void;
  canDelete: (p: Place) => boolean;
  onDelete: (p: Place) => void | Promise<boolean>;
  onAdd: () => void;
  /** Sol alttaki akış penceresi açıkken panel sağa kayar */
  shifted: boolean;
  onOpenFeed: () => void;
  /** Konum izni verildiyse metre cinsinden doğruluk */
  accuracy: number | null;
  locating: boolean;
}

export function PlaceThumb({ place, className }: { place: Place; className?: string }) {
  return <PlaceImage place={place} className={className} compact />;
}

export default function BottomPanel({
  open,
  onToggle,
  category,
  onCategory,
  current,
  isActive,
  locationLabel,
  nearby,
  total,
  onShow,
  onCycle,
  canDelete,
  onDelete,
  onAdd,
  shifted,
  onOpenFeed,
  accuracy,
  locating,
}: Props) {
  const { savePlace, isSaved } = useCollections();

  // Kapatılan keşif alanı kaybolmaz: açık panelin yer kartını tek, ince bir
  // satır olarak korur. Kartın metin tarafına dokunmak paneli yeniden açar.
  if (!open) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-20 flex justify-center px-3 pb-3 transition-[padding] duration-500 md:bottom-0 md:pb-7",
          shifted && "lg:pl-[420px]",
        )}
      >
        <div className="w-full max-w-[920px]">
          <section
            aria-label="Daraltılmış keşif önerisi"
            className="mobile-discovery-panel desktop-discovery-panel gold-frame pointer-events-auto rounded-[22px] bg-[#021915]/95 p-2.5 backdrop-blur-xl max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(120px+env(safe-area-inset-bottom))] max-md:z-20 md:rounded-[28px] md:p-4"
          >
            {current ? (
              <div className="flex min-w-0 items-center gap-1.5 md:gap-3">
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label={`Keşif panelini aç: ${current.title}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left md:gap-4"
                >
                  <PlaceThumb place={current} className="h-12 w-14 shrink-0 rounded-xl ring-1 ring-white/10 md:h-[58px] md:w-[72px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-white md:text-[13px]">
                      {current.title}
                      <span className="font-normal text-mint/60"> · </span>
                      <span className={cn("font-normal", current.kind === "user" ? "text-leaf" : "text-sun")}>
                        {current.kind === "user" ? `Keşif · ${current.author}` : current.author}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] leading-snug text-mint/65 md:text-[11.5px]">{current.note}</span>
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                  <button type="button" onClick={() => savePlace(current)} aria-label={isSaved(current.id) ? "Yer kaydını kaldır" : "Yeri kaydet"} className="hidden size-10 place-items-center rounded-full border border-white/15 text-sun min-[520px]:grid"><Bookmark size={16} fill={isSaved(current.id) ? "currentColor" : "none"} /></button>
                  <button type="button" onClick={() => onCycle(-1)} aria-label="Önceki yer" className="hidden size-8 place-items-center rounded-full border border-white/10 text-mint/70 transition hover:bg-white/10 hover:text-white md:grid"><ChevronLeft className="size-4" /></button>
                  <button type="button" onClick={() => onCycle(1)} aria-label="Sonraki yer" className="grid size-9 place-items-center rounded-full border border-white/10 text-mint/70 transition hover:bg-white/10 hover:text-white md:size-8"><ChevronRight className="size-4" /></button>
                  {canDelete(current) && (
                    <button type="button" onClick={() => void onDelete(current)} aria-label="Keşfimi sil" title="Keşfimi sil" className="hidden size-8 place-items-center rounded-full border border-red-400/20 text-red-300/70 transition hover:bg-red-400/10 hover:text-red-300 sm:grid"><Trash2 className="size-3.5" /></button>
                  )}
                  <button
                    type="button"
                    onClick={() => onShow(current)}
                    className={cn(
                      "flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold text-ink transition active:scale-95 md:px-5 md:text-[12.5px]",
                      isActive ? "bg-leaf" : "btn-gold",
                    )}
                  >
                    <span className="hidden sm:inline">{isActive ? "Odaklandı" : "Haritada gör"}</span>
                    <span className="sm:hidden">Gör</span>
                    <ArrowRight className="size-3.5" strokeWidth={2.6} />
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={onToggle} className="flex min-h-12 w-full items-center gap-3 text-left" aria-label="Keşif panelini aç">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf"><Sparkles className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-white">Bir sonraki güzel tesadüfün</span><span className="mt-0.5 block truncate text-[11px] text-mint/60">Kategorileri ve keşif önerilerini yeniden aç.</span></span>
                <ChevronUp className="size-4 shrink-0 text-sun" />
              </button>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-20 flex justify-center px-3 pb-3 transition-[padding] duration-500 md:bottom-0 md:pb-7",
        shifted && "lg:pl-[420px]",
      )}
    >
      <div className="w-full max-w-[920px]">
        <section aria-label="Keşif önerileri" className="mobile-discovery-panel gold-frame pointer-events-auto rounded-[26px] bg-[#021b16] px-3.5 pb-3.5 pt-2.5 max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(120px+env(safe-area-inset-bottom))] max-md:z-20 max-md:max-h-[42dvh] max-md:overflow-y-auto md:hidden">
          <span aria-hidden className="sheet-handle mb-2.5" />
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[12px] text-mint/75">Yol üstündekilerden küçük ipuçları</p>
            <button type="button" onClick={onToggle} aria-expanded={open} aria-label={open ? "Öneri panelini küçült" : "Öneri panelini genişlet"} className="flex min-h-9 shrink-0 items-center gap-1 text-[12px] font-medium text-sun">
              <MapPin className="size-3.5" />{total} iz
              <ChevronDown className={cn("size-3.5 transition-transform", !open && "rotate-180")} />
            </button>
          </div>

          <h2 className="font-display mt-1.5 text-[18px] leading-tight font-semibold tracking-tight text-mint">Bir sonraki güzel tesadüfün</h2>
          {open && (
            <>
              <p className="mt-0.5 text-[12px] leading-[1.35] text-mint/75">Küreyi çevir ya da bir nokta seç. Merakının götürdüğü yere.</p>
              <div className="mobile-category-grid mt-3 grid grid-cols-5 gap-1.5">
                {CATEGORIES.map((item) => {
                  const Icon = item.icon;
                  const selected = category === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onCategory(selected ? null : item.id)}
                      aria-pressed={selected}
                      className={cn(
                        "mobile-category-item pressable flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-[18px] border px-0.5 py-1 text-center text-[10px] leading-[1.05] transition",
                        selected ? "btn-gold border-transparent font-bold" : "border-leaf/35 bg-white/[0.015] text-mint/90",
                      )}
                    >
                      <Icon className="size-[15px] shrink-0" strokeWidth={1.65} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {current ? (
                <>
                  <div className="mt-3 flex items-center gap-2.5 border-t border-white/10 pt-2.5">
                    <PlaceThumb place={current} className="size-[52px] shrink-0 rounded-xl" />
                    <button type="button" onClick={() => onShow(current)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[13px] font-semibold text-mint">{current.title} <span className="font-normal text-sun">· {current.kind === "user" ? current.author : "Atlasia rehberi"}</span></span>
                      <span className="mt-0.5 block line-clamp-2 text-[11px] leading-[1.25] text-mint/75">{current.note}</span>
                    </button>
                    {canDelete(current) && (
                      <button type="button" onClick={() => void onDelete(current)} aria-label="Bu izimi sil" className="grid size-10 shrink-0 place-items-center rounded-full border border-red-300/25 text-red-200/80 transition hover:bg-red-400/10 hover:text-red-200">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => onCycle(1)} aria-label="Sonraki keşif yerini göster" className="grid size-10 shrink-0 place-items-center rounded-full border border-leaf/35 text-mint transition hover:bg-white/5">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                  <button type="button" onClick={() => onShow(current)} className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 btn-gold rounded-full px-4 text-[13px] font-bold text-[#10241A] transition">
                    <Map className="size-[17px]" strokeWidth={1.8} />Haritada gör <ArrowRight className="size-4" />
                  </button>
                </>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <p className="text-[12px] text-mint/75">Bu kategoride henüz iz yok.</p>
                  <button type="button" onClick={onAdd} className="btn-gold min-h-10 rounded-full px-3 text-[12px] font-semibold text-ink">İz bırak</button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Panel üstü şerit */}
        <div className="mb-3 hidden grid-cols-[1fr_auto_1fr] items-end gap-2 px-1 text-[12px] md:grid">
          <div className="col-start-1 justify-self-start">
            <button
              onClick={onOpenFeed}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-leaf/25 bg-ink/80 px-3 py-1.5 text-[11.5px] text-mint backdrop-blur-xl transition hover:border-leaf/60 hover:text-white lg:hidden"
            >
              <MessagesSquare className="size-3.5 text-leaf" />
               İzler
            </button>
            <span className="pointer-events-auto hidden font-medium text-mint drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] lg:block">
              Yol üstündekilerden küçük ipuçları
            </span>
          </div>
          <button
            onClick={onAdd}
            className="pointer-events-auto col-start-2 flex items-center gap-2 rounded-full border border-leaf/25 bg-ink/80 px-3.5 py-2 text-[12px] text-mint backdrop-blur-xl transition hover:border-sun/60 hover:text-white md:col-start-2"
          >
            <Sparkles className="size-3.5 text-leaf" />
            {nearby === 0 ? "Bu noktaya ilk izi sen bırak" : "Buraya sen de iz bırak"}
          </button>
          <span className="pointer-events-auto col-start-3 justify-self-end rounded-full border border-sun/35 bg-ink/80 px-3 py-1.5 font-semibold text-sun backdrop-blur-xl">
            {total} iz
          </span>
        </div>

        <section aria-label="Keşif önerileri" className="desktop-discovery-panel gold-frame pointer-events-auto hidden animate-rise rounded-[28px] bg-[#021915] p-4 md:block md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-[17px] leading-tight font-semibold tracking-tight text-white md:text-[21px]">
                Bir sonraki güzel tesadüfün
              </h2>
              {open && (
                <p className="mt-1.5 text-[12px] text-mint/65">
                  Küreyi çevir ya da bir nokta seç. Merakının götürdüğü yere.
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden max-w-[150px] items-center gap-1.5 truncate text-[12px] text-sun min-[440px]:flex md:max-w-[280px]">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{locationLabel}</span>
                {locating && (
                  <span className="shrink-0 rounded-full bg-leaf/15 px-1.5 py-0.5 text-[10px] leading-none text-leaf">
                    ölçülüyor…
                  </span>
                )}
                {!locating && accuracy !== null && (
                  <span
                    title="Konum doğruluğu"
                    className="shrink-0 rounded-full bg-leaf/15 px-1.5 py-0.5 text-[10px] leading-none text-leaf"
                  >
                    {formatAccuracy(accuracy)}
                  </span>
                )}
              </span>
              <button
                onClick={onToggle}
                aria-label={open ? "Paneli küçült" : "Paneli aç"}
                className="grid size-10 place-items-center rounded-full text-mint/70 transition hover:bg-white/10 hover:text-white"
              >
                {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </button>
            </div>
          </div>

          {open && (
            <>
              <div className="no-scrollbar fade-x -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 py-1">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const active = category === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => onCategory(active ? null : c.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-full border px-4 py-2 text-[12px] transition active:scale-95",
                        active
                          ? "btn-gold border-transparent font-bold"
                          : "border-leaf/25 bg-white/[0.02] text-mint/85 hover:border-leaf/60 hover:bg-white/[0.06]",
                      )}
                    >
                      <Icon className="size-[15px]" />
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {current && (
                <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4 md:gap-4">
                  <PlaceThumb
                    place={current}
                    className="h-[58px] w-[72px] shrink-0 rounded-xl ring-1 ring-white/10 md:h-[58px] md:w-[72px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">
                      {current.title}
                      <span className="font-normal text-mint/60"> · </span>
                      <span className={cn("font-normal", current.kind === "user" ? "text-leaf" : "text-sun")}>
                        {current.kind === "user" ? `Keşif · ${current.author}` : current.author}
                      </span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-mint/65">{current.note}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                    <button type="button" onClick={() => savePlace(current)} aria-label={isSaved(current.id) ? "Yer kaydını kaldır" : "Yeri kaydet"} className="hidden size-10 place-items-center rounded-full border border-white/15 text-sun sm:grid"><Bookmark size={16} fill={isSaved(current.id) ? "currentColor" : "none"} /></button>
                    <button
                      onClick={() => onCycle(-1)}
                      aria-label="Önceki yer"
                      className="hidden size-8 place-items-center rounded-full border border-white/10 text-mint/70 transition hover:bg-white/10 hover:text-white sm:grid"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => onCycle(1)}
                      aria-label="Sonraki yer"
                      className="hidden size-8 place-items-center rounded-full border border-white/10 text-mint/70 transition hover:bg-white/10 hover:text-white sm:grid"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    {canDelete(current) && (
                      <button
                        onClick={() => void onDelete(current)}
                        aria-label="Keşfimi sil"
                        title="Keşfimi sil"
                        className="grid size-8 place-items-center rounded-full border border-red-400/20 text-red-300/70 transition hover:bg-red-400/10 hover:text-red-300"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onShow(current)}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-bold text-ink transition active:scale-95 md:px-5",
                        isActive ? "bg-leaf" : "btn-gold",
                      )}
                    >
                      <span className="hidden sm:inline">{isActive ? "Odaklandı" : "Haritada gör"}</span>
                      <span className="sm:hidden">Gör</span>
                      <ArrowRight className="size-3.5" strokeWidth={2.6} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
