/**
 * Sesli anlatım rehberi — veri katmanı.
 *
 * TEK KAYNAK: `public/assets/sesli-turlar.json`. Tüm sesli turlar (Efes,
 * Kalkidikum ve sonra eklenecek Kapadokya vb.) o dosyanın `tours` dizisinde
 * durur. Ayrı tur dosyası açılmaz; ayrıntı ve ekleme adımları:
 * `docs/icerik/sesli-anlatim-rehberi/README.md`.
 *
 * NEDEN: 2026-11-07 öncesinde her tur ayrı dosyadaydı (`efes-tour.json`,
 * `kalkidikum-tour.json`) ve Kalkidikum durakları yanlışlıkla ana kataloğa
 * (`src/data/places.ts`) da eklenmişti. Sonuç: haritada üst üste binen pinler,
 * çöken fotoğraf zinciri ve iki yerde tutulan numaralandırma. Artık durak
 * yalnız turun içinde yaşar.
 */

export interface AudioDiscoveryStop {
  id: string;
  /** Pin numarası. Tur içinde 1'den başlar, boşluk bırakmaz. */
  no: number;
  title: string;
  description: string;
  lat: number;
  lng: number;
  sources: { title: string; url: string }[];
  coordinateSource: string;
  /**
   * Noktanın ne kadar güvenilir olduğu. Alan yoksa koordinat kaynağındaki
   * değerin kendisidir.
   *
   * `"approximate"` = yapı geniş bir alana yayılıyor, sınırları toprak altında
   * ya da nokta sıralamadan türetildi; kaynaklar arasında 25–90 m fark sürebilir
   * (51 Heksagon, 52 Verulanus, 53 Antik Liman, 57 sur kesiti). Arayüzde
   * "≈ Yaklaşık konum" olarak **açıkça** yazılır; kesin konum izlenimi verilmez.
   */
  coordinateAccuracy?: "approximate";
  /**
   * Kaynaklar aynı noktada anlaşmıyorsa farkın kaydı.
   *
   * NEDEN: 52 Verulanus için Wikidata Q104641912 başka bir nokta veriyor ve
   * ikisi arasında 100 m var. Hangi noktanın seçildiğini ve neden seçildiğini
   * sessizce saklamak yerine durak kartında kaynak bölümünde gösterilir.
   */
  coordinateNote?: string;
  /**
   * `"additional"` = ören yeri dışındaki yer (haritada numarasız ◆).
   * Alan yoksa durak ören yeri içindedir ve numaralı yeşil pin alır.
   */
  markerStyle?: "additional";
  audio?: string;
  image?: { url: string; alt: string; source: string; author: string; license: string; licenseUrl: string };
  /** `docs/gorevler/efes-kapsamli-yer-listesi-*.md` envanter sıra numarası (izlenebilirlik). */
  envanterNo?: number;
  /**
   * Aynı fiziksel noktayı paylaştığı diğer durak id'leri.
   *
   * Koordinat UYDURULMAZ: iki ayrı yapı gerçekten aynı noktada temsil ediliyorsa
   * (ör. Bazilika Stoası ile Heksagon, Efes Stadyumu ile Vedius Gymnasionu ve
   * kent surları) o ilişki burada açıkça yazılır. Harita bu durakları üst üste
   * basmamak için kümeler; testler aynı koordinatı yalnız bu bayrakla kabul eder.
   */
  sharedWith?: string[];
}

export interface AudioDiscoveryTour {
  id: string;
  placeId: string;
  title: string;
  stops: AudioDiscoveryStop[];
}

/** Tek kaynak dosya. Servis çalışanı bu yolu kabuğa dahil eder (`public/sw.js`). */
export const AUDIO_TOUR_FILE = "/assets/sesli-turlar.json";

/** Tur tanıtımında ve testlerde kullanılan yüklenmiş belge önbelleği. */
let loadPromise: Promise<AudioDiscoveryTour[]> | null = null;

function isStop(value: unknown): value is AudioDiscoveryStop {
  if (!value || typeof value !== "object") return false;
  const stop = value as Partial<AudioDiscoveryStop>;
  return Boolean(
    stop.id
    && stop.title
    && stop.description
    && Number.isInteger(stop.no)
    && Number.isFinite(stop.lat)
    && Number.isFinite(stop.lng),
  );
}

/** Dosyadaki tüm turlar. Hata durumunda önbellek temizlenir, sonraki çağrı yeniden dener. */
export async function loadAudioTours(): Promise<AudioDiscoveryTour[]> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const response = await fetch(AUDIO_TOUR_FILE);
    if (!response.ok) throw new Error("Audio tours unavailable");
    const payload: unknown = await response.json();
    const tours = (payload as { tours?: unknown } | null)?.tours;
    if (!Array.isArray(tours) || !tours.length) throw new Error("Invalid audio tour file");
    for (const tour of tours as AudioDiscoveryTour[]) {
      if (!tour?.id || !tour.placeId || !Array.isArray(tour.stops) || !tour.stops.length || !tour.stops.every(isStop)) {
        throw new Error("Incomplete audio tour");
      }
    }
    return tours as AudioDiscoveryTour[];
  })().catch((error: unknown) => {
    loadPromise = null;
    throw error;
  });
  return loadPromise;
}

/** Bu yer için sesli tur var mı? (Menü görünürlüğü buradan beslenir.) */
export async function hasAudioTour(placeId: string): Promise<boolean> {
  try {
    const tours = await loadAudioTours();
    return tours.some((tour) => tour.placeId === placeId);
  } catch {
    return false;
  }
}

export async function loadAudioDiscoveryForPlace(placeId: string): Promise<AudioDiscoveryTour | null> {
  const tours = await loadAudioTours();
  return tours.find((tour) => tour.placeId === placeId) ?? null;
}

/** Yalnız testler ve kilitler için: dosyayı yeniden okumaya zorla. */
export function resetAudioTourCache() {
  loadPromise = null;
}
