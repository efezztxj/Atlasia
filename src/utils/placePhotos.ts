import type { Place } from "../types";
import { GALLERIES } from "../data/galleries";

export function getPlacePhotos(place: Place) {
  const seen = new Set<string>();
  return [place.photo, ...(place.gallery ?? []), ...(GALLERIES[place.id] ?? []), place.image]
    .filter((url): url is string => !!url)
    .filter((url) => {
      const photoId = url.match(/pexels\.com\/photos\/(\d+)/)?.[1];
      const key = photoId ? `pexels-${photoId}` : url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
}

export function photoSource(url: string) {
  const id = url.match(/pexels\.com\/photos\/(\d+)/)?.[1];
  if (id) return { label: "Pexels · fotoğrafçı bilgisi", href: `https://www.pexels.com/photo/${id}/` };
  const file = url.split("Special:FilePath/")[1]?.split("?")[0];
  if (file) return { label: "Wikimedia Commons · fotoğraf ve lisans", href: `https://commons.wikimedia.org/wiki/File:${file}` };
  return { label: "Gezgin fotoğrafı", href: null };
}