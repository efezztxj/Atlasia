import { useRef, useState } from "react";
import { ImagePlus, Loader2, MapPin, Send, X } from "lucide-react";
import { STORY_ACCENTS } from "../data/feed";
import type { StoryAccent, UploadPhotoKind } from "../types";
import { mediaUrl } from "../utils/api";
import { cn } from "../utils/cn";
import { photoUploadErrorMessage } from "../utils/image";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props {
  place: { label: string; lng: number; lat: number };
  defaultAuthor: string;
  uploadPhoto: (file: File, kind: UploadPhotoKind) => Promise<string>;
  onClose: () => void;
  onPublish: (data: {
    text: string;
    accent: StoryAccent;
    author: string;
    attachPlace: boolean;
    photo: string | null;
  }) => void | Promise<void>;
}

const ACCENT_IDS = Object.keys(STORY_ACCENTS) as StoryAccent[];

export default function StoryComposer({
  place,
  defaultAuthor,
  uploadPhoto,
  onClose,
  onPublish,
}: Props) {
  const [text, setText] = useState("");
  const [accent, setAccent] = useState<StoryAccent>("leaf");
  const [author, setAuthor] = useState(defaultAuthor);
  const [attachPlace, setAttachPlace] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Odak tuzağı + Esc + odak dönüşü (P18).
  const panelRef = usePanelAccess(true, onClose, true) as React.RefObject<HTMLDivElement>;

  const pick = async (file?: File) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      setPhoto(await uploadPhoto(file, "story"));
    } catch (failure) {
      setError(photoUploadErrorMessage(failure, "Fotoğraf yüklenemedi, tekrar dene."));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const canPost = (text.trim().length >= 2 || !!photo) && !sending && !uploading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) return;
    setSending(true);
    setError(null);
    try {
      await onPublish({
        text: text.trim(),
        accent,
        author: author.trim() || "Gezgin",
        attachPlace,
        photo,
      });
    } catch (failure) {
      console.error("[Atlasia] Story kaydedilemedi:", failure);
      setError("İz kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setSending(false);
    }
  };

  const preview = mediaUrl(photo ?? undefined);

  return (
    <div className="mobile-fullscreen-wrap animate-fade fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <button type="button" tabIndex={-1} aria-label="Pencereyi kapat" className="absolute inset-0 cursor-default" onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Hikâye oluştur"
        className="mobile-fullscreen-bleed mobile-safe-bottom animate-rise thin-scroll relative max-h-[94vh] w-full max-w-[400px] overflow-y-auto rounded-3xl border border-leaf/25 bg-ink-2 shadow-2xl shadow-black/70"
      >
        <form onSubmit={submit}>
        {/* Önizleme */}
        <div className={cn("relative aspect-[16/11] w-full overflow-hidden", STORY_ACCENTS[accent].bg)}>
          {preview && <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/25" />

          <div className="mobile-safe-top relative z-10 flex items-center justify-between px-3 pt-3">
            {photo ? (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-medium text-white/90 transition hover:bg-black/65"
              >
                Fotoğrafı kaldır
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="grid size-9 place-items-center rounded-full bg-black/40 text-white/85 transition hover:bg-black/65 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="font-display absolute inset-x-5 bottom-4 line-clamp-3 text-[19px] leading-snug font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
            {text.trim() || "Şu an nerede, ne görüyorsun?"}
          </p>
        </div>

        <div className="p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-sun uppercase">24 saatlik iz</p>

          <textarea
            aria-label="Hikâye notu"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="24 saat boyunca akışta kalacak kısa bir not bırak…"
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white outline-none transition placeholder:text-mint/70 focus:border-sun/70"
          />
          <span className="-mt-1 block text-right text-[10px] text-mint/40">{text.length}/160</span>

          {/* Fotoğraf */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={cn(
              "mt-2 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] transition",
              photo
                ? "border-leaf/45 bg-leaf/10 text-mint"
                : "border-dashed border-white/15 bg-white/[0.02] text-mint/60 hover:border-leaf/50 hover:text-mint",
            )}
          >
            {uploading ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-leaf" />
            ) : (
              <ImagePlus className={cn("size-4 shrink-0", photo ? "text-leaf" : "text-mint/45")} />
            )}
            <span className="min-w-0 flex-1 truncate">
              {uploading ? "Fotoğraf hazırlanıyor…" : photo ? "Fotoğraf eklendi" : "Fotoğraf ekle"}
            </span>
            {photo && <span className="shrink-0 text-[11px] text-leaf">değiştir</span>}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void pick(e.target.files?.[0])}
          />

          {error && <p role="alert" className="mt-2 text-[11.5px] text-red-300/90">{error}</p>}

          {/* Renk */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[12px] text-mint/70">{photo ? "Üst ton" : "Renk"}</span>
            <div className="flex gap-1.5">
              {ACCENT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAccent(id)}
                  aria-label={STORY_ACCENTS[id].label}
                  title={STORY_ACCENTS[id].label}
                  className={cn(
                    "size-7 rounded-full ring-offset-2 ring-offset-ink-2 transition",
                    STORY_ACCENTS[id].dot,
                    accent === id ? "ring-2 ring-white" : "ring-1 ring-white/20 hover:ring-white/60",
                  )}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAttachPlace((v) => !v)}
            className={cn(
              "mt-3 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] transition",
              attachPlace
                ? "border-leaf/45 bg-leaf/10 text-mint"
                : "border-white/10 bg-white/[0.02] text-mint/55 hover:text-mint",
            )}
          >
            <MapPin className={cn("size-4 shrink-0", attachPlace ? "text-leaf" : "text-mint/45")} />
            <span className="min-w-0 flex-1 truncate">{place.label}</span>
            <span className="shrink-0 text-[11px] text-mint/50">{attachPlace ? "ekli" : "ekle"}</span>
          </button>

          <input
            aria-label="Takma adın"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={24}
            placeholder="Takma adın"
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-[13px] text-white outline-none transition placeholder:text-mint/70 focus:border-sun/70"
          />

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2.5 text-[13px] text-mint/70 transition hover:bg-white/5 hover:text-white"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!canPost}
              className="flex items-center gap-2 rounded-full bg-sun px-5 py-2.5 text-[13px] font-bold text-ink transition hover:bg-sun-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" strokeWidth={2.4} />
              )}
              Paylaş
            </button>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
}
