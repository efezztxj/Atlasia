import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, MapPin, X } from "lucide-react";
import { CATEGORIES } from "../data/categories";
import type { CategoryId, UploadPhotoKind } from "../types";
import { mediaUrl } from "../utils/api";
import { cn } from "../utils/cn";
import { formatCoords, reverseName } from "../utils/geo";
import { storageGet, storageSet } from "../utils/storage";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props {
  draft: { lng: number; lat: number };
  uploadPhoto: (file: File, kind: UploadPhotoKind) => Promise<string>;
  onClose: () => void;
  onSave: (data: {
    title: string;
    category: CategoryId;
    note: string;
    author: string;
    region: string;
    photo?: string;
  }) => void | Promise<void>;
}

export default function AddDiscoveryModal({ draft, uploadPhoto, onClose, onSave }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryId>("nature");
  const [note, setNote] = useState("");
  const [author, setAuthor] = useState(() => storageGet("atlasia.author") ?? "");
  const [region, setRegion] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingName(true);
    reverseName(draft.lat, draft.lng, ctrl.signal).then((name) => {
      if (ctrl.signal.aborted) return;
      setRegion(name);
      setLoadingName(false);
    });
    return () => ctrl.abort();
  }, [draft.lat, draft.lng]);

  // Odak tuzağı + Esc + kapanınca açan öğeye odak dönüşü (P18).
  const panelRef = usePanelAccess(true, onClose, true) as React.RefObject<HTMLFormElement>;

  const coords = formatCoords(draft.lat, draft.lng);
  const canSave = title.trim().length >= 2 && !saving && !uploading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    if (author.trim()) storageSet("atlasia.author", author.trim());
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        category,
        note: note.trim(),
        author: author.trim(),
        region: region ?? coords,
        photo: photo ?? undefined,
      });
    } catch (failure) {
      console.error("[Atlasia] İz kaydedilemedi:", failure);
      setError("İz kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  const pick = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setPhoto(await uploadPhoto(file, "place"));
    } catch (failure) {
      console.error("[Atlasia] Fotoğraf yüklenemedi:", failure);
      setError("Fotoğraf yüklenemedi. İstersen fotoğrafsız devam edebilirsin.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <button type="button" tabIndex={-1} aria-label="Pencereyi kapat" className="absolute inset-0 cursor-default" onClick={onClose} />
      <form
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keşif ekle"
        onSubmit={submit}
        className="animate-rise thin-scroll relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-3xl border border-leaf/25 bg-ink-2 p-6 shadow-2xl shadow-black/70"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-mint/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>

        <p className="text-[12px] font-bold tracking-[0.18em] text-sun uppercase">Yeni iz</p>
        <h3 id="iz-title" className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Bu noktaya bir iz bırak
        </h3>
        <p className="mt-1.5 text-[13px] text-mint/60">* işaretli alanlar zorunlu.</p>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-mint/80">
          <MapPin className="size-4 shrink-0 text-leaf" />
          <span className="min-w-0 flex-1 truncate">
            {loadingName ? "Konum çözümleniyor…" : (region ?? "Bilinmeyen konum")}
          </span>
          {loadingName ? (
            <Loader2 className="size-3.5 animate-spin text-mint/60" />
          ) : (
            <span className="shrink-0 text-[11px] text-mint/45">{coords}</span>
          )}
        </div>

        <label className="mt-5 block text-[12px] font-medium text-mint/80">
          Yerin adı
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Örn. Sessiz koy, sabah pazarı…"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-[14px] text-white outline-none transition placeholder:text-mint/70 focus:border-sun/70"
          />
        </label>

        <div className="mt-4">
          <p className="text-[12px] font-medium text-mint/80">Kategori</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition",
                    active
                      ? "border-sun bg-sun/15 text-sun"
                      : "border-white/10 text-mint/75 hover:border-leaf/50 hover:text-white",
                  )}
                >
                  <Icon className="size-3.5" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-4 block text-[12px] font-medium text-mint/80">
          Küçük ipucu
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={180}
            rows={3}
            placeholder="Gelecek gezginlere ne söylemek istersin? Hangi saatte, neye dikkat etmeli?"
            className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-[13px] leading-relaxed text-white outline-none transition placeholder:text-mint/70 focus:border-sun/70"
          />
          <span className="mt-1 block text-right text-[10px] text-mint/40">{note.length}/180</span>
        </label>

        {/* Fotoğraf */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            "mt-1 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[12px] transition",
            photo
              ? "border-leaf/45 bg-leaf/10 text-mint"
              : "border-dashed border-white/15 bg-white/[0.02] text-mint/60 hover:border-leaf/50 hover:text-mint",
          )}
        >
          {photo ? (
            <img src={mediaUrl(photo)} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
          ) : uploading ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-leaf" />
          ) : (
            <ImagePlus className="size-4 shrink-0 text-mint/45" />
          )}
          <span className="min-w-0 flex-1 truncate">
            {uploading ? "Fotoğraf hazırlanıyor…" : photo ? "Fotoğraf eklendi" : "Fotoğraf ekle"}
          </span>
          {photo && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setPhoto(null);
              }}
              className="shrink-0 rounded-full p-1 text-mint/50 transition hover:text-white"
            >
              <X className="size-3.5" />
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />

        <label className="mt-3 block text-[12px] font-medium text-mint/80">
          Takma adın <span className="text-mint/40">(isteğe bağlı)</span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={24}
            placeholder="Gezgin"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-[14px] text-white outline-none transition placeholder:text-mint/70 focus:border-sun/70"
          />
        </label>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2 text-[12px] leading-relaxed text-red-200">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-[13px] text-mint/70 transition hover:bg-white/5 hover:text-white"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex items-center gap-2 rounded-full bg-sun px-6 py-2.5 text-[13px] font-bold text-ink transition hover:bg-sun-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2.6} />}
            {saving ? "Kaydediliyor…" : "İz bırak"}
          </button>
        </div>
      </form>
    </div>
  );
}
