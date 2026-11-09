import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Fotoğrafı tam ekran gösterir.
 *
 * NEDEN: kullanıcı "nerede fotoğraf varsa tam ekran yapılabilmeli" dedi
 * (2026-11-09). Üç yerde fotoğraf var ve hepsi küçük/çerçeveli duruyor:
 * yer detayının ana görseli, galeri pulları ve sesli turdaki durak fotoğrafı.
 * Tek bir bileşen hem odak tuzağını hem Escape'i hem geri dönüş odağını
 * yönetir; üç yerde ayrı ayrı yazılsa biri kaçınılmaz olarak eksik kalırdı.
 *
 * Erişilebilirlik: `role="dialog"` + `aria-modal`, açılışta kapat düğmesine
 * odak, Escape ve arka plana dokunma kapatır, kapanınca odak açan öğeye döner.
 */
export default function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: { url: string; alt: string; credit?: string; source?: string };
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    // Arka plan kaydırmasını kilitle: tam ekran görselde sayfa kayması
    // görselin kendisini kaydırıyormuş izlenimi veriyordu.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      const target = restoreRef.current;
      if (target?.isConnected) target.focus();
    };
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      // Odak tuzağı: Escape'e basılmadan arkadaki haritaya sekmeyle geçilmesin.
      if (event.key !== "Tab") return;
      const items = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]") ?? [],
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Fotoğraf, tam ekran"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[95] flex flex-col bg-black"
    >
      <header className="flex shrink-0 items-center justify-end gap-2 p-3">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Tam ekrandan çık"
          className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
        >
          <X size={20} />
        </button>
      </header>
      {/* object-contain: fotoğraf kırpılmadan, ekrana sığdığı kadar büyük. */}
      <button type="button" onClick={onClose} aria-label="Fotoğraf alanına dokunarak tam ekrandan çık" className="relative grid min-h-0 flex-1 place-items-center px-2 focus-visible:outline-2 focus-visible:outline-sun">
        <img src={photo.url} alt={photo.alt} decoding="async" className="max-h-full max-w-full object-contain" />
      </button>
      {(photo.credit || photo.source) && (
        <footer className="shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-[11px] text-white/70">
          {photo.source ? (
            <a href={photo.source} target="_blank" rel="noreferrer" className="underline">{photo.credit ?? photo.source}</a>
          ) : (
            photo.credit
          )}
        </footer>
      )}
    </div>
  );
}
