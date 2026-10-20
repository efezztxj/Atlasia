import type { AtlasRoute, Place, RouteBrief, RouteDay, RouteStop, StopType, TransportMode } from "../types";
import { haversineKm } from "./geo";
import { encodePolyline } from "./polyline";

const CATEGORY_INTERESTS: Record<string, string[]> = { Doğa: ["nature", "camp"], Tarih: ["history"], Yemek: ["food"], Fotoğraf: ["photo", "cities"], Kamp: ["camp"], Plaj: ["beaches"], "Gizli Yerler": ["community", "nature"], Manzara: ["photo", "nature", "beaches"], Mimari: ["cities", "history"] };
const TYPES: Record<Place["category"], StopType> = { cities: "city", beaches: "beach", history: "history", nature: "nature", camp: "camp", food: "food", photo: "photo", routes: "viewpoint", community: "hidden_gem", issues: "other", parking: "parking", trailhead: "trailhead", descent: "descent", water: "water" };
const STAY: Record<Place["category"], number> = { cities: 50, beaches: 60, history: 60, nature: 50, camp: 70, food: 45, photo: 35, routes: 45, community: 35, issues: 25, parking: 5, trailhead: 8, descent: 10, water: 30 };
const SPEED: Record<TransportMode, number> = { walking: 4, cycling: 12, driving: 35, transit: 18, trail: 3, offroad: 2.2 };
export const ROUTE_ALTERNATIVES = [
  { label: "Daha kısa", prompt: "Bu rotayı daha kısa hale getir." },
  { label: "Daha az yürüyüş", prompt: "Daha az yürüyüş olsun." },
  { label: "Yağmur planı", prompt: "Yağmur ihtimaline göre değiştir." },
  { label: "Daha sakin", prompt: "Daha sakin olsun." },
];

export function briefHours(brief: RouteBrief) {
  return brief.duration === "half" ? 4 : brief.duration === "day" ? 8 : brief.duration === "multi" ? 20 : Math.max(1, Math.min(24, brief.customHours ?? 3));
}

export function validPlace(place: Place) {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng) && Math.abs(place.lat) <= 85 && Math.abs(place.lng) <= 180 && place.title.trim().length >= 2 && place.note.trim().length >= 12;
}

export function nearbyPlaces(places: Place[], center: { lat: number; lng: number }, radius = 15) {
  return places.filter(validPlace).map((place) => ({ place, distance: haversineKm(center.lat, center.lng, place.lat, place.lng) })).filter((item) => item.distance <= radius).sort((a, b) => (a.place.kind === "user" ? 0 : 1) - (b.place.kind === "user" ? 0 : 1) || a.distance - b.distance).map((item) => item.place);
}

