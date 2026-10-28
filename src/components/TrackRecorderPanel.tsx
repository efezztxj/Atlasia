import { useRef, useState } from "react";
import { Activity, CircleStop, MapPin, Play, Save, ShieldCheck, Trash2, X } from "lucide-react";
import type { AtlasRoute, AtlasTrack } from "../types";
import { cn } from "../utils/cn";
import { useTrackRecorder, type FinishedTrack } from "../hooks/useTrackRecorder";
// A3: `lib/firebase` SDK'yı modül yüklenirken başlatır; panel yalnız
// "yapılandırıldı mı" sorusunu soruyor → SDK'sız kapı.
import { firebaseConfigured } from "../lib/firebaseConfig";
import { decodePolyline } from "../utils/polyline";
import { summarizeDraft, draftSummaryText, DRAFT_LOSS_NOTICE } from "../utils/trackDraft";
import TrackRibbonPreview from "./TrackRibbonPreview";
import { friendlyDataError } from "../lib/firestoreValue";

interface Props {
  uid: string;
  /** İz yalnızca bulut (Firebase) hesabına yazılır; cihaz hesabı Firestore'a yazamaz. */
  cloudAccount: boolean;
  onClose: () => void;
  onPreview: (coords: [number, number][]) => void;
  onFinished: (track: AtlasTrack, route: AtlasRoute) => void;
}

function paceLabel(seconds: number, distanceKm: number) {
  if (distanceKm < 0.01 || seconds <= 0) return "—";
  const totalSeconds = Math.round(seconds / distanceKm);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")} dk/km`;
}

function durationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
}

/**
 * Yürüyüş kaydı paneli.
 *
 * Akış (P17-Tur2): **Bitir** yalnız taslak üretir ve önizleme gösterir; ham iz
 * hiçbir yere yazılmaz. **Hesabıma kaydet** açık eylemi `createTrack` çağırır.
 * **Vazgeç** taslağı atar. Kaydetme yalnız bulut hesabında vardır: cihaz
 * hesabında Firestore yazma izni yoktur, düğme gösterilmez ve nedeni yazılır.
 */
