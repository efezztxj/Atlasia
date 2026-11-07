export interface AudioDiscoveryStop {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  sources: { title: string; url: string }[];
  coordinateSource: string;
  markerStyle?: "additional";
  audio?: string;
  image?: { url: string; alt: string; source: string; author: string; license: string; licenseUrl: string };
}

export interface AudioDiscoveryTour {
  id: string;
  placeId: string;
  title: string;
  stops: AudioDiscoveryStop[];
}

/** Efes ve Kalkidikum turları açılmadan içerik yüklenmez; dosya servis çalışanının kabuğunda da saklanır. */
export function supportsAudioDiscovery(placeId: string): boolean {
  return placeId === "efes" || placeId === "kalkidikum";
}

/**
 * Kartı açık yerin sesli turunu çözer: Kalkidikum'un dokuz durağı haritada ayrı
 * rehber pini olduğu için tur kapısı her birinin kartından aynı tura açılır.
 */
export function audioTourPlaceFor(placeId: string): string | null {
  if (supportsAudioDiscovery(placeId)) return placeId;
  if (placeId.startsWith("kalkidikum-")) return "kalkidikum";
  return null;
}

/** İngilizce anlatım kayıtları bugün yalnız Efes turu için var. */
export function hasEnglishAudio(placeId: string): boolean {
  return placeId === "efes";
}

export async function loadAudioDiscoveryForPlace(placeId: string): Promise<AudioDiscoveryTour | null> {
  if (!supportsAudioDiscovery(placeId)) return null;
  const response = await fetch(`/assets/${placeId}-tour.json`);
  if (!response.ok) throw new Error("Audio tour unavailable");
  const tours: unknown = await response.json();
  if (!Array.isArray(tours)) throw new Error("Invalid audio tour");
  const tour = (tours as AudioDiscoveryTour[]).find((item) => item.placeId === placeId);
  if (!tour || !Array.isArray(tour.stops) || !tour.stops.length || !tour.stops.every((stop) => stop.id && stop.title && stop.description && Number.isFinite(stop.lat) && Number.isFinite(stop.lng))) {
    throw new Error("Incomplete audio tour");
  }
  return tour;
}
