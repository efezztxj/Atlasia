import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pause, Play, Volume2, X } from "lucide-react";
import { hasEnglishAudio, type AudioDiscoveryTour } from "../data/audioDiscovery";
import type { EnglishAudioStop } from "../data/audioDiscoveryEnglish";
import AudioDiscoveryCategories from "./AudioDiscoveryCategories";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props {
  tour: AudioDiscoveryTour;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  attribution?: ReactNode;
  initialCategoriesOpen?: boolean;
}

export default function AudioDiscoverySheet({ tour, selectedIndex, onSelect, onClose, attribution, initialCategoriesOpen = false }: Props) {
  const stop = tour.stops[selectedIndex];
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const [englishStops, setEnglishStops] = useState<Record<string, EnglishAudioStop> | null>(null);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [languageError, setLanguageError] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(initialCategoriesOpen);
  const [stopsOpen, setStopsOpen] = useState(false);
  const panelRef = usePanelAccess(!categoriesOpen, onClose);
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
  }, [selectedIndex, tour.id, language]);

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); return; }
    try {
      setError(null);
      await audio.play();
    } catch {
      setError(language === "en" ? "Audio could not be played. Check your connection or read the text." : "Ses kaydı açılamadı. Bağlantını kontrol et veya metni oku.");
      setSpeaking(false);
    }
  };

  if (!stop) return null;
  const en = language === "en";
  const englishStop = en ? englishStops?.[stop.id] : undefined;
  const title = englishStop?.title ?? stop.title;
  const description = englishStop?.description ?? stop.description;
  const audio = en ? englishStop?.audio : stop.audio;
  const changeLanguage = async (value: "tr" | "en") => {
    if (value === language || languageLoading) return;
    audioRef.current?.pause();
    setSpeaking(false);
    setError(null);
    setLanguageError(false);
    if (value === "en" && !englishStops) {
      setLanguageLoading(true);
      try {
        const response = await fetch("/audio/efes-en.json");
        if (!response.ok) throw new Error("Translations unavailable");
        const data = await response.json() as Record<string, EnglishAudioStop>;
        if (!tour.stops.every((item) => data[item.id]?.title && data[item.id]?.description)) throw new Error("Incomplete translations");
        setEnglishStops(data);
      } catch {
        setLanguageError(true);
        return;
      } finally {
        setLanguageLoading(false);
      }
    }
    setLanguage(value);
  };
  const select = (index: number) => { audioRef.current?.pause(); onSelect(index); };
  return (
    <>
    <section
      ref={panelRef}
      inert={categoriesOpen}
      lang={language}
      aria-labelledby="audio-discovery-title"
      className="fixed inset-x-3 bottom-[calc(66px+env(safe-area-inset-bottom))] z-50 mx-auto max-h-[55dvh] max-w-[440px] overflow-y-auto rounded-[24px] border border-leaf/30 bg-ink text-mint shadow-2xl md:right-4 md:bottom-4 md:left-auto"
    >
      <div className="p-4 sm:p-5">
        <header className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-leaf/15 text-sun"><Volume2 size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.14em] text-sun uppercase">{en ? "Atlasia audio discovery" : "Atlasia sesli keşif"}</p>
            <h2 id="audio-discovery-title" className="mt-1 text-[16px] leading-snug font-semibold">{en ? "Discover ancient Ephesus" : tour.title}</h2>
            <p className="mt-1 text-[12px] text-mint/70">{selectedIndex + 1} / {tour.stops.length} · {en ? "Stop" : "Durak"}</p>
          </div>
          <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={en ? (collapsed ? "Expand audio tour" : "Collapse audio tour") : (collapsed ? "Sesli turu genişlet" : "Sesli turu küçült")} aria-expanded={!collapsed} className="grid size-11 shrink-0 place-items-center rounded-full border border-leaf/30 text-mint transition hover:bg-leaf/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun">{collapsed ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</button>
          <button type="button" onClick={onClose} aria-label={en ? "Close audio tour" : "Sesli turu kapat"} className="grid size-11 shrink-0 place-items-center rounded-full border border-leaf/30 text-mint transition hover:bg-leaf/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"><X size={18} /></button>
        </header>

        {hasEnglishAudio(tour.placeId) && <div role="group" aria-label={en ? "Narration language" : "Anlatım dili"} className="mt-3 flex w-fit gap-1 rounded-full border border-leaf/20 p-1">
          {(["tr", "en"] as const).map((value) => <button key={value} type="button" lang={value} aria-pressed={language === value} onClick={() => void changeLanguage(value)} disabled={languageLoading} className={`min-h-9 rounded-full px-3 text-[12px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun ${language === value ? "bg-sun text-ink" : "text-mint/75 hover:bg-leaf/10"}`}>{value === "tr" ? "Türkçe" : "English"}</button>)}
        </div>}
        {languageLoading && <p role="status" className="mt-2 text-[12px] text-mint/75">Loading English…</p>}
        {languageError && <p role="alert" className="mt-2 text-[12px] text-mint/75">English could not be loaded. Please try again. / İngilizce yüklenemedi. Lütfen tekrar dene.</p>}
        {audio && <audio key={`${stop.id}-${language}`} ref={audioRef} src={audio} preload="none" onPlay={() => setSpeaking(true)} onPause={() => setSpeaking(false)} onEnded={() => setSpeaking(false)} onError={() => { setSpeaking(false); setError(en ? "Audio could not be loaded. You can read the text." : "Ses yüklenemedi. Metni okuyabilirsin."); }} />}
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-leaf/20 bg-leaf/[0.06] p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.12em] text-sun uppercase">{en ? `Stop ${selectedIndex + 1}` : `${selectedIndex + 1}. durak`}</p>
            <p className="mt-1 break-words text-[14px] leading-snug font-semibold">{title}</p>
          </div>
          <nav aria-label={en ? "Audio and stop controls" : "Ses ve durak kontrolleri"} className="flex shrink-0 items-center gap-1.5">
            <button type="button" aria-label={en ? "Previous stop" : "Önceki durak"} disabled={selectedIndex === 0} onClick={() => select(selectedIndex - 1)} className="grid size-11 place-items-center rounded-full border border-leaf/30 transition hover:bg-leaf/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"><ChevronLeft size={19} aria-hidden="true" /></button>
            <button type="button" disabled={!audio} onClick={() => { void play(); }} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-sun px-3 text-[13px] font-bold text-ink transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun">{speaking ? <Pause size={16} /> : <Play size={16} />}{speaking ? (en ? "Pause" : "Duraklat") : (en ? "Play" : "Dinle")}</button>
            <button type="button" aria-label={en ? "Next stop" : "Sonraki durak"} disabled={selectedIndex === tour.stops.length - 1} onClick={() => select(selectedIndex + 1)} className="grid size-11 place-items-center rounded-full border border-leaf/30 transition hover:bg-leaf/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"><ChevronRight size={19} aria-hidden="true" /></button>
          </nav>
        </div>
        {(!audio || error) && <p role="status" className="mt-2 text-[12px] text-sun">{error ?? (en ? "English audio is not available yet. You can read the text." : "Ses kaydı yok. Metni okuyabilirsin.")}</p>}

        <button type="button" onClick={() => setCategoriesOpen(true)} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-leaf/30 px-4 text-left text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"><span>{en ? "Other places" : "Diğer yerler"}</span><ChevronRight size={17} aria-hidden="true" /></button>

        <div hidden={collapsed}>
          {stop.image && <figure className="mt-4"><img key={stop.id} src={stop.image.url} alt={englishStop?.imageAlt ?? stop.image.alt} className="h-36 w-full rounded-2xl object-cover" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /><figcaption className="mt-2 text-[10px] leading-relaxed text-mint/70"><a href={stop.image.source} target="_blank" rel="noreferrer" className="underline">{stop.image.author}</a> · <a href={stop.image.licenseUrl} target="_blank" rel="noreferrer" className="underline">{stop.image.license === "Kullanım izni doğrulanmadı" && en ? "Reuse permission not verified" : stop.image.license}</a> · {en ? "Resized and cropped" : "Boyutlandırıldı ve kırpıldı"}{stop.id === "domitian-tapinagi" ? (en ? " · Reconstructed columns’ origin uncertain." : " · Yeniden kurulan sütunların kökeni belirsiz.") : ""}</figcaption></figure>}
          <div className="mt-4 border-t border-leaf/20 pt-4"><h3 className="text-[14px] font-semibold">{en ? "The story of this place" : "Bu yerin hikâyesi"}</h3><p className="mt-2 text-[13px] leading-relaxed text-mint/80">{description}</p></div>
          <div className="mt-4 border-t border-leaf/20 pt-4"><button type="button" onClick={() => setStopsOpen((value) => !value)} aria-expanded={stopsOpen} aria-controls="tour-stops-list" className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-leaf/30 bg-leaf/[0.06] px-4 text-left text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"><span>{en ? "Tour stops" : "Tur durakları"} · {tour.stops.length}</span>{stopsOpen ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}</button><ol id="tour-stops-list" aria-label={en ? "Tour stops" : "Tur durakları"} hidden={!stopsOpen} className={`mt-2 flex-wrap gap-2 ${stopsOpen ? "flex" : ""}`}>{tour.stops.map((item, index) => <li key={item.id}><button type="button" aria-current={selectedIndex === index ? "step" : undefined} onClick={() => select(index)} className={`min-h-11 rounded-full border px-3 text-[12px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun ${selectedIndex === index ? "border-sun/60 bg-sun/10 text-sun" : "border-leaf/30 hover:bg-leaf/10"}`}>{index + 1}. {en ? (englishStops?.[item.id]?.title ?? item.title) : item.title}</button></li>)}</ol></div>
          <button type="button" onClick={() => setShowSources((value) => !value)} aria-expanded={showSources} className="mt-3 min-h-11 rounded-full border border-leaf/30 px-4 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun">{en ? (showSources ? "Hide sources" : "View sources") : (showSources ? "Kaynakları gizle" : "Kaynakları gör")}</button>
          {showSources && <div className="mt-3 text-[12px] leading-relaxed">{en ? "Sources: " : "Kaynaklar: "}{stop.sources.map((source, index) => <span key={source.url}>{index > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.title}</a></span>)} · <a href={stop.coordinateSource} target="_blank" rel="noreferrer" className="underline">{en ? "Coordinate source" : "Konum kaynağı"}</a></div>}
          <p className="mt-4 text-[11px] leading-relaxed text-mint/70">{en ? "Purple diamonds mark places outside the ancient city core. Locations are approximate; check entrances and walking conditions on site. This sequence is not a route." : "Mor elmaslar antik kent çekirdeği dışındaki yerleri gösterir. Konumlar yaklaşıktır; girişleri ve yürüyüş koşullarını sahada kontrol et. Bu sıralama yol tarifi değildir."}</p>
        </div>
        {attribution && <div className="mt-3 border-t border-leaf/20 pt-2">{attribution}</div>}
      </div>
    </section>
    {categoriesOpen && <AudioDiscoveryCategories tour={tour} selectedIndex={selectedIndex} speaking={speaking} language={language} englishStops={englishStops} onSelect={select} onClose={() => setCategoriesOpen(false)} />}
    </>
  );
}
