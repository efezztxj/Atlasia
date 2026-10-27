import { useEffect, useState } from "react";
import { ExternalLink, Map, Maximize2, Minimize2, RotateCcw, X } from "lucide-react";
import type { Place } from "../types";
import { cn } from "../utils/cn";

interface Props {
  place: Place;
  onClose: () => void;
  corner?: "right" | "left";
}

export default function StreetPeek({ place, onClose, corner = "right" }: Props) {
  const [wide, setWide] = useState(false);
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [late, setLate] = useState(false);
  const embedKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined;
  const bbox = [place.lng - .004, place.lat - .0025, place.lng + .004, place.lat + .0025].join(",");
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${place.lat},${place.lng}`;
  const src = embedKey ? `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(embedKey)}&location=${place.lat},${place.lng}` : mapUrl;
  const panorama = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${place.lat},${place.lng}`;

  useEffect(() => {
    setLoaded(false);
    setLate(false);
    const timer = setTimeout(() => setLate(true), 8000);
    return () => clearTimeout(timer);
  }, [place.id, reload]);

  return (
    <aside
      aria-label={`${place.title} çevre görünümü`}
      className={cn(
        "mobile-fullscreen-bleed pointer-events-auto fixed bottom-4 z-[66] flex flex-col overflow-hidden rounded-2xl border border-leaf/20 bg-ink-2 shadow-xl",
        wide
          ? "right-4 h-[min(50dvh,400px)] w-[min(94vw,560px)]"
          : corner === "left"
            ? "left-4 h-[260px] w-[300px]"
            : "right-4 h-[250px] w-[300px] md:right-8",
      )}
    >
      <header className="mobile-safe-top flex min-h-11 shrink-0 items-center justify-between px-3 py-1 text-[13px]">
        <span className="flex items-center gap-2"><Map size={15} className="text-sun" />{embedKey ? "Sokak görünümü" : "Çevre haritası"}</span>
        <div className="flex">
          <button type="button" aria-label="Görünümü yeniden yükle" onClick={() => setReload((n) => n + 1)} className="grid size-9 place-items-center"><RotateCcw size={14} /></button>
          <button type="button" aria-label={wide ? "Küçült" : "Büyüt"} onClick={() => setWide(!wide)} className="hidden size-9 place-items-center md:grid">
            {wide ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button type="button" aria-label="Çevre görünümünü kapat" onClick={onClose} className="grid size-9 place-items-center">
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1 bg-[#182b23]">
      {!loaded && <div className="absolute inset-0 grid place-content-center px-4 text-center text-[13px] text-mint"><p>{late ? "Harita gecikiyor. Yeniden yüklemeyi deneyebilirsin." : "Çevre haritası yükleniyor..."}</p></div>}
      <iframe
        key={`${place.id}-${reload}`}
        title={embedKey ? `${place.title} için etkileşimli sokak görünümü` : `${place.title} çevresinin OpenStreetMap haritası`}
        src={src}
        className="relative size-full border-0"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      </div>
      <footer className="mobile-safe-bottom flex min-h-11 shrink-0 items-center justify-between gap-2 px-3 py-1 text-[12px]"><span className="truncate text-mint/70">{embedKey ? place.title : "© OpenStreetMap katkıda bulunanlar"}</span><a href={panorama} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1.5 text-sun">Sokak görünümü <ExternalLink size={13} /></a></footer>
    </aside>
  );
}