const time = (minutes: number) => {
  const rounded = Math.round(minutes);
  return `${String(Math.floor(rounded / 60) % 24).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
};
const distanceBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => haversineKm(a.lat, a.lng, b.lat, b.lng) * 1.25;
const sourceOf = (place: Place): RouteStop["source"] => place.kind === "user" ? "community" : place.id.startsWith("osm-route-") ? "openstreetmap" : "atlasia";

export function planRoute(places: Place[], origin: { lat: number; lng: number }, brief: RouteBrief, weatherNote: string | null): AtlasRoute {
  const hours = briefHours(brief);
  const daysCount = brief.duration === "multi" ? 3 : 1;
  const perDayMinutes = hours * 60 / daysCount;
  const radius = brief.transport === "walking" ? Math.min(12, hours * 1.7 / daysCount) : brief.transport === "cycling" ? Math.min(45, hours * 5 / daysCount) : brief.transport === "driving" ? Math.min(150, hours * 17 / daysCount) : Math.min(60, hours * 8 / daysCount);
  const interests = brief.interests.flatMap((value) => CATEGORY_INTERESTS[value] ?? []);
  const rainy = weatherNote?.includes("mevcut yağış görünüyor") ?? false;
  const preferredByVibe = brief.vibe === "Huzurlu" || brief.vibe === "Yalnızlık"
    ? ["nature", "photo", "community"]
    : brief.vibe === "Macera"
      ? ["nature", "camp", "routes"]
      : brief.vibe === "Enerjik"
        ? ["cities", "food", "community"]
        : [];
  const preference = (place: Place) => {
    const interest = !interests.length ? 1 : interests.includes(place.category) ? 2.2 : .65;
    const community = place.kind === "user" ? 1.4 : 1;
    const vibe = preferredByVibe.includes(place.category) ? 1.2 : 1;
    const lowBudget = brief.budget === "Düşük" && ["nature", "photo", "routes", "community", "beaches"].includes(place.category) ? 1.15 : 1;
    const weather = rainy ? (["history", "food", "cities"].includes(place.category) ? 1.25 : .7) : 1;
    // Adım 14: tazelik bir güven sinyalidir. Son 30 günde doğrulanmış durak öne
    // alınır; 90 günü aşmış bilgi geriye düşer; doğrulanmamış bilgi nötrdür.
    const freshness = place.freshness?.score ?? 1;
    return interest * community * vibe * lowBudget * weather * freshness;
  };
  const pool = nearbyPlaces(places, origin, radius).sort((a, b) => {
    const utility = (place: Place) => preference(place) / Math.max(.3, haversineKm(origin.lat, origin.lng, place.lat, place.lng));
    return utility(b) - utility(a);
  });
  const maxStops = Math.min(7, Math.max(1, Math.floor(hours / (brief.tempo === "Rahat" ? 1.1 : .85))));
  const used = new Set<string>();
  let totalDistance = 0;
  let totalMinutes = 0;
  let previous = origin;
  const days: RouteDay[] = [];
  const tempoFactor = brief.tempo === "Rahat" ? 1.2 : brief.tempo === "Yoğun" ? .8 : 1;

  for (let day = 0; day < daysCount && used.size < maxStops; day++) {
    let elapsed = 0;
    let clock = 9 * 60;
    const stops: RouteStop[] = [];
    const start = previous;
    while (used.size < maxStops) {
      const options = pool.filter((place) => !used.has(place.id)).sort((a, b) => {
        const score = (place: Place) => distanceBetween(previous, place) / preference(place);
        return score(a) - score(b);
      });
      const breakTime = stops.length > 0 && stops.length % 2 === 0 ? 15 : 0;
      const place = options.find((candidate) => {
        const distance = distanceBetween(previous, candidate);
        const travel = distance < .08 ? 0 : Math.max(3, Math.round(distance / SPEED[brief.transport] * 60));
        const stay = Math.round(STAY[candidate.category] * tempoFactor);
        return elapsed + travel + stay + breakTime <= perDayMinutes;
      });
      if (!place) break;
      const distance = distanceBetween(previous, place);
      const travel = distance < .08 ? 0 : Math.max(3, Math.round(distance / SPEED[brief.transport] * 60));
      const stay = Math.round(STAY[place.category] * tempoFactor);
      const source = sourceOf(place);
      const matchedInterest = brief.interests.find((value) => (CATEGORY_INTERESTS[value] ?? []).includes(place.category));
      const preferenceReason = matchedInterest ? `${matchedInterest} tercihinle eşleşiyor. ` : "";
      const freshnessReason = place.freshness?.latestAt
        ? place.freshness.band === "fresh"
          ? `${place.freshness.label}. Taze doğrulanmış bilgi öne alındı. `
          : place.freshness.band === "stale"
            ? `${place.freshness.label}. Bilgi eski; gitmeden doğrula. `
            : `${place.freshness.label}. `
        : "Bu durağın tazelik kaydı yok; bilgi doğrulanmamış olabilir. ";
      clock += travel + breakTime;
      elapsed += travel + stay + breakTime;
      totalDistance += distance;
      stops.push({
        order: stops.length + 1,
        name: place.title,
        type: TYPES[place.category],
        lat: place.lat,
        lng: place.lng,
        startTime: time(clock),
        endTime: time(clock + stay),
        durationMinutes: stay,
        description: place.note,
        aiReason: freshnessReason + (source === "community"
          ? `${preferenceReason}Topluluk izi olduğu ve önceki durağa yakın olduğu için bu sırada. Kalabalık ölçümü yapılmadı.`
          : source === "openstreetmap"
            ? `${preferenceReason}Açık harita verisindeki yakın bir nokta; önceki duraktan tahmini ${distance.toFixed(1)} km.`
            : stops.length === 0
              ? `${preferenceReason}Başlangıca yakın bir Atlasia rehber noktası.`
              : `${preferenceReason}Önceki noktadan yaklaşık ${distance.toFixed(1)} km; geri dönüşü azaltmak için sıraya alındı.`),
        tips: [place.note, "Saat, ücret ve erişimi gitmeden doğrula."],
        isCommunityPin: place.kind === "user",
        pinId: place.id,
        category: place.category,
        imageUrl: place.photo ?? place.image ?? null,
        source,
      });
      clock += stay;
      used.add(place.id);
      previous = place;
    }
    if (stops.length) {
      totalMinutes += elapsed;
      days.push({ dayNumber: day + 1, title: `${day + 1}. gün · Yakındaki izler`, summary: `${stops.length} durak, ${Math.round(elapsed)} dakika.`, stops, polyline: encodePolyline([[start.lng, start.lat], ...stops.map((stop) => [stop.lng, stop.lat] as [number, number])]) });
    }
  }

  const usesOpenMap = days.some((item) => item.stops.some((stop) => stop.source === "openstreetmap"));
  return { id: `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, routeTitle: brief.interests.includes("Fotoğraf") ? "Işığın peşinde" : brief.vibe === "Huzurlu" ? "Yavaş bir keşif" : "Merakının kısa rotası", routeSummary: used.size ? `${used.size} yakın durak seçtim. Süre ve mesafe tahminidir; çizgi durakları bağlar, yol navigasyonu değildir.${hours > totalMinutes / 60 + 2 ? " Bölgede tüm süreyi dolduracak kadar iz yok; kalan zamanı mola için bırakıyorum." : ""}` : "Bu başlangıcın yakınında seçtiğin süreye ve ulaşıma uygun yeterli iz yok. Başlangıcı seçili bir yere taşıyabilir veya ulaşımı değiştirebilirsin.", totalDurationHours: Math.round(totalMinutes / 60 * 10) / 10, totalDistanceKm: Math.round(totalDistance * 10) / 10, transport: brief.transport, vibe: brief.vibe || "Keşifçi", days, weatherNote, alternatives: ROUTE_ALTERNATIVES, dataSources: usesOpenMap ? ["OpenStreetMap contributors"] : undefined, createdAt: Date.now(), origin };
}

