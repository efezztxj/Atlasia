import { lazy, Suspense, useEffect, useState } from "react";
import {
  Ban,
  Bookmark,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Flag,
  Loader2,
  Map,
  MapPin,
  Navigation,
  Route,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { Place } from "../types";
import { STORIES } from "../data/galleries";
import { CATEGORY_MAP } from "../data/categories";
import { usePlaceGallery } from "../hooks/usePlaceGallery";
import { useCollections } from "../hooks/useCollections";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { useAuth } from "../contexts/AuthContext";
import { blockUser } from "../lib/moderation";
import { VERIFICATION_LABELS, VERIFICATION_STATUSES, type VerificationStatus } from "../utils/freshness";
import ReportDialog from "./ReportDialog";
import { advice } from "../utils/placeAdvice";
import { buildGooglePlaceDirectionsUrl, buildYandexPlaceDirectionsUrl } from "../utils/mapLinks";
import { friendlyDataError } from "../lib/firestoreValue";

// P14: tarihçe listesi ve Overpass/Wikipedia kodu yalnız detay açılınca yüklenir.
const NearbyHistory = lazy(() => import("./NearbyHistory"));

interface Props {
  place: Place;
  onClose: () => void;
  onStreet: () => void;
  onPlan: () => void;
  canDelete?: boolean;
  onDelete?: () => Promise<boolean>;
  onVerify?: (status: VerificationStatus, note?: string) => Promise<void>;
  /** Tazelik okuması giriş şartlı (kural: signedIn). Bulut hesabı yoksa bilgi gizlenir. */
  freshnessLocked?: boolean;
  /** Yakındaki tarihî yer listesinden bir yer açılınca. */
  onOpenPlace?: (place: Place) => void;
}

export default function PlaceDetails({ place, onClose, onStreet, onPlan, canDelete = false, onDelete, onVerify, onOpenPlace, freshnessLocked = false }: Props) {
  const { photos: allPhotos, loading, error } = usePlaceGallery(place);
  const { savePlace, isSaved } = useCollections();
  const panelRef = usePanelAccess(true, onClose, true);
  const [failed, setFailed] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState<VerificationStatus | null>(null);
  const [verifyNote, setVerifyNote] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const { user } = useAuth();

  const submitVerification = async (status: VerificationStatus) => {
    if (!onVerify || verifyBusy) return;
    setVerifyBusy(status);
    setVerifyStatus(null);
    try {
      await onVerify(status, verifyNote.trim() || undefined);
      setVerifyNote("");
      setVerifyStatus("Doğrulaman kaydedildi. Teşekkürler!");
    } catch (error) {
      setVerifyStatus(friendlyDataError(error, "Doğrulama kaydedilemedi."));
    } finally {
      setVerifyBusy(null);
    }
  };

  const photos = allPhotos.filter((photoItem) => !failed.includes(photoItem.url));
  const photo = photos[Math.min(index, Math.max(0, photos.length - 1))];
  const cat = CATEGORY_MAP[place.category];
  const guide = advice(place);
  const story = place.story ?? STORIES[place.id] ?? place.note;
  const googleMapsUrl = buildGooglePlaceDirectionsUrl(place);
  const yandexMapsUrl = buildYandexPlaceDirectionsUrl(place);

  useEffect(() => {
    setFailed([]);
    setIndex(0);
    setStatus(null);
    setDeleting(false);
  }, [place.id]);
  useEffect(() => setImageLoaded(false), [photo?.url]);

  const share = async () => {
    try {
      const text = `${place.title}\n${place.region}\nhttps://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`;
      if (navigator.share) await navigator.share({ title: place.title, text });
      else await navigator.clipboard.writeText(text);
      setStatus("Yer bağlantısı paylaşıldı.");
    } catch {
      setStatus("Paylaşım tamamlanmadı. Konum bağlantısını yol tarifi üzerinden açabilirsin.");
    }
  };

  const remove = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    const removed = await onDelete();
    if (removed) onClose();
    else setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-[65] flex justify-end bg-black/35">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Yer detayından haritaya dön" />
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="place-title" className="settings-sheet relative flex h-dvh w-full max-w-[510px] flex-col overflow-hidden border-l border-leaf/20 bg-[#041c16] shadow-2xl">
        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-ink/95 to-transparent px-4 py-3">
          <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-1.5 rounded-full bg-ink/85 px-3 text-sm"><ChevronLeft size={17} />Haritaya dön</button>
          <button type="button" onClick={onClose} aria-label="Yer detayını kapat" className="grid size-11 place-items-center rounded-full bg-ink/85"><X size={18} /></button>
        </header>

        <figure className="relative h-[min(35dvh,350px)] min-h-[220px] shrink-0 bg-[#12362a]">
          {photo ? (
            <>
              <img
                key={photo.url}
                src={photo.url}
                alt={`${place.title}${photo.nearby ? " yakın çevresi" : ""}, galeri fotoğrafı ${index + 1}`}
                className="size-full object-cover"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setFailed((current) => [...current, photo.url]);
                  setIndex(0);
                }}
              />
              {!imageLoaded && <div className="pointer-events-none absolute inset-0 grid place-content-center bg-ink/30 text-sm">Fotoğraf yükleniyor...</div>}
              <figcaption className="absolute inset-x-0 bottom-0 bg-ink/90 px-4 py-2 text-[11px] text-mint/90">
                {photo.nearby && <span className="mr-2 text-sun">Yakın çevreden</span>}
                {photo.source ? <a href={photo.source} target="_blank" rel="noreferrer" className="hover:underline">{photo.credit}</a> : photo.credit}
              </figcaption>
            </>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Camera size={30} className="text-sun" />
              <p className="text-sm">{loading ? "Bu çevredeki fotoğraflar aranıyor..." : allPhotos.length ? "Fotoğraflar şu an yüklenemiyor." : "Bu noktaya henüz fotoğraf eklenmemiş."}</p>
              {failed.length > 0 && <button type="button" onClick={() => setFailed([])} className="min-h-10 text-sm text-sun underline">Tekrar dene</button>}
            </div>
          )}
          {photos.length > 1 && (
            <>
              <button type="button" aria-label="Önceki fotoğraf" onClick={() => setIndex((current) => (current - 1 + photos.length) % photos.length)} className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/80"><ChevronLeft size={18} /></button>
              <button type="button" aria-label="Sonraki fotoğraf" onClick={() => setIndex((current) => (current + 1) % photos.length)} className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/80"><ChevronRight size={18} /></button>
            </>
          )}
        </figure>

        {photos.length > 1 && (
          <nav aria-label="Yer fotoğrafları" className="thin-scroll flex shrink-0 gap-2 overflow-x-auto px-4 py-3">
            {photos.map((item, photoIndex) => (
              <button key={item.url} type="button" aria-label={`${photoIndex + 1}. fotoğrafı göster`} aria-current={photoIndex === index ? "true" : undefined} onClick={() => setIndex(photoIndex)} className={`h-14 w-[76px] shrink-0 overflow-hidden rounded-lg border-2 ${photoIndex === index ? "border-sun" : "border-transparent"}`}>
                <img src={item.url} alt="" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </nav>
        )}

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-8">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-sun uppercase">{cat.label} · {place.kind === "user" ? "Gezgin izi" : "Atlasia rehberi"}</p>
          <h2 id="place-title" className="font-display mt-2 text-[28px] leading-tight font-semibold">{place.title}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-mint/75"><MapPin size={14} />{place.region}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => savePlace(place)} className="flex min-h-11 items-center gap-2 rounded-full border border-leaf/30 px-4 text-sm text-sun">
              <Bookmark size={15} fill={isSaved(place.id) ? "currentColor" : "none"} />{isSaved(place.id) ? "Kaydedildi" : "Kaydet"}
            </button>
            <button type="button" onClick={onPlan} className="flex min-h-11 items-center gap-2 rounded-full bg-sun px-4 text-sm font-semibold text-ink"><Route size={15} />Rota oluştur</button>
            <button type="button" onClick={() => void share()} aria-label="Bu yeri paylaş" className="grid size-11 place-items-center rounded-full border border-leaf/30"><Share2 size={16} /></button>
            {canDelete && onDelete && (
              <button type="button" disabled={deleting} onClick={() => void remove()} aria-label="Bu izimi sil" className="flex min-h-11 items-center gap-2 rounded-full border border-red-300/25 px-4 text-sm text-red-200 transition hover:bg-red-400/10 disabled:opacity-60">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}İzimi sil
              </button>
            )}
            {place.authorUid && place.authorUid !== user?.uid && (
              <button type="button" disabled={blocking} onClick={async () => {
                if (!user || !place.authorUid) return;
                if (!confirm(`${place.author} kullanıcısını engellemek istiyor musun?`)) return;
                setBlocking(true);
                try { await blockUser(place.authorUid, user.uid); setStatus("Kullanıcı engellendi."); } catch (e) { setStatus(friendlyDataError(e, "Kullanıcı engellenemedi.")); } finally { setBlocking(false); }
              }} className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-mint/70 disabled:opacity-50">
                {blocking ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}Engelle
              </button>
            )}
            <button type="button" onClick={() => setShowReport(true)} className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-mint/70"><Flag size={15} />Bildir</button>
          </div>

          {status && <p role="status" className="mt-2 text-[13px] text-sun">{status}</p>}
          <p className="mt-5 text-[15px] leading-[1.8] text-mint/90">{story}</p>
          {place.historySource ? (
            <p className="mt-2 text-[11px] leading-relaxed text-mint/70" data-testid="place-attribution">
              Metin: <a href={place.historySource.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{place.historySource.name} · {place.historySource.title}</a> ({place.historySource.license}, özetlendi). Konum verisi © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2">OpenStreetMap katkıcıları</a> (ODbL).
            </p>
          ) : place.dataSources?.length ? (
            <p className="mt-2 text-[11px] leading-relaxed text-mint/70" data-testid="place-attribution">Kaynak: {place.dataSources.join(" · ")}</p>
          ) : null}

          <Suspense fallback={null}>
            <NearbyHistory key={place.id} place={place} onOpen={onOpenPlace} />
          </Suspense>

          <section aria-labelledby="freshness-title" className="mt-7 rounded-2xl border border-leaf/25 bg-white/[0.03] p-3.5">
            <h3 id="freshness-title" className="flex items-center gap-2 text-[13px] font-semibold"><Clock3 size={16} className="text-leaf" />Tazelik</h3>
            {freshnessLocked ? (
              <p className="mt-1 text-[13px] leading-relaxed text-mint/85">
                Tazelik bilgisi yalnız giriş yapmış üyelere görünür. Giriş yapınca son doğrulamaları görebilirsin.
              </p>
            ) : (
              <p className="mt-1 text-[13px] leading-relaxed text-mint/85">
                {place.freshness ? place.freshness.label : "Henüz doğrulanmadı · bilgi eski olabilir"}
              </p>
            )}
            {!freshnessLocked && place.freshness?.latestAt && (
              <p className="mt-1 text-[11px] text-mint/55">
                Son doğrulama: {new Date(place.freshness.latestAt).toLocaleDateString("tr-TR")} · toplam {place.freshness.totalCount} doğrulama
              </p>
            )}
            {!freshnessLocked && onVerify && (
              <>
                <p className="mt-3 text-[12px] text-mint/70">Burayı yeni ziyaret ettiysen tek dokunuşla doğrula:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VERIFICATION_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={!!verifyBusy}
                      onClick={() => void submitVerification(status)}
                      className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[12px] text-mint/85 transition hover:border-leaf/60 hover:text-white disabled:opacity-50"
                    >
                      {verifyBusy === status ? <Loader2 size={12} className="animate-spin" /> : null}
                      {VERIFICATION_LABELS[status]}
                    </button>
                  ))}
                </div>
                <label className="mt-2 block text-[11px] text-mint/70">
                  İsteğe bağlı not (max 280)
                  <input value={verifyNote} onChange={(event) => setVerifyNote(event.target.value)} maxLength={280} placeholder="Örn. giriş ücreti 200 TL oldu" className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-ink px-2 text-[12px] text-mint outline-none focus:border-leaf/50" />
                </label>
                {verifyStatus && <p role="status" className="mt-2 text-[12px] text-sun">{verifyStatus}</p>}
              </>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-mint/50">Tazelik bir güven sinyalidir; doğrulama puan/rozet kazandırmaz. Rota motoru taze doğrulanmış durağı öne alır.</p>
          </section>

          <h3 className="mt-7 text-[12px] font-bold tracking-[0.16em] text-sun uppercase">Gitmeden bil</h3>
          <dl className="mt-3 space-y-4">
            {[["En iyi zaman", guide.timing], ["Ulaşım", guide.access], ["Bilet ve ücret", guide.cost], ["Dikkat", guide.caution]].map(([label, value]) => (
              <div key={label}><dt className="text-[12px] text-mint/70">{label}</dt><dd className="mt-1 text-[14px] leading-relaxed text-mint">{value}</dd></div>
            ))}
          </dl>

          <section aria-labelledby="directions-title" className="mt-7 rounded-2xl border border-leaf/20 bg-white/[0.025] p-3.5">
            <h3 id="directions-title" className="flex items-center gap-2 text-[13px] font-semibold"><Navigation size={16} className="text-leaf" />Yol tarifi</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-mint/70">Atlasia açık kalır; rota yeni sekmede veya uygun harita uygulamasında açılır.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {googleMapsUrl && <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 text-center text-[13px] font-semibold text-[#1f2937]">Google Maps <ExternalLink size={14} /></a>}
              {yandexMapsUrl && <a href={yandexMapsUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ffdf35] px-3 text-center text-[13px] font-semibold text-[#201d12]">Yandex Maps <ExternalLink size={14} /></a>}
              {!googleMapsUrl && !yandexMapsUrl && <p className="col-span-2 text-[12px] text-mint/70">Bu yerin koordinatları geçerli olmadığı için dış yol tarifi oluşturulamadı.</p>}
            </div>
          </section>

          <button type="button" onClick={onStreet} className="mt-4 flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-leaf/30 px-4 text-[14px]">
            <span className="flex items-center gap-2"><Map size={17} className="text-sun" />Çevre haritasını aç</span><ExternalLink size={15} />
          </button>
          <a href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`} target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center justify-center gap-2 text-[13px] text-sun">OpenStreetMap'te bu yeri aç <ExternalLink size={13} /></a>

          {error && <p className="mt-3 text-[13px] text-mint/75">Ek fotoğraf kaynağına ulaşılamadı; mevcut galeriyi kullanabilirsin.</p>}
          <p className="mt-5 border-l-2 border-sun/30 pl-3 text-[12px] leading-relaxed text-mint/75">Bu bir rehber özetidir. Saat, ücret ve erişim koşullarını gitmeden resmî kaynaktan doğrula.</p>
        </div>
      </aside>
      {showReport && user && (
        <ReportDialog targetType="place" targetId={place.id} targetOwnerUid={place.authorUid} targetLabel={place.title} reporterUid={user.uid} onClose={() => setShowReport(false)} onReported={() => setStatus("Raporun alındı, inceleyeceğiz.")} />
      )}
    </div>
  );
}
