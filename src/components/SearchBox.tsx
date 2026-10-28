import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-react";
import type { Place } from "../types";
import { normalize, searchWorld, type SearchResult } from "../utils/geo";
import { storageGet, storageSet } from "../utils/storage";

const RECENTS_KEY = "atlasia.recentSearches.v1";
const RECENTS_LIMIT = 5;

interface RecentSearch {
  label: string;
  sub: string;
  lng: number;
  lat: number;
}

function readRecents(): RecentSearch[] {
  const raw = storageGet(RECENTS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentSearch =>
        !!item && typeof item === "object"
        && typeof (item as RecentSearch).label === "string"
        && typeof (item as RecentSearch).lng === "number"
        && typeof (item as RecentSearch).lat === "number")
      .slice(0, RECENTS_LIMIT);
  } catch {
    return [];
  }
}

interface Props {
  places: Place[];
  onPick: (r: SearchResult) => void;
  onOpenFilters?: () => void;
  /** Mobil arama sayfası açılırken klavyeyi hazırlar. */
  autoFocus?: boolean;
}

export default function SearchBox({ places, onPick, onOpenFilters, autoFocus = false }: Props) {
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [recents, setRecents] = useState<RecentSearch[]>(readRecents);
  const wrapRef = useRef<HTMLDivElement>(null);

  const closeMobileSheet = () => {
    const closeBtn = wrapRef.current?.closest(".mobile-search-sheet")?.previousElementSibling;
    if (closeBtn instanceof HTMLButtonElement) closeBtn.click();
  };

  const local = useMemo<SearchResult[]>(() => {
    const n = normalize(q.trim());
    if (n.length < 2) return [];
    const matches = places
      .filter((p) => normalize(`${p.title} ${p.region}`).includes(n))
      .slice(0, 4)
      .map((p) => ({
        id: `p-${p.id}`,
        label: p.title,
        sub: p.region,
        lng: p.lng,
        lat: p.lat,
        place: p,
      }));
    return matches;
  }, [q, places]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setRemote([]);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    setRemote([]);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await searchWorld(term, ctrl.signal);
        setRemote(r);
        setLoading(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(true);
          setLoading(false);
        }
      }
    }, 750);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const combined = [
    ...local,
    ...remote.filter((r) => !local.some((l) => normalize(l.label) === normalize(r.label))),
  ];
  const showList = open && q.trim().length >= 2;
  const showRecents = open && q.trim().length === 0 && recents.length > 0;

  const rememberPick = (r: SearchResult) => {
    // Son aramalar yalnız bu cihazda tutulur; yakınlık/konum verisi yazılmaz.
    const next = [
      { label: r.label, sub: r.sub, lng: r.lng, lat: r.lat },
      ...recents.filter((item) => normalize(item.label) !== normalize(r.label)),
    ].slice(0, RECENTS_LIMIT);
    setRecents(next);
    storageSet(RECENTS_KEY, JSON.stringify(next));
  };

  const pick = (r: SearchResult) => {
    setOpen(false);
    setQ(r.label);
    rememberPick(r);
    onPick(r);
  };

  const clearRecents = () => {
    setRecents([]);
    storageSet(RECENTS_KEY, "[]");
  };

  return (
    <div ref={wrapRef} className="pointer-events-auto order-1 w-full md:order-2 md:w-[312px]">
      <div className="mb-3 flex items-center justify-between md:hidden">
        <p className="font-display text-lg font-semibold text-mint">Yer ara</p>
        <button
          type="button"
          onClick={closeMobileSheet}
          aria-label="Aramayı kapat"
          className="grid size-10 place-items-center rounded-full text-mint/75 hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
      </div>
      <label htmlFor="atlasia-search" className="sr-only md:not-sr-only md:mb-2 md:block md:text-[11px] md:tracking-wide md:text-mint/65">
        Yer, şehir veya ülke ara
      </label>
      <div className="relative">
        <div className="mobile-search-field flex h-12 items-center gap-3 rounded-full border border-leaf/25 bg-ink/[0.92] px-4 transition focus-within:border-sun/70 focus-within:bg-ink/90">
          <Search className="size-[18px] shrink-0 text-sun" />
          <input
            id="atlasia-search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && combined[0]) pick(combined[0]);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Ülke, şehir ya da yer ara..."
            autoComplete="off"
            autoFocus={autoFocus}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-mint outline-none placeholder:text-mint/70"
          />
          {loading ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-sun" />
          ) : q ? (
            <button
              onClick={() => {
                setQ("");
                setRemote([]);
              }}
              aria-label="Aramayı temizle"
              className="shrink-0 text-mint/50 transition hover:text-mint"
            >
              <X className="size-4" />
            </button>
          ) : (
            <>
              <button type="button" onClick={onOpenFilters} aria-label="Keşif filtrelerini aç" className="grid size-9 shrink-0 place-items-center text-sun md:hidden">
                <SlidersHorizontal className="size-[18px]" />
              </button>
              <Sparkles className="hidden size-4 shrink-0 text-sun md:block" />
            </>
          )}
        </div>

        {showRecents && (
          <div className="animate-fade panel-solid absolute top-14 right-0 left-0 z-20 overflow-hidden rounded-2xl border border-leaf/20 p-1.5 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
              <p className="text-[11px] font-bold tracking-[0.14em] text-sun uppercase">Son aramalar</p>
              <button type="button" onClick={clearRecents} className="min-h-8 rounded-full px-2 text-[11px] text-mint/65 transition hover:text-mint">
                Temizle
              </button>
            </div>
            {recents.map((item) => (
              <button
                key={`${item.label}-${item.lat}`}
                type="button"
                onClick={() => pick({ id: `recent-${item.label}`, label: item.label, sub: item.sub, lng: item.lng, lat: item.lat })}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-white/[0.06]"
              >
                <MapPin className="size-4 shrink-0 text-leaf" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-mint">{item.label}</span>
                  <span className="block truncate text-[11px] text-mint/60">{item.sub}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {showList && (
          <div className="animate-fade thin-scroll absolute top-14 right-0 left-0 z-20 max-h-[min(50dvh,420px)] overflow-y-auto rounded-2xl border border-leaf/20 bg-ink-2/95 p-1.5 shadow-2xl shadow-black/50">
            {combined.length === 0 && !loading && (
              <p className="px-3 py-3 text-[12px] text-mint/55">
                {error ? "Harita aramasına ulaşılamadı. Kayıtlı yerleri kullanabilir veya biraz sonra tekrar deneyebilirsin." : "Sonuç bulunamadı. Yer adını veya şehir adını farklı yazmayı dene."}
              </p>
            )}
            {combined.length === 0 && loading && (
              <div role="status" className="space-y-2 p-2">
                <p className="px-1 text-[12px] text-mint/70">Dünya taranıyor…</p>
                <div aria-hidden className="skeleton h-11 w-full" />
                <div aria-hidden className="skeleton h-11 w-full" />
                <div aria-hidden className="skeleton h-11 w-full" />
              </div>
            )}
            {combined.map((r) => (
              <button
                key={r.id}
                onClick={() => pick(r)}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
              >
                {r.place ? (
                  <Star className="mt-0.5 size-4 shrink-0 fill-sun text-sun" />
                ) : (
                  <MapPin className="mt-0.5 size-4 shrink-0 text-leaf" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-mint">{r.label}</span>
                  <span className="block truncate text-[11px] text-mint/55">{r.sub}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
