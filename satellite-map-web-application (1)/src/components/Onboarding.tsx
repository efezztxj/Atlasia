import { useEffect, useRef } from "react";
import { Crosshair, MapPinPlus, Route, X } from "lucide-react";

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
  const ref = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = (id: (typeof OPTIONS)[number]["id"]) => {
    if (id === "nearby") onNearby();
    if (id === "route") onRoute();
    if (id === "leave") onLeave();
  };

  return (
    <div className="animate-fade fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onb-title"
        className="panel-solid animate-rise relative w-full max-w-[460px] rounded-3xl border border-leaf/25 p-6 shadow-2xl shadow-black/70 sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Karşılamayı kapat"
          className="absolute top-4 right-4 grid size-11 place-items-center rounded-full text-mint/60 transition hover:bg-white/[0.07] hover:text-white"
        >
          <X className="size-5" />
        </button>

        <p className="text-[12px] font-bold tracking-[0.18em] text-sun uppercase">Atlasia</p>
        <h2 id="onb-title" className="font-display mt-2 text-[27px] leading-tight font-semibold text-mint">
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
