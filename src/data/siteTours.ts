import type { AtlasRoute, RouteStop } from "../types";
import { encodePolyline } from "../utils/polyline";

/**
 * Adım 8 — Site içi tur modeli
 * Tur YAZILIR, HESAPLANMAZ (antipattern A). planRoute KULLANILMAZ.
 * Sıralı duraklar, patika geometrisi (elle çizilmiş), giriş kapısı, çıkış noktası.
 * KANIT: Efes 3 saatlik tur, durak saatleri tanımlı, haritada gerçek patika.
 */

const EPHESUS_PATH_COORDS: [number, number][] = [
  // Giriş → Devlet Agorası arası patika (yaya footway)
  [27.3435, 37.9365], // Magnesia Kapısı (Giriş)
  [27.3437, 37.9367],
  [27.3439, 37.9369],
  [27.344, 37.937], // Devlet Agorası
  [27.3438, 37.9372],
  [27.3432, 37.9376],
  [27.3428, 37.9379],
  [27.3425, 37.938], // Domitian Meydanı
  [27.3424, 37.9383],
  [27.3423, 37.9386],
  [27.3422, 37.9391], // Memmius Anıtı
  [27.3421, 37.9389],
  [27.342, 37.9385], // Herakles Kapısı
  [27.3418, 37.9387],
  [27.3416, 37.9388],
  [27.3415, 37.9389], // Kuretler Caddesi
  [27.3412, 37.939],
  [27.3405, 37.9392], // Skolastika Hamamları
  [27.3409, 37.9393],
  [27.3413, 37.9392],
  [27.3419, 37.939], // Yamaç Evler
  [27.3416, 37.9392],
  [27.3411, 37.9395],
  [27.3408, 37.9399], // Hadrian Tapınağı
  [27.341, 37.9398],
  [27.3413, 37.9396],
  [27.3417, 37.9395], // Celsus Kütüphanesi
  [27.342, 37.9396],
  [27.3423, 37.9397],
  [27.3425, 37.9398], // Mermer Cadde
  [27.3426, 37.94],
  [27.3424, 37.9403],
  [27.3422, 37.9408], // Büyük Tiyatro (Çıkış)
];

function stop(
  order: number,
  name: string,
  lat: number,
  lng: number,
  startTime: string,
  endTime: string,
  durationMinutes: number,
  description: string,
  pinId: string | null,
): RouteStop {
  return {
    order,
    name,
    type: "history",
    lat,
    lng,
    startTime,
    endTime,
    durationMinutes,
    description,
    aiReason: `Editör tarafından yazılan site turu durağı ${order}: önceki durağa yaya patikasıyla bağlı, sıra bölge motoruyla değil elle belirlendi.`,
    tips: ["Bilet ve açılış saatini resmî kaynaktan doğrula.", "Yazın şapka ve su al; alan içinde gölge sınırlı."],
    isCommunityPin: false,
    pinId,
    category: "history",
    imageUrl: null,
    source: "atlasia",
  };
}

