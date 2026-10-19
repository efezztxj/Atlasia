import type { AtlasRoute, RouteLeg, RouteStop } from "../types";
import { encodePolyline } from "../utils/polyline";
import { createLeg } from "../utils/routeLegs";

/**
 * Adım 10 — "park et → patika → iniş" rotası kanıtı
 * Likya Yolu / Kabak Koyu çevresi örneği: park yeri → patika → iniş → koy
 * Her bacakta mod farklı, süre makul (patikasız iniş 2 km/h → süre iki kat doğru).
 */

function time(minutes: number) {
  const rounded = Math.round(minutes);
  return `${String(Math.floor(rounded / 60) % 24).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

const parkingCoords: [number, number][] = [
  [29.11, 36.52], // Park yeri (kapasite 30, ücret 50TL, son 200m toprak)
  [29.1115, 36.521],
  [29.112, 36.522], // Trailhead
];

const trailCoords: [number, number][] = [
  [29.112, 36.522], // Trailhead (su var, tabela)
  [29.111, 36.523],
  [29.1095, 36.524],
  [29.109, 36.525], // İniş başı
];

const descentCoords: [number, number][] = [
  [29.109, 36.525], // İniş başı (dik, kaygan)
  [29.1095, 36.526],
  [29.1105, 36.527],
  [29.111, 36.528], // Kabak Koyu
];

const leg1 = createLeg("leg-parking", parkingCoords, "walking");
const leg2 = createLeg("leg-trail", trailCoords, "trail");
const leg3 = createLeg("leg-descent", descentCoords, "descent");

const legs: RouteLeg[] = [
  { id: leg1.id, coords: leg1.coords, mode: "walking", distanceKm: leg1.distanceKm, durationMinutes: leg1.durationMinutes },
  { id: leg2.id, coords: leg2.coords, mode: "trail", distanceKm: leg2.distanceKm, durationMinutes: leg2.durationMinutes },
  { id: leg3.id, coords: leg3.coords, mode: "descent", distanceKm: leg3.distanceKm, durationMinutes: leg3.durationMinutes },
];

const allCoords: [number, number][] = [...parkingCoords, ...trailCoords.slice(1), ...descentCoords.slice(1)];

// Durak süreleri
let clock = 9 * 60; // 09:00

function makeStop(
  order: number,
  name: string,
  type: RouteStop["type"],
  lat: number,
  lng: number,
  stay: number,
  description: string,
  category: string,
): RouteStop {
  const travel = order === 1 ? 0 : legs[order - 2].durationMinutes;
  if (travel) clock += travel;
  // patika ortasında 5dk mola
  const breakTime = order === 3 ? 5 : 0;
  clock += breakTime;
  const start = time(clock);
  clock += stay;
  const end = time(clock);
  return {
    order,
    name,
    type,
    lat,
    lng,
    startTime: start,
    endTime: end,
    durationMinutes: stay,
    description,
    aiReason: `Erişim tipi durak: ${name} — bacak modu ${legs[order - 1]?.mode ?? "walking"} ile süre hesaplandı.`,
    tips: [description, "Son 200m toprak; yağmur sonrası kaygan olabilir."],
    isCommunityPin: false,
    pinId: `access-${order}`,
    category,
    imageUrl: null,
    source: "atlasia",
  };
}

const stops: RouteStop[] = [
  makeStop(1, "Faralya Park Yeri", "parking", 36.52, 29.11, 5, "30 araç kapasiteli, 08:00-19:00, 50 TL. Son 200m toprak yol, düşük araçla yavaş geç.", "parking"),
  makeStop(2, "Kabak Patika Başı (Trailhead)", "trailhead", 36.522, 29.112, 8, "Su ve tabela var; patika 1.2 km, gölgeli çam altı. Tabela: Kabak 30dk.", "trailhead"),
  makeStop(3, "İniş Başı (Dik Keçi Yolu)", "descent", 36.525, 29.109, 10, "Patika bitiyor, keçi yolundan iniş başlıyor; taşlar kaygan, baston önerilir.", "descent"),
  makeStop(4, "Kabak Koyu", "beach", 36.528, 29.111, 60, "Turkuaz koy; sezonda işletme var, çadır alanı ücretli.", "beaches"),
];

const totalDistance = legs.reduce((s, l) => s + l.distanceKm, 0);
const totalDuration = stops.reduce((s, st) => s + st.durationMinutes, 0) + legs.reduce((s, l) => s + l.durationMinutes, 0);

export const ACCESS_EXAMPLE_ROUTE: AtlasRoute = {
  id: "access-likya-kabak",
  routeTitle: "Park Et → Patika → İniş: Kabak Koyu",
  routeSummary:
    "Faralya park yerinden patika ve keçi yolu inişiyle Kabak Koyu'na 2 km yürüyüş. Bacak moduna göre süre hesaplandı: patika 3 km/h, iniş 2 km/h.",
  totalDurationHours: Math.round((totalDuration / 60) * 10) / 10,
  totalDistanceKm: Math.round(totalDistance * 10) / 10,
  transport: "walking",
  vibe: "Doğa",
  days: [
    {
      dayNumber: 1,
      title: "Gün 1 · Kabak erişim rotası",
      summary: `${stops.length} durak, ${Math.round(totalDuration)} dakika. Park → Patika → İniş modları ayrı.`,
      stops,
      polyline: encodePolyline(allCoords),
      legs,
    },
  ],
  weatherNote: null,
  alternatives: [
    { label: "Dönüş aynı patika", prompt: "Dönüş aynı patikadan, iniş çıkış sayılır." },
    { label: "Tekne ile dön", prompt: "Dönüş Ölüdeniz'den tekne ile." },
  ],
  dataSources: ["© OpenStreetMap contributors (ODbL)", "Atlasia editör erişim rotası"],
  createdAt: Date.now(),
  origin: { lat: 36.52, lng: 29.11 },
};

export function getAccessExampleRoute(): AtlasRoute {
  return ACCESS_EXAMPLE_ROUTE;
}
