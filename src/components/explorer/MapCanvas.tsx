/**
 * Atlasia — harita yüzeyi kromu (F1-6, adım 1).
 *
 * NEDEN VAR: `Explorer.tsx` 1.568 satırın 664'ü JSX'ti ve en kolay taşınabilen
 * parçalar, haritanın **üstünde duran ama hiçbir mantığa bağlı olmayan**
 * parçalardı: tut-döndür ipucu, atıf satırı ve "konumu temizle" düğmesi.
 * Bunlar kendi başına karar vermez; yalnız `precise` + bir geri çağrı alır.
 *
 * KURAL: prop adları `Explorer` içindeki adlarla **birebir aynı** tutuldu ki
 * taşınan JSX gövdesi tek karakter değişmeden yerleşsin (`{precise.label}` vb.).
 */
import { Crosshair, X } from "lucide-react";
import { formatAccuracy } from "../../hooks/useGeolocation";

/** Kullanıcının hassas konumu (Explorer'da `useMemo` ile türetilir). */
export interface PreciseLocation {
  label: string;
  lng: number;
  lat: number;
  accuracy: number;
}

export interface MapSurfaceHintsProps {
  precise: PreciseLocation | null;
  onClearLocation: () => void;
}

export function MapSurfaceHints({ precise, onClearLocation }: MapSurfaceHintsProps) {
  return (
    <>
      {/* İpucu + atıf */}
      <div className="pointer-events-none absolute right-28 bottom-[30%] z-10 hidden flex-col items-end gap-2 text-right lg:flex">
        <p className="flex items-center gap-2 text-[10.5px] font-medium tracking-[0.16em] text-mint/70 uppercase">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-leaf" />
          </span>
          Haritayı tut, döndür, keşfet
        </p>
        {precise && (
          <button
            onClick={onClearLocation}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-leaf/25 bg-ink/80 px-3 py-1.5 text-[11px] text-mint/85 transition hover:border-leaf/60 hover:text-white"
            title="Konum işaretini kaldır"
          >
            <Crosshair className="size-3.5 text-leaf" />
            <span className="max-w-[180px] truncate">{precise.label}</span>
            <span className="text-mint/50">{formatAccuracy(precise.accuracy)}</span>
            <X className="size-3" />
          </button>
        )}
      </div>
      <p role="contentinfo" className="pointer-events-none absolute inset-x-0 bottom-[2px] z-20 hidden px-2 text-center text-[11px] leading-none text-mint/45 md:block">
        Harita © Esri, OpenFreeMap, OpenMapTiles ve OpenStreetMap katkıcıları · Yükseklik verisi: AWS Terrain Tiles
      </p>
    </>
  );
}
