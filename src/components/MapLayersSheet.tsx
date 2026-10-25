import { Layers, RotateCcw, Tags, CloudSun, Mountain, X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { cn } from "../utils/cn";
import type { WeatherStatus } from "../utils/mapWeather";

// Windy renk ölçeği tek yerde: Tailwind keyfi sınıfı yerine satır içi (CSS bütçesi).
const WIND_GRADIENT = "linear-gradient(90deg,#5b6fd6,#3fa0d9,#35c98a,#d8d24a,#e69a3c,#d1567f,#8b3fa8)";

/**
 * Katmanlar sayfası (denetim K-03).
 *
 * Telefonda harita katmanı denetimleri tek bir sayfada toplanır; masaüstünde
 * sağ raydaki düğmeler aynen kalır, bu sayfa aynı anahtarları gösterir.
 * Hava katmanı Windy benzeri rüzgâr akışıdır (`utils/mapWeather.ts`).
 */
interface Props {
  open: boolean;
  onClose: () => void;
  labels: boolean;
  onToggleLabels: () => void;
  terrain: boolean;
  onToggleTerrain: () => void;
  weather: boolean;
  onToggleWeather: () => void;
  weatherStatus: WeatherStatus;
  onReset: () => void;
}

const WEATHER_HINT: Record<WeatherStatus, string> = {
  loading: "Rüzgâr verisi yükleniyor…",
  ready: "Rüzgâr akışı açık · 10 m yükseklik · Open-Meteo",
  empty: "Bu görünüm için rüzgâr verisi yok. Haritayı kaydırıp tekrar dene.",
  error: "Rüzgâr verisi şu an alınamıyor. Bağlantını kontrol et.",
};

function Row({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
  hint,
}: {
  icon: typeof Layers;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <div className="border-t border-white/[0.07] first:border-t-0">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className="flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
      >
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", checked ? "bg-sun/15 text-sun" : "bg-white/[0.05] text-mint/60")}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-mint">{title}</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-mint/60">{description}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full border transition",
            checked ? "border-sun/40 bg-sun/80" : "border-white/15 bg-white/[0.08]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-[18px] rounded-full bg-white transition-all",
              checked ? "left-[22px]" : "left-0.5",
            )}
          />
        </span>
      </button>
      {hint && checked && <p className="px-4 pb-3 -mt-1 text-[11px] leading-relaxed text-mint/50">{hint}</p>}
    </div>
  );
}

export default function MapLayersSheet({
  open,
  onClose,
  labels,
  onToggleLabels,
  terrain,
  onToggleTerrain,
  weather,
  onToggleWeather,
  weatherStatus,
  onReset,
}: Props) {
  const panelRef = usePanelAccess(open, onClose, true);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[64] flex items-end justify-center bg-black/40 md:items-center">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Katmanlar sayfasını kapat" />
      <section
        ref={panelRef as React.RefObject<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-layers-title"
        className="animate-rise relative mb-[max(10px,env(safe-area-inset-bottom))] w-full max-w-[430px] overflow-hidden rounded-[24px] border border-white/12 bg-[#041d17] shadow-2xl md:mb-0"
      >
        <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          <h2 id="map-layers-title" className="flex items-center gap-2 font-display text-base font-semibold text-mint">
            <Layers className="size-4 text-sun" />Katmanlar
          </h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full text-mint/70 hover:bg-white/5">
            <X className="size-4" />
          </button>
        </header>

        <div className="mt-1">
          <Row
            icon={Tags}
            title="Yer adları"
            description="Şehir, ülke ve deniz etiketleri"
            checked={labels}
            onToggle={onToggleLabels}
          />
          <Row
            icon={Mountain}
            title="3B arazi"
            description="Yükseklik ve kabartma"
            checked={terrain}
            onToggle={onToggleTerrain}
          />
          <Row
            icon={CloudSun}
            title="Hava katmanı"
            description="Rüzgâr akışı ve hız ısı haritası"
            checked={weather}
            onToggle={onToggleWeather}
            hint={WEATHER_HINT[weatherStatus]}
          />
        </div>

        {weather && (
          <div className="px-4 pb-1">
            <div className="h-2 w-full rounded-full" style={{ backgroundImage: WIND_GRADIENT }} />
            <div className="mt-1 flex justify-between text-[10px] font-semibold tracking-wide text-mint/55">
              <span>0</span><span>18</span><span>36</span><span>54</span><span>72+ km/sa</span>
            </div>
          </div>
        )}

        <footer className="mt-2 flex items-center justify-between gap-3 border-t border-white/[0.07] px-3 py-2">
          <button
            type="button"
            onClick={onReset}
            className="flex min-h-11 items-center gap-2 rounded-full px-3 text-[13px] text-mint/80 transition hover:bg-white/5"
          >
            <RotateCcw className="size-4" />Görünümü sıfırla
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-sun px-5 text-[13px] font-semibold text-ink">
            Bitti
          </button>
        </footer>
      </section>
    </div>
  );
}
