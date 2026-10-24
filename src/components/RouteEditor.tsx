import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { CloudSun, ImagePlus, Link2, LockKeyhole, Mountain, Save, ShieldCheck, Trash2, TriangleAlert, X } from "lucide-react";
import type { AtlasRoute, RouteDay, RouteLeg, RouteVisibility } from "../types";
import { useCollections } from "../hooks/useCollections";
import { compressImageWithinLimit } from "../utils/image";
import { decodePolyline } from "../utils/polyline";
import type { ElevationProfileData } from "../utils/elevation";
import { buildRouteShareUrl } from "../utils/shareLinkUrl";
import {
  ROUTE_WEATHER_MAX_STOPS,
  assessWeatherRisk,
  dateKeyForDayIndex,
  fetchWeatherSeriesBatched,
  routeStopArrivalWeather,
  routeStopWeatherId,
  routeStopWeatherPoints,
  type StopWeather,
  type WeatherHour,
  type WeatherRiskAssessment,
} from "../utils/weather";
import { cn } from "../utils/cn";
import { friendlyDataError } from "../lib/firestoreValue";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props {
  route: AtlasRoute;
  onClose: () => void;
  onSaved: (route: AtlasRoute, visibility: RouteVisibility) => void;
}

const VISIBILITIES: { value: RouteVisibility; label: string; detail: string }[] = [
  { value: "private", label: "Yalnız ben", detail: "Hesabında kalır; başkaları açamaz." },
  { value: "unlisted", label: "Bağlantısı olanlar", detail: "Listelenmez. Bağlantıyı gönderdiğin kişiler açabilir." },
  { value: "public", label: "Herkese açık", detail: "Keşif akışında listelenir ve bağlantıyla açılır." },
];

type RiskState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; byDay: (WeatherRiskAssessment | null)[]; byStop: (StopWeather | null)[][]; truncated: boolean }
  | { status: "error"; message: string };

/** Günün plan penceresini (ilk başlama – son bitiş saati) çıkarır. */
function dayClockWindow(day: RouteDay): { fromClock?: string; toClock?: string } {
  const clocks = (values: string[]) => values.filter((value) => /^\d{2}:\d{2}/.test(value)).sort();
  const starts = clocks(day.stops.map((stop) => stop.startTime));
  const ends = clocks(day.stops.map((stop) => stop.endTime));
  return {
    ...(starts.length ? { fromClock: starts[0].slice(0, 5) } : {}),
    ...(ends.length ? { toClock: ends[ends.length - 1].slice(0, 5) } : {}),
  };
}

function riskBadge(assessment: WeatherRiskAssessment | null): { text: string; className: string } {
  // null = pencerede veri yok. "Risk yok" DENMEZ; bilinmiyor açıkça söylenir.
  if (!assessment) return { text: "Hava durumu bilinmiyor", className: "border-white/10 text-mint/70" };
  if (assessment.level === "warning") return { text: "Kötü hava uyarısı", className: "border-red-300/40 bg-red-400/10 text-red-200" };
  if (assessment.level === "caution") return { text: "Dikkat", className: "border-sun/40 bg-sun/10 text-sun" };
  return { text: "Belirgin risk yok", className: "border-leaf/30 bg-leaf/10 text-leaf" };
}

/**
 * Adım 15 (kalan): gün bazlı kötü hava rozeti. Veri yalnız kullanıcı
 * "Denetle" dediğinde çekilir; tahmin aralığı dışındaki günler ve ağ
 * hatası "bilinmiyor" görünür, tahmin uydurulmaz.
 */