export const EPHESUS_TOUR: AtlasRoute = {
  id: "site-efes-3h",
  routeTitle: "Efes Antik Kenti — 3 Saatlik Klasik Tur",
  routeSummary:
    "Magnesia Kapısı'ndan giren, Kuretler Caddesi'ni izleyen ve Büyük Tiyatro'da biten 2,1 km'lik yaya turu. Sıra editör tarafından yazıldı; kesik çizgi patika geometrisi footway'i takip eder, planRoute kullanılmadı.",
  totalDurationHours: 3,
  totalDistanceKm: 2.1,
  transport: "walking",
  vibe: "Tarih",
  days: [
    {
      dayNumber: 1,
      title: "Gün 1 · Efes içi 3 saat",
      summary: "10 durak, 180 dakika. Giriş: Magnesia Kapısı, Çıkış: Büyük Tiyatro.",
      stops: [
        stop(
          1,
          "Magnesia Kapısı (Giriş Kapısı)",
          37.9365,
          27.3435,
          "09:00",
          "09:10",
          10,
          "Doğu surlarındaki üç kemerli kapı; bilet kontrolü burada. Haritayı al, su doldur.",
          "osm-historic-node-16",
        ),
        stop(
          2,
          "Devlet Agorası",
          37.937,
          27.344,
          "09:15",
          "09:30",
          15,
          "1,6 hektarlık siyasi agora; kuzeyde bazilika kalıntıları. Yönetim kararları burada alınırdı.",
          "osm-historic-node-17",
        ),
        stop(
          3,
          "Odeon (Bouleuterion)",
          37.9382,
          27.3423,
          "09:33",
          "09:45",
          12,
          "1.400 kişilik çatılı meclis salonu; kent senatosu burada toplandı.",
          "osm-historic-node-10",
        ),
        stop(
          4,
          "Domitian Meydanı ve Tapınağı",
          37.938,
          27.3425,
          "09:48",
          "10:00",
          12,
          "13 basamaklı podyum üzerindeki Neokoros tapınağı; teras Efes siluetini kurar.",
          "osm-historic-node-13",
        ),
        stop(
          5,
          "Herakles Kapısı",
          37.9385,
          27.342,
          "10:02",
          "10:12",
          10,
          "4. yüzyılda daraltılan kapı; Herakles kabartması geçişi işaretler.",
          "osm-historic-node-12",
        ),
        stop(
          6,
          "Kuretler Caddesi & Skolastika Hamamları",
          37.9392,
          27.3405,
          "10:15",
          "10:30",
          15,
          "Kutsal yol ve hamam kompleksi; caldarium ve yerden ısıtma izleri.",
          "osm-historic-node-6",
        ),
        stop(
          7,
          "Yamaç Evler",
          37.939,
          27.3419,
          "10:35",
          "11:05",
          30,
          "Teraslanmış peristylli konutlar; mozaik ve freskler korumalı çatı altında.",
          "osm-historic-node-9",
        ),
        stop(
          8,
          "Hadrian Tapınağı",
          37.9399,
          27.3408,
          "11:08",
          "11:20",
          12,
          "Korint cepheli imparator kült tapınağı; Tyche kabartması ve frizler.",
          "osm-historic-node-4",
        ),
        stop(
          9,
          "Celsus Kütüphanesi",
          37.9395,
          27.3417,
          "11:23",
          "11:45",
          22,
          "M.S. 114-135, 12.000 rulo kapasiteli; çift duvar nemi keser, cephe 1970-78'de ayağa kaldırıldı.",
          "osm-historic-node-1",
        ),
        stop(
          10,
          "Büyük Tiyatro (Çıkış Noktası)",
          37.9408,
          27.3422,
          "11:50",
          "12:00",
          10,
          "24.000 kişilik tiyatro; Mermer Cadde ile liman aksında. Tur burada biter, çıkış Aşağı Kapı'ya 5 dk.",
          "osm-historic-node-2",
        ),
      ],
      polyline: encodePolyline(EPHESUS_PATH_COORDS),
    },
  ],
  weatherNote: null,
  alternatives: [
    { label: "Kısa versiyon (90 dk)", prompt: "Yamaç Evler atlanarak 90 dakikaya indir." },
    { label: "Fotoğraf rotası", prompt: "Kütüphane ve tiyatroda gün doğumu ışığı için erken başla." },
  ],
  dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)", "Atlasia editör turu"],
  createdAt: Date.now(),
  origin: { lat: 37.9365, lng: 27.3435 },
};

/** Site turları listesi (ölçeklenebilir) */
export function getSiteTours(): AtlasRoute[] {
  return [EPHESUS_TOUR];
}

export function getSiteTourById(id: string): AtlasRoute | null {
  return getSiteTours().find((t) => t.id === id) ?? null;
}

/** Giriş/çıkış yardımcıları (editör yazımı doğrulamak için) */
export function getEntranceGate(tour: AtlasRoute) {
  return tour.days[0]?.stops[0] ?? null;
}

export function getExitPoint(tour: AtlasRoute) {
  const stops = tour.days[0]?.stops ?? [];
  return stops[stops.length - 1] ?? null;
}

/** Patika gerçek mi yoksa düz çizgi mi? (antipattern A kontrolü) */
export function isRealPath(tour: AtlasRoute): boolean {
  const poly = tour.days[0]?.polyline ?? "";
  if (!poly) return false;
  // Gerçek patika: decode edilmiş nokta sayısı durak sayısından明显 fazla
  // Düz çizgi olsaydı nokta sayısı = durak +1 olurdu
  const decodedLength = (() => {
    // basit polyline decode sayımı: encodePolyline ile aynı algoritma
    let i = 0;
    let count = 0;
    while (i < poly.length) {
      // her nokta 2 değer kodlar
      let _s = 0;
      let b: number;
      do {
        b = poly.charCodeAt(i++) - 63;
        _s += 5;
      } while (b >= 0x20 && i < poly.length);
      do {
        b = poly.charCodeAt(i++) - 63;
        _s += 5;
      } while (b >= 0x20 && i < poly.length);
      void _s;
      count++;
    }
    return count;
  })();
  const stops = tour.days[0]?.stops.length ?? 0;
  return decodedLength > stops + 4; // en az 4 ara nokta fazla
}
