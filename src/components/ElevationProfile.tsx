import { useMemo } from "react";
import type { AtlasRoute, RouteLeg } from "../types";
import { buildElevationProfile, buildProfileForPolyline } from "../utils/elevation";

interface Props {
  route?: AtlasRoute | null;
  legs?: RouteLeg[] | null;
  coords?: [number, number][] | null;
  className?: string;
}

const MODE_COLOR: Record<string, string> = {
  walking: "#F2D77C",
  trail: "#5be0a6",
  offroad: "#a78bfa",
  descent: "#f87171",
  driving: "#60a5fa",
  cycling: "#fbbf24",
  transit: "#94a3b8",
};

const MODE_DASH: Record<string, string | undefined> = {
  walking: undefined,
  trail: "6 4",
  offroad: "2 4",
  descent: "4 4",
  driving: undefined,
  cycling: undefined,
  transit: "8 4",
};

export default function ElevationProfile({ route, legs, coords, className }: Props) {
  const profile = useMemo(() => {
    if (legs && legs.length > 0) return buildElevationProfile(legs);
    if (route?.days[0]?.legs && route.days[0].legs.length > 0) return buildElevationProfile(route.days[0].legs);
    if (coords && coords.length > 1) return buildProfileForPolyline(coords);
    if (route?.days[0]?.polyline) {
      // Polyline decode edip basit profil (fallback)
      return null;
    }
    return null;
  }, [route, legs, coords]);

  if (!profile || profile.samples.length < 2) {
    return (
      <div className={className ?? ""} aria-label="Yükseklik profili yok">
        <p className="text-[11px] text-mint/60">Yükseklik profili bu rota için hesaplanamadı.</p>
      </div>
    );
  }

  const { samples, totalAscentM, maxSlopePercent, totalDistanceKm, naismithMinutes } = profile;
  const elevations = samples.map((s) => s.elevationM);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const range = Math.max(10, maxElev - minElev);
  const width = 320;
  const height = 96;
  const padLeft = 28;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 18;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xFor = (d: number) => padLeft + (d / Math.max(0.1, totalDistanceKm)) * plotW;
  const yFor = (e: number) => padTop + plotH - ((e - minElev) / range) * plotH;

  // Bacak bazlı segmentler: mode'a göre renk ve çizgi tipi
  const segments: { mode: string; points: string }[] = [];
  let curMode = samples[0].mode;
  let pts: string[] = [];
  for (const s of samples) {
    if (s.mode !== curMode) {
      segments.push({ mode: curMode, points: pts.join(" ") });
      curMode = s.mode;
      pts = [];
    }
    pts.push(`${xFor(s.distanceKm)},${yFor(s.elevationM)}`);
  }
  if (pts.length) segments.push({ mode: curMode, points: pts.join(" ") });

  // Alan doldurma için taban çizgisi
  const areaPoints = [
    ...samples.map((s) => `${xFor(s.distanceKm)},${yFor(s.elevationM)}`),
    `${xFor(samples[samples.length - 1].distanceKm)},${padTop + plotH}`,
    `${xFor(samples[0].distanceKm)},${padTop + plotH}`,
  ].join(" ");

  return (
    <div className={className ?? "elevation-profile"} role="img" aria-label={`Yükseklik profili: ${totalDistanceKm} km, toplam tırmanış ${totalAscentM} m`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {/* Arka plan grid */}
        <rect x={padLeft} y={padTop} width={plotW} height={plotH} fill="#0a2e26" rx={6} />
        {/* Yatay grid çizgileri */}
        {[0, 0.5, 1].map((t) => {
          const y = padTop + plotH * t;
          return <line key={t} x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke="white" strokeOpacity={0.06} strokeWidth={1} />;
        })}
        {/* Alan */}
        <polygon points={areaPoints} fill="#F2D77C" fillOpacity={0.12} stroke="none" />
        {/* Bacak bazlı çizgiler */}
        {segments.map((seg, i) => (
          <polyline
            key={i}
            fill="none"
            stroke={MODE_COLOR[seg.mode] ?? "#F2D77C"}
            strokeWidth={2.2}
            strokeDasharray={MODE_DASH[seg.mode]}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={seg.points}
          />
        ))}
        {/* Eksen etiketleri */}
        <text x={padLeft} y={padTop - 2} fontSize={9} fill="rgba(255,255,255,0.55)">{maxElev} m</text>
        <text x={padLeft} y={padTop + plotH + 12} fontSize={9} fill="rgba(255,255,255,0.55)">0 km</text>
        <text x={padLeft + plotW - 24} y={padTop + plotH + 12} fontSize={9} fill="rgba(255,255,255,0.55)">{totalDistanceKm} km</text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-mint/80">
        <span>Toplam tırmanış: <b className="text-mint">{totalAscentM} m</b></span>
        <span>En dik eğim: <b className="text-mint">{maxSlopePercent}%</b></span>
        <span>Naismith: <b className="text-mint">{Math.floor(naismithMinutes / 60)}s {naismithMinutes % 60}dk</b></span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from(new Set(samples.map((s) => s.mode))).map((mode) => (
          <span key={mode} className="flex items-center gap-1.5 text-[10px] text-mint/70">
            <span
              className="inline-block h-1 w-4 rounded"
              style={{
                background: MODE_COLOR[mode] ?? "#F2D77C",
                borderTop: MODE_DASH[mode] ? `1.5px dashed ${MODE_COLOR[mode]}` : undefined,
              }}
            />
            {mode}
          </span>
        ))}
      </div>

      <p className="mt-2 text-[10.5px] leading-relaxed text-mint/45">Yükseklik GeoFix'ten değil, terrain raster-dem'den (AWS Terrain Tiles terrarium) örneklenir. Arazi eğimi gerçek harita verisinden hesaplanır.</p>
    </div>
  );
}
