import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, X } from "lucide-react";
import type { AudioDiscoveryTour } from "../data/audioDiscovery";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props {
  tour: AudioDiscoveryTour;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  attribution?: ReactNode;
}

export default function AudioDiscoverySheet({ tour, selectedIndex, onSelect, onClose, attribution }: Props) {
  const stop = tour.stops[selectedIndex];
  const panelRef = usePanelAccess(true, onClose);
  const [collapsed, setCollapsed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setSpeaking(false);
    setError(null);
    const audio = audioRef.current;
    return () => { audio?.pause(); };
  }, [selectedIndex, tour.id]);

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); return; }
    try {
      setError(null);
      await audio.play();
    } catch {
      setError("Ses kaydı açılamadı. Bağlantını kontrol et veya metni oku.");
      setSpeaking(false);
    }
  };

  if (!stop) return null;
  const select = (index: number) => { audioRef.current?.pause(); onSelect(index); };
  return (
    <section ref={panelRef} aria-labelledby="audio-discovery-title" className="fixed inset-x-3 bottom-[calc(66px+env(safe-area-inset-bottom))] z-50 mx-auto max-h-[55dvh] max-w-[440px] overflow-y-auto rounded-2xl border border-leaf/30 bg-ink p-4 text-mint shadow-2xl md:right-4 md:bottom-4 md:left-auto">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-3 text-sun"><Volume2 size={19} /></span>
        <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-sun uppercase">Atlasia sesli keşif</p><h2 id="audio-discovery-title" className="mt-1 text-[17px] font-semibold">{tour.title}</h2><p className="text-[12px] text-mint/70">{selectedIndex + 1} / {tour.stops.length} · Durak</p></div>
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Sesli turu genişlet" : "Sesli turu küçült"} aria-expanded={!collapsed} className="grid size-11 place-items-center rounded-full border border-leaf/30">{collapsed ? "+" : "−"}</button>
        <button type="button" onClick={onClose} aria-label="Sesli turu kapat" className="grid size-11 place-items-center rounded-full border border-leaf/30"><X size={18} /></button>
      </div>
      {stop.audio && <audio key={stop.id} ref={audioRef} src={stop.audio} preload="none" onPlay={() => setSpeaking(true)} onPause={() => setSpeaking(false)} onEnded={() => setSpeaking(false)} onError={() => { setSpeaking(false); setError("Ses yüklenemedi. Metni okuyabilirsin."); }} />}
      <div className="mt-3 flex items-center gap-2"><p className="flex-1">{selectedIndex + 1}. {stop.title}</p><button type="button" disabled={!stop.audio} onClick={() => { void play(); }} className="flex min-h-11 items-center gap-2 rounded-full bg-sun px-4 text-[13px] font-semibold text-ink">{speaking ? <Pause size={16} /> : <Play size={16} />}{speaking ? "Duraklat" : "Dinle"}</button></div>
      {(!stop.audio || error) && <p role="status" className="text-sun">{error ?? "Ses kaydı yok. Metni okuyabilirsin."}</p>}
      {attribution && <div className="mt-2">{attribution}</div>}
      <div hidden={collapsed}>
      {stop.image && <figure className="mt-2"><img src={stop.image.url} alt={stop.image.alt} className="h-32 w-full rounded-xl object-cover" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /><figcaption className="mt-1 text-[11px] text-mint/70"><a href={stop.image.source} target="_blank" rel="noreferrer" className="underline">{stop.image.author} · Wikimedia Commons</a> · <a href={stop.image.licenseUrl} target="_blank" rel="noreferrer" className="underline">{stop.image.license}</a> · Görüntü kırpıldı</figcaption></figure>}
      <div className="mt-3 rounded-xl border border-leaf/20 bg-ink-3 p-3"><p className="text-[11px] font-semibold text-sun">{selectedIndex + 1}. DURAK</p><h3 className="mt-1 text-[16px] font-semibold">{stop.title}</h3><p className="mt-1 text-[12px] leading-relaxed text-mint/75">{stop.description}</p></div>
      <ol aria-label="Tur durakları" className="mt-3 flex flex-wrap gap-2">{tour.stops.map((item, index) => <li key={item.id}><button type="button" aria-current={selectedIndex === index ? "step" : undefined} onClick={() => select(index)} className="min-h-11 rounded-full border border-leaf/30 px-3 text-[12px]">{index + 1}. {item.title}</button></li>)}</ol>

      <button type="button" onClick={() => setShowSources((value) => !value)} aria-expanded={showSources} className="mt-3 min-h-11 rounded-full border border-leaf/30 px-4 text-[13px]">{showSources ? "Kaynakları gizle" : "Kaynakları gör"}</button>
      {showSources && <div className="mt-3">Kaynaklar: {stop.sources.map((source, index) => <span key={source.url}>{index > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.title}</a></span>)} · <a href={stop.coordinateSource} target="_blank" rel="noreferrer" className="underline">Konum kaynağı</a></div>}
      <div className="mt-3 flex gap-2"><button type="button" disabled={selectedIndex === 0} onClick={() => select(selectedIndex - 1)} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-leaf/30 text-[13px] disabled:opacity-45"><ChevronLeft size={16} />Önceki</button><button type="button" disabled={selectedIndex === tour.stops.length - 1} onClick={() => select(selectedIndex + 1)} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-leaf/30 text-[13px] disabled:opacity-45">Sonraki durak<ChevronRight size={16} /></button></div>
      <p className="mt-3 text-[11px] leading-relaxed text-mint/70">Konumlar yaklaşık gösterilir. Girişleri ve yürüyüş koşullarını sahada kontrol et; bu sıralama yol tarifi değildir.</p>
      </div>
    </section>
  );
}
