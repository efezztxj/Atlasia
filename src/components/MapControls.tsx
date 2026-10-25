import { Activity, CloudSun, Globe2, Layers, Locate, RotateCcw, Sparkles, Tags, ZoomIn, ZoomOut } from "lucide-react";
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
  weather: boolean;
  onToggleWeather: () => void;
  onToggleTrackRecorder: () => void;
  trackRecorderOpen: boolean;
  /** Mobilde tek "Katmanlar" düğmesi: yer adları, 3B arazi ve hava katmanı orada. */
  onOpenLayers: () => void;
  layersOpen: boolean;
  onToggleAtlas: () => void;
  atlasOpen: boolean;
  /**
   * İŞ 2d: mobilde açık keşif paneli harita düğmelerinin üstüne biniyor
   * (panel 64–332 px, düğme yığını 196–366 px). Panel açıkken düğmeler
   * gizlenir; masaüstünde görünür kalır.
   */
  hiddenOnMobile?: boolean;
}

function RoundBtn({
  children,
  label,
  onClick,
  active,
  pressed,
  expanded,
  controls,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  /** Görünürlük sınıfları (ör. yalnız mobil). */
  className?: string;
}) {
  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        {...(pressed !== undefined ? { "aria-pressed": pressed } : {})}
        {...(expanded !== undefined ? { "aria-expanded": expanded } : {})}
        {...(controls ? { "aria-controls": controls } : {})}
        className={cn(
          "map-round-btn grid size-11 place-items-center rounded-full border transition active:scale-90",
          active
            ? "btn-gold border-transparent"
            : "border-white/10 bg-white/[0.04] text-mint/85 hover:border-sun/40 hover:bg-white/[0.08] hover:text-white",
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

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onLocate,
  onToggleLabels,
  onToggleTerrain,
  labels,
  terrain,
  weather,
  onToggleWeather,
  onToggleTrackRecorder,
  trackRecorderOpen,
  onOpenLayers,
  layersOpen,
  onToggleAtlas,
  atlasOpen,
  hiddenOnMobile,
}: Props) {
  // Hava katmanı durumu App'te tutulur (Katmanlar sayfası ile tek kaynak).
  return (
    <div
      role="toolbar"
      aria-label="Görünüm kontrolleri"
      aria-orientation="vertical"
      className={cn(
        "mobile-map-controls mobile-bottom-stack-control glass-panel gold-frame pointer-events-auto fixed right-3 z-20 flex flex-col items-center gap-1 rounded-full p-1.5 md:top-[196px] md:right-0 md:bottom-[96px] md:z-[5] md:justify-center md:gap-1.5 [@media(min-width:768px)_and_(min-height:850px)]:gap-3 md:rounded-l-[30px] md:rounded-r-none",
        hiddenOnMobile && "max-md:hidden",
      )}
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
      {/* Mobil: tek Katmanlar düğmesi (yer adları, 3B arazi, hava katmanı). */}
      <RoundBtn
        label={layersOpen ? "Katmanlar sayfasını kapat" : "Katmanlar sayfasını aç"}
        onClick={onOpenLayers}
        active={layersOpen}
        pressed={layersOpen}
        expanded={layersOpen}
        controls="map-layers"
        className="md:hidden"
      >
        <Layers className="size-[18px]" />
      </RoundBtn>
      <RoundBtn label="Yer adları" onClick={onToggleLabels} active={labels} pressed={labels} className="max-md:hidden">
        <Tags className="size-[18px]" />
      </RoundBtn>
      <RoundBtn label="3B arazi" onClick={onToggleTerrain} active={terrain} pressed={terrain} className="max-md:hidden">
        <Globe2 className="size-[18px]" />
      </RoundBtn>
      <RoundBtn label="Hava katmanı" onClick={onToggleWeather} active={weather} pressed={weather} className="max-md:hidden">
        <CloudSun className="size-[18px]" />
      </RoundBtn>
      <span aria-hidden className="mx-auto my-0.5 h-px w-5 bg-white/15 max-md:hidden" />
      <RoundBtn
        label={trackRecorderOpen ? "Yürüyüş kaydını kapat" : "Yürüyüş kaydını aç"}
        onClick={onToggleTrackRecorder}
        active={trackRecorderOpen}
        pressed={trackRecorderOpen}
        className="max-md:hidden"
      >
        <Activity className="size-[18px]" />
      </RoundBtn>
      <RoundBtn
        label={atlasOpen ? "Atlas AI'yi kapat" : "Atlas AI keşif asistanını aç"}
        onClick={onToggleAtlas}
        active={atlasOpen}
        pressed={atlasOpen}
        expanded={atlasOpen}
        controls="atlas-assistant"
        className="max-md:hidden"
      >
        <Sparkles className="size-[18px]" />
      </RoundBtn>
    </div>
  );
}
