import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, MapPin, X } from "lucide-react";
import { CATEGORIES } from "../data/categories";
import type { CategoryId, UploadPhotoKind } from "../types";
import { mediaUrl } from "../utils/api";
import { cn } from "../utils/cn";
import { formatCoords, reverseName } from "../utils/geo";
import { photoUploadErrorMessage } from "../utils/image";
import { countWords, MAX_PLACE_NOTE_CHARS, MAX_PLACE_NOTE_WORDS, MAX_PLACE_PHOTOS, preparePlacePhotos } from "../utils/placeDraft";
import { storageGet, storageSet } from "../utils/storage";

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
    gallery?: string[];
  }) => void | Promise<void>;
}

export default function AddDiscoveryModal({ draft, uploadPhoto, onClose, onSave }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoNeedsConfirmation, setPhotoNeedsConfirmation] = useState(false);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const coords = formatCoords(draft.lat, draft.lng);
  const noteWords = countWords(note);
  const canSave = title.trim().length >= 2 && noteWords <= MAX_PLACE_NOTE_WORDS
    && note.length <= MAX_PLACE_NOTE_CHARS && !saving && !uploading && !photoNeedsConfirmation;

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
        photo: photos[0],
        gallery: photos.length > 1 ? photos.slice(1) : undefined,
      });
    } catch (failure) {
      console.error("[Atlasia] İz kaydedilemedi:", failure);
      const code = (failure as { code?: string } | null)?.code ?? "";
      setError(code.includes("permission-denied")
        ? "Sunucu bu izi reddetti. Çoklu fotoğraf için Firestore kuralları yayınlanmamış olabilir; kayıt yapılmadı."
        : "İz kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  const pick = async (files: File[]) => {
    if (!files.length || uploading || saving) return;
    setUploading(true);
    setPhotoNeedsConfirmation(false);
    setError(null);
    try {
      const result = await preparePlacePhotos(photos, files, (file) => uploadPhoto(file, "place"), (failure) => {
        console.error("[Atlasia] Fotoğraf hazırlanamadı:", failure);
        return photoUploadErrorMessage(failure);
      });
      setPhotos(result.photos);
      const failures = result.failures.map(({ name, reason }) => `${name}: ${reason}`);
      if (result.failures.length) setPhotoNeedsConfirmation(true);
      if (result.skipped) failures.push(`En fazla ${MAX_PLACE_PHOTOS} fotoğraf eklenebilir; ${result.skipped} fotoğraf işlenmedi.`);
      if (failures.length) setError(failures.join(" "));
    } catch (failure) {
      console.error("[Atlasia] Fotoğraf hazırlama hatası:", failure);
      setPhotoNeedsConfirmation(true);
      setError(photoUploadErrorMessage(failure));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form
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
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-[14px] text-white outline-none transition placeholder:text-mint/35 focus:border-sun/70"
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
          Notun <span className="text-mint/50">(en fazla 300 kelime)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_PLACE_NOTE_CHARS}
            aria-describedby="place-note-count"
            aria-invalid={noteWords > MAX_PLACE_NOTE_WORDS}
            rows={6}
            placeholder="Gelecek gezginlere ne söylemek istersin? Hangi saatte, neye dikkat etmeli?"
            className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-[13px] leading-relaxed text-white outline-none transition placeholder:text-mint/35 focus:border-sun/70"
          />
          <span id="place-note-count" className={cn("mt-1 block text-right text-[11px]", noteWords > MAX_PLACE_NOTE_WORDS ? "text-red-200" : "text-mint/60")}>
            {noteWords}/{MAX_PLACE_NOTE_WORDS} kelime · {note.length}/{MAX_PLACE_NOTE_CHARS} karakter
          </span>
        </label>

        {/* Birden fazla fotoğraf aynı seçimde hazırlanır; ilk görsel kapaktır. */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || saving || photos.length >= MAX_PLACE_PHOTOS}
          className={cn(
            "mt-1 flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[12px] transition disabled:cursor-not-allowed",
            photos.length
              ? "border-leaf/45 bg-leaf/10 text-mint"
              : "border-dashed border-white/15 bg-white/[0.02] text-mint/60 hover:border-leaf/50 hover:text-mint",
          )}
        >
          {uploading ? <Loader2 className="size-4 shrink-0 animate-spin text-leaf" /> : <ImagePlus className="size-4 shrink-0 text-mint/70" />}
          <span className="min-w-0 flex-1">
            {uploading ? "Fotoğraflar hazırlanıyor…" : photos.length >= MAX_PLACE_PHOTOS
              ? "3/3 fotoğraf · değiştirmek için birini kaldır"
              : `Fotoğraf ekle · ${photos.length}/${MAX_PLACE_PHOTOS} (birden fazla seçebilirsin)`}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            const selected = Array.from(e.currentTarget.files ?? []);
            e.currentTarget.value = "";
            void pick(selected);
          }}
        />
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Seçilen fotoğraflar">
            {photos.map((photo, index) => (
              <div key={index} className="relative size-16 overflow-hidden rounded-lg border border-leaf/40">
                <img src={mediaUrl(photo)} alt={`${index + 1}. fotoğraf${index === 0 ? " (kapak)" : ""}`} className="size-full object-cover" />
                <button
                  type="button"
                  disabled={uploading || saving}
                  onClick={() => { setPhotos((current) => current.filter((_, i) => i !== index)); setError(null); setPhotoNeedsConfirmation(false); }}
                  aria-label={`${index + 1}. fotoğrafı kaldır`}
                  className="absolute top-0 right-0 grid size-7 place-items-center rounded-bl-lg bg-ink/90 text-white disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="mt-3 block text-[12px] font-medium text-mint/80">
          Takma adın <span className="text-mint/40">(isteğe bağlı)</span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={24}
            placeholder="Gezgin"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-[14px] text-white outline-none transition placeholder:text-mint/35 focus:border-sun/70"
          />
        </label>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2 text-[12px] leading-relaxed text-red-200">
            <p>{error}</p>
            {photoNeedsConfirmation && (
              <button type="button" onClick={() => { setPhotoNeedsConfirmation(false); setError(null); }} className="mt-2 min-h-10 text-left font-semibold text-sun underline">
                {photos.length ? "Hazır fotoğraflarla devam et" : "Fotoğrafsız devam et"}
              </button>
            )}
          </div>
        )}

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
