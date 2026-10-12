import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Check, ChevronDown, Clock3, ExternalLink, ImagePlus, MapPin, Navigation, RotateCcw, Send, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import type { AtlasRoute, Place, RouteBrief, ViewState } from "../types";
import { useCollections } from "../hooks/useCollections";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { briefHours, nearbyPlaces, planRoute, reorderRoute, surpriseBrief } from "../utils/routePlanner";
import { advice, namedPlace } from "../utils/placeAdvice";
import { normalize } from "../utils/text";
import { decodePolyline } from "../utils/polyline";
import { goldenHourWindow } from "../utils/sun";
import { haversineKm } from "../utils/geo";
import { compressImage } from "../utils/image";
import { cn } from "../utils/cn";
import PlaceImage from "./PlaceImage";

const QUICK = ["1 günlük rota öner", "Yakınımda gizli yerler", "Fotoğraf rotası", "Kalabalıktan kaç", "Yerel uyarılar", "Ücretsiz alternatifler"];
const INTERESTS = ["Doğa", "Tarih", "Yemek", "Fotoğraf", "Kamp", "Plaj", "Gizli Yerler", "Mimari"];
const VIBES = ["Huzurlu", "Macera", "Romantik", "Yalnızlık", "Enerjik", "Keşifçi", "Atmosferik"];
const DEFAULT: RouteBrief = { duration: "day", tempo: "Dengeli", interests: [], transport: "walking", budget: "Orta", vibe: "", start: "pick", rain: "auto" };
const STEPS = ["Haritadaki bağlamı okuyorum...", "Yakın izleri seçiyorum...", "Mesafe ve zamanı dengeliyorum...", "Rota önizlemesi hazırlanıyor..."];
const DISCLAIMER = "Saat, ücret ve erişim koşulları değişebilir; gitmeden doğrula.";
interface Message { id: string; role: "user" | "assistant"; text: string; cards?: Place[]; photo?: string; }
interface Props {
  open: boolean; onOpen: () => void; onClose: () => void; places: Place[]; view: ViewState;
  origin: { lat: number; lng: number; label: string }; selectedPlace?: Place; hasLocation?: boolean;
  resumeRoute?: AtlasRoute | null; onPreview: (coords: [number, number][]) => void; onDraw: (coords: [number, number][]) => void;
  dockExpanded?: boolean;
  onPulse: (lng: number, lat: number) => void; onFit: (coords: [number, number][]) => void;
}
const coordinates = (route: AtlasRoute) => route.days.flatMap((day) => decodePolyline(day.polyline));

