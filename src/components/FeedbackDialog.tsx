import { useState } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  submitFeedback,
  type FeedbackCategory,
} from "../lib/feedback";

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Hata bildir",
  idea: "Öneri",
  other: "Diğer",
};

interface Props {
  uid: string | null;
  onClose: () => void;
}

export default function FeedbackDialog({ uid, onClose }: Props) {
  const panelRef = usePanelAccess(true, onClose, true);
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooLong = message.length > FEEDBACK_MESSAGE_MAX;
  const submit = async () => {
    if (!uid) {
      setError("Geri bildirim için giriş yapman gerekiyor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await submitFeedback(uid, { category, message });
      if (result.ok) {
        setDone(true);
        setMessage("");
      } else {
        setError(result.error ?? "Geri bildirim gönderilemedi.");
      }
    } catch (e) {
      // Ağ/izin hatası kullanıcıya gösterilir; yutulmaz.
      setError((e as Error).message || "Geri bildirim gönderilemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <button type="button" aria-label="Geri bildirim penceresini kapat" onClick={onClose} className="absolute inset-0" />
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="panel-solid relative w-full max-w-[420px] rounded-[20px] border border-white/10 bg-[#0a221b] p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <h3 id="feedback-title" className="flex items-center gap-2 font-display text-lg font-semibold text-sun"><MessageSquare size={18} />Geri bildirim gönder</h3>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full hover:bg-white/5"><X size={18} /></button>
        </header>
        <p className="mt-2 text-[12px] text-mint/70">Konum veya cihaz bilgisi eklenmez. Mesajın, hesabınla birlikte geliştirme ekibine ulaşır.</p>
        {done ? (
          <p role="status" className="mt-4 text-sm text-mint">Teşekkürler, geri bildirimin alındı.</p>
        ) : (
          <>
            <fieldset className="mt-4">
              <legend className="text-[12px] text-mint/80">Kategori</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FEEDBACK_CATEGORIES.map((item) => (
                  <label key={item} className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12px] ${category === item ? "border-sun bg-sun/15 text-sun" : "border-white/15 text-mint"}`}>
                    <input type="radio" name="feedback-category" value={item} checked={category === item} onChange={() => setCategory(item)} className="sr-only" />
                    {CATEGORY_LABELS[item]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="feedback-message" className="mt-4 block text-[12px] text-mint/80">Mesaj</label>
            <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={5} aria-invalid={tooLong} aria-describedby="feedback-count" className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-mint" />
            <p id="feedback-count" className={`mt-1 text-right text-[11px] ${tooLong ? "text-red-300" : "text-mint/60"}`}>{message.length}/{FEEDBACK_MESSAGE_MAX}</p>
            {error && <p role="alert" className="mt-2 text-[12px] text-red-300">{error}</p>}
            <button type="button" onClick={() => void submit()} disabled={busy || tooLong || message.trim().length === 0} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-sun px-4 text-sm font-semibold text-ink disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Gönder
            </button>
          </>
        )}
      </section>
    </div>
  );
}
