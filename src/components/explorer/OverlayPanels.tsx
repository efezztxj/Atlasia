/**
 * Atlasia — geçici üst katmanlar (F1-6, adım 1).
 *
 * NEDEN VAR: canlı veri hata şeridi, ekleme modu bandı, mobil arama sayfası ve
 * toast `Explorer.tsx` içinde dört ayrı yerde duruyordu; hiçbiri iş mantığı
 * taşımıyor, hepsi "göster/gizle + tek geri çağrı" sözleşmesiyle çalışıyor.
 * Burada toplandılar; `Explorer` yalnız ne zaman göstereceğine karar verir.
 *
 * KURAL: prop adları `Explorer` içindeki adlarla birebir aynı (taşınan JSX
 * gövdesi değişmeden yerleşsin diye).
 */
import { Crosshair, MousePointerClick, X } from "lucide-react";
import SearchBox from "../SearchBox";
import type { SearchResult } from "../../utils/geo";
import type { Place } from "../../types";

export interface DataErrorBannerProps {
  onRetry: () => void;
  onDismiss: () => void;
}

export function DataErrorBanner({ onRetry, onDismiss }: DataErrorBannerProps) {
  return (
    <div role="alert" className="animate-rise absolute top-[88px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-sun/30 bg-ink/90 py-2 pr-2 pl-4 text-[12px] text-mint shadow-xl shadow-black/50">
      <span>Canlı veriler yüklenemedi · yerel kayıtlar gösteriliyor</span>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1 rounded-full bg-sun px-3 py-1.5 text-[12px] font-semibold text-ink transition"
      >
        Yeniden dene
      </button>
      <button
        type="button"
        aria-label="Canlı veri uyarısını kapat"
        onClick={onDismiss}
        className="grid size-7 place-items-center rounded-full text-mint/70 transition hover:bg-white/10"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export interface AddModeBannerProps {
  /** Konum yoksa "Tam konumum" düğmesi ayarları açar (Explorer karar verir). */
  onUseHere: () => void;
  onCancel: () => void;
}

export function AddModeBanner({ onUseHere, onCancel }: AddModeBannerProps) {
  return (
    <div className="animate-rise absolute top-[88px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-leaf/40 bg-ink/90 py-2 pr-2 pl-4 text-[12.5px] text-mint shadow-xl shadow-black/50">
      <MousePointerClick className="size-4 shrink-0 text-leaf" />
      <span>Keşfini bırakmak istediğin noktaya dokun</span>
      <button
        onClick={onUseHere}
        title="Keşfi bulunduğun tam noktaya bırak"
        className="flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf/10 px-3 py-1.5 text-[12px] font-semibold text-leaf transition hover:bg-leaf/20"
      >
        <Crosshair className="size-3.5" />
        Tam konumum
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/20"
      >
        <X className="size-3.5" /> İptal
      </button>
    </div>
  );
}

export interface MobileSearchSheetProps {
  places: Place[];
  onPick: (result: SearchResult) => void;
  onClose: () => void;
  onOpenFilters: () => void;
}

export function MobileSearchSheet({ places, onPick, onClose, onOpenFilters }: MobileSearchSheetProps) {
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button type="button" aria-label="Aramayı kapat" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <div className="mobile-search-sheet absolute inset-x-3 top-[calc(64px+env(safe-area-inset-top))] rounded-[24px] border border-leaf/30 bg-[#031d17] p-3 shadow-2xl">
        <SearchBox
          places={places}
          onPick={onPick}
          onOpenFilters={onOpenFilters}
        />
      </div>
    </div>
  );
}

export interface ToastBannerProps {
  toast: string;
}

export function ToastBanner({ toast }: ToastBannerProps) {
  return (
    <div
      role="status"
      className="mobile-toast gold-frame animate-rise absolute top-[88px] left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-2/95 px-5 py-2.5 text-[13px] whitespace-nowrap text-mint"
    >
      {toast}
    </div>
  );
}
