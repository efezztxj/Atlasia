import { useState } from "react";
import { ChevronLeft, Volume2, X } from "lucide-react";
import type { AudioDiscoveryTour } from "../data/audioDiscovery";
import type { EnglishAudioStop } from "../data/audioDiscoveryEnglish";
import { usePanelAccess } from "../hooks/usePanelAccess";

/**
 * Kategori grupları TUR BAŞINA tanımlanır.
 *
 * NEDEN: Gruplar daha önce tek bir sabit dizide, yalnız Efes durak id'leriyle
 * yazılıydı. Kalkidikum turunda dört grubun da sayısı "0 yer" çıkıyordu.
 * Yeni tur eklerken grubu burada tanımlanır; tanım yoksa ekran durakları
 * "Tüm duraklar" altında, sırayla gösterir (boş kategori üretilmez).
 *
 * Kural: her durak en çok bir gruba girer; gruplar `tour.stops` sırasını korur.
 * Kilit: `AudioDiscoveryCategories.test.ts`.
 */
interface StopGroup {
  id: string;
  tr: string;
  en: string;
  stops: readonly string[];
}

const GROUPS_BY_TOUR: Readonly<Record<string, readonly StopGroup[]>> = Object.freeze({
  "efes-kamusal-yasam": [
    { id: "upper", tr: "Üst kent ve Devlet Agorası", en: "Upper city and State Agora", stops: ["prytaneion", "devlet-agorasi", "basilica-stoa", "odeon", "memmius", "domitian-meydani", "domitian-tapinagi", "pollio-domitian-cesmesi", "laecanius-cesmesi", "agora-tapinagi", "herakles-kapisi", "yukari-hamam"] },
    { id: "curetes", tr: "Kuretler Caddesi", en: "Curetes Street", stops: ["hadrian-tapinagi", "trajan-cesmesi", "yamac-evler", "skolastika", "oktagon", "heoron", "latrina", "kuretler-caddesi", "alytarkhos-stoasi", "ask-evi", "yamac-ev-1", "yamac-ev-2"] },
    { id: "north", tr: "Kuzey ve çevresi", en: "North and surroundings", stops: ["meryem-kilisesi", "efes-stadyumu", "artemision", "aziz-yuhanna", "isa-bey", "liman-caddesi", "liman-hamamlari", "meryem-ana-evi", "yedi-uyuyanlar", "ayasuluk", "lukas", "magnesia-kapisi", "dogu-gymnasionu"] },
    { id: "lower", tr: "Kütüphane, agora ve tiyatro", en: "Library, agora and theatre", stops: ["celsus-kutuphanesi", "buyuk-tiyatro", "ticaret-agorasi", "mazaeus-mithridates", "mermer-cadde", "tiyatro-cesmesi", "hadrian-kapisi", "tiyatro-gymnasionu", "serapeion"] },
    { id: "kalkidikum", tr: "Kalkidikum ve liman bölgesi", en: "Chalcidicum and the harbour area", stops: ["hydreion-kalkidikum", "triodos-meydani", "heksagon", "verulanus-meydani-salonu", "antik-liman-kanali", "meryem-kilisesi-vaftizhanesi", "bizans-hamamlari", "vedius-gymnasionu", "kent-surlari"] },
  ],
});

