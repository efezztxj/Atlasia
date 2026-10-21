import { useEffect, useRef, useState } from "react";
import { Activity, CircleStop, CloudOff, MapPin, Play, Save, ShieldCheck, Trash2, X } from "lucide-react";
import type { AtlasRoute, AtlasTrack } from "../types";
import { cn } from "../utils/cn";
import { useTrackRecorder, type FinishedTrack } from "../hooks/useTrackRecorder";
import { firebaseConfigured } from "../lib/firebase";
import { createTrack } from "../lib/routeData";
import { decodePolyline } from "../utils/polyline";
import { clearPendingTrack, pendingAgeLabel, readPendingTrack, savePendingTrack, type PendingTrack } from "../utils/trackDraft";
import { resolveTrackPublish } from "../utils/trackPrivacy";
import TrackRibbonPreview from "./TrackRibbonPreview";

interface Props {
  uid: string;
  onClose: () => void;
  onPreview: (coords: [number, number][]) => void;
  onFinished: (track: AtlasTrack, route: AtlasRoute) => void;
}

function durationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
}

export default function TrackRecorderPanel({ uid, onClose, onPreview, onFinished }: Props) {
  const recorder = useTrackRecorder(uid, onPreview);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FinishedTrack | null>(null);
  const [pending, setPending] = useState<PendingTrack | null>(() => readPendingTrack());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const recording = recorder.status === "recording";
  const finishing = recorder.status === "saving";

  // Önizleme geri çağrısı her render'da yeniden oluşuyor; ref ile tekrar çizimi önle.
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;
  useEffect(() => {
    if (draft) previewRef.current(decodePolyline(draft.track.polyline));
  }, [draft]);

  const finish = async () => {
    setActionError(null);
    setSavedMsg(null);
    try {
      const result = await recorder.finish();
      setDraft(result);
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : "Kayıt tamamlanamadı.");
    }
  };

  /** Açık "kaydet" eylemi: özel olarak hesaba yazar; başarısızsa cihazda bekletir. */
  const persist = async (value: { track: AtlasTrack; route: AtlasRoute }) => {
    const { track, route } = value;
    const decision = resolveTrackPublish(track, { userInitiated: true, privacy: "private", shareConsent: false });
    if (!decision.ok) {
      setActionError(decision.reason);
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await createTrack(uid, decision.track);
      clearPendingTrack();
      setPending(null);
      setSavedMsg("İz hesabına özel olarak kaydedildi. Yayınlanmadı.");
      onFinished(decision.track, route);
    } catch {
      const queued = savePendingTrack(track, route);
      setPending(readPendingTrack());
      setActionError(
        queued
          ? "Bağlantı yok. İz bu cihazda bekliyor; bağlantı gelince aynı düğmeyle kaydet."
          : "İz ne buluta ne cihaza yazılabildi. Ekranı kapatmadan tekrar dene.",
      );
    } finally {
      setSaving(false);
    }
  };

  const discardDraft = () => {
    setDraft(null);
    setSavedMsg(null);
    setActionError(null);
    onPreview([]);
  };

  return <section aria-labelledby="track-recorder-title" className="fixed bottom-[calc(26vh+env(safe-area-inset-bottom))] left-3 z-40 w-[min(360px,calc(100vw-24px))] rounded-[22px] border border-leaf/30 bg-[#031c16]/95 p-4 text-mint shadow-2xl backdrop-blur-xl md:bottom-8 md:left-8">
    <header className="flex items-start justify-between gap-3">
      <div>
        <h2 id="track-recorder-title" className="flex items-center gap-2 font-display text-lg font-semibold"><Activity className="size-5 text-sun" />Yürüyüş kaydı</h2>
        <p className="mt-1 text-[12px] text-mint/70">İzin verdiğinde kaydı başlat. Kendiliğinden yayınlanmaz.</p>
      </div>
      <button type="button" onClick={onClose} disabled={recording || finishing} aria-label="Kayıt panelini kapat" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/5 disabled:opacity-40"><X size={17} /></button>
    </header>

    <div className="mt-3 flex items-start gap-2 rounded-xl border border-leaf/20 bg-leaf/[0.07] p-3 text-[12px] leading-relaxed text-mint/80">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf" />
      <p>İz varsayılan olarak <b>özel</b>dir; ham konum geçmişi yalnız senin hesabında kalır. Kaydetmek ayrı bir eylemdir, paylaşmak daha da ayrı. Telefon ekranını açık tut; arka planda web kaydı durabilir.</p>
    </div>

    {recording && <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-[11px] text-mint/60">Süre</span><strong className="mt-1 block font-mono text-sm">{durationLabel(recorder.elapsedSeconds)}</strong></div>
      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-[11px] text-mint/60">Mesafe</span><strong className="mt-1 block text-sm">{recorder.distanceKm.toFixed(2)} km</strong></div>
      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-[11px] text-mint/60">Ölçüm</span><strong className="mt-1 block text-sm">{recorder.pointCount}</strong></div>
    </div>}

    {draft && (
      <div className="mt-4">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-leaf uppercase">Kayıt bitti · taslak</p>
        <TrackRibbonPreview coords={decodePolyline(draft.track.polyline)} className="mt-2" />
        <p className="mt-2 text-[11.5px] text-mint/70">
          {draft.track.distanceKm.toFixed(2)} km · {draft.track.stops.length} durak · ortalama doğruluk ±{Math.round(draft.track.accuracy.meanMeters)} m
        </p>
        <p className="mt-1 text-[11px] text-mint/55">
          {draft.stats.keptCount} nokta (ham {draft.track.accuracy.sampleCount}) · en büyük sapma {draft.stats.maxDeviationM.toFixed(1)} m
          {" · "}sadeleştirme toleransı 7 m
        </p>
        <p className="mt-1 text-[11px] text-mint/50">Şerit görünümü haritadaki hedef geometridir; taslak henüz hiçbir yere yazılmadı.</p>
      </div>
    )}

    {pending && !draft && (
      <div className="mt-3 rounded-xl border border-sun/25 bg-sun/[0.07] p-3 text-[12px] text-sun">
        <p className="flex items-center gap-1.5 font-semibold"><CloudOff size={14} />Cihazda bekleyen iz</p>
        <p className="mt-1 text-mint/75">{pending.track.distanceKm.toFixed(2)} km · {pending.route.routeTitle} · {pendingAgeLabel(pending.savedAt)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={saving} onClick={() => void persist(pending)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-sun px-3 text-[12px] font-semibold text-ink disabled:opacity-50"><Save size={13} />Şimdi kaydet</button>
          <button type="button" onClick={() => { clearPendingTrack(); setPending(null); }} className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 px-3 text-[12px] text-mint/80"><Trash2 size={13} />Sil</button>
        </div>
      </div>
    )}

    {!firebaseConfigured && !draft && <p role="status" className="mt-3 text-[12px] text-sun">Bulut hesabı bağlı değil. Kayıt alınır ama şimdilik yalnız cihazda tutulamaz; bulut yapılandırması gerekir.</p>}
    {savedMsg && <p role="status" className="mt-3 rounded-xl bg-leaf/10 p-2.5 text-[12px] text-leaf">{savedMsg}</p>}
    {(recorder.error || actionError) && <p role="alert" className="mt-3 text-[12px] text-red-200">{actionError ?? recorder.error}</p>}
    {finishing && <p role="status" className="mt-3 text-[12px] text-mint/75">Kayıt kapatılıyor, duraklar hesaplanıyor…</p>}

    <div className="mt-4 flex flex-wrap gap-2">
      {!recording && !draft && <button type="button" disabled={finishing || saving} onClick={() => { setActionError(null); recorder.start(); }} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold", "bg-sun text-ink hover:bg-sun/90 disabled:opacity-50")}><Play size={15} fill="currentColor" />{recorder.status === "error" ? "Tekrar dene" : "Kaydı başlat"}</button>}
      {recording && <button type="button" onClick={() => void finish()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-sun px-4 text-sm font-semibold text-ink hover:bg-sun/90"><CircleStop size={16} />Bitir</button>}
      {draft && <button type="button" disabled={saving} onClick={() => void persist(draft)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-sun px-4 text-sm font-semibold text-ink disabled:opacity-50"><Save size={15} />{saving ? "Kaydediliyor…" : "Hesabıma kaydet"}</button>}
      {(recording || recorder.pointCount > 0) && <button type="button" disabled={finishing || saving} onClick={() => { recorder.discard(); setSavedMsg(null); setActionError(null); }} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-3 text-sm text-mint/80 disabled:opacity-40" aria-label="Kaydedilmemiş izi sil"><Trash2 size={15} />Sil</button>}
      {draft && <button type="button" disabled={saving} onClick={discardDraft} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-3 text-sm text-mint/80 disabled:opacity-40" aria-label="Taslağı at"><X size={15} />Vazgeç</button>}
    </div>
    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-mint/55"><MapPin size={12} />Durak tespiti tam GPS ölçümlerinden (yalnız ±50 m'den iyi, en az 3 dk aynı yerde), mesafe sadeleştirilmiş çizgiden hesaplanır. Taslak rota yalnız sen kaydedersen oluşur; paylaşım bu panelde yapılmaz.</p>
  </section>;
}
