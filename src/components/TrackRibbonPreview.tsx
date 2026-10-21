import { cn } from "../utils/cn";

interface Props {
  /** Taslak geometri: `[lng, lat]` çiftleri. */
  coords: [number, number][];
  className?: string;
}

const WIDTH = 320;
const HEIGHT = 72;
const PAD = 8;

/**
 * Taslak izin küçük şerit görünümü.
 *
 * Mevcut panellerdeki SVG desenleriyle aynı dili kullanır (koyu zemin, `sun`
 * çizgi). Bu bir **önizlemedir**: ölçek, kuzey yönü veya yol tarifi iddiası
 * yoktur; haritadaki geometrinin şeklini gösterir.
 */
export default function TrackRibbonPreview({ coords, className }: Props) {
  if (coords.length < 2) {
    return (
      <div
        data-atlasia-ribbon="empty"
        className={cn("grid h-[72px] place-items-center rounded-xl border border-white/10 bg-black/25 text-[11px] text-mint/50", className)}
      >
        Önizleme için yeterli ölçüm yok.
      </div>
    );
  }

  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLng = maxLng - minLng || 1e-6;
  const spanLat = maxLat - minLat || 1e-6;
  const scale = Math.min((WIDTH - PAD * 2) / spanLng, (HEIGHT - PAD * 2) / spanLat);

  // En-boy oranını korumak için her eksen aynı ölçekle çizilir, kalan boşluk ortalanır.
  const offsetX = (WIDTH - spanLng * scale) / 2;
  const offsetY = (HEIGHT - spanLat * scale) / 2;
  const points = coords
    .map(([lng, lat]) => `${(offsetX + (lng - minLng) * scale).toFixed(1)},${(offsetY + (maxLat - lat) * scale).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      data-atlasia-ribbon="ready"
      role="img"
      aria-label={`Taslak iz önizlemesi: ${coords.length} nokta`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-[72px] w-full rounded-xl border border-white/10 bg-black/25", className)}
    >
      <polyline points={points} fill="none" stroke="#F2D77C" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={(offsetX + (coords[0][0] - minLng) * scale).toFixed(1)}
        cy={(offsetY + (maxLat - coords[0][1]) * scale).toFixed(1)}
        r={3}
        fill="#5be0a6"
      />
      <circle
        cx={(offsetX + (coords[coords.length - 1][0] - minLng) * scale).toFixed(1)}
        cy={(offsetY + (maxLat - coords[coords.length - 1][1]) * scale).toFixed(1)}
        r={3}
        fill="#f87171"
      />
    </svg>
  );
}