export default function TrackRecorderPanel({ uid, cloudAccount, onClose, onPreview, onFinished }: Props) {
  const recorder = useTrackRecorder(uid, onPreview);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FinishedTrack | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const recording = recorder.status === "recording";
  const finishing = recorder.status === "finishing";
  const canRecord = firebaseConfigured && cloudAccount;
  const canSave = firebaseConfigured && cloudAccount;

  // Önizleme geri çağrısı her render'da yeniden oluşuyor; ref ile tekrar çizimi önle.
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;

  /** "Bitir": taslak üretir, yazmaz. */
  const finish = async () => {
    setActionError(null);
    setSavedMsg(null);
    try {
      const finished = await recorder.finish();
      setDraft(finished);
      // Önizleme, taslak ÜRETİLDİĞİ anda ve aynı elde yayılır. Daha önce bu bir
      // effect'e bağlıydı: "Vazgeç" tıklaması effect'ten önce çalışabildiği için
      // temizlenmiş haritaya taslak geri dönebiliyordu (testte flaky, React 19'da
      // daha sık). Sıra artık kesin: taslak → önizleme, vazgeç → temizleme.
      previewRef.current(decodePolyline(finished.track.polyline));
    } catch (failure) {
      setActionError(friendlyDataError(failure, "Kayıt tamamlanamadı."));
    }
  };

  /** "Hesabıma kaydet": tek ve açık yazma eylemi. */
  const persist = async (value: FinishedTrack) => {
    setActionError(null);
    setSavedMsg(null);
    setSaving(true);
    try {
      await recorder.save(value.track);
      setSavedMsg("İz hesabına özel olarak kaydedildi. Yayınlanmadı.");
      onFinished(value.track, value.route);
    } catch (failure) {
      setActionError(friendlyDataError(failure, "İz kaydedilemedi. Bağlantını kontrol edip tekrar dene."));
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

  const summary = draft ? summarizeDraft(draft) : null;

  return <section aria-labelledby="track-recorder-title" className="mobile-fullscreen gold-frame glass-panel fixed bottom-7 left-6 z-[55] flex w-[370px] flex-col overflow-y-auto rounded-[26px] p-5 text-mint md:z-40 md:block md:overflow-visible">
    <header className="flex items-start justify-between gap-3">
      <div>
        <h2 id="track-recorder-title" className="flex items-center gap-2.5 font-display text-lg font-semibold"><span className="btn-gold grid size-9 place-items-center rounded-full"><Activity className="size-[18px]" strokeWidth={2.2} /></span>Yürüyüş kaydı</h2>
        <p className="mt-1.5 text-[12px] text-mint/70">İzin verdiğinde kaydı başlat. Kendiliğinden yayınlanmaz.</p>
        <p className="mt-2.5">
          {recording
            ? <span className="rec-pill inline-flex items-center gap-2 rounded-full bg-[#ff6b5e]/12 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-[#ffb3ab] ring-1 ring-[#ff6b5e]/35"><span aria-hidden className="rec-dot" />KAYDEDİLİYOR</span>
            : draft
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/12 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-leaf ring-1 ring-leaf/35">TASLAK HAZIR</span>
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-mint/75 ring-1 ring-white/12">HAZIR</span>}
        </p>
      </div>
      <button type="button" onClick={onClose} disabled={recording || finishing} aria-label="Kayıt panelini kapat" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/5 disabled:opacity-40"><X size={17} /></button>
    </header>

    <div className="mt-3 flex items-start gap-2 rounded-xl border border-leaf/20 bg-leaf/[0.07] p-3 text-[12px] leading-relaxed text-mint/80">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf" />
      <p>Kaydı bitirmek hiçbir yere yazmaz: önce taslağı görürsün, "Hesabıma kaydet" dersen iz yalnız senin hesabına işlenir. Yayınlamak ayrı ve açık bir eylemdir. Telefon ekranını açık tut; arka planda web kaydı durabilir.</p>
    </div>

    {recording && <div className="mt-4">
      <div className="rounded-2xl border border-sun/25 bg-gradient-to-b from-sun/[0.09] to-transparent px-4 py-3 text-center">
        <span className="block text-[11px] font-semibold tracking-[0.14em] text-mint/70 uppercase">Süre</span>
        <strong className="font-display mt-0.5 block text-[38px] leading-none font-bold tracking-tight text-white tabular-nums">{durationLabel(recorder.elapsedSeconds)}</strong>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2.5"><span className="block text-[11px] text-mint/70">Mesafe</span><strong className="mt-1 block text-[15px] text-white tabular-nums">{recorder.distanceKm.toFixed(2)} km</strong></div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2.5"><span className="block text-[11px] text-mint/70">Tempo</span><strong className="mt-1 block text-[15px] text-white tabular-nums">{paceLabel(recorder.elapsedSeconds, recorder.distanceKm)}</strong></div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2.5"><span className="block text-[11px] text-mint/70">Ölçüm</span><strong className="mt-1 block text-[15px] text-white tabular-nums">{recorder.pointCount}</strong></div>
      </div>
      <p role="status" className="mt-2 text-center text-[11px] text-mint/70">
        {recorder.wakeLockActive ? "Ekran açık tutuluyor (Wake Lock etkin)" : "Ekran kilidi korunamadı · telefon ekranını açık tut"}
      </p>
    </div>}

    {draft && summary && (
      <div className="mt-4" data-atlasia-draft="ready">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-leaf uppercase">Kayıt bitti · taslak</p>
        <TrackRibbonPreview coords={decodePolyline(draft.track.polyline)} className="mt-2" />
        <p className="mt-2 text-[11.5px] text-mint/75">{draftSummaryText(summary)}</p>
        <p className="mt-1 text-[11px] text-mint/50">{DRAFT_LOSS_NOTICE}</p>
        {!canSave && (
          <p role="note" className="mt-2 rounded-xl border border-sun/25 bg-sun/[0.07] p-2.5 text-[11.5px] leading-relaxed text-sun">
            Bu cihaz hesabında buluta kayıt yapılamaz. Taslak yalnız bu ekranda durur; kaybetmemek için oturumu bulut (e-posta) hesabıyla aç.
          </p>
        )}
      </div>
    )}

    {!firebaseConfigured && <p role="status" className="mt-3 text-[12px] text-sun">Bulut hesabı bağlı değil. Bu cihazda kayıt alınamaz.</p>}
    {firebaseConfigured && !cloudAccount && !draft && <p role="note" className="mt-3 text-[12px] text-sun">Cihaz hesabındasın: yürüyüş kaydı buluta yazılamaz. Kaydetmek için bulut (e-posta) hesabıyla giriş yap.</p>}
    {(recorder.error || actionError) && <p role="alert" className="mt-3 text-[12px] text-red-200">{actionError ?? recorder.error}</p>}
    {savedMsg && <p role="status" className="mt-3 rounded-xl bg-leaf/10 p-2.5 text-[12px] text-leaf">{savedMsg}</p>}
    {finishing && <p role="status" className="mt-3 text-[12px] text-mint/75">Kayıt kapatılıyor, taslak hazırlanıyor…</p>}
    {saving && <p role="status" className="mt-3 text-[12px] text-mint/75">İz hesabına kaydediliyor…</p>}

    <div className="mt-4 flex flex-wrap gap-2">
      {!recording && !draft && <button type="button" disabled={!canRecord || finishing} onClick={() => { setActionError(null); setSavedMsg(null); recorder.start(); }} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold", canRecord ? "btn-gold text-ink" : "bg-white/10 text-mint/70")}><Play size={15} fill="currentColor" />{recorder.status === "error" ? "Tekrar dene" : "Kaydı başlat"}</button>}
      {recording && <button type="button" onClick={() => void finish()} className="btn-gold flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-ink"><CircleStop size={16} />Bitir</button>}
      {draft && canSave && <button type="button" disabled={saving} onClick={() => void persist(draft)} className="btn-gold flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-ink disabled:opacity-50"><Save size={15} />{saving ? "Kaydediliyor…" : "Hesabıma kaydet"}</button>}
      {draft && <button type="button" disabled={saving} onClick={discardDraft} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-3 text-sm text-mint/80 disabled:opacity-40" aria-label="Taslağı at"><X size={15} />Vazgeç</button>}
      {recording && <button type="button" disabled={finishing} onClick={() => { recorder.discard(); setActionError(null); }} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-3 text-sm text-mint/80 disabled:opacity-40" aria-label="Kaydedilmemiş izi sil"><Trash2 size={15} />Sil</button>}
    </div>
    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-mint/55"><MapPin size={12} />Durak tespiti tam GPS ölçümlerinden, mesafe sadeleştirilmiş çizgiden hesaplanır. Ham iz paylaşılmaz.</p>
  </section>;
}
