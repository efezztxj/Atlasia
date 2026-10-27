import { CloudSun, Globe2, Layers, Map, Moon, Mountain, RotateCcw, Tags, X } from "lucide-react";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { cn } from "../utils/cn";
import { RAIN_PALETTE, TEMP_PALETTE, type WeatherMode, type WeatherStatus } from "../utils/mapWeather";
import type { BaseMapStyle } from "./MapView";

// Windy renk ölçeği tek yerde: Tailwind keyfi sınıfı yerine satır içi (CSS bütçesi).
const WIND_GRADIENT = "linear-gradient(90deg,#5b6fd6,#3fa0d9,#35c98a,#d8d24a,#e69a3c,#d1567f,#8b3fa8)";

/** Lejant, çizimdeki paletlerden üretilir — iki yerde renk tutmak yok. */
const RAIN_GRADIENT = `linear-gradient(90deg,${RAIN_PALETTE.slice(1).map((entry) => entry.color).join(",")})`;
const TEMP_GRADIENT = `linear-gradient(90deg,${TEMP_PALETTE.map((entry) => entry.color).join(",")})`;

// Segment yalnız metin: her yeni ikon lazyChunk'ı değil `iconsVendor` bütçesini
// büyütüyor (bkz. scripts/bundle-budget.mjs). Üç kelime zaten kısa.
const MODES: Array<{ id: WeatherMode; label: string }> = [
  { id: "wind", label: "Rüzgâr" },
  { id: "rain", label: "Yağış" },
  { id: "temp", label: "Sıcaklık" },
];

const LEGENDS: Record<WeatherMode, { gradient: string; ticks: string[] }> = {
  wind: { gradient: WIND_GRADIENT, ticks: ["0", "18", "36", "54", "72+ km/sa"] },
  rain: { gradient: RAIN_GRADIENT, ticks: ["0", "1", "3", "8", "15+ mm/sa"] },
  temp: { gradient: TEMP_GRADIENT, ticks: ["-5", "5", "14", "22", "30+ °C"] },
};

const MODE_DESCRIPTION: Record<WeatherMode, string> = {
  wind: "Rüzgâr akışı ve hız ısı haritası",
  rain: "Yağış şiddeti · saatlik tahmin",
  temp: "2 m sıcaklık haritası",
};
const BASE_MAP_OPTIONS = [
  { id: "satellite", label: "Uydu", icon: Globe2 },
  { id: "dark", label: "Karanlık", icon: Moon },
  { id: "street", label: "Sokak", icon: Map },
  { id: "topographic", label: "Topoğrafik", icon: Mountain },
] as const;

/**
 * Katmanlar sayfası (denetim K-03 & kullanıcı kararı 2026-10-27).
 *
 * Harita altlığı (Uydu, Karanlık, Sokak, Topoğrafik) ve harita gösterimi
 * (Yer adları, 3B arazi, Hava katmanı) profilden çıkarılıp hem masaüstü
 * hem telefonda kısayol çubuğundaki "Katmanlar" düğmesine taşındı.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  baseMap: BaseMapStyle;
  onBaseMap: (style: BaseMapStyle) => void;
  labels: boolean;
  onToggleLabels: () => void;
  terrain: boolean;
  onToggleTerrain: () => void;
  weather: boolean;
  onToggleWeather: () => void;
  weatherStatus: WeatherStatus;
  weatherMode: WeatherMode;
  onWeatherMode: (mode: WeatherMode) => void;
  weatherHour: number;
  onWeatherHour: (hour: number) => void;
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
  baseMap,
  onBaseMap,
  labels,
  onToggleLabels,
  terrain,
  onToggleTerrain,
  weather,
  onToggleWeather,
  weatherStatus,
  weatherMode,
  onWeatherMode,
  weatherHour,
  onWeatherHour,
  onReset,
}: Props) {
  const panelRef = usePanelAccess(open, onClose, true);
  if (!open) return null;

  return (
    <div className="mobile-fullscreen-wrap fixed inset-0 z-[64] flex items-end justify-end bg-black/40 md:items-center md:bg-transparent">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Katmanlar sayfasını kapat" />
      <section
        id="map-layers"
        ref={panelRef as React.RefObject<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-layers-title"
        className="panel-solid mobile-fullscreen animate-rise relative flex max-h-[min(78dvh,710px)] w-full max-w-[430px] flex-col overflow-y-auto rounded-[24px] border border-white/12 bg-ink-2 shadow-2xl md:right-20"
      >
        <header className="flex items-center justify-between gap-3 px-4 pt-2 pb-2 md:pt-4">
          <h2 id="map-layers-title" className="flex items-center gap-2 font-display text-base font-semibold text-mint">
            <Layers className="size-4 text-sun" />Katmanlar
          </h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full text-mint/70 hover:bg-white/5">
            <X className="size-4" />
          </button>
        </header>

        <div className="px-4 pt-2 pb-4">
          <p className="text-[12px] font-semibold text-mint/70">Harita altlığı</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {BASE_MAP_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={baseMap === id}
                onClick={() => onBaseMap(id)}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition",
                  baseMap === id
                    ? "border-sun/60 bg-sun/10 text-sun"
                    : "border-leaf/20 text-mint/65 hover:border-leaf/45 hover:text-mint",
                )}
              >
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-mint/45">
            Pinlerin, rota çizgin ve 3B arazi tercihin korunur.
          </p>
        </div>

        <div className="border-t border-white/[0.07] pt-3">
          <p className="px-4 pb-1 text-[12px] font-semibold text-mint/70">Harita gösterimi</p>
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
              description={MODE_DESCRIPTION[weatherMode]}
              checked={weather}
              onToggle={onToggleWeather}
              hint={WEATHER_HINT[weatherStatus]}
            />
          </div>
        </div>

        {weather && (
          <div className="px-4 pb-1">
            <div role="group" aria-label="Hava katmanı ölçümü" className="flex gap-1 rounded-full bg-white/[0.05] p-1">
              {MODES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={weatherMode === id}
                  onClick={() => onWeatherMode(id)}
                  className={cn(
                    "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[12px] font-semibold transition",
                    weatherMode === id ? "bg-sun text-ink" : "text-mint/70 hover:bg-white/5",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 h-2 w-full rounded-full" style={{ backgroundImage: LEGENDS[weatherMode].gradient }} />
            <div className="mt-1 flex justify-between text-[10px] font-semibold tracking-wide text-mint/55">
              {LEGENDS[weatherMode].ticks.map((tick) => <span key={tick}>{tick}</span>)}
            </div>

            {weatherMode !== "wind" && (
              <label className="mt-3 block">
                <span className="flex items-baseline justify-between text-[11px] font-semibold text-mint/70">
                  <span>Tahmin saati</span>
                  <span className="text-sun">
                    {weatherHour === 0 ? "şimdi" : `+${weatherHour} sa`}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={weatherHour}
                  onChange={(event) => onWeatherHour(Number(event.target.value))}
                  aria-label="Tahmin saati (saat sonra)"
                  className="mt-1.5 h-8 w-full accent-[#f3c870]"
                />
              </label>
            )}

            {weatherMode === "rain" && (
              <p className="mt-1 text-[11px] leading-relaxed text-mint/50">
                Rotada yağmur riski taşıyan duraklar altın halkayla işaretlenir.
              </p>
            )}
          </div>
        )}

        <footer className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.07] px-3 py-2 md:mt-2">
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
