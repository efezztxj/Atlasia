import { useEffect, useRef } from "react";
import { Crosshair, MapPinPlus, Route, X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props {
  onNearby: () => void;
  onRoute: () => void;
  onLeave: () => void;
  onClose: () => void;
}

const OPTIONS = [
  { id: "nearby", icon: Crosshair, title: "Yakınımdaki izleri göster", desc: "Çevrendeki gezgin ipuçlarıyla başla." },
  { id: "route", icon: Route, title: "Rota oluştur", desc: "Süre ve ruh haline göre bir gün planla." },
  { id: "leave", icon: MapPinPlus, title: "Bir iz bırak", desc: "Bildiğin bir yeri haritaya ekle." },
] as const;

export default function Onboarding({ onNearby, onRoute, onLeave, onClose }: Props) {
  const firstRef = useRef<HTMLButtonElement>(null);

  // Esc + odak tuzağı + kapanınca odak dönüşü (P18); ilk seçenek odak alır.
  const panelRef = usePanelAccess(true, onClose, true);
  useEffect(() => {
    // Kancanın ilk-odak zamanlayıcısından sonra çalışır: ilk seçenek odakta kalır.
    const timer = setTimeout(() => firstRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  const run = (id: (typeof OPTIONS)[number]["id"]) => {
    if (id === "nearby") onNearby();
    if (id === "route") onRoute();
    if (id === "leave") onLeave();
  };

  return (
    <div className="mobile-fullscreen-wrap animate-fade fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4">
      <div
        ref={panelRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onb-title"
        className="panel-solid mobile-fullscreen animate-rise relative flex w-full max-w-[460px] flex-col justify-center overflow-y-auto rounded-3xl border border-leaf/25 p-6 shadow-2xl shadow-black/70 md:block sm:p-7"
      >
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold tracking-[0.18em] text-sun uppercase">Atlasia</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Karşılamayı kapat"
            className="grid size-11 place-items-center rounded-full text-mint/60 transition hover:bg-white/[0.07] hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <h2 id="onb-title" className="font-display mt-1 text-[27px] leading-tight font-semibold text-mint">
          Nereden başlayalım?
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-mint/65">
          Üçünden birini seç. İstediğin an değiştirebilirsin.
        </p>

        <div className="mt-6 space-y-2.5">
          {OPTIONS.map((o, i) => (
            <button
              key={o.id}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              onClick={() => run(o.id)}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-sun/55 hover:bg-white/[0.07]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sun/15 text-sun">
                <o.icon className="size-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-mint">{o.title}</span>
                <span className="mt-0.5 block text-[14px] text-mint/60">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-[44px] w-full text-[14px] text-mint/60 transition hover:text-mint"
        >
          Önce haritaya bakayım
        </button>
      </div>
    </div>
  );
}
