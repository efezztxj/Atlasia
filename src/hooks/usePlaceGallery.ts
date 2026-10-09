import { useEffect, useMemo, useState } from "react";
import type { Place } from "../types";
import { getPlacePhotos, photoSource } from "../utils/placePhotos";

export interface GalleryPhoto { url: string; credit: string; source: string | null; nearby?: boolean; }
const cache = new Map<string, GalleryPhoto[]>();
const plainText = (html: string) => new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";

export function usePlaceGallery(place: Place) {
  const base = useMemo<GalleryPhoto[]>(() => getPlacePhotos(place).map((url) => { const source = photoSource(url); return { url, credit: source.label, source: source.href }; }), [place]);
  const [extra, setExtra] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    setExtra([]);
    setError(false);
    if (base.length >= 5) { setLoading(false); return; }
    const key = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;
    if (cache.has(key)) { setExtra(cache.get(key)!); setLoading(false); return; }
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => { if (active) { setError(true); setLoading(false); } controller.abort(); }, 7000);
    setLoading(true);
    const query = new URLSearchParams({ action: "query", format: "json", generator: "geosearch", ggsprimary: "all", ggsnamespace: "6", ggsradius: "500", ggscoord: `${place.lat}|${place.lng}`, ggslimit: "12", prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "1200", origin: "*" });
    void fetch(`https://commons.wikimedia.org/w/api.php?${query}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Gallery unavailable");
      const data = await response.json() as { query?: { pages?: Record<string, { imageinfo?: { mime?: string; thumburl?: string; url?: string; descriptionurl?: string; extmetadata?: { Artist?: { value: string }; LicenseShortName?: { value: string } } }[] }> } };
      const photos = Object.values(data.query?.pages ?? {}).flatMap((page) => {
        const info = page.imageinfo?.[0];
        if (!info || !["image/jpeg", "image/png", "image/webp"].includes(info.mime ?? "") || !(info.thumburl ?? info.url)) return [];
        const artist = plainText(info.extmetadata?.Artist?.value ?? "Wikimedia Commons");
        const license = plainText(info.extmetadata?.LicenseShortName?.value ?? "Lisans dosya sayfasında");
        return [{ url: (info.thumburl ?? info.url)!, credit: `${artist} · ${license}`, source: info.descriptionurl ?? null, nearby: true }];
      });
      if (active && !controller.signal.aborted) { cache.set(key, photos); setExtra(photos); }
    }).catch(() => { if (active && !controller.signal.aborted) setError(true); }).finally(() => { if (active) setLoading(false); clearTimeout(timeout); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [place.id, place.lat, place.lng, base.length]);
  return { photos: [...base, ...extra.filter((photo) => !base.some((item) => item.url === photo.url))].slice(0, 10), loading, error };
}