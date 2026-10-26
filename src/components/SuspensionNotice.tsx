import { useState } from "react";
import { Loader2, Send, ShieldAlert } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { APPEAL_MAX, APPEAL_MIN, type Appeal, type Ban } from "../lib/moderation";

/**
 * Askıya alma ekranı (moderasyon · "kısasa kısas").
 *
 * Hesap askıdayken uygulama kabuğu açılmaz: gerekçe, bitiş tarihi, itiraz
 * formu ve çıkış düğmesi gösterilir. Bu bir *istemci* engeli; asıl yaptırım
 * sunucuda — `bans/{uid}` belgesi etkinken `firestore.rules` yeni gönderi/
 * hikâye/yanıt/yer yazımını reddeder. Yani istemci atlatılsa bile içerik
 * üretilemez. İtiraz `appeals` koleksiyonuna yazılır; moderatör panelden
 * görür, kabul ederse banı ayrıca kaldırır.
 */
export default function SuspensionNotice({
  ban,
  appeal,
  onAppeal,
  onSignOut,
}: {
  ban: Ban;
  appeal?: Appeal | null;
  onAppeal?: (message: string) => Promise<void>;
  onSignOut: () => void | Promise<void>;
}) {
  // Ekran kapanmaz (Escape yalnız odağı korur): tek çıkış "Çıkış yap".
  const panelRef = usePanelAccess(true, () => {}, true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const until = ban.expiresAt
    ? new Date(ban.expiresAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
    : null;

  const appealPending = appeal && appeal.status !== "rejected";

  const submit = async () => {
    if (!onAppeal) return;
    setSending(true);
    setError(null);
    try {
      await onAppeal(message);
      setMessage("");
    } catch (err) {
      setError((err as Error)?.message || "İtiraz gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-ink px-5 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspension-title"
      ref={panelRef as React.RefObject<HTMLDivElement>}
    >
      <div className="w-full max-w-[440px] rounded-3xl border border-red-300/25 bg-white/[0.03] p-6">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-red-300 uppercase">
          <ShieldAlert className="size-4" />Hesap askıda
        </p>
        <h1 id="suspension-title" className="mt-3 font-display text-2xl font-semibold text-mint">
          Bu hesap geçici olarak kapatıldı
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mint/75">
          Topluluk kurallarını ihlal eden bir içerik nedeniyle hesabın askıya alındı. Askı süresince yeni
          gönderi, hikâye, yanıt veya iz eklenemez.
        </p>

        <dl className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12.5px]">
          <div>
            <dt className="font-semibold text-mint/60">Gerekçe</dt>
            <dd className="mt-0.5 leading-relaxed text-mint/85">{ban.reason || "Belirtilmedi."}</dd>
          </div>
          <div>
            <dt className="font-semibold text-mint/60">Bitiş</dt>
            <dd className="mt-0.5 text-mint/85">{until ?? "Kalıcı (itiraz edebilirsin)"}</dd>
          </div>
        </dl>

        {onAppeal && (
          <div className="mt-5">
            {appealPending ? (
              <p className="rounded-2xl border border-sun/25 bg-sun/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-sun/90">
                İtirazın alındı{appeal.status === "seen" ? " ve moderatör tarafından görüldü" : ""}. Sonuçlanınca
                askın kaldırılırsa uygulama kendiliğinden açılır.
              </p>
            ) : (
              <>
                <label className="block text-[12px] font-semibold text-mint/70" htmlFor="appeal-message">
                  İtirazın ({APPEAL_MIN}–{APPEAL_MAX} karakter)
                </label>
                <textarea
                  id="appeal-message"
                  value={message}
                  maxLength={APPEAL_MAX}
                  rows={3}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Askının haksız olduğunu düşünüyorsan nedenini yaz."
                  className="mt-1.5 w-full rounded-2xl border border-white/12 bg-ink px-3 py-2 text-[13px] text-mint outline-none focus:border-sun/50"
                />
                {error && <p role="alert" className="mt-2 text-[12px] text-red-300">{error}</p>}
                <button
                  type="button"
                  disabled={sending || message.trim().length < APPEAL_MIN}
                  onClick={() => void submit()}
                  className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-sun px-4 text-[12.5px] font-semibold text-ink disabled:opacity-40"
                >
                  {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  İtirazı gönder
                </button>
              </>
            )}
          </div>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-mint/55">
          Askı süresi dolunca uygulama kendiliğinden açılır; ayrıca çıkış yapıp başka hesapla girebilirsin.
        </p>

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-5 min-h-11 w-full rounded-full border border-white/15 px-4 text-[13px] font-semibold text-mint/85 hover:bg-white/5"
        >
          Çıkış yap
        </button>
      </div>
    </div>
  );
}