export default function AtlasAssistant({ open, onOpen, onClose, places, view, origin, selectedPlace, hasLocation, resumeRoute, dockExpanded, onPreview, onDraw, onPulse, onFit }: Props) {
  const { saveRoute } = useCollections();
  const panelRef = usePanelAccess(open, onClose);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const resumeId = useRef<string | null>(null);
  const [intro, setIntro] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", text: "Merhaba! Haritada bir yer seç veya aklındaki keşfi yaz. Önce yakınındaki topluluk izlerine, sonra rehber noktalarına bakarım." }]);
  const [brief, setBrief] = useState<RouteBrief>(DEFAULT);
  const [wizard, setWizard] = useState(false);
  const [route, setRoute] = useState<AtlasRoute | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"good" | "bad" | null>(null);
  const [saved, setSaved] = useState(false);
  const context = selectedPlace ?? origin;

  useEffect(() => { const timer = setTimeout(() => setIntro(false), 1800); return () => clearTimeout(timer); }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, loading]);

  const add = (message: Omit<Message, "id">) => setMessages((current) => [...current.slice(-39), { ...message, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }]);

  useEffect(() => {
    if (!open) { resumeId.current = null; return; }
    if (!resumeRoute || resumeId.current === resumeRoute.id) return;
    resumeId.current = resumeRoute.id;
    setRoute(resumeRoute);
    setApproved(false);
    setSaved(true);
    const points = coordinates(resumeRoute);
    if (points.length > 1) { onPreview(points); onFit(points); }
    add({ role: "assistant", text: `“${resumeRoute.routeTitle}” kaydını açtım. Önce gözden geçir; istersen sırayı değiştir veya haritada göster.` });
  }, [open, resumeRoute, onPreview, onFit]);

  const weather = async (center: { lat: number; lng: number }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&current=precipitation&forecast_days=1`, { signal: controller.signal });
      if (!response.ok) throw new Error("Weather unavailable");
      const data = await response.json() as { current?: { precipitation?: number } };
      if (typeof data.current?.precipitation !== "number") throw new Error("No weather data");
      return data.current.precipitation > .2 ? "Hava modelinde mevcut yağış görünüyor. Kaygan zemin ve açık alanlar için kapalı bir mola planla; tüm durakların yağmura uygunluğu doğrulanmadı." : "Hava modelinde mevcut yağış görünmüyor. Bu, gün boyunca yağmur olmayacağı anlamına gelmez.";
    } catch { return "Canlı hava bilgisine ulaşamadım. Yağmur ihtimalini yerel tahminden kontrol et."; }
    finally { clearTimeout(timeout); }
  };

  const build = async (settings: RouteBrief, question: string, reference?: Place) => {
    if (lock.current) return;
    lock.current = true;
    setError(null);
    setWizard(false);
    setBrief(settings);
    setSaved(false);
    setFeedback(null);
    add({ role: "user", text: question });
    const center = reference ?? (settings.start === "map" ? view : settings.start === "me" ? origin : context);
    const forecast = settings.rain === "auto" ? weather(center) : Promise.resolve("Hava değerlendirmesi esnek bırakıldı; tahmini gitmeden kontrol et.");
    try {
      for (let step = 0; step < STEPS.length; step++) {
        if (!mounted.current) return;
        setStage(step);
        setLoading(STEPS[step]);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      const result = planRoute(places, center, settings, await forecast);
      if (!mounted.current) return;
      setRoute(result);
      setApproved(false);
      const points = coordinates(result);
      if (points.length > 1) { onPreview(points); onFit(points); }
      const local = nearbyPlaces(places, center, 20);
      add({ role: "assistant", text: result.routeSummary, cards: result.days.length ? undefined : local.slice(0, 3) });
    } catch { setError("Rota hazırlanamadı. Daha az durak veya farklı bir başlangıç seçip tekrar dene."); }
    finally { if (mounted.current) setLoading(null); lock.current = false; }
  };

  const respond = async (raw: string) => {
    const question = raw.trim();
    if (!question || lock.current) return;
    setInput("");
    setError(null);
    const q = normalize(question);
    const named = namedPlace(question, places);
    const reference = named ?? selectedPlace;
    const center = reference ?? origin;
    const local = nearbyPlaces(places, center, 20);

    if (route && /daha kisa|daha az yuruyus|yagmur.*degistir|daha sakin|cocuk|daha basit/.test(q)) {
      const next = { ...brief };
      if (/kisa|basit/.test(q)) { next.duration = "custom"; next.customHours = Math.max(1, Math.min(3, briefHours(brief) / 2)); }
      if (/sakin|cocuk/.test(q)) next.tempo = "Rahat";
      if (/az yuruyus/.test(q)) next.transport = "transit";
      if (/yagmur/.test(q)) { next.interests = ["Tarih", "Yemek", "Mimari"]; next.rain = "auto"; }
      await build(next, question, reference);
      return;
    }
    if (/foto.*rota/.test(q)) { await build({ ...DEFAULT, interests: ["Fotoğraf", "Mimari"], vibe: "Atmosferik" }, question, reference); return; }
    if (/2 saat|bos vaktim|beni sasirt/.test(q)) { await build(surpriseBrief(), question, reference); return; }
    if (/ruya|hayalim|ideal seyahat/.test(q)) {
      const days = Number(q.match(/(\d+)\s*gun/)?.[1] ?? 1);
      await build({ ...DEFAULT, duration: days > 1 ? "multi" : "day", tempo: /sakin|cocuk|yavas/.test(q) ? "Rahat" : "Dengeli", interests: /foto/.test(q) ? ["Fotoğraf", "Doğa"] : /tarih/.test(q) ? ["Tarih", "Mimari"] : ["Doğa", "Gizli Yerler"], budget: /ucuz|dusuk|butce/.test(q) ? "Düşük" : "Orta", vibe: /huzur|sessiz/.test(q) ? "Huzurlu" : "Keşifçi", transport: /araba/.test(q) ? "driving" : "walking" }, question, reference);
      return;
    }
    if (/rota olustur|rota oner|1 gunluk|planla/.test(q)) {
      add({ role: "user", text: question });
      setBrief({ ...DEFAULT, start: reference ? "pick" : hasLocation ? "me" : "map" });
      setWizard(true);
      return;
    }
    add({ role: "user", text: question });
    if (/goster|haritada/.test(q) && reference) { onPulse(reference.lng, reference.lat); add({ role: "assistant", text: `${reference.title} gösteriliyor. İpucu: fotoğrafları ve erişim notlarını yerin detayında bulabilirsin.` }); return; }
    if (/acik mi|bilgi dogru|ucret ne|kac para/.test(q)) { add({ role: "assistant", text: `Canlı açık/kapalı veya güncel bilet bilgisine erişimim yok.${reference ? ` ${reference.title} için ${advice(reference).cost}` : " Seçtiğin yerin resmî kaynağını kontrol et."} Bir ipucu: rezervasyon ve biletin hangi alanları kapsadığını satın almadan kontrol et.` }); return; }
    if (/gun batimi|altin saat|en iyi isik|cekim saati/.test(q)) {
      const light = goldenHourWindow(center.lat, center.lng);
      add({ role: "assistant", text: `${reference ? `${reference.title} için ` : "Bu konumda "}altın saat tahmini: ${light.evening ?? "bu tarihte hesaplanamıyor"}. Sabah: ${light.morning ?? "hesaplanamıyor"}. Saatler ${light.timeZone} yerel saatidir. Bina gölgesi, hava ve yerel arazi görüşü değiştirebilir. İpucu: son güneşten 20 dakika önce konumunu seç.`, cards: local.filter((place) => ["photo", "nature", "beaches"].includes(place.category)).slice(0, 2) });
      return;
    }
    if (/gizli|kalabalik|huzur|sessiz/.test(q)) {
      const candidates = local.filter((place) => place.kind === "user" || ["nature", "routes", "community"].includes(place.category)).slice(0, 3);
      add({ role: "assistant", text: candidates.length ? "Önce yakınındaki topluluk izlerine bakıyorum. Ziyaretçi sayısı ölçülmediği için bu yerlerin boş olacağını söyleyemem. Bir ipucu: patika, erişim ve dönüş saatini önceden kontrol et." : "Bu bölgede doğrulanmış gizli yer kaydı az. Yeni bir yer uydurmak yerine yakın rehber noktalarını gösterebilirim. İpucu: sabah erken seçenekleri değerlendirmek için yer detaylarını aç.", cards: candidates.length ? candidates : local.slice(0, 2) });
      return;
    }
    if (/uyari|dikkat|guvenlik/.test(q)) { add({ role: "assistant", text: reference ? `${reference.title}: ${advice(reference).caution}\nUlaşım: ${advice(reference).access}\nAcil numarayı ve en yakın sağlık noktasını yerel resmî kaynaktan kontrol et; canlı acil hizmet listem yok.` : "Belirli bir yer seçersen yere uygun uyarı verebilirim. Genel ipucu: çevrimdışı harita, yeterli su ve hava koşuluna uygun ayakkabı al; ücretli hizmetin fiyatını önceden sor." }); return; }
    if (/ucretsiz|butce|ucuz|alternatif/.test(q)) { add({ role: "assistant", text: reference ? `${reference.title}: ${advice(reference).cost}\nÜcretsiz alternatif için izin verilen kamusal yürüyüş veya seyir alanını değerlendir. Tam konum için yerel erişim kurallarını kontrol et.` : "Yakınında fiyatı doğrulanmış bir ücretsiz nokta bulamadım. Kamusal yürüyüş ve seyir alanları alternatif olabilir; hepsinin ücretsiz olduğunu varsayma. İpucu: ulaşım ve rezervasyonun toplam maliyetini birlikte kontrol et.", cards: local.slice(0, 2) }); return; }
    if (/mevsim|hangi ay|kisin|yazin/.test(q)) { add({ role: "assistant", text: reference && Math.abs(reference.lat) > 55 ? "Yüksek enlemde gün ışığı ve mevsimsel erişim önemli. Yazın günler uzun, kışın yol ve hava koşulları daha zor olabilir. İpucu: ziyaret tarihine göre servis, patika ve gün ışığı saatlerini kontrol et." : "İlkbahar ve sonbahar birçok yerde daha ılıman seçenekler olabilir; bu her iklim için geçerli değil. Canlı sıcaklık ve etkinlik takvimini doğrulamadım. İpucu: tarihinle birlikte bir yer adı yazarsan konuma göre değerlendirebilirim.", cards: reference ? [reference] : undefined }); return; }
    if (/yemek/.test(q)) { const food = local.filter((place) => place.category === "food"); add({ role: "assistant", text: food.length ? "Yakındaki yemek izleri bunlar. İpucu: fiyat, rezervasyon ve diyet/alergen bilgisini işletmeden doğrula." : "Bu çevrede yemek kaydı bulamadım; başka bir şehirden uzak bir restoran önermiyorum. İpucu: yerel pazar veya esnaf lokantasını değerlendir, fiyatı menüden doğrula.", cards: food.slice(0, 3) }); return; }
    add({ role: "assistant", text: reference ? `${reference.title}: ${reference.note}\nBir ipucu: ${advice(reference).timing}` : local.length ? "Bu konuma yakın izleri seçtim. Bir ipucu: bir yeri seçip süre veya ruh halini yaz; öneriyi o çevrede daraltayım." : "Bu çevrede yeterli iz yok. Haritada bir yer seçebilir veya “Kapadokya” gibi bir yer adı yazabilirsin. İpucu: başlangıç noktasını belirtmek, uzak ve anlamsız rota önerilerini önler.", cards: reference ? [reference] : local.slice(0, 3) });
  };

  const photoMatch = async (file?: File) => {
    if (!file || lock.current) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) { setError("10 MB'dan küçük bir fotoğraf seç."); return; }
    lock.current = true;
    setLoading("Fotoğrafın ışık ve renk tonlarını okuyorum...");
    try {
      const { dataUrl } = await compressImage(file, 600, .8);
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = dataUrl; });
      const canvas = document.createElement("canvas"); canvas.width = 20; canvas.height = 20;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("No canvas");
      ctx.drawImage(image, 0, 0, 20, 20);
      const pixels = ctx.getImageData(0, 0, 20, 20).data;
      const colors = [0, 0, 0]; for (let i = 0; i < pixels.length; i += 4) { colors[0] += pixels[i]; colors[1] += pixels[i + 1]; colors[2] += pixels[i + 2]; }
      const green = colors[1] > colors[0] && colors[1] > colors[2];
      const local = nearbyPlaces(places, context, 25).filter((place) => green ? ["nature", "camp"].includes(place.category) : ["photo", "history", "beaches", "cities"].includes(place.category));
      add({ role: "user", text: "Bu fotoğrafın atmosferine benzer yerler", photo: dataUrl });
      add({ role: "assistant", text: `Fotoğrafta ${green ? "yeşil" : colors[0] > colors[2] ? "sıcak" : "soğuk"} tonlar baskın. Bu eşleştirme renk ve ışık üzerinden yapılır; mekânı veya mevsimi kesin olarak tanımıyorum. İpucu: benzer ışık için çekim saatini ayrıca sor.`, cards: local.slice(0, 3) });
    } catch { setError("Fotoğraf okunamadı. JPG, PNG veya WebP ile tekrar dene."); }
    finally { lock.current = false; setLoading(null); if (fileRef.current) fileRef.current.value = ""; }
  };

  return <>
    <button type="button" onClick={open ? onClose : onOpen} aria-label="Atlas AI keşif asistanını aç" aria-expanded={open} aria-controls="atlas-assistant" className={cn("atlas-fab atlas-launcher absolute right-3 z-30 flex min-h-12 items-center gap-2 rounded-full bg-[#F2D77C] px-4 font-semibold text-[#10241a] md:right-8", intro && "is-intro", dockExpanded && "atlas-dock-expanded", open && "invisible")}><Sparkles size={17} /><span className="atlas-launcher-label">Atlas AI</span></button>
    {open && <aside ref={panelRef} id="atlas-assistant" aria-labelledby="atlas-title" className="atlas-sheet fixed bottom-[calc(78px+env(safe-area-inset-bottom))] right-3 z-[50] flex max-h-[min(78dvh,710px)] w-[calc(100%-24px)] max-w-[450px] flex-col overflow-hidden rounded-[28px] border border-sun/25 bg-[#071c16] shadow-2xl md:bottom-6 md:right-24">
      <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4"><div><h2 id="atlas-title" className="font-display flex items-center gap-2 text-lg font-semibold text-sun"><Sparkles size={17} />Atlas AI</h2><p className="mt-1 text-[13px] leading-relaxed text-mint/75">Yakındaki izlerle önerir. Güncel bilgileri gitmeden doğrula.</p></div><button type="button" onClick={onClose} aria-label="Atlas AI'yi kapat" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/5"><ChevronDown size={18} /></button></header>
      <div className="border-y border-white/10 px-5 py-2 text-[12px] text-sun">Referans: {selectedPlace?.title ?? origin.label}</div>
      <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 py-3">{QUICK.map((prompt) => <button key={prompt} type="button" disabled={!!loading} onClick={() => void respond(prompt)} className="min-h-10 shrink-0 rounded-full border border-white/15 px-3 text-[13px] text-mint transition hover:border-sun/60 disabled:opacity-40">{prompt}</button>)}</div>
      <div ref={bodyRef} className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <div role="log" aria-live="polite" aria-relevant="additions" className="space-y-4">{messages.map((message) => <div key={message.id} className={cn("text-[14px] leading-[1.65]", message.role === "user" ? "ml-8 rounded-2xl bg-white/[0.08] px-3.5 py-2.5" : "mr-2 text-mint")}><p className="whitespace-pre-line">{message.text}</p>{message.photo && <img src={message.photo} alt="Photoğrafın ışık ve renk eşleştirmesi için yüklediğin görsel" className="mt-2 max-h-36 rounded-xl object-cover" />}{message.cards && <div className="mt-3 space-y-2">{message.cards.map((place) => <button key={place.id} type="button" onClick={() => onPulse(place.lng, place.lat)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-2.5 text-left"><PlaceImage place={place} compact className="size-12 shrink-0 rounded-lg" /><span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{place.title}</span><span className="mt-1 block truncate text-[12px] text-mint/75">{place.kind === "user" ? "Topluluk izi" : "Atlasia rehberi"} · {haversineKm(context.lat, context.lng, place.lat, place.lng).toFixed(1)} km</span></span><MapPin size={15} className="text-sun" /></button>)}</div>}{message.role === "assistant" && message.id !== "welcome" && <p className="mt-2 text-[12px] text-mint/70">{DISCLAIMER}</p>}</div>)}</div>
        {messages.length === 1 && <button type="button" onClick={() => setInput("Kapadokya'da gün batımı için önerin ne?")} className="min-h-11 rounded-xl border border-white/10 px-3 text-left text-[13px] text-mint/80">Örnek: Kapadokya'da gün batımı nereden izlenir?</button>}
        {wizard && <RouteWizard initial={brief} hasLocation={!!hasLocation} onCancel={() => setWizard(false)} onGenerate={(settings) => void build(settings, "Bu seçimlerle rota oluştur")} />}
        {loading && <div role="status" className="rounded-xl border border-sun/15 p-3"><p className="text-[13px] text-sun">{loading}</p><div className="mt-3 h-0.5 bg-white/10"><div className="h-full bg-sun transition-all duration-700" style={{ width: `${(stage + 1) * 25}%` }} /></div></div>}
        {error && <div role="alert" className="border-l-2 border-sun pl-3 text-sm text-sun"><p>{error}</p><button type="button" onClick={() => { setError(null); setWizard(true); }} className="mt-2 flex min-h-10 items-center gap-2 underline underline-offset-4"><RotateCcw size={14} />Seçimleri düzenle</button></div>}
        {route && route.days.length > 0 && <RouteResult route={route} approved={approved} saved={saved} onConfirm={() => { onDraw(coordinates(route)); setApproved(true); }} onStop={(stop) => onPulse(stop.lng, stop.lat)} onReorder={(day, from, to) => { const next = reorderRoute(route, day, from, to); setRoute(next); if (approved) onDraw(coordinates(next)); else onPreview(coordinates(next)); }} onSave={() => { saveRoute(route); setSaved(true); }} onEdit={() => setWizard(true)} onAlternative={(prompt) => void respond(prompt)} />}
        {route && <div className="flex items-center gap-3 border-t border-white/10 pt-3 text-[12px]"><span className="text-mint/75">Bu öneri nasıldı?</span><button type="button" aria-label="Öneri iyi" aria-pressed={feedback === "good"} onClick={() => setFeedback("good")} className={cn("grid size-10 place-items-center rounded-full", feedback === "good" && "bg-sun/15 text-sun")}><ThumbsUp size={15} /></button><button type="button" aria-label="Öneri yetersiz" aria-pressed={feedback === "bad"} onClick={() => { setFeedback("bad"); setWizard(true); }} className={cn("grid size-10 place-items-center rounded-full", feedback === "bad" && "bg-sun/15 text-sun")}><ThumbsDown size={15} /></button>{feedback === "good" && <span className="text-sun">Teşekkürler.</span>}</div>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void respond(input); }} className="shrink-0 border-t border-white/10 px-4 py-3"><label htmlFor="atlas-query" className="mb-2 block text-[12px] text-mint/80">Haritaya sor</label><div className="flex items-center gap-2"><button type="button" disabled={!!loading} onClick={() => fileRef.current?.click()} aria-label="Atmosfer eşleştirmesi için fotoğraf ekle" className="grid size-11 shrink-0 place-items-center rounded-full text-sun disabled:opacity-40"><ImagePlus size={19} /></button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void photoMatch(event.target.files?.[0])} /><input id="atlas-query" value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} disabled={!!loading} placeholder="Yer, süre veya aklındaki atmosfer..." className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-mint placeholder:text-[#b6cabb]" /><button type="submit" disabled={!input.trim() || !!loading} aria-label="Soruyu gönder" className="grid size-11 shrink-0 place-items-center rounded-full bg-sun text-ink disabled:opacity-40"><Send size={16} /></button></div></form>
    </aside>}
  </>;
}

function RouteWizard({ initial, hasLocation, onCancel, onGenerate }: { initial: RouteBrief; hasLocation: boolean; onCancel: () => void; onGenerate: (brief: RouteBrief) => void }) {
  const [value, setValue] = useState(initial);
  const [step, setStep] = useState(0);
  const select = (key: keyof RouteBrief, choice: unknown) => setValue((current) => ({ ...current, [key]: choice }));
  const chip = (active: boolean) => cn("min-h-10 rounded-full border px-3 text-[13px]", active ? "border-sun bg-sun/15 text-sun" : "border-white/15 text-mint");
  return <section aria-label="Rota oluşturma adımları" className="rounded-2xl border border-sun/20 bg-white/[0.025] p-4"><header className="mb-4 flex items-center justify-between"><h3 className="font-display font-semibold">{["Ne kadar zamanın var?", "Nasıl bir keşif?", "Yolun nasıl olsun?"][step]}</h3><span className="text-[12px] text-sun">{step + 1}/3</span></header>
    {step === 0 && <><p className="mb-2 text-[13px] text-mint/75">Süre</p><div className="flex flex-wrap gap-2">{([["half", "Yarım gün"], ["day", "1 gün"], ["multi", "2-3 gün"], ["custom", "Saat seç"]] as const).map(([choice, label]) => <button key={choice} type="button" aria-pressed={value.duration === choice} className={chip(value.duration === choice)} onClick={() => select("duration", choice)}>{label}</button>)}</div>{value.duration === "custom" && <label className="mt-3 block text-[13px]">Kaç saat?<input type="number" min={1} max={24} value={value.customHours ?? 3} onChange={(event) => select("customHours", Number(event.target.value))} className="ml-3 h-10 w-20 rounded-lg border border-leaf/30 bg-ink px-2" /></label>}<p className="mb-2 mt-4 text-[13px] text-mint/75">Tempo</p><div className="flex gap-2">{(["Rahat", "Dengeli", "Yoğun"] as const).map((choice) => <button type="button" key={choice} className={chip(value.tempo === choice)} onClick={() => select("tempo", choice)}>{choice}</button>)}</div></>}
    {step === 1 && <><p className="mb-2 text-[13px] text-mint/75">İlgi alanları</p><div className="flex flex-wrap gap-2">{INTERESTS.map((choice) => <button type="button" key={choice} aria-pressed={value.interests.includes(choice)} className={chip(value.interests.includes(choice))} onClick={() => select("interests", value.interests.includes(choice) ? value.interests.filter((interest) => interest !== choice) : [...value.interests, choice])}>{choice}</button>)}</div><label className="mb-2 mt-4 block text-[13px] text-mint/75" htmlFor="atlas-vibe">Ruh hali</label><select id="atlas-vibe" value={value.vibe} onChange={(event) => select("vibe", event.target.value)} className="h-11 w-full rounded-xl border border-white/20 bg-ink px-3 text-[14px]"><option value="">Sana bırakıyorum</option>{VIBES.map((vibe) => <option key={vibe}>{vibe}</option>)}</select></>}
    {step === 2 && <div className="space-y-3">{[{ key: "transport", label: "Ulaşım", options: [["walking", "Yürüyüş"], ["cycling", "Bisiklet"], ["driving", "Araba"], ["transit", "Toplu taşıma"]] }, { key: "budget", label: "Bütçe", options: [["Düşük", "Düşük"], ["Orta", "Orta"], ["Yüksek", "Yüksek"]] }, { key: "start", label: "Başlangıç", options: [["pick", "Seçili yer veya mevcut bağlam"], ["map", "Haritanın merkezi"], ...(hasLocation ? [["me", "Doğrulanmış konumum"]] : [])] }, { key: "rain", label: "Hava durumu", options: [["auto", "Mevcut tahmini kontrol et"], ["flex", "Esnek bırak"]] }].map(({ key, label, options }) => <label key={key} className="block text-[13px] text-mint/80">{label}<select value={value[key as keyof RouteBrief] as string} onChange={(event) => select(key as keyof RouteBrief, event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-white/20 bg-ink px-3 text-[14px]">{options.map(([choice, text]) => <option key={choice} value={choice}>{text}</option>)}</select></label>)}<p className="text-[12px] leading-relaxed text-mint/70">Bütçe bir tercihtir; güncel ücretler ve toplu taşıma tarifesi doğrulanmaz.</p></div>}
    <footer className="mt-5 flex items-center justify-between"><button type="button" onClick={step ? () => setStep(step - 1) : onCancel} className="min-h-11 px-2 text-[13px] text-mint">{step ? "Geri" : "Vazgeç"}</button><button type="button" onClick={() => step < 2 ? setStep(step + 1) : onGenerate(value)} className="min-h-11 rounded-full bg-sun px-5 text-[13px] font-semibold text-ink">{step < 2 ? "Devam et" : "Rotayı hazırla"}</button></footer>
  </section>;
}

function RouteResult({ route, approved, saved, onConfirm, onStop, onReorder, onSave, onEdit, onAlternative }: { route: AtlasRoute; approved: boolean; saved: boolean; onConfirm: () => void; onStop: (stop: { lng: number; lat: number }) => void; onReorder: (day: number, from: number, to: number) => void; onSave: () => void; onEdit: () => void; onAlternative: (prompt: string) => void }) {
  const [dayIndex, setDay] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const day = route.days[Math.min(dayIndex, route.days.length - 1)];
  const stops = route.days.flatMap((item) => item.stops);
  const google = new URL("https://www.google.com/maps/dir/");
  google.searchParams.set("api", "1");
  google.searchParams.set("origin", `${route.origin?.lat ?? stops[0].lat},${route.origin?.lng ?? stops[0].lng}`);
  google.searchParams.set("destination", `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`);
  google.searchParams.set("waypoints", stops.slice(0, -1).map((stop) => `${stop.lat},${stop.lng}`).join("|"));
  google.searchParams.set("travelmode", route.transport === "cycling" ? "bicycling" : route.transport);
  const yandexPoints = [{ lat: route.origin?.lat ?? stops[0].lat, lng: route.origin?.lng ?? stops[0].lng }, ...stops];
  const yandex = `https://yandex.com/maps/?rtext=${encodeURIComponent(yandexPoints.map((point) => `${point.lat},${point.lng}`).join("~"))}&rtt=auto`;
  const apple = `https://maps.apple.com/?daddr=${day.stops[0].lat},${day.stops[0].lng}&dirflg=${route.transport === "walking" ? "w" : route.transport === "transit" ? "r" : "d"}`;
  const share = async () => {
    const text = `${route.routeTitle}\n${stops.map((stop) => `${stop.order}. ${stop.name}: ${stop.startTime}`).join("\n")}\n${google.toString()}`;
    try { if (navigator.share) await navigator.share({ title: route.routeTitle, text }); else await navigator.clipboard.writeText(text); setShared(true); } catch { /* Sharing can be cancelled by the user. */ }
  };
  return <section className="rounded-2xl border border-sun/20 p-4"><p className="text-[12px] font-semibold text-sun">{approved ? "Haritada gösteriliyor" : "Soluk rota önizlemesi"}</p><h3 className="font-display mt-2 text-lg font-semibold">{route.routeTitle}</h3><p className="mt-1 flex items-center gap-1.5 text-[13px] text-mint/75"><Clock3 size={14} />≈{route.totalDurationHours} saat · ≈{route.totalDistanceKm} km</p>{route.days.length > 1 && <nav className="mt-3 flex gap-2" aria-label="Rota günleri">{route.days.map((item, i) => <button key={item.dayNumber} type="button" onClick={() => setDay(i)} className={cn("min-h-10 rounded-full border px-3 text-[13px]", i === dayIndex ? "border-sun text-sun" : "border-white/15")}>{item.dayNumber}. gün</button>)}</nav>}
    <ol className="mt-4 space-y-2">{day.stops.map((stop, i) => <li key={`${stop.pinId}-${i}`} draggable onDragStart={() => setDrag(i)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (drag !== null) onReorder(dayIndex, drag, i); setDrag(null); }} className="rounded-xl border border-white/10 p-3"><button type="button" onClick={() => onStop(stop)} className="w-full text-left"><p className="text-[14px] font-semibold">{i + 1}. {stop.name}</p><p className="mt-1 text-[12px] text-sun">{stop.startTime} - {stop.endTime} · {stop.isCommunityPin ? "Topluluk izi" : "Rehber noktası"}</p><p className="mt-2 text-[13px] leading-relaxed text-mint/80">{stop.aiReason}</p></button><div className="mt-2 flex justify-end"><button type="button" disabled={i === 0} onClick={() => onReorder(dayIndex, i, i - 1)} aria-label={`${stop.name} durağını yukarı taşı`} className="grid size-9 place-items-center disabled:opacity-30"><ArrowUp size={14} /></button><button type="button" disabled={i === day.stops.length - 1} onClick={() => onReorder(dayIndex, i, i + 1)} aria-label={`${stop.name} durağını aşağı taşı`} className="grid size-9 place-items-center disabled:opacity-30"><ArrowDown size={14} /></button></div></li>)}</ol>
    {route.weatherNote && <p className="mt-3 border-l-2 border-leaf/35 pl-3 text-[12px] leading-relaxed text-mint/75">{route.weatherNote}</p>}
    <div className="mt-4 flex flex-wrap gap-2">{!approved && <button type="button" onClick={onConfirm} className="min-h-11 rounded-full bg-sun px-4 text-[13px] font-semibold text-ink">Haritada göster</button>}<button type="button" onClick={onEdit} className="min-h-11 rounded-full border border-white/20 px-4 text-[13px]">Düzenle</button><button type="button" onClick={onSave} className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/20 px-4 text-[13px] text-sun">{saved ? <Check size={14} /> : <Bookmark size={14} />}{saved ? "Kaydedildi" : "Kaydet"}</button><button type="button" onClick={() => void share()} className="min-h-11 rounded-full border border-white/20 px-4 text-[13px]">{shared ? "Paylaşıldı" : "Paylaş"}</button></div>
    <div className="mt-3 flex flex-wrap gap-2">{route.alternatives.map((alternative) => <button key={alternative.label} type="button" onClick={() => onAlternative(alternative.prompt)} className="min-h-10 rounded-full border border-white/15 px-3 text-[12px] text-mint/80">{alternative.label}</button>)}</div>
    <div className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-3 text-[12px]"><a href={google.toString()} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-1.5 text-sun"><Navigation size={13} />Google Haritalar <ExternalLink size={12} /></a><a href={yandex} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-1.5 text-sun">Yandex Haritalar <ExternalLink size={12} /></a><a href={apple} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-1.5 text-mint">Apple'da ilk durak <ExternalLink size={12} /></a></div><p className="mt-1 text-[11px] text-mint/70">Yol mesafesi tahminidir. Apple bağlantısı ilk durağı açar.</p>
  </section>;
}