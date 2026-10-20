import { useState } from "react";
import { Activity, CircleStop, MapPin, Play, ShieldCheck, Trash2, X } from "lucide-react";
import type { AtlasRoute, AtlasTrack } from "../types";
import { cn } from "../utils/cn";
import { useTrackRecorder } from "../hooks/useTrackRecorder";
import { firebaseConfigured } from "../lib/firebase";

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
  const recording = recorder.status === "recording";
  const saving = recorder.status === "saving";

  const finish = async () => {
    setActionError(null);
    try {
      const result = await recorder.finish();
      onFinished(result.track, result.route);
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : "Kayıt tamamlanamadı.");
    }
  };

  return <section aria-labelledby="track-recorder-title" className="fixed bottom-[calc(26vh+env(safe-area-inset-bottom))] left-3 z-40 w-[min(360px,calc(100vw-24px))] rounded-[22px] border border-leaf/30 bg-[#031c16]/95 p-4 text-mint shadow-2xl backdrop-blur-xl md:bottom-8 md:left-8">
    <header className="flex items-start justify-between gap-3">
      <div>
        <h2 id="track-recorder-title" className="flex items-center gap-2 font-display text-lg font-semibold"><Activity className="size-5 text-sun" />Yürüyüş kaydı</h2>
        <p className="mt-1 text-[12px] text-mint/70">İzin verdiğinde kaydı başlat. Yayınlanmaz.</p>
      </div>
      <button type="button" onClick={onClose} disabled={recording || saving} aria-label="Kayıt panelini kapat" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/5 disabled:opacity-40"><X size={17} /></button>
    </header>

    <div className="mt-3 flex items-start gap-2 rounded-xl border border-leaf/20 bg-leaf/[0.07] p-3 text-[12px] leading-relaxed text-mint/80">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf" />
      <p>İz ve duraklar hesabında gizli kalır. Yayımlamak ayrı ve açık bir eylemdir. Telefon ekranını açık tut; arka planda web kaydı durabilir ve pil daha hızlı bitebilir.</p>
    </div>

    {recording && <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-[11px] text-mint/60">Süre</span><strong className="mt-1 block font-mono text-sm">{durationLabel(recorder.elapsedSeconds)}</strong></div>
      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-[11px] text-mint/60">Mesafe</span><strong className="mt-1 block text-sm">{recorder.distanceKm.toFixed(2)} km</strong></div>
      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-[11px] text-mint/60">Ölçüm</span><strong className="mt-1 block text-sm">{recorder.pointCount}</strong></div>
    </div>}

    {!firebaseConfigured && <p role="status" className="mt-3 text-[12px] text-sun">Bulut hesabı bağlı değil. Bu cihazda kayıt alınamaz.</p>}
    {(recorder.error || actionError) && <p role="alert" className="mt-3 text-[12px] text-red-200">{actionError ?? recorder.error}</p>}
    {saving && <p role="status" className="mt-3 text-[12px] text-mint/75">İz güvenli biçimde buluta kaydediliyor…</p>}

    <div className="mt-4 flex flex-wrap gap-2">
      {!recording && <button type="button" disabled={!firebaseConfigured || saving} onClick={() => { setActionError(null); recorder.start(); }} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold", firebaseConfigured ? "bg-sun text-ink hover:bg-sun/90" : "bg-white/10 text-mint/50")}><Play size={15} fill="currentColor" />{recorder.status === "error" ? "Tekrar dene" : "Kaydı başlat"}</button>}
      {recording && <button type="button" onClick={() => void finish()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-sun px-4 text-sm font-semibold text-ink hover:bg-sun/90"><CircleStop size={16} />Bitir ve kaydet</button>}
      {(recording || recorder.pointCount > 0) && <button type="button" disabled={saving} onClick={() => { recorder.discard(); setActionError(null); }} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-3 text-sm text-mint/80 disabled:opacity-40" aria-label="Kaydedilmemiş izi sil"><Trash2 size={15} />Sil</button>}
    </div>
    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-mint/55"><MapPin size={12} />Durak tespiti tam GPS ölçümlerinden, mesafe sadeleştirilmiş çizgiden hesaplanır.</p>
  </section>;
}
