import { ShieldAlert } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import type { Ban } from "../lib/moderation";

/**
 * Askıya alma ekranı (moderasyon · "kısasa kısas").
 *
 * Hesap askıdayken uygulama kabuğu açılmaz: gerekçe, bitiş tarihi ve çıkış
 * düğmesi gösterilir. Bu bir *istemci* engeli; asıl yaptırım sunucuda —
 * `bans/{uid}` belgesi etkinken `firestore.rules` yeni gönderi/hikâye/yanıt/
 * yer yazımını reddeder. Yani istemci atlatılsa bile içerik üretilemez.
 */
export default function SuspensionNotice({
  ban,
  onSignOut,
}: {
  ban: Ban;
  onSignOut: () => void | Promise<void>;
}) {
  // Ekran kapanmaz (Escape yalnız odağı korur): tek çıkış "Çıkış yap".
  const panelRef = usePanelAccess(true, () => {}, true);
  const until = ban.expiresAt
    ? new Date(ban.expiresAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
    : null;

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
            <dd className="mt-0.5 text-mint/85">{until ?? "Kalıcı (itiraz için destek)"}</dd>
          </div>
        </dl>

        <p className="mt-4 text-[12px] leading-relaxed text-mint/55">
          Hatanın kendinde olmadığını düşünüyorsan bu ekranın görüntüsünü alıp destek kanalından itiraz edebilirsin.
          Askı kalkınca uygulama kendiliğinden açılır.
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