interface Props {
  tour: AudioDiscoveryTour;
  selectedIndex: number;
  speaking: boolean;
  language: "tr" | "en";
  englishStops: Record<string, EnglishAudioStop> | null;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function AudioDiscoveryCategories({ tour, selectedIndex, speaking, language, englishStops, onSelect, onClose }: Props) {
  const [group, setGroup] = useState<string | null>(null);
  const panelRef = usePanelAccess(true, onClose, true);
  const en = language === "en";
  // Turun kendi grubu; tanım yoksa boş dizi → "Tüm duraklar" görünümü.
  const groups: readonly StopGroup[] = GROUPS_BY_TOUR[tour.id] ?? [];
  const currentGroup = groups.find((item) => item.id === group);
  /**
   * Grup tanımı olmayan tur (ör. yeni eklenen bir şehir turu) tek liste olarak
   * açılır. Böylece "0 yer" yazan boş kategoriler hiç üretilmez.
   */
  const allStopsMode = groups.length === 0;
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 md:items-center">
    <button type="button" className="absolute inset-0" onClick={onClose} aria-label={en ? "Close categories" : "Kategorileri kapat"} tabIndex={-1} />
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="audio-categories-title" lang={language} onClick={(event) => event.stopPropagation()} className="relative flex max-h-[85dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-[24px] border border-leaf/30 bg-ink text-mint shadow-2xl">
      <header className="flex items-center gap-2 border-b border-leaf/20 p-4">
        {currentGroup && <button type="button" onClick={() => setGroup(null)} aria-label={en ? "Back to categories" : "Kategorilere dön"} className="grid size-11 shrink-0 place-items-center rounded-full border border-leaf/30"><ChevronLeft size={19} /></button>}
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold tracking-[0.12em] text-sun uppercase">{en ? "Ephesus audio discovery" : "Efes sesli keşif"}</p><h2 id="audio-categories-title" className="mt-1 text-[17px] font-semibold">{currentGroup ? (en ? currentGroup.en : currentGroup.tr) : allStopsMode ? (en ? "Audio stops" : "Sesli anlatım durakları") : (en ? "Audio categories" : "Sesli anlatım kategorileri")}</h2></div>
        <button type="button" onClick={onClose} aria-label={en ? "Close categories" : "Kategorileri kapat"} className="grid size-11 shrink-0 place-items-center rounded-full border border-leaf/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"><X size={19} /></button>
      </header>
      <div className="overflow-y-auto p-4">
        <p className="mb-3 text-[12px] leading-relaxed text-mint/70">{en ? "Browse the places currently available in the audio tour. Select a place to open it; playback does not start automatically." : "Sesli turdaki yerleri keşfet. Bir yer seçerek açabilirsin; ses kendiliğinden başlamaz."}</p>
        {!currentGroup && !allStopsMode ? <div className="space-y-2">{groups.map((item) => {
          const count = tour.stops.filter((stop) => (item.stops as readonly string[]).includes(stop.id)).length;
          const playingHere = speaking && (item.stops as readonly string[]).includes(tour.stops[selectedIndex]?.id);
          return <button key={item.id} type="button" onClick={() => setGroup(item.id)} className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun ${playingHere ? "border-sun bg-sun/10 text-sun" : "border-leaf/25 bg-leaf/[0.06]"}`}><span><span className="block text-[14px] font-semibold">{en ? item.en : item.tr}</span><span className="mt-1 block text-[12px] opacity-75">{count} {en ? "places" : "yer"}{playingHere ? (en ? " · Playing" : " · Şu an çalıyor") : ""}</span></span><span aria-hidden="true">→</span></button>;
        })}</div> : <ul className="space-y-3">{tour.stops.map((stop, index) => {
          // Grup seçilmişse yalnız o grubun durakları; "tüm duraklar" modunda hepsi.
          if (!allStopsMode && !(currentGroup?.stops as readonly string[] | undefined)?.includes(stop.id)) return null;
          const translated = en ? englishStops?.[stop.id] : undefined;
          const playing = speaking && selectedIndex === index;
          const selected = selectedIndex === index;
          return <li key={stop.id} className={`overflow-hidden rounded-2xl border ${playing ? "border-sun bg-sun/10" : "border-leaf/25 bg-leaf/[0.06]"}`}>
            <button type="button" onClick={() => { if (!selected) onSelect(index); onClose(); }} aria-current={selected ? "true" : undefined} className="flex w-full items-stretch gap-3 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sun">
              <span className="min-w-0 flex-1"><span className={`block text-[14px] font-semibold ${playing ? "text-sun" : ""}`}>{stop.no}. {translated?.title ?? stop.title}</span><span className="mt-1 block line-clamp-2 text-[12px] leading-relaxed text-mint/70">{translated?.description ?? stop.description}</span>{playing ? <span className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-sun"><Volume2 size={13} />{en ? "Playing now" : "Şu an çalıyor"}</span> : selected ? <span className="mt-2 block text-[11px] text-mint/70">{en ? "Selected" : "Seçili"}</span> : null}</span>
              {stop.image && <img src={stop.image.url} alt="" loading="lazy" className="h-20 w-24 shrink-0 rounded-xl object-cover" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />}
            </button>
            {stop.image && <p className="px-3 pb-2 text-[10px] text-mint/60"><a href={stop.image.source} target="_blank" rel="noreferrer" className="underline">{stop.image.author}</a> · <a href={stop.image.licenseUrl} target="_blank" rel="noreferrer" className="underline">{stop.image.license === "Kullanım izni doğrulanmadı" && en ? "Reuse permission not verified" : stop.image.license}</a> · {en ? "Resized and cropped" : "Boyutlandırıldı ve kırpıldı"}{stop.id === "domitian-tapinagi" ? (en ? " · Reconstructed columns’ origin uncertain." : " · Yeniden kurulan sütunların kökeni belirsiz.") : ""}</p>}
          </li>;
        })}</ul>}
      </div>
    </section>
  </div>;
}
