import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark, Compass, MapPin, Route, Trash2, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { isCloudAccount, useCollections } from "../hooks/useCollections";
import {
  PUBLIC_ROUTE_PAGE_SIZE,
  deleteTrack,
  filterPublicRoutes,
  listOwnedTracks,
  listPublicRoutes,
  sortPublicRoutes,
  type PublicRouteDurationFilter,
  type PublicRouteRecord,
  type PublicRouteSort,
} from "../lib/routeData";
import type { AtlasRoute, AtlasTrack, Place } from "../types";
import PlaceImage from "./PlaceImage";
import { cn } from "../utils/cn";
import { friendlyDataError } from "../lib/firestoreValue";

interface Props { onClose: () => void; onPlace: (place: Place) => void; onRoute: (route: AtlasRoute) => void; }
type Tab = "places" | "routes" | "discover" | "tracks";

export default function RecordsDock({ onClose, onPlace, onRoute }: Props) {
  const { user } = useAuth();
  const { savedPlaces, savedRoutes, savePlace, saveRoute, removeRoute, loading: savedLoading, error: savedError } = useCollections();
  const [tab, setTab] = useState<Tab>("places");
  const [publicRoutes, setPublicRoutes] = useState<PublicRouteRecord[]>([]);
  const [tracks, setTracks] = useState<AtlasTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState<PublicRouteDurationFilter>("all");
  const [themeFilter, setThemeFilter] = useState("all");
  const [sort, setSort] = useState<PublicRouteSort>("saved");
  // Keşif ve özel izler Firestore ister: yapılandırma yoksa ya da hesap cihaz
  // hesabıysa (Firestore'da yetkisiz uid) bu sekmeler açık mesaj gösterir;
  // sessiz boş liste ya da yabancı hata metni gösterilmez.
  const cloudReady = isCloudAccount(user?.backend);
  const cloudBlocked = !cloudReady && (tab === "discover" || tab === "tracks");

  useEffect(() => {
    if (!cloudReady || tab !== "discover") return;
    let active = true;
    setLoading(true);
    setError(null);
    void listPublicRoutes().then((routes) => {
      if (active) setPublicRoutes(routes);
    }).catch((failure: unknown) => {
      if (active) setError(friendlyDataError(failure, "Rotalar keşfedilemedi."));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cloudReady, tab]);

  useEffect(() => {
    if (!cloudReady || tab !== "tracks" || !user) return;
    let active = true;
    setLoading(true);
    setError(null);
    void listOwnedTracks(user.uid).then((items) => {
      if (active) setTracks(items.sort((a, b) => b.startedAt - a.startedAt));
    }).catch((failure: unknown) => {
      if (active) setError(friendlyDataError(failure, "Özel izler yüklenemedi."));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cloudReady, tab, user]);

  const regions = useMemo(() => [...new Set(publicRoutes.map(({ route }) => route.region?.trim()).filter((region): region is string => !!region))].sort((a, b) => a.localeCompare(b, "tr")), [publicRoutes]);
  const themes = useMemo(() => [...new Set(publicRoutes.map(({ route }) => route.vibe.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")), [publicRoutes]);
  const visibleRoutes = useMemo(
    () => sortPublicRoutes(
      filterPublicRoutes(publicRoutes, { region: regionFilter, duration: durationFilter, theme: themeFilter }),
      sort,
    ),
    [publicRoutes, regionFilter, durationFilter, themeFilter, sort],
  );

  const deleteTrackRecord = async (trackId: string) => {
    setError(null);
    try {
      await deleteTrack(trackId);
      setTracks((current) => current.filter((track) => track.id !== trackId));
    } catch (failure) {
      setError(friendlyDataError(failure, "İz silinemedi."));
    }
  };

  const currentError = error ?? savedError;
  const empty = tab === "places" ? savedPlaces.length === 0
    : tab === "routes" ? savedRoutes.length === 0
      : tab === "discover" ? visibleRoutes.length === 0
        : tracks.length === 0;
  const emptyTitle = cloudBlocked
    ? tab === "discover" ? "Rota keşfi bulut hesabıyla çalışır." : "Özel izler bulut hesabına kaydedilir."
    : tab === "places" ? "Henüz kaydettiğin bir yer yok."
      : tab === "routes" ? "Henüz kaydettiğin rota yok."
        : tab === "discover" ? "Bu filtrelerde açık rota yok." : "Özel iz kaydın yok.";
  const emptyBody = cloudBlocked
    ? tab === "discover"
      ? "Bu modda yalnız kendi cihazındaki kayıtlar görünür. Başkalarının açık rotalarını görmek için bulut (e-posta) hesabıyla giriş yap."
      : "Yürüyüş izleri yalnız bulut hesabında saklanır; bu cihazda iz kaydı tutulmaz."
    : tab === "places" ? "Bir yerin hikâyesini açıp Kaydet'e dokun. Bir sonraki yolculuğunda burada olsun."
      : tab === "routes" ? "Paylaşılan bir rotayı açıp kaydet; cihazların arasında eşitlensin."
        : tab === "discover" ? "Filtreleri değiştir veya daha sonra yeniden dene." : "Yürüyüş kaydı başlattığında iz burada yalnız sana görünür.";

  return <aside aria-labelledby="records-title" className="atlas-sheet fixed inset-x-3 bottom-[calc(78px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[1020px] overflow-hidden rounded-[28px] border border-leaf/25 bg-[#031c16] p-4 shadow-2xl md:bottom-7 md:p-6" onKeyDown={(event) => event.key === "Escape" && onClose()}>
    <header className="flex items-center justify-between gap-3"><div><h2 id="records-title" className="font-display text-xl font-semibold">Kayıtlarım</h2><p className="mt-1 text-[13px] text-mint/70">Kişisel izlerin gizli; yalnız açık rotalar keşifte görünür.</p></div><button type="button" onClick={onClose} aria-label="Kayıtları kapat" className="grid size-11 place-items-center rounded-full hover:bg-white/5"><X size={18} /></button></header>
    <nav aria-label="Kayıt türü" className="thin-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
      <button type="button" aria-pressed={tab === "places"} onClick={() => setTab("places")} className={cn("flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px]", tab === "places" ? "border-sun/50 bg-sun/10 text-sun" : "border-white/15 text-mint")}><Bookmark size={14} />Yerler {savedPlaces.length}</button>
      <button type="button" aria-pressed={tab === "routes"} onClick={() => setTab("routes")} className={cn("flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px]", tab === "routes" ? "border-sun/50 bg-sun/10 text-sun" : "border-white/15 text-mint")}><Route size={15} />Kaydettiklerim {savedRoutes.length}</button>
      <button type="button" aria-pressed={tab === "discover"} onClick={() => setTab("discover")} className={cn("flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px]", tab === "discover" ? "border-sun/50 bg-sun/10 text-sun" : "border-white/15 text-mint")}><Compass size={15} />Rota keşfi</button>
      <button type="button" aria-pressed={tab === "tracks"} onClick={() => setTab("tracks")} className={cn("flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px]", tab === "tracks" ? "border-sun/50 bg-sun/10 text-sun" : "border-white/15 text-mint")}><MapPin size={14} />Özel izler {tracks.length}</button>
    </nav>

    {tab === "discover" && cloudReady && <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-1 text-[11px] text-mint/60">Bölge<select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="min-h-10 rounded-lg border border-white/15 bg-[#061b16] px-2 text-[13px] text-mint"><option value="all">Tüm bölgeler</option>{regions.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
      <label className="grid gap-1 text-[11px] text-mint/60">Süre<select value={durationFilter} onChange={(event) => setDurationFilter(event.target.value as PublicRouteDurationFilter)} className="min-h-10 rounded-lg border border-white/15 bg-[#061b16] px-2 text-[13px] text-mint"><option value="all">Her süre</option><option value="short">4 saate kadar</option><option value="day">4–12 saat</option><option value="multi">12 saatten uzun</option></select></label>
      <label className="grid gap-1 text-[11px] text-mint/60">Tema<select value={themeFilter} onChange={(event) => setThemeFilter(event.target.value)} className="min-h-10 rounded-lg border border-white/15 bg-[#061b16] px-2 text-[13px] text-mint"><option value="all">Tüm temalar</option>{themes.map((theme) => <option key={theme} value={theme}>{theme}</option>)}</select></label>
      <label className="grid gap-1 text-[11px] text-mint/60">Sıralama<select value={sort} onChange={(event) => setSort(event.target.value as PublicRouteSort)} className="min-h-10 rounded-lg border border-white/15 bg-[#061b16] px-2 text-[13px] text-mint"><option value="saved">En çok kaydedilen</option><option value="newest">En yeni</option><option value="shortest">En kısa süre</option><option value="longest">En uzun süre</option></select></label>
    </div>}
    {tab === "discover" && cloudReady && publicRoutes.length >= PUBLIC_ROUTE_PAGE_SIZE && (
      <p role="note" className="mt-2 text-[11px] text-mint/55">Keşif en fazla {PUBLIC_ROUTE_PAGE_SIZE} rota listeler; filtre ve sıralamayla daraltabilirsin.</p>
    )}

    {currentError && <p role="alert" className="mt-3 rounded-xl border border-red-300/20 bg-red-950/30 p-3 text-[12px] text-red-100">{currentError}</p>}
    {(loading || ((tab === "places" || tab === "routes") && savedLoading)) && <p role="status" className="mt-4 text-center text-[13px] text-mint/65">Kayıtlar yükleniyor…</p>}
    {empty && !loading && !(savedLoading && (tab === "places" || tab === "routes")) ? <div className="mt-3 flex min-h-[130px] items-center justify-center gap-4 border-t border-white/10 text-left"><Bookmark size={26} className="shrink-0 text-sun/80" /><div><h3 className="text-[15px] font-semibold">{emptyTitle}</h3><p className="mt-1 max-w-md text-[13px] leading-relaxed text-mint/70">{emptyBody}</p></div></div> : <div className="thin-scroll mt-4 flex gap-3 overflow-x-auto pb-1">
      {tab === "places" && savedPlaces.map((place) => <article key={place.id} className="relative w-[220px] shrink-0 overflow-hidden rounded-2xl border border-white/10"><button type="button" onClick={() => onPlace(place)} className="w-full text-left"><PlaceImage place={place} className="h-[95px] w-full" compact /><span className="block px-3 py-3"><span className="block truncate text-[14px] font-semibold">{place.title}</span><span className="mt-1 flex items-center gap-1 text-[12px] text-mint/75"><MapPin size={12} /><span className="truncate">{place.region}</span></span></span></button><button type="button" onClick={() => savePlace(place)} aria-label={`${place.title} kaydını kaldır`} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-ink/90 text-sun"><Bookmark size={15} fill="currentColor" /></button></article>)}
      {tab === "routes" && savedRoutes.map((route) => <article key={route.id} className="flex min-h-[176px] w-[280px] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center justify-between"><Route size={18} className="text-sun" /><button type="button" onClick={() => removeRoute(route.id)} aria-label={`${route.routeTitle} rotasını kayıtlardan sil`} className="grid size-9 place-items-center rounded-full text-mint/70 hover:bg-red-400/10 hover:text-red-200"><Trash2 size={14} /></button></div><h3 className="mt-2 line-clamp-2 text-[15px] font-semibold">{route.routeTitle}</h3><p className="mt-1 text-[13px] text-mint/70">{route.region ? `${route.region} · ` : ""}{route.days.flatMap((day) => day.stops).length} durak · {route.totalDistanceKm} km</p><button type="button" onClick={() => onRoute(route)} className="mt-auto flex min-h-11 items-center justify-between text-[13px] font-semibold text-sun">Rotayı aç <ArrowRight size={15} /></button></article>)}
      {tab === "discover" && visibleRoutes.map(({ route, saveCount }) => <article key={route.id} className="flex min-h-[205px] w-[290px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">{route.photo && <img src={route.photo} alt="" className="h-24 w-full object-cover" />}<div className="flex flex-1 flex-col p-4"><div className="flex items-center justify-between gap-2"><span className="truncate text-[11px] text-mint/55">{route.region || "Bölgesi belirtilmedi"}</span><span className="shrink-0 text-[11px] text-sun">{saveCount} kayıt</span></div><h3 className="mt-2 line-clamp-2 text-[15px] font-semibold">{route.routeTitle}</h3><p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-mint/65">{route.vibe} · {route.totalDurationHours} saat · {route.totalDistanceKm} km</p><div className="mt-auto flex gap-2 pt-3"><button type="button" onClick={() => onRoute(route)} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full border border-white/15 text-[12px]">Aç <ArrowRight size={13} /></button><button type="button" onClick={() => saveRoute(route)} aria-label={`${route.routeTitle} rotasını kaydet`} className="grid size-10 shrink-0 place-items-center rounded-full border border-sun/30 text-sun"><Bookmark size={14} fill={savedRoutes.some((saved) => saved.id === route.id) ? "currentColor" : "none"} /></button></div></div></article>)}
      {tab === "tracks" && tracks.map((track) => <article key={track.id} className="flex min-h-[160px] w-[270px] shrink-0 flex-col rounded-2xl border border-leaf/20 bg-leaf/[0.04] p-4"><div className="flex items-center justify-between"><span className="rounded-full bg-leaf/10 px-2.5 py-1 text-[11px] text-leaf">Yalnız sen</span><button type="button" onClick={() => void deleteTrackRecord(track.id)} aria-label="Bu özel izi kalıcı olarak sil" className="grid size-9 place-items-center rounded-full text-mint/70 hover:bg-red-400/10 hover:text-red-200"><Trash2 size={14} /></button></div><h3 className="mt-3 text-[14px] font-semibold">Yürüyüş kaydı</h3><p className="mt-1 text-[12px] text-mint/70">{new Date(track.startedAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}</p><p className="mt-1 text-[12px] text-mint/70">{track.distanceKm.toFixed(2)} km · {track.stops.length} durak · {track.accuracy.sampleCount} ölçüm</p></article>)}
    </div>}
  </aside>;
}
