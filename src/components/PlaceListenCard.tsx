import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";
import {
  estimatedListenSeconds,
  loadPlaceListen,
  type ListenLanguage,
  type PlaceListenEntry,
} from "../lib/placeListen";

const LANGUAGE_KEY = "atlasia.listen.language";

function readStoredLanguage(): ListenLanguage {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "tr";
  } catch {
    return "tr";
  }
}

function storeLanguage(language: ListenLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    /* Gizli sekmede localStorage yazılamaz; tercih yalnız bu oturumda kalır. */
  }
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

interface Props {
  placeId: string;
  placeTitle: string;
}

/**
 * Yerin tamamını üstün körü anlatan tek parça dinleme kartı.
 *
 * Efes turundaki durak-durak gezinme (`AudioDiscoverySheet`) burada bilinçli
 * olarak YOK: kullanıcı isteği "hepsi için genel dinleme ses kaydı" idi, yani
 * yeri bir bütün olarak anlatan tek kayıt. Metin, ses kaydının dökümüdür;
 * kayıt oynatılamadığında okunabilir kalır (hem erişilebilirlik hem çevrimdışı
 * durum için).
 */
export default function PlaceListenCard({ placeId, placeTitle }: Props) {
  const [entry, setEntry] = useState<PlaceListenEntry | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [language, setLanguage] = useState<ListenLanguage>(readStoredLanguage);
  const [playing, setPlaying] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showText, setShowText] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlaceListen()
      .then((map) => {
        if (!cancelled) setEntry(map[placeId] ?? null);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  useEffect(() => {
    audioRef.current?.pause();
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setAudioFailed(false);
  }, [language, placeId]);

  // Metinler yüklenemezse kart hiç görünmez: boş bir oynatıcı, olmayan bir
  // özelliği varmış gibi göstermekten daha kötüdür. Ses kaydı yoksa kart
  // görünür kalır, çünkü metin okunabilir bir içeriktir.
  if (loadFailed || !entry) return null;

  const block = entry[language];
  const total = duration || estimatedListenSeconds(block.text);
  const titleId = `place-listen-${placeId}`;
  const textId = `place-listen-text-${placeId}`;

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
      setAudioFailed(false);
    } catch {
      setAudioFailed(true);
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    setCurrent(value);
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = value;
  };

  return (
    <section
      aria-labelledby={titleId}
      className="mt-4 rounded-2xl border border-leaf/25 bg-white/[0.03] p-3.5"
      data-testid="place-listen"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.14em] text-sun uppercase">Genel dinleme</p>
          <h3 id={titleId} className="mt-1 flex items-center gap-1.5 text-[14px] leading-snug font-semibold">
            <Headphones size={15} className="shrink-0 text-leaf" aria-hidden="true" />
            <span className="truncate">{placeTitle}</span>
          </h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-mint/65">
            Yerin tamamına üstün körü bir bakış · yaklaşık {clock(total)}
          </p>
        </div>
        <div role="group" aria-label="Dinleme dili" className="flex shrink-0 rounded-full border border-leaf/30 p-0.5">
          {(["tr", "en"] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-label={code === "tr" ? "Türkçe anlatım" : "İngilizce anlatım"}
              aria-pressed={language === code}
              onClick={() => {
                setLanguage(code);
                storeLanguage(code);
              }}
              className={`min-h-9 rounded-full px-2.5 text-[11px] font-bold tracking-wide uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun ${
                language === code ? "bg-sun/15 text-sun" : "text-mint/70 hover:bg-leaf/10"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => void togglePlay()}
          aria-label={playing ? "Genel dinlemeyi duraklat" : "Genel dinlemeyi başlat"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-sun text-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.round(total))}
          step={1}
          value={Math.min(current, Math.round(total))}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Dinleme ilerlemesi"
          aria-valuetext={`${clock(current)} / ${clock(total)}`}
          className="min-w-0 flex-1 accent-sun"
        />
        <span className="shrink-0 text-[11px] text-mint/65 tabular-nums" aria-hidden="true">
          {clock(current)} / {clock(total)}
        </span>
      </div>

      {audioFailed && (
        <p role="status" className="mt-2 text-[12px] leading-relaxed text-sun">
          Ses kaydı henüz yayında değil. Anlatımın metnini okuyabilirsin.
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowText((value) => !value)}
        aria-expanded={showText}
        aria-controls={textId}
        className="mt-2 flex min-h-9 items-center gap-1.5 text-[12px] font-semibold text-mint/80 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
      >
        {showText ? "Metni gizle" : "Metni oku"}
      </button>
      {showText && (
        <p id={textId} className="mt-2 text-[13px] leading-[1.75] text-mint/85">
          {block.text}
        </p>
      )}

      <audio
        key={`${entry.id}-${language}`}
        ref={audioRef}
        src={block.audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime || 0)}
        onError={() => {
          setAudioFailed(true);
          setPlaying(false);
        }}
      />
    </section>
  );
}
