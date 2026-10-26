import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Send, X } from "lucide-react";
import { REPORT_REASONS, createReport, type ReportReason } from "../lib/moderation";
import { usePanelAccess } from "../hooks/usePanelAccess";

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam / reklam",
  harassment: "Taciz / zorbalık",
  hate: "Nefret söylemi",
  misinfo: "Yanlış / yanıltıcı bilgi",
  privacy: "Özel bilgi / gizlilik ihlali",
  other: "Diğer",
};

interface Props {
  targetType: "place" | "post" | "story" | "user";
  targetId: string;
  targetOwnerUid?: string;
  targetLabel?: string;
  reporterUid: string;
  onClose: () => void;
  onReported?: () => void;
}

export default function ReportDialog({ targetType, targetId, targetOwnerUid, targetLabel, reporterUid, onClose, onReported }: Props) {
  const panelRef = usePanelAccess(true, onClose);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Denetim K-08: kapanış gecikmesi unmount'ta iptal edilir; aksi hâlde kapanmış
  // pencerenin zamanlayıcısı ebeveyne ikinci bir onClose gönderir.
  const closeTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createReport({ targetType, targetId, targetOwnerUid, reason, details: details.trim() || undefined }, reporterUid);
      setDone(true);
      closeTimer.current = window.setTimeout(() => {
        closeTimer.current = null;
        onReported?.();
        onClose();
      }, 900);
    } catch (e) {
      setError((e as Error).message || "Rapor gönderilemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mobile-fullscreen-wrap fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <button type="button" aria-label="Rapor penceresini kapat" onClick={onClose} className="absolute inset-0" />
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="report-title" className="panel-solid mobile-fullscreen relative w-full max-w-[420px] overflow-y-auto rounded-[20px] border border-white/10 bg-[#0a221b] p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <h3 id="report-title" className="flex items-center gap-2 font-display text-lg font-semibold text-sun"><AlertTriangle size={18} />İçeriği bildir</h3>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full hover:bg-white/5"><X size={18} /></button>
        </header>
        {targetLabel && <p className="mt-2 text-[13px] text-mint/70">Hedef: {targetLabel} · {targetType} · {targetId.slice(0, 8)}</p>}
        {!done ? (
          <>
            <fieldset className="mt-4">
              <legend className="text-[13px] font-semibold text-mint">Neden bildiriyorsun?</legend>
              <div className="mt-2 grid gap-2">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] ${reason === r ? "border-sun bg-sun/10 text-sun" : "border-white/10 text-mint/80"}`}>
                    <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-sun" />
                    {REASON_LABELS[r]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block text-[13px] font-semibold text-mint">
              Açıklama (isteğe bağlı, max 1000)
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} placeholder="Kural ihlalini kısaca açıkla…" className="mt-2 w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-[13px] text-mint outline-none focus:border-sun/50" />
            </label>
            {error && <p role="alert" className="mt-3 text-[13px] text-red-300">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-white/10 px-5 text-[13px]">Vazgeç</button>
              <button type="button" disabled={busy} onClick={() => void submit()} className="flex min-h-11 items-center gap-2 rounded-full bg-sun px-5 text-[13px] font-semibold text-ink disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Gönder
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-mint/55">Bildirimler inceleme sonrası moderasyon ekibine iletilir. Asılsız toplu bildirimler spam sayılır.</p>
          </>
        ) : (
          <p role="status" className="mt-4 rounded-xl bg-leaf/10 px-3 py-3 text-[13px] text-leaf">Raporun alındı. İnceleme sonrası sana bildirileceğiz.</p>
        )}
      </section>
    </div>
  );
}
