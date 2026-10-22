import { CloudSun, Globe2, Locate, RotateCcw, Tags, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
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
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  pressed?: boolean;
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
            ? "border-sun/70 bg-sun/20 text-sun"
            : "border-leaf/30 bg-ink/80 text-mint hover:border-leaf/70 hover:bg-ink-3 hover:text-white",
        )}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="panel-solid pointer-events-none absolute top-1/2 right-[calc(100%+10px)] hidden -translate-y-1/2 rounded-lg border border-leaf/25 px-2.5 py-1.5 text-[13px] whitespace-nowrap text-mint opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 md:block"
      >
        {label}
      </span>
    </div>
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
  useEffect(() => {
    // Hava katmanı parçası yüklenemezse (ağ kopuk) düğme kapalıya döner.
    const unavailable = () => setWeather(false);
    window.addEventListener("atlasia:weather-unavailable", unavailable);
    return () => window.removeEventListener("atlasia:weather-unavailable", unavailable);
  }, []);
  const toggleWeather = () => {
    const next = !weather;
    setWeather(next);
    window.dispatchEvent(new CustomEvent("atlasia:weather-toggle", { detail: next }));
  };
  return (
    <div
      role="toolbar"
      aria-label="Görünüm kontrolleri"
      aria-orientation="vertical"
      className="mobile-map-controls pointer-events-auto absolute right-3 bottom-[136px] z-20 flex flex-col items-center gap-1.5 md:right-8 md:bottom-24 md:gap-3"
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
  );
}
