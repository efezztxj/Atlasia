import { useEffect, useMemo, useState } from "react";
import { Camera } from "lucide-react";
import type { Place } from "../types";
import { getPlacePhotos } from "../utils/placePhotos";
import { cn } from "../utils/cn";

export default function PlaceImage({ place, className, compact = false }: { place: Place; className?: string; compact?: boolean }) {
  const photos = useMemo(() => getPlacePhotos(place), [place]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [place.id]);
  if (photos[index]) return <img src={photos[index]} alt={`${place.title} fotoğrafı`} className={cn("object-cover", className)} loading="lazy" decoding="async" onError={() => setIndex((current) => current + 1)} />;
  return <div role="img" aria-label={`${place.title}: fotoğraf şu an yüklenemiyor`} className={cn("grid place-content-center gap-2 bg-[#10352b] text-center text-mint/75", className)}><Camera size={compact ? 20 : 27} className="mx-auto" />{!compact && <span className="px-3 text-[13px]">Fotoğraf yüklenemedi</span>}</div>;
}