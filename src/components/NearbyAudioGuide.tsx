import { useEffect, useMemo, useState } from "react";
import { BookOpen, MapPin, Pause, Play, RotateCcw, Volume2, X } from "lucide-react";
import type { Place } from "../types";
import { STORIES } from "../data/galleries";
import { haversineKm } from "../utils/geo";

interface Props {
  location: { lat: number; lng: number; accuracy: number } | null;
  places: Place[];
  onOpenPlace: (place: Place) => void;
}

const DISMISSED_KEY = "atlasia.audioGuide.dismissed.v1";

function readDismissed() {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function guideText(place: Place) {
  const story = place.story ?? STORIES[place.id] ?? place.note;
  return `${place.title}. ${story}`.replace(/\s+/g, " ").trim();
}

export default function NearbyAudioGuide({ location, places, onOpenPlace }: Props) {
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  const nearby = useMemo(() => {
    if (!location) return null;
    const thresholdMeters = Math.max(50, Math.min(120, location.accuracy + 30));
    return places
      .filter((place) => place.kind === "guide" && !dismissed.includes(place.id))
      .map((place) => ({ place, meters: haversineKm(location.lat, location.lng, place.lat, place.lng) * 1000 }))
      .filter((item) => item.meters <= thresholdMeters)
      .sort((a, b) => a.meters - b.meters)[0] ?? null;
  }, [dismissed, location, places]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  useEffect(() => {
    if (!nearby && supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setPaused(false);
    }
  }, [nearby, supported]);

  if (!nearby) return null;

  const dismiss = () => {
    if (supported) window.speechSynthesis.cancel();
    const next = [...new Set([...dismissed, nearby.place.id])].slice(-30);
    setDismissed(next);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    setSpeaking(false);
    setPaused(false);
  };

  const speakFromStart = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(guideText(nearby.place));
    utterance.lang = "tr-TR";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    const turkishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLocaleLowerCase("tr").startsWith("tr"));
    if (turkishVoice) utterance.voice = turkishVoice;
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  };

  const play = () => {
    if (!supported) return;
    if (speaking && paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      return;
    }
    speakFromStart();
  };

  const pause = () => {
    if (!supported || !speaking) return;
    window.speechSynthesis.pause();
    setPaused(true);
  };

  const replay = () => speakFromStart();

  return (
    <section aria-labelledby="nearby-guide-title" className="animate-rise fixed inset-x-3 top-[78px] z-[38] mx-auto max-w-[440px] rounded-[22px] border border-sun/30 bg-[#06241d]/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl md:top-[92px]">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sun/15 text-sun"><Volume2 size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.15em] text-sun uppercase">Yakınında bir hikâye var</p>
          <h2 id="nearby-guide-title" className="mt-1 truncate font-display text-[17px] font-semibold">{nearby.place.title}</h2>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-mint/65"><MapPin size={12} />Yaklaşık {Math.max(1, Math.round(nearby.meters))} metre uzağında</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Bu sesli rehber önerisini kapat" className="grid size-10 shrink-0 place-items-center rounded-full text-mint/60 hover:bg-white/5 hover:text-white"><X size={17} /></button>
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-mint/75">{nearby.place.note}</p>
      {!supported && <p className="mt-2 text-[12px] text-sun">Bu tarayıcı sesli okumayı desteklemiyor; hikâyeyi yer ayrıntısından okuyabilirsin.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!supported} onClick={speaking && !paused ? pause : play} className="flex min-h-11 items-center gap-2 rounded-full bg-sun px-4 text-[13px] font-semibold text-ink disabled:opacity-45">
          {speaking && !paused ? <Pause size={15} /> : <Play size={15} />}
          {speaking && !paused ? "Duraklat" : paused ? "Devam et" : "Hikâyeyi dinle"}
        </button>
        {speaking && (
          <button type="button" onClick={replay} className="grid size-11 place-items-center rounded-full border border-white/15 text-mint" aria-label="Sesli anlatımı baştan oynat"><RotateCcw size={15} /></button>
        )}
        <button type="button" onClick={() => onOpenPlace(nearby.place)} className="flex min-h-11 items-center gap-2 rounded-full border border-leaf/30 px-4 text-[13px] text-leaf"><BookOpen size={15} />Yeri aç</button>
      </div>
      <p className="mt-3 text-[10.5px] leading-relaxed text-mint/45">Ses yalnızca sen başlatırsan oynar. Konumun otomatik olarak paylaşılmaz.</p>
    </section>
  );
}
