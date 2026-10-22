import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bookmark, ChevronRight, ChevronUp, MapPin, Sparkles } from "lucide-react";
import { CATEGORIES } from "../data/categories";
import { useCollections } from "../hooks/useCollections";
import type { CategoryId, Place } from "../types";
import { cn } from "../utils/cn";
import PlaceImage from "./PlaceImage";

interface Props {
  open: boolean;
  onToggle: () => void;
  category: CategoryId | null;
  onCategory: (category: CategoryId | null) => void;
  current: Place | undefined;
  isActive: boolean;
  total: number;
  onShow: (place: Place) => void;
  onCycle: (direction: 1 | -1) => void;
  canDelete: (place: Place) => boolean;
  onDelete: (place: Place) => void | Promise<boolean>;
  onAdd: () => void;
  locationLabel: string;
  nearby: number;
}

type Snap = "peek" | "half" | "full";

/** Alt çubuk (58px) + eylem satırı (48px) + güvenli boşluk. */
const SHEET_BOTTOM = "calc(120px + env(safe-area-inset-bottom))";
const HALF = "min(52dvh, 470px)";
const FULL = "calc(100dvh - 196px)";
const PEEK_PX = 132;

function heightFor(snap: Snap) {
  return snap === "peek" ? PEEK_PX : snap === "half" ? Math.min(window.innerHeight * 0.52, 470) : window.innerHeight - 196;
}

/**
 * Mobil keşif paneli — Google Maps / Apple Maps'teki gibi üç kademeli
 * (peek → yarım → tam) sürüklenebilir alt sayfa.
 *
 * - Peek: kapalıyken de görünen ince kart (AGENTS.md: kapalı panel kaybolmaz).
 * - Yarım: kategoriler + seçili yer kartı.
 * - Tam: uzun açıklamalar için daha fazla alan.
 * Sürükleme yalnız tutamaç/başlık alanından başlar; düğmeler etkilenmez.
 */
