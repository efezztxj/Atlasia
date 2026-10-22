import { CloudSun, Globe2, Layers, Locate, RotateCcw, Tags, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLocate: () => void;
  onToggleLabels: () => void;
  onToggleTerrain: () => void;
  labels: boolean;
  terrain: boolean;
}

function RoundBtn({
  children,
  label,
  onClick,
  active,
  pressed,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        {...(pressed !== undefined ? { "aria-pressed": pressed } : {})}
        className={cn(
          "map-round-btn grid place-items-center rounded-full border backdrop-blur-xl transition active:scale-90",
          active
            ? "btn-gold border-transparent"
            : "border-leaf/30 bg-ink/80 text-mint hover:border-leaf/70 hover:bg-ink-3 hover:text-white",
          className,
        )}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="panel-solid pointer-events-none absolute top-1/2 right-[calc(100%+10px)] hidden -translate-y-1/2 rounded-lg border border-sun/30 px-2.5 py-1.5 text-[13px] whitespace-nowrap text-mint opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 md:block"
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Harita üzerindeki tek bir katman anahtarı. Google Maps'in katman menüsü gibi
 * satır hâlinde: dokunma hedefi tam genişlik, durum hem yazıyla hem anahtarla
 * okunur (renk tek başına anlam taşımaz).
 */
function LayerRow({
  icon: Icon,
  label,
  description,
  checked,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-white/[0.06]"
    >
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", checked ? "bg-sun/20 text-sun" : "bg-white/[0.06] text-mint/70")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-mint">{label}</span>
        <span className="block text-[11px] leading-snug text-mint/60">{description}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border transition",
          checked ? "border-sun/60 bg-sun/85" : "border-white/20 bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-all",
            checked ? "left-[20px] bg-[#10241a]" : "left-[3px] bg-mint/80",
          )}
        />
      </span>
    </button>
  );
}

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onLocate,
  onToggleLabels,
  onToggleTerrain,
  labels,
  terrain,
}: Props) {
  const [weather, setWeather] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hava katmanı parçası yüklenemezse (ağ kopuk) düğme kapalıya döner.
    const unavailable = () => setWeather(false);
    window.addEventListener("atlasia:weather-unavailable", unavailable);
    return () => window.removeEventListener("atlasia:weather-unavailable", unavailable);
  }, []);

  // Katman menüsü: dışına dokunma ve Escape kapatır (mobilde alışılmış davranış).
  useEffect(() => {
    if (!layersOpen) return;
    const onDown = (event: PointerEvent) => {
      if (layersRef.current && !layersRef.current.contains(event.target as Node)) setLayersOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayersOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [layersOpen]);

  const toggleWeather = () => {
    const next = !weather;
    setWeather(next);
    window.dispatchEvent(new CustomEvent("atlasia:weather-toggle", { detail: next }));
  };

  const activeLayers = [labels, terrain, weather].filter(Boolean).length;

  return (
    <>
      {/* Masaüstü: tam dikey kontrol sütunu (davranış değişmedi). */}
      <div
        role="toolbar"
        aria-label="Görünüm kontrolleri"
        aria-orientation="vertical"
        className="pointer-events-auto absolute right-8 bottom-24 z-20 hidden flex-col items-center gap-3 md:flex"
      >
        <RoundBtn label="Yakınlaştır" onClick={onZoomIn}>
          <ZoomIn className="size-[18px]" />
        </RoundBtn>
        <RoundBtn label="Uzaklaştır" onClick={onZoomOut}>
          <ZoomOut className="size-[18px]" />
        </RoundBtn>
        <RoundBtn label="Görünümü sıfırla" onClick={onReset}>
          <RotateCcw className="size-[18px]" />
        </RoundBtn>
        <span aria-hidden className="mx-auto my-0.5 h-px w-5 bg-white/15" />
        <RoundBtn label="Konumuma git" onClick={onLocate}>
          <Locate className="size-[18px]" />
        </RoundBtn>
        <RoundBtn label="Yer adları" onClick={onToggleLabels} active={labels} pressed={labels}>
          <Tags className="size-[18px]" />
        </RoundBtn>
        <RoundBtn label="3B arazi" onClick={onToggleTerrain} active={terrain} pressed={terrain}>
          <Globe2 className="size-[18px]" />
        </RoundBtn>
        <RoundBtn label="Hava katmanı" onClick={toggleWeather} active={weather} pressed={weather}>
          <CloudSun className="size-[18px]" />
        </RoundBtn>
      </div>

      {/* Mobil: dört düğme + katman menüsü. Önceden yer adları, 3B arazi ve hava
          katmanı CSS ile gizleniyordu; telefonda hiçbir yerden açılamıyordu. */}
      <div
        role="toolbar"
        aria-label="Harita kontrolleri"
        aria-orientation="vertical"
        className="mobile-map-controls pointer-events-auto absolute right-3 z-20 flex flex-col items-center gap-1.5 md:hidden"
      >
        <RoundBtn label="Yakınlaştır" onClick={onZoomIn}>
          <ZoomIn className="size-[18px]" />
        </RoundBtn>
        <RoundBtn label="Uzaklaştır" onClick={onZoomOut}>
          <ZoomOut className="size-[18px]" />
        </RoundBtn>
        <RoundBtn label="Konumuma git" onClick={onLocate}>
          <Locate className="size-[18px]" />
        </RoundBtn>

        <div ref={layersRef} className="relative">
          <RoundBtn
            label={layersOpen ? "Katman menüsünü kapat" : "Katmanlar"}
            onClick={() => setLayersOpen((value) => !value)}
            active={layersOpen || activeLayers > 0}
          >
            <Layers className="size-[18px]" />
          </RoundBtn>

          {layersOpen && (
            <div
              role="group"
              aria-label="Harita katmanları"
              className="animate-rise panel-solid absolute right-[calc(100%+10px)] bottom-0 w-[228px] rounded-2xl border border-sun/30 p-1.5 shadow-2xl shadow-black/60"
            >
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold tracking-[0.14em] text-sun uppercase">Katmanlar</p>
              <LayerRow
                icon={Tags}
                label="Yer adları"
                description="Şehir ve ülke etiketleri"
                checked={labels}
                onToggle={onToggleLabels}
              />
              <LayerRow
                icon={Globe2}
                label="3B arazi"
                description="Yükseklik ve kabartma"
                checked={terrain}
                onToggle={onToggleTerrain}
              />
              <LayerRow
                icon={CloudSun}
                label="Hava katmanı"
                description="Bulut ve yağış görüntüsü"
                checked={weather}
                onToggle={toggleWeather}
              />
              <div className="my-1 h-px bg-white/10" />
              <button
                type="button"
                onClick={() => {
                  setLayersOpen(false);
                  onReset();
                }}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] text-mint/85 transition hover:bg-white/[0.06]"
              >
                <RotateCcw className="size-4 text-mint/70" />
                Görünümü sıfırla
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