export function reorderRoute(route: AtlasRoute, dayIndex: number, from: number, to: number) {
  const days = route.days.map((day) => ({ ...day, stops: [...day.stops] }));
  const day = days[dayIndex];
  if (!day || to < 0 || to >= day.stops.length) return route;
  const [stop] = day.stops.splice(from, 1);
  day.stops.splice(to, 0, stop);
  let distance = 0;
  let duration = 0;
  let previous = route.origin ?? day.stops[0];
  days.forEach((item, currentDayIndex) => {
    let clock = 9 * 60;
    let dayMinutes = 0;
    const coords: [number, number][] = [[previous.lng, previous.lat]];
    item.stops = item.stops.map((entry, i) => {
      const hop = distanceBetween(previous, entry);
      const travel = hop < .08 ? 0 : Math.max(3, Math.round(hop / SPEED[route.transport] * 60));
      const breakTime = i > 0 && i % 2 === 0 ? 15 : 0;
      clock += travel + breakTime;
      distance += hop;
      dayMinutes += travel + breakTime + entry.durationMinutes;
      duration += travel + breakTime + entry.durationMinutes;
      const next = {
        ...entry,
        order: i + 1,
        startTime: time(clock),
        endTime: time(clock + entry.durationMinutes),
        aiReason: currentDayIndex === dayIndex
          ? "Sıralamayı sen düzenledin. Mesafe, zaman ve bağlantı çizgisi yeniden hesaplandı."
          : entry.aiReason,
      };
      clock += entry.durationMinutes;
      previous = entry;
      coords.push([entry.lng, entry.lat]);
      return next;
    });
    item.summary = `${item.stops.length} durak, ${Math.round(dayMinutes)} dakika.`;
    item.polyline = encodePolyline(coords);
  });
  return { ...route, days, totalDistanceKm: Math.round(distance * 10) / 10, totalDurationHours: Math.round(duration / 60 * 10) / 10 };
}

export function surpriseBrief(): RouteBrief {
  return { duration: "custom", customHours: 2, tempo: "Rahat", interests: ["Gizli Yerler", "Fotoğraf"], transport: "walking", budget: "Orta", vibe: "Keşifçi", start: "pick", rain: "flex" };
}

export function hiddenInView(places: Place[], view: { lat: number; lng: number; zoom: number }) {
  return nearbyPlaces(places, view, Math.min(150, Math.max(3, 100 / 2 ** Math.max(0, view.zoom - 3))));
}