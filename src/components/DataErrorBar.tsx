import { CloudOff, Loader2 } from "lucide-react";

/**
 * Atlasia — kalıcı veri hatası şeridi (denetim M-18).
 *
 * NEDEN VAR: Canlı veri (feed/harita) yüklenemediğinde uygulama sessizce yerel
 * kopyaya düşüyordu ve yalnızca 3,2 saniyelik bir toast gösteriyordu. Kullanıcı
 * birkaç saniye sonra ekranda ne olduğunu bilmiyor, tekrar deneme yolu da
 * kalmıyordu. Bu şerit; (a) durumu ekranda tutar, (b) tek tıkla yeniden dener,
 * (c) veri gelince kendiliğinden kaybolur.
 *
 * NEDEN TOAST DEĞİL: Toast geçicidir ve `aria-live` ile yarışır. Bu bileşen
 * `role="status"` ile kararlı bir bölge sunar; odak çalmaz (kullanıcı haritada
 * çalışmaya devam edebilir).
 */

export type DataErrorKind = "remote" | "config";

export interface DataErrorBarProps {
  kind: DataErrorKind;
  /** Tekrar deneme sürüyor mu (düğme kilitlenir, dönen ikon gösterilir). */
  retrying?: boolean;
  /** Veri hatası: sorguları yeniden kurar. Yapılandırma hatasında verilmez. */
  onRetry?: () => void;
}

const COPY = {
  remote: ["Canlı veriler yüklenemedi", "Son kopya gösteriliyor; paylaşımlar bağlantı düzelince gider."],
  config: ["Bulut yapılandırması eksik", "Yerel veriyle çalışılıyor: paylaşımlar yalnız bu cihazda kalır."],
} satisfies Record<DataErrorKind, [string, string]>;

export default function DataErrorBar({ kind, retrying = false, onRetry }: DataErrorBarProps) {
  const [title, detail] = COPY[kind];
  return (
    <div
      role="status"
      aria-live="polite"
      data-atlasia="data-error-bar"
      data-kind={kind}
      className="gold-frame absolute top-[76px] left-1/2 z-[45] flex w-[min(560px,calc(100%-24px))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-sun/35 bg-[#12211d]/95 px-3.5 py-2.5 text-mint shadow-xl shadow-black/40 md:top-[92px]"
    >
      <CloudOff className="size-4 shrink-0 text-sun" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-mint/75">{detail}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="pressable flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-sun/45 bg-sun/15 px-3 text-[12px] font-semibold text-sun transition hover:bg-sun/25 disabled:opacity-55"
        >
          {retrying && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {retrying ? "Deneniyor" : "Yeniden dene"}
        </button>
      )}
    </div>
  );
}
