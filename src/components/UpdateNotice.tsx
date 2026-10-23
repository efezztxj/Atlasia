/**
 * İŞ 5 — "Yeni sürüm hazır" bildirimi.
 *
 * Güncelleme sessizce uygulanmaz; kullanıcı "Yenile" der ya da kapatır.
 * Kapatma tercihi bu oturum için hatırlanır (sayfa yenilenene kadar).
 */
import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate";

export default function UpdateNotice() {
  const { ready, applying, apply } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);
  if (!ready || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="update-notice fixed inset-x-3 bottom-[calc(66px+env(safe-area-inset-bottom))] z-[110] mx-auto flex max-w-[420px] items-center gap-3 rounded-2xl border border-white/12 bg-[#06221b] px-3.5 py-2.5 text-[12.5px] text-mint shadow-xl md:bottom-6"
    >
      <RefreshCw size={16} className={applying ? "animate-spin" : ""} />
      <span className="min-w-0 flex-1">Yeni sürüm hazır. Sayfayı yenileyerek geçebilirsin.</span>
      <button
        type="button"
        onClick={apply}
        disabled={applying}
        className="btn-gold min-h-9 shrink-0 rounded-full px-3.5 text-[12px] font-bold text-[#10241a] disabled:opacity-60"
      >
        {applying ? "Yenileniyor…" : "Yenile"}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Güncelleme bildirimini kapat"
        className="grid size-8 shrink-0 place-items-center rounded-full text-mint/70 transition hover:bg-white/10 hover:text-white"
      >
        <X size={15} />
      </button>
    </div>
  );
}
