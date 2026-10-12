import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Trash2, X } from "lucide-react";
import { STORY_ACCENTS } from "../data/feed";
import type { Story } from "../types";
import { mediaUrl } from "../utils/api";
import { cn } from "../utils/cn";
import { relativeTime, storyRemaining } from "../utils/time";
import Avatar from "./Avatar";

const DURATION = 6000;

interface Props {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
  onSeen: (id: string) => void;
  onGoTo: (s: Story) => void;
  canDelete: (story: Story) => boolean;
  onDelete: (id: string) => void;
}

export default function StoryViewer({
  stories,
  startIndex,
  onClose,
  onSeen,
  onGoTo,
  canDelete,
  onDelete,
}: Props) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef(0);

  const story = stories[index];

  const next = useCallback(() => {
    setProgress(0);
    setIndex((i) => {
      if (i + 1 >= stories.length) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [stories.length, onClose]);

  const prev = () => {
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  };

  useEffect(() => {
    if (story) onSeen(story.id);
  }, [story, onSeen]);

  // İlerleme çubuğu
  useEffect(() => {
    let start = performance.now();
    let elapsed = 0;
    const tick = (t: number) => {
      if (!paused) {
        elapsed += t - start;
        const p = Math.min(1, elapsed / DURATION);
        setProgress(p);
        if (p >= 1) {
          next();
          return;
        }
      }
      start = t;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index, paused, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next]);

  if (!story) return null;
  const accent = STORY_ACCENTS[story.accent];
  const remaining = storyRemaining(story.createdAt);
  const photo = mediaUrl(story.photo);

  return (
    <div className="animate-fade fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="animate-rise relative flex aspect-[9/16] max-h-[86vh] w-full max-w-[380px] flex-col overflow-hidden rounded-[28px] ring-1 ring-white/15"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className={"absolute inset-0 " + accent.bg} />
        {photo && (
          <img
            src={photo}
            alt=""
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/45" />

        {/* İlerleme çizgileri */}
        <div className="relative z-10 flex gap-1 p-3">
          {stories.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                className="block h-full rounded-full bg-white"
                style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
              />
            </span>
          ))}
        </div>

        {/* Başlık */}
        <div className="relative z-10 flex items-center gap-2.5 px-4 pb-2">
          <Avatar name={story.author} className="size-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{story.author}</p>
            <p className="truncate text-[11px] text-white/70">
              {relativeTime(story.createdAt)}
              {remaining ? ` · ${remaining}` : ""}
            </p>
          </div>
          {story.kind === "user" && canDelete(story) && (
            <button
              onClick={() => {
                onDelete(story.id);
                onClose();
              }}
              aria-label="Story'yi sil"
              className="grid size-8 place-items-center rounded-full bg-black/30 text-white/80 transition hover:bg-black/50 hover:text-white"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="grid size-8 place-items-center rounded-full bg-black/30 text-white/80 transition hover:bg-black/50 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Metin */}
        <div
          className={cn(
            "relative z-10 flex flex-1 px-7",
            photo ? "items-end pb-2" : "items-center",
          )}
        >
          {story.text && (
            <p
              className={cn(
                "font-display font-semibold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]",
                photo ? "text-[19px] leading-snug" : "text-[26px] leading-[1.18]",
              )}
            >
              {story.text}
            </p>
          )}
        </div>

        {/* Alt bilgi */}
        <div className="relative z-10 p-4">
          {story.placeLabel && (
            <button
              onClick={() => onGoTo(story)}
              className="flex max-w-full items-center gap-2 rounded-full bg-black/45 px-3.5 py-2 text-[12px] font-medium text-white backdrop-blur-md transition hover:bg-black/65"
            >
              <MapPin className="size-3.5 shrink-0 text-leaf" />
              <span className="truncate">{story.placeLabel}</span>
              <span className="shrink-0 text-white/60">· haritada gör</span>
            </button>
          )}
        </div>

        {/* Gezinme alanları */}
        <button
          onClick={prev}
          aria-label="Önceki story"
          className="absolute inset-y-16 left-0 z-10 w-1/3 cursor-pointer"
        />
        <button
          onClick={next}
          aria-label="Sonraki story"
          className="absolute inset-y-16 right-0 z-10 w-1/3 cursor-pointer"
        />
      </div>

      {/* Masaüstü okları */}
      <button
        onClick={prev}
        disabled={index === 0}
        aria-label="Önceki"
        className="absolute left-6 z-10 hidden size-11 place-items-center rounded-full border border-white/15 bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-30 md:grid"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={next}
        aria-label="Sonraki"
        className="absolute right-6 z-10 hidden size-11 place-items-center rounded-full border border-white/15 bg-black/40 text-white transition hover:bg-black/60 md:grid"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