export default function MobileDiscoverySheet({
  open,
  onToggle,
  category,
  onCategory,
  current,
  isActive,
  total,
  onShow,
  onCycle,
  canDelete,
  onDelete,
  onAdd,
  locationLabel,
  nearby,
}: Props) {
  const { savePlace, isSaved } = useCollections();
  const cardRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null);
  const [full, setFull] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const snap: Snap = !open ? "peek" : full ? "full" : "half";

  // Panel kapanınca tam kademede kalmasın.
  useEffect(() => {
    if (!open) setFull(false);
  }, [open]);

  const settle = useCallback(
    (height: number) => {
      const peek = heightFor("peek");
      const half = heightFor("half");
      const fullHeight = heightFor("full");
      if (height >= (half + fullHeight) / 2) {
        if (!open) onToggle();
        setFull(true);
        return;
      }
      if (height >= (peek + half) / 2) {
        if (!open) onToggle();
        setFull(false);
        return;
      }
      setFull(false);
      if (open) onToggle();
    },
    [onToggle, open],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    const card = cardRef.current;
    if (!card || event.pointerType === "mouse") return;
    dragRef.current = { startY: event.clientY, startHeight: card.getBoundingClientRect().height, moved: false };
    if (typeof card.setPointerCapture === "function") card.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = event.clientY - drag.startY;
    if (Math.abs(delta) > 6) drag.moved = true;
    const next = Math.min(heightFor("full"), Math.max(PEEK_PX, drag.startHeight - delta));
    setDragHeight(next);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const card = cardRef.current;
    if (card && typeof card.releasePointerCapture === "function") card.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    const height = dragHeight ?? drag.startHeight;
    setDragHeight(null);
    // Dokunma (sürükleme yok): bir kademe yukarı/aşağı.
    if (!drag.moved) {
      if (!open) onToggle();
      else if (!full) setFull(true);
      else setFull(false);
      return;
    }
    settle(height);
  };

  return (
    <section
      ref={cardRef}
      aria-label="Keşif önerileri"
      aria-expanded={open}
      style={{ height: dragHeight ? `${dragHeight}px` : snap === "peek" ? `${PEEK_PX}px` : snap === "half" ? HALF : FULL, bottom: SHEET_BOTTOM }}
      className={cn(
        "mobile-discovery-panel gold-frame fixed inset-x-3 z-20 flex flex-col overflow-hidden rounded-[26px] bg-[#021b16] px-3.5 pt-2 pb-3.5 md:hidden",
        dragHeight === null && "transition-[height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
      )}
    >
      {/* Sürükleme alanı: yalnız bu şeritten başlar. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={open ? "Keşif panelini büyüt veya küçült" : "Keşif panelini aç"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) onToggle();
            else setFull(true);
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (full) setFull(false);
            else if (open) onToggle();
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) onToggle();
            else if (!full) setFull(true);
            else setFull(false);
          }
        }}
        className="shrink-0 cursor-grab touch-none text-left select-none active:cursor-grabbing"
      >
        <span aria-hidden className="sheet-handle mx-auto mb-2" />
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-mint/75">
            <MapPin className="size-3.5 shrink-0 text-leaf" />
            <span className="truncate">{locationLabel}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0 text-sun">{total} iz</span>
          </p>
          <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-sun">
            {snap === "peek" ? "Aç" : snap === "half" ? "Genişlet" : "Küçült"}
            <ChevronUp className={cn("size-3.5 transition-transform", snap === "full" ? "rotate-180" : "rotate-0")} />
          </span>
        </div>
      </div>

      <div className="mt-1 shrink-0">
        <h2 className="font-display text-[18px] leading-tight font-semibold tracking-tight text-mint">
          {current && snap !== "peek" ? "Sıradaki durak" : "Bir sonraki güzel tesadüfün"}
        </h2>
        {snap === "peek" && (
          <p className="mt-0.5 truncate text-[11.5px] text-mint/65">
            {current ? current.title : "Kategorileri ve keşif önerilerini aç."}
          </p>
        )}
      </div>

      {snap !== "peek" && (
        <div className="thin-scroll mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
          <p className="text-[12px] leading-[1.35] text-mint/75">Küreyi çevir ya da bir nokta seç. Merakının götürdüğü yere.</p>

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
            <div className="mt-3 border-t border-white/10 pt-3">
              <button type="button" onClick={() => onShow(current)} className="flex w-full items-center gap-3 text-left">
                <PlaceImage place={current} compact className="h-[58px] w-[72px] shrink-0 rounded-xl ring-1 ring-white/10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-white">
                    {current.title}
                    <span className="font-normal text-mint/60"> · </span>
                    <span className={cn("font-normal", current.kind === "user" ? "text-leaf" : "text-sun")}>
                      {current.kind === "user" ? `Keşif · ${current.author}` : current.author}
                    </span>
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[11.5px] leading-snug text-mint/65">{current.note}</span>
                </span>
              </button>

              {/* Hızlı eylemler: tek elle ulaşılabilir, eşit genişlikte hedefler. */}
              <div className="mt-3 grid grid-cols-[auto_auto_1fr] items-center gap-2">
                <button
                  type="button"
                  onClick={() => savePlace(current)}
                  aria-label={isSaved(current.id) ? "Yer kaydını kaldır" : "Yeri kaydet"}
                  aria-pressed={isSaved(current.id)}
                  className="grid size-11 place-items-center rounded-full border border-white/15 text-sun transition active:scale-95"
                >
                  <Bookmark size={17} fill={isSaved(current.id) ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => onCycle(1)}
                  aria-label="Sonraki keşif yerini göster"
                  className="grid size-11 place-items-center rounded-full border border-white/15 text-mint transition active:scale-95"
                >
                  <ChevronRight size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => onShow(current)}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold text-ink transition active:scale-[0.98]",
                    isActive ? "bg-leaf" : "btn-gold",
                  )}
                >
                  {isActive ? "Odaklandı" : "Haritada gör"}
                  <ArrowRight className="size-4" strokeWidth={2.6} />
                </button>
              </div>

              {canDelete(current) && (
                <button
                  type="button"
                  onClick={() => void onDelete(current)}
                  className="mt-2 w-full rounded-full border border-red-400/25 py-2 text-[12px] font-semibold text-red-300/85 transition hover:bg-red-400/10"
                >
                  Bu keşfimi sil
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-[12px] text-mint/75">
                {nearby > 0 ? `${nearby} yakın iz var.` : "Bu kategoride henüz iz yok."}
              </p>
              <button type="button" onClick={onAdd} className="btn-gold min-h-11 rounded-full px-4 text-[12px] font-semibold text-ink">
                İz bırak
              </button>
            </div>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-mint/55">
            <Sparkles className="size-3.5 shrink-0 text-sun" />
            Paneli yukarı sürükleyerek daha fazla yer görebilirsin.
          </p>
        </div>
      )}
    </section>
  );
}
