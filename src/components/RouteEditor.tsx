import { useEffect, useState } from "react";
import { ImagePlus, Link2, LockKeyhole, Save, ShieldCheck, Trash2, X } from "lucide-react";
import type { AtlasRoute, RouteVisibility } from "../types";
import { useCollections } from "../hooks/useCollections";
import { compressImageWithinLimit } from "../utils/image";
import { cn } from "../utils/cn";

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

export default function RouteEditor({ route, onClose, onSaved }: Props) {
  const { publishRoute } = useCollections();
  const [title, setTitle] = useState(route.routeTitle);
  const [summary, setSummary] = useState(route.routeSummary);
  const [photo, setPhoto] = useState(route.photo ?? "");
  const [visibility, setVisibility] = useState<RouteVisibility>("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTitle(route.routeTitle);
    setSummary(route.routeSummary);
    setPhoto(route.photo ?? "");
    setVisibility("private");
    setShareLink(null);
    setError(null);
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

  const save = async () => {
    if (!title.trim()) { setError("Rotaya bir ad ver."); return; }
    if (summary.length > 5000) { setError("Not en fazla 5.000 karakter olabilir."); return; }
    setBusy(true);
    setError(null);
    const updated: AtlasRoute = { ...route, routeTitle: title.trim().slice(0, 160), routeSummary: summary.trim(), ...(photo ? { photo } : {}) };
    if (!photo) delete updated.photo;
    try {
      await publishRoute(updated, visibility);
      setShareLink(visibility === "private" ? null : `${window.location.origin}/?route=${encodeURIComponent(updated.id)}`);
      onSaved(updated, visibility);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Rota kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setBusy(false);
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
    <section role="dialog" aria-modal="true" aria-labelledby="route-editor-title" className="thin-scroll max-h-[min(92dvh,900px)] w-full max-w-[620px] overflow-y-auto rounded-[26px] border border-leaf/30 bg-[#031c16] p-5 text-mint shadow-2xl md:p-7">
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

        <div>
          <p className="mb-2 text-[13px] font-medium">Kapak fotoğrafı <span className="font-normal text-mint/55">(JPEG data URL, ücretsiz Firestore sınırı)</span></p>
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

        <p className="flex items-start gap-2 rounded-xl border border-leaf/20 bg-leaf/[0.06] p-3 text-[12px] leading-relaxed text-mint/75"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-leaf" />Yürüyüş izleri ve taslaklar varsayılan olarak gizlidir. Bu görünürlük seçimi yalnız bu rotayı etkiler; ham iz kendiliğinden yayımlanmaz.</p>
        {error && <p role="alert" className="text-[13px] text-red-200">{error}</p>}
        {shareLink && <div className="rounded-xl border border-leaf/25 p-3"><label htmlFor="route-share-link" className="text-[12px] font-semibold text-leaf">Kalıcı rota bağlantısı</label><div className="mt-2 flex gap-2"><input id="route-share-link" readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2 text-[12px]" /><button type="button" onClick={() => void copyLink()} className="min-h-10 shrink-0 rounded-full bg-leaf/15 px-3 text-[12px] font-semibold text-leaf">{copied ? "Kopyalandı" : "Kopyala"}</button></div></div>}
      </div>

      <footer className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-full border border-white/15 px-4 text-[13px]">Kapat</button><button type="button" disabled={busy} onClick={() => void save()} className="flex min-h-11 items-center gap-2 rounded-full bg-sun px-5 text-[13px] font-semibold text-ink disabled:opacity-50"><Save size={15} />{busy ? "Kaydediliyor…" : visibility === "private" ? "Özel kaydet" : "Yayınla"}</button></footer>
    </section>
  </div>;
}