function WeatherRiskPanel({ route }: { route: AtlasRoute }) {
  const [state, setState] = useState<RiskState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const check = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });
    try {
      // Her konumlu durak bir nokta (üst sınır ROUTE_WEATHER_MAX_STOPS); seri
      // 10'luk parçalarla istenir. Gün rozeti yine günün ilk/orta/son
      // durağından hesaplanır, durak satırları varış saatini kullanır.
      const points = routeStopWeatherPoints(route);
      const requested = new Set(points.map((point) => point.id));
      const locatedCount = route.days.reduce((total, day) => total
        + day.stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)).length, 0);
      const truncated = locatedCount > points.length;
      if (points.length === 0) {
        setState({ status: "done", byDay: route.days.map(() => null), byStop: route.days.map((day) => day.stops.map(() => null)), truncated });
        return;
      }
      const series = await fetchWeatherSeriesBatched(points, controller.signal);
      const byDay = route.days.map((day, dayIndex) => {
        const ids = day.stops
          .map((_, stopIndex) => routeStopWeatherId(dayIndex, stopIndex))
          .filter((id) => requested.has(id));
        const picks = [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]]
          .filter((id, index, all) => id !== undefined && all.indexOf(id) === index);
        const dayHours: WeatherHour[] = picks.flatMap((id) => series[id] ?? []);
        const date = dateKeyForDayIndex(dayHours, dayIndex) ?? undefined;
        return assessWeatherRisk(dayHours, { date, ...dayClockWindow(day) });
      });
      const byStop = routeStopArrivalWeather(route, series);
      setState({ status: "done", byDay, byStop, truncated });
    } catch (failure) {
      if ((failure as { name?: string })?.name === "AbortError") return; // kapanış/yeni denetim
      setState({ status: "error", message: failure instanceof Error ? failure.message : "Hava durumu alınamadı." });
    }
  };

  return (
    <section aria-label="Hava riski" className="rounded-2xl border border-white/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[13px] font-semibold"><CloudSun size={15} />Hava riski</p>
        <button type="button" disabled={state.status === "loading"} onClick={() => void check()} className="min-h-10 shrink-0 rounded-full border border-leaf/30 bg-leaf/10 px-3 text-[12px] font-semibold text-leaf disabled:opacity-50">
          {state.status === "loading" ? "Denetleniyor…" : "Hava riskini denetle"}
        </button>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-mint/65">Plan günleri bugünden başlayan 7 günlük tahminle karşılaştırılır; tahminin ötesindeki günler bilinmiyor kalır. Her durakta başlama saatindeki hava gösterilir.</p>
      {state.status === "done" && state.truncated && (
        <p className="mt-1 text-[12px] leading-relaxed text-mint/65">İlk {ROUTE_WEATHER_MAX_STOPS} durağın havası istendi; sonrakiler bilinmiyor görünür.</p>
      )}
      {state.status === "error" && <p role="alert" className="mt-2 text-[12px] leading-relaxed text-red-200">Hava durumu bilinmiyor. {state.message}</p>}
      {state.status === "done" && (
        <ul className="mt-2 grid gap-2">
          {route.days.map((day, dayIndex) => {
            const assessment = state.byDay[dayIndex] ?? null;
            const badge = riskBadge(assessment);
            return (
              <li key={dayIndex} className="rounded-xl border border-white/5 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold">{day.dayNumber}. gün{day.title ? ` · ${day.title}` : ""}</span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", badge.className)}>
                    {assessment?.level === "warning" && <TriangleAlert size={12} />}{badge.text}
                  </span>
                </div>
                {assessment && assessment.reasons.length > 0 && (
                  <p className="mt-1 text-[12px] leading-relaxed text-mint/70">{assessment.reasons.join("; ")}</p>
                )}
                {day.stops.length > 0 && (
                  <ul aria-label={`${day.dayNumber}. gün durak havası`} className="mt-2 grid gap-1">
                    {day.stops.map((stop, stopIndex) => {
                      const weather = state.byStop[dayIndex]?.[stopIndex] ?? null;
                      return (
                        <li key={stopIndex} className="flex flex-wrap items-baseline justify-between gap-x-2 text-[12px] leading-relaxed">
                          <span className="min-w-0 truncate text-mint/80">{/^\d{2}:\d{2}/.test(stop.startTime) ? `${stop.startTime.slice(0, 5)} · ` : ""}{stop.name}</span>
                          {weather ? (
                            <span className={cn("shrink-0", weather.risk === "rainy" ? "text-red-200" : weather.risk === "possible" ? "text-sun" : "text-leaf")}>
                              Varışta: {Math.round(weather.temperature)}° · {weather.label} · %{Math.round(weather.precipitationProbability)} yağış
                            </span>
                          ) : (
                            <span className="shrink-0 text-mint/65">Varış havası bilinmiyor</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Profil bileşeni ve karo örnekleyici tembel yüklenir: düzenleyici
// açılış paketinde büyümez, veri yalnız kullanıcı isterse çekilir.
const LazyElevationProfile = lazy(() => import("./ElevationProfile"));

type ElevationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; profile: ElevationProfileData | null }
  | { status: "error"; message: string };

/**
 * Adım 11 (kalan): yükseklik profili rota düzenleyicide. Harita DEM'ine
 * erişim olmadığından karolar doğrudan örneklenir; başarısızsa bileşen
 * "yükseklik verisi yok" gösterir — sahte eğri çizilmez.
 */
function RouteElevationPanel({ route }: { route: AtlasRoute }) {
  const [state, setState] = useState<ElevationState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const load = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });
    try {
      const legs: RouteLeg[] = route.days.flatMap((day, dayIndex) => {
        const dayLegs = (day.legs ?? []).filter((leg) => leg.coords.length > 1);
        if (dayLegs.length > 0) return dayLegs;
        if (!day.polyline) return [];
        try {
          const coords = decodePolyline(day.polyline);
          return coords.length > 1
            ? [{ id: `gun-${dayIndex}-cizgi`, coords, mode: route.transport, distanceKm: 0, durationMinutes: 0 }]
            : [];
        } catch (failure) {
          console.warn("[Atlasia] Gün çizgisi profil için çözülemedi:", failure);
          return [];
        }
      });
      if (legs.length === 0) {
        setState({ status: "done", profile: null });
        return;
      }
      const { buildElevationProfileFromTiles } = await import("../utils/elevation");
      const profile = await buildElevationProfileFromTiles(legs, { signal: controller.signal });
      setState({ status: "done", profile });
    } catch (failure) {
      if ((failure as { name?: string })?.name === "AbortError") return; // kapanış/yeni deneme
      setState({ status: "error", message: failure instanceof Error ? failure.message : "Yükseklik verisi alınamadı." });
    }
  };

  return (
    <section aria-label="Yükseklik profili" className="rounded-2xl border border-white/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[13px] font-semibold"><Mountain size={15} />Yükseklik profili</p>
        <button type="button" disabled={state.status === "loading"} onClick={() => void load()} className="min-h-10 shrink-0 rounded-full border border-leaf/30 bg-leaf/10 px-3 text-[12px] font-semibold text-leaf disabled:opacity-50">
          {state.status === "loading" ? "Hazırlanıyor…" : "Profili göster"}
        </button>
      </div>
      {state.status === "idle" && (
        <p className="mt-1 text-[12px] leading-relaxed text-mint/65">Tırmanış ve eğim, arazi yükseklik verisinden hesaplanır; veri örneklenemezse uydurma eğri çizilmez.</p>
      )}
      {state.status === "error" && <p role="alert" className="mt-2 text-[12px] leading-relaxed text-red-200">Yükseklik verisi yok. {state.message}</p>}
      {state.status === "done" && (
        <div className="mt-2">
          <Suspense fallback={<p className="text-[12px] text-mint/60">Profil bileşeni yükleniyor…</p>}>
            <LazyElevationProfile profileData={state.profile} />
          </Suspense>
        </div>
      )}
    </section>
  );
}

export default function RouteEditor({ route, onClose, onSaved }: Props) {
  // Esc + odak tuzağı + kapanınca odak dönüşü (P18).
  const panelRef = usePanelAccess(true, onClose, true);
  const { publishRoute } = useCollections();
  const [title, setTitle] = useState(route.routeTitle);
  const [summary, setSummary] = useState(route.routeSummary);
  const [region, setRegion] = useState(route.region ?? "");
  const [photo, setPhoto] = useState(route.photo ?? "");
  const [visibility, setVisibility] = useState<RouteVisibility>("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Paylaşım onayı: varsayılan işaretsiz; private dışı yayın ve hesapsız
  // bağlantı bu onay olmadan gizlilik kapısından geçemez.
  const [shareConsent, setShareConsent] = useState(false);
  const [inlineLink, setInlineLink] = useState<string | null>(null);
  const [inlineNote, setInlineNote] = useState<string | null>(null);
  const [inlineCopied, setInlineCopied] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    setTitle(route.routeTitle);
    setSummary(route.routeSummary);
    setRegion(route.region ?? "");
    setPhoto(route.photo ?? "");
    setVisibility("private");
    setShareLink(null);
    setError(null);
    setShareConsent(false);
    setInlineLink(null);
    setInlineNote(null);
  }, [route]);

  const selectPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageWithinLimit(file);
      setPhoto(compressed.dataUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Fotoğraf işlenemedi.");
    }
  };

  /** Düzenlenmiş rotayı kurar; ad/uzunluk denetimi hem kaydetme hem bağlantı için aynıdır. */
  const buildUpdated = (): AtlasRoute | null => {
    if (!title.trim()) { setError("Rotaya bir ad ver."); return null; }
    if (summary.length > 5000) { setError("Not en fazla 5.000 karakter olabilir."); return null; }
    const updated: AtlasRoute = { ...route, routeTitle: title.trim().slice(0, 160), routeSummary: summary.trim(), region: region.trim().slice(0, 120), ...(photo ? { photo } : {}) };
    if (!photo) delete updated.photo;
    return updated;
  };

  const save = async () => {
    const updated = buildUpdated();
    if (!updated) return;
    setBusy(true);
    setError(null);
    try {
      await publishRoute(updated, visibility, shareConsent);
      setShareLink(visibility === "private" ? null : `${window.location.origin}/?route=${encodeURIComponent(updated.id)}`);
      onSaved(updated, visibility);
    } catch (failure) {
      setError(friendlyDataError(failure, "Rota kaydedilemedi. Bağlantını kontrol edip tekrar dene."));
    } finally {
      setBusy(false);
    }
  };

  /**
   * P20: rotayı bağlantının içinde taşıyan hesapsız paylaşım. Sunucuya
   * yazılmaz; aynı onay kutusu ve aynı gizlilik kapısı geçerlidir.
   */
  const createInlineLink = async () => {
    const updated = buildUpdated();
    if (!updated) return;
    setLinkBusy(true);
    setError(null);
    setInlineNote(null);
    try {
      // Paylaşım kodu (sıkıştırma dahil) yalnız bağlantı istenince yüklenir.
      const { createRouteShareLink } = await import("../utils/shareLink");
      const created = await createRouteShareLink(updated, { userInitiated: true, shareConsent });
      if (!created.ok) {
        setError(created.message);
        return;
      }
      setInlineLink(buildRouteShareUrl(window.location.origin, created.token));
      setInlineCopied(false);
      const notes = [
        ...(created.droppedPhoto ? ["Kapak fotoğrafı bağlantıya sığmadığı için eklenmedi."] : []),
        ...created.warnings,
      ];
      setInlineNote(notes.length > 0 ? notes.join(" ") : null);
    } catch (failure) {
      console.warn("[Atlasia] Paylaşım bağlantısı üretilemedi:", failure);
      setError("Bağlantı üretilemedi. Tekrar deneyebilirsin.");
    } finally {
      setLinkBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setError(null);
    } catch {
      setError("Panoya kopyalanamadı. Bağlantıyı seçip elle kopyalayabilirsin.");
    }
  };

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-3" role="presentation">
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="route-editor-title" className="panel-solid thin-scroll max-h-[min(92dvh,900px)] w-full max-w-[620px] overflow-y-auto rounded-[26px] border border-leaf/30 bg-[#031c16] p-5 text-mint shadow-2xl md:p-7">
      <header className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sun">Önce sen karar ver</p><h2 id="route-editor-title" className="mt-1 font-display text-2xl font-semibold">Rotayı düzenle ve paylaş</h2></div>
        <button type="button" onClick={onClose} aria-label="Rota düzenleyiciyi kapat" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/5"><X size={18} /></button>
      </header>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-[13px] font-medium">Rota adı
          <input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-3 text-[15px] outline-none focus:border-sun/60" />
        </label>
        <label className="grid gap-1.5 text-[13px] font-medium">Not / açıklama
          <textarea value={summary} maxLength={5000} onChange={(event) => setSummary(event.target.value)} rows={4} className="rounded-xl border border-white/15 bg-black/20 p-3 text-[14px] leading-relaxed outline-none focus:border-sun/60" />
        </label>
        <label className="grid gap-1.5 text-[13px] font-medium">Bölge <span className="font-normal text-mint/70">(keşif filtrelemesi için)</span>
          <input value={region} maxLength={120} onChange={(event) => setRegion(event.target.value)} placeholder="Örn. İzmir · Kordon" className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-3 text-[15px] outline-none focus:border-sun/60" />
        </label>

        <div>
          <p className="mb-2 text-[13px] font-medium">Kapak fotoğrafı <span className="font-normal text-mint/70">(JPEG data URL, ücretsiz Firestore sınırı)</span></p>
          {photo && <div className="relative mb-2 overflow-hidden rounded-2xl border border-white/10"><img src={photo} alt="Rota kapak fotoğrafı" className="max-h-56 w-full object-cover" /><button type="button" onClick={() => setPhoto("")} aria-label="Kapak fotoğrafını sil" className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-black/75 text-white"><Trash2 size={16} /></button></div>}
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-[13px] text-mint/85 hover:border-sun/50"><ImagePlus size={16} />{photo ? "Başka fotoğraf seç" : "Fotoğraf ekle"}<input type="file" accept="image/*" className="sr-only" onChange={(event) => void selectPhoto(event.currentTarget.files?.[0])} /></label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[13px] font-semibold">Görünürlük</legend>
          {VISIBILITIES.map((option) => <label key={option.value} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-3", visibility === option.value ? "border-sun/50 bg-sun/[0.07]" : "border-white/10")}>
            <input type="radio" name="route-visibility" value={option.value} checked={visibility === option.value} onChange={() => setVisibility(option.value)} className="mt-1 accent-[#f2d77c]" />
            <span><span className="flex items-center gap-2 text-[14px] font-semibold">{option.value === "private" ? <LockKeyhole size={15} /> : <Link2 size={15} />}{option.label}</span><span className="mt-1 block text-[12px] leading-relaxed text-mint/65">{option.detail}</span></span>
          </label>)}
        </fieldset>

        {visibility !== "private" && (
          <div className="grid gap-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 p-3">
              <input type="checkbox" checked={shareConsent} onChange={(event) => setShareConsent(event.currentTarget.checked)} aria-label="Paylaşım onayı" className="mt-1 accent-[#f2d77c]" />
              <span><span className="block text-[14px] font-semibold">Paylaşmayı onaylıyorum</span><span className="mt-1 block text-[12px] leading-relaxed text-mint/65">Bu rotanın {visibility === "public" ? "herkese açık listelenmesini ve bağlantıyla açılmasını" : "bağlantısı olan herkesçe açılmasını"} kabul ediyorum. Ham yürüyüş izim paylaşılmaz; yalnız bu rota paylaşılır.</span></span>
            </label>
            <div className="rounded-2xl border border-white/10 p-3">
              <p className="text-[13px] font-semibold">Hesapsız bağlantıyla paylaş</p>
              <p className="mt-1 text-[12px] leading-relaxed text-mint/65">Rota bağlantının içinde taşınır; sunucuya yayımlanmaz, karşı tarafın hesabı olması gerekmez. Bağlantıyı alan rotayı olduğu gibi açar — kiminle paylaştığına dikkat et.</p>
              <button type="button" disabled={linkBusy} onClick={() => void createInlineLink()} className="mt-2 flex min-h-10 items-center gap-2 rounded-full border border-leaf/30 bg-leaf/10 px-4 text-[12px] font-semibold text-leaf disabled:opacity-50"><Link2 size={14} />{linkBusy ? "Bağlantı hazırlanıyor…" : "Bağlantıyı oluştur"}</button>
              {inlineLink && <div className="mt-2 flex gap-2"><input aria-label="Hesapsız paylaşım bağlantısı" readOnly value={inlineLink} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2 text-[12px]" /><button type="button" onClick={() => { void navigator.clipboard.writeText(inlineLink).then(() => setInlineCopied(true)).catch((failure: unknown) => { console.warn("[Atlasia] Bağlantı panoya kopyalanamadı:", failure); setError("Panoya kopyalanamadı. Bağlantıyı seçip elle kopyalayabilirsin."); }); }} className="min-h-10 shrink-0 rounded-full bg-leaf/15 px-3 text-[12px] font-semibold text-leaf">{inlineCopied ? "Kopyalandı" : "Kopyala"}</button></div>}
              {inlineNote && <p role="note" className="mt-2 text-[12px] leading-relaxed text-sun">{inlineNote}</p>}
            </div>
          </div>
        )}

        <WeatherRiskPanel key={route.id} route={route} />
        <RouteElevationPanel key={`${route.id}-yukseklik`} route={route} />

        <p className="flex items-start gap-2 rounded-xl border border-leaf/20 bg-leaf/[0.06] p-3 text-[12px] leading-relaxed text-mint/75"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-leaf" />Yürüyüş izleri ve taslaklar varsayılan olarak gizlidir. Bu görünürlük seçimi yalnız bu rotayı etkiler; ham iz kendiliğinden yayımlanmaz.</p>
        {error && <p role="alert" className="text-[13px] text-red-200">{error}</p>}
        {shareLink && <div className="rounded-xl border border-leaf/25 p-3"><label htmlFor="route-share-link" className="text-[12px] font-semibold text-leaf">Kalıcı rota bağlantısı</label><div className="mt-2 flex gap-2"><input id="route-share-link" readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2 text-[12px]" /><button type="button" onClick={() => void copyLink()} className="min-h-10 shrink-0 rounded-full bg-leaf/15 px-3 text-[12px] font-semibold text-leaf">{copied ? "Kopyalandı" : "Kopyala"}</button></div></div>}
      </div>

      <footer className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-full border border-white/15 px-4 text-[13px]">Kapat</button><button type="button" disabled={busy} onClick={() => void save()} className="flex min-h-11 items-center gap-2 rounded-full bg-sun px-5 text-[13px] font-semibold text-ink disabled:opacity-50"><Save size={15} />{busy ? "Kaydediliyor…" : visibility === "private" ? "Özel kaydet" : "Yayınla"}</button></footer>
    </section>
  </div>;
}
