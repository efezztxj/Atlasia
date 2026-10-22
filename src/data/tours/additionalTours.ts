import type { AtlasRoute, RouteStop } from "../../types";

/** Kaynaklı ziyaret noktaları; doğrulanmış yol geometrisi DEĞİLDİR.
 * Koordinat/kaynak dökümü ve erişim sınırlamaları: docs/icerik/site-turlari.md.
 */
interface VisitPoint {
  name: string;
  lat: number;
  lng: number;
  description: string;
  source: string;
}

const portaMarina: VisitPoint = {
  name: "Porta Marina",
  lat: 40.74857267367671,
  lng: 14.483180053934703,
  description: "Pompeii'de Strada della Marina'nın batı ucundaki antik kent kapısı. Ziyaretçi giriş hattının başlangıcıdır; güncel kapı erişimi, ücret, açılış saati ve sezon bilgisi doğrulanmadı.",
  source: "https://pleiades.stoa.org/places/615138225",
};
const portaRomana: VisitPoint = {
  name: "Porta Romana",
  lat: 41.757398,
  lng: 12.295696,
  description: "Ostia'nın Roma yönündeki antik kapısı; Via Ostiensis'ten kente geçişi işaretler. Bu durak tarihî kapıdır, modern bilet gişesi değildir. Modern park girişinden buraya ulaşım sahada doğrulanmalıdır.",
  source: "https://en.gancarczyk.com/Ostia-Antica-map-directions-sightseeing-curiosities/",
};

function visitTour(id: string, title: string, points: VisitPoint[]): AtlasRoute {
  // AtlasRoute sayısal alanları zorunlu: 0 bilinmiyor, boş saat planlanmadı.
  // Süre / mesafe tahmini veya varsayılan açılış saati üretme.
  const stops: RouteStop[] = points.map((point, index) => ({
    order: index + 1,
    name: `${point.name}${index === 0 ? " (Tur Girişi)" : index === points.length - 1 ? " (Tur Bitişi — park çıkışı değil)" : ""}`,
    lat: point.lat,
    lng: point.lng,
    type: "history",
    startTime: "",
    endTime: "",
    durationMinutes: 0,
    description: `${point.description} Kaynak: ${point.source}`,
    aiReason: "Editör sırası; yol geometrisi alınamadı, duraklar arasında doğrulanmış yaya bağlantısı iddia edilmez.",
    tips: ["Yol geometrisi yok: bu tur dönüş dönüş navigasyon sağlamaz.", "Giriş ücreti, açılış saati ve sezon bilgisi doğrulanmadı; park yönetiminden doğrula."],
    isCommunityPin: false,
    pinId: null,
    category: "history",
    imageUrl: null,
    source: "atlasia",
  }));
  return {
    id,
    routeTitle: title,
    routeSummary: "Kaynaklı duraklarla editör turu. OSM yürüyüş geometrisi alınamadı; haritada gerçek yol gösterilmez. Tur son durakta biter; bu nokta park çıkışı değildir. Mesafe ve süre bilinmiyor (sayısal alanlarda 0); saatler planlanmadı. Giriş ücreti, açılış saati ve sezon bilgisi doğrulanmadı.",
    totalDurationHours: 0,
    totalDistanceKm: 0, // Bilinmeyen mesafe; uydurma km üretme.
    transport: "walking",
    vibe: "Tarih",
    days: [{ dayNumber: 1, title, summary: "Kaynaklı durak sırası; yol geometrisi ve yürüme mesafesi doğrulanmadı.", stops, polyline: "" }],
    weatherNote: null,
    alternatives: [],
    dataSources: [...new Set(points.map((point) => point.source)), "Pleiades contributors (CC BY 3.0)", "Atlasia editör turu; OSM yol verisi alınamadı"],
    createdAt: Date.UTC(2026, 9, 23),
    origin: { lat: points[0].lat, lng: points[0].lng },
  };
}

export const POMPEII_TOUR = visitTour("site-pompeii-forum", "Pompeii — Porta Marina ve Forum", [
  portaMarina,
  {
    name: "Bazilika", lat: 40.7487294102377, lng: 14.48450735252601,
    description: "Pompeii'nin kamusal yapılarından bazilika, bu yapı türünün erken örneklerindendir.",
    source: "https://pleiades.stoa.org/places/945930915",
  },
  {
    name: "Pompeii Forumu", lat: 40.74943545853224, lng: 14.48478436801491,
    description: "Roma kenti Pompeii'nin ana forumu; kentin kamusal merkezini tanımak için ziyaret durağı.",
    source: "https://pleiades.stoa.org/places/188321148",
  },
]);

export const OSTIA_TOUR = visitTour("site-ostia-theatre", "Ostia Antica — Kapı, Tiyatro ve Ticaret Meydanı", [
  portaRomana,
  {
    name: "Roma Tiyatrosu", lat: 41.755783949874804, lng: 12.29147340477965,
    description: "Ostia'nın Roma tiyatrosu Marcus Agrippa'nın himayesinde inşa edildi.",
    source: "https://pleiades.stoa.org/places/443253553",
  },
  {
    name: "Korporasyonlar Forumu", lat: 41.7563893179929, lng: 12.291007512869603,
    description: "Tiyatronun dört tarafı revaklı avlusundaki ticaret merkezi Augustus dönemine uzanır; ikinci yüzyılda önemli ölçüde yeniden inşa edilmiştir.",
    source: "https://pleiades.stoa.org/places/489630692",
  },
]);

export const ADDITIONAL_SITE_TOURS: AtlasRoute[] = [POMPEII_TOUR, OSTIA_TOUR];
