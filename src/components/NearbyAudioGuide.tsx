import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, MapPin, Pause, Play, RotateCcw, Volume2, X } from "lucide-react";
import type { Place, AtlasRoute } from "../types";
import { STORIES } from "../data/galleries";
import { storageGet, storageSet } from "../utils/storage";
import { initialGuideState, resolveGuidePlace, type TourGuideState } from "../utils/tourGuide";

interface Props {
  location: { lat: number; lng: number; accuracy: number } | null;
  places: Place[];
  tourRoute?: AtlasRoute | null;
  onOpenPlace: (place: Place) => void;
}

const DISMISSED_KEY = "atlasia.audioGuide.dismissed.v1";

function readDismissed() {
  try {
    return JSON.parse(storageGet(DISMISSED_KEY, "session") ?? "[]") as string[];
  } catch {
    return [];
  }
}

function guideText(place: Place) {
  const story = place.story ?? STORIES[place.id] ?? place.note;
  return `${place.title}. ${story}`.replace(/\s+/g, " ").trim();
}

export default function NearbyAudioGuide({ location, places, tourRoute, onOpenPlace }: Props) {
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  // KARAR (e) BAĞLI: web/PWA kalır, ekran açık şartı kabul — arka plan konumu yok, rehber yalnızca sekme ön planda ve ekran açıkken tetiklenir.
  const guideStateRef = useRef<TourGuideState>(initialGuideState());

  const nearby = useMemo(() => {
    if (!location) return null;

    const isTour = !!tourRoute && tourRoute.days[0]?.stops.length > 0;
    type Candidate = { id: string; lat: number; lng: number; order?: number; place: Place };
    const candidates: Candidate[] = [];

    if (isTour) {
      for (const s of tourRoute.days[0].stops) {
        if (dismissed.includes(s.pinId ?? s.name)) continue;
        const placeForStop: Place = {
          id: s.pinId ?? `tour-${s.order}`,
          title: s.name,
          region: tourRoute.routeTitle,
          category: "history",
          lng: s.lng,
          lat: s.lat,
          note: s.description,
          story: s.description,
          author: "Atlasia editör turu",
          kind: "guide",
        };
        candidates.push({ id: placeForStop.id, lat: s.lat, lng: s.lng, order: s.order, place: placeForStop });
      }
    }

    for (const p of places) {
      if (p.kind !== "guide" || dismissed.includes(p.id)) continue;
      if (isTour && candidates.some((c) => c.id === p.id)) continue;
      candidates.push({ id: p.id, lat: p.lat, lng: p.lng, place: p });
    }

    if (candidates.length === 0) return null;

    const res = resolveGuidePlace(location, candidates, guideStateRef.current, isTour);
    guideStateRef.current = res.nextState;
    if (!res.place) return null;
    const match = candidates.find((c) => c.id === res.place!.id);
    if (!match) return null;
    return { place: match.place, meters: res.meters ?? 0 };
  }, [dismissed, location, places, tourRoute]);

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
    storageSet(DISMISSED_KEY, JSON.stringify(next), "session");
    // Histeresis durumu: kapatılan yer içerideyse temizle ki titreme olmasın
    if (guideStateRef.current.insideId === nearby.place.id) {
      guideStateRef.current = { insideId: null, currentIndex: guideStateRef.current.currentIndex, lastUpdateAt: Date.now() };
    }
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
    <section aria-labelledby="nearby-guide-title" className="nearby-audio-guide animate-rise fixed inset-x-3 top-[78px] z-[38] mx-auto max-w-[440px] rounded-[22px] border border-sun/30 bg-[#06241d] p-4 shadow-2xl shadow-black/60 md:top-[92px]">
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
      <p className="mt-3 text-[10.5px] leading-relaxed text-mint/45">Ses yalnızca sen başlatırsan oynar. Konumun otomatik olarak paylaşılmaz. Web/PWA sahada yalnızca ekran açıkken rehberlik eder.</p>
    </section>
  );
}
