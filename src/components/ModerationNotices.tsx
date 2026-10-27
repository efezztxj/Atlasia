import { AlertTriangle, Megaphone, X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import type { Announcement, Warning } from "../lib/moderation";

/**
 * Moderatör uyarısı bildirimi (kademeli yaptırımın ilk basamağı).
 * Kullanıcı "Anladım" demeden kapanmaz (Escape yalnız odağı korur);
 * okundu işareti `warnings/{id}.read` alanına yazılır, kayıt silinmez.
 */
export function WarningNotice({
  warning,
  onAcknowledge,
}: {
  warning: Warning;
  onAcknowledge: (warningId: string) => void | Promise<void>;
}) {
  const panelRef = usePanelAccess(true, () => {}, true);
  return (
    <div
      className="mobile-fullscreen-wrap fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/60 px-5 py-8"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="warning-title"
      ref={panelRef as React.RefObject<HTMLDivElement>}
    >
      <div className="panel-solid mobile-fullscreen flex w-full max-w-[420px] flex-col justify-center rounded-3xl border border-sun/30 bg-[#0b1f18] p-6 md:block">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-sun uppercase">
          <AlertTriangle className="size-4" />Moderatör uyarısı
        </p>
        <h2 id="warning-title" className="mt-3 font-display text-xl font-semibold text-mint">
          Hesabına resmî uyarı verildi
        </h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mint/80">{warning.reason}</p>
        <p className="mt-3 text-[12px] leading-relaxed text-mint/55">
          Uyarı tek başına içerik üretimini kapatmaz; tekrarında içerik kaldırma ve askıya alma uygulanabilir.
          Bu uyarı hesabında kayıtlı kalır.
        </p>
        <button
          type="button"
          onClick={() => void onAcknowledge(warning.id)}
          className="mt-5 min-h-11 w-full rounded-full bg-sun px-4 text-[13px] font-semibold text-ink"
        >
          Anladım
        </button>
      </div>
    </div>
  );
}

/**
 * Moderatör duyurusu şeridi. En güncel duyuru gösterilir; kapatma bilgisi
 * yalnız bu cihazda (`localStorage`) saklanır — duyuru belgesi silinirse
 * ya da yenisini yayınlanırsa tekrar görünür.
 */
export function AnnouncementBanner({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: (announcementId: string) => void;
}) {
  return (
    <div
      role="status"
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-[65] w-[min(92vw,480px)] -translate-x-1/2 rounded-2xl border border-leaf/30 bg-[#041d17]/95 px-4 py-3 shadow-2xl md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <Megaphone className="mt-0.5 size-4 shrink-0 text-leaf" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-mint">{announcement.title}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-mint/75">{announcement.body}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(announcement.id)}
          aria-label="Duyuruyu kapat"
          className="grid size-8 shrink-0 place-items-center rounded-full text-mint/70 hover:bg-white/5"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
