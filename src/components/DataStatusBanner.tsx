import { CloudOff, RotateCw, Settings2, X } from "lucide-react";

/**
 * Atlasia — kalıcı veri durumu şeridi (M-18).
 *
 * İki AYRI durum aynı yüzeyde gösterilir, çünkü ikisinin de ortak özelliği
 * "kalıcı" olması:
 *
 * 1. `remote` — canlı veri (feed/harita) yüklenemedi; yerel son kopya gösteriliyor.
 *    Kullanıcının yapabileceği bir şey var: **Yeniden dene**.
 * 2. `config` — bu derlemede bulut yapılandırması yok; veri yalnız bu cihazda
 *    kalır. Yeniden denenecek bir şey yok (eksik değer derleme zamanında sabit),
 *    bu yüzden düğme gösterilmez.
 *
 * NEDEN TOAST DEĞİL: bu durumlar 3,2 saniyede geçmez. Toast kaybolunca kullanıcı
 * neden yerel veri gördüğünü bilmiyordu.
 *
 * NEDEN `role="status"` (alert değil): durum bilgisidir, kesinti değil. `alert`
 * ekran okuyucuda akan okumayı keser; kalıcı bir yüzey için doğru rol değil.
 * Kapatma düğmesi olduğu için kullanıcı isterse yüzeyi kaldırabilir.
 */

export type DataIssueKind = "remote" | "config";

const COPY: Record<DataIssueKind, { message: string; dismissLabel: string }> = {
  remote: {
    message: "Canlı veriler yüklenemedi · yerel kayıtlar gösteriliyor",
    dismissLabel: "Canlı veri uyarısını kapat",
  },
  config: {
    message: "Bulut yapılandırması yok · kayıtlar yalnız bu cihazda kalır",
    dismissLabel: "Yapılandırma bilgisini kapat",
  },
};

export default function DataStatusBanner({
  kind,
  onRetry,
  onDismiss,
}: {
  kind: DataIssueKind;
  /** Yalnız `remote`: sorguları yeniden kurar. `config` için verilmez. */
  onRetry?: () => void;
  onDismiss: () => void;
}) {
  const copy = COPY[kind];
  const Icon = kind === "config" ? Settings2 : CloudOff;
  return (
    <div
      role="status"
      aria-live="polite"
      data-atlasia="data-status-banner"
      data-kind={kind}
      className="animate-rise absolute top-[88px] left-1/2 z-30 flex max-w-[calc(100%-16px)] -translate-x-1/2 items-center gap-2 rounded-full border border-sun/30 bg-ink/90 py-2 pr-2 pl-4 text-[12px] text-mint shadow-xl shadow-black/50"
    >
      <Icon size={14} className="shrink-0 text-sun" aria-hidden />
      <span className="truncate">{copy.message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1 rounded-full bg-sun px-3 py-1.5 text-[12px] font-semibold text-ink transition"
        >
          <RotateCw size={12} aria-hidden />
          Yeniden dene
        </button>
      )}
      <button
        type="button"
        aria-label={copy.dismissLabel}
        onClick={onDismiss}
        className="grid size-7 shrink-0 place-items-center rounded-full text-mint/70 transition hover:bg-white/10"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
