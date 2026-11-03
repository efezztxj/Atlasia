import type { BaseMapStyle } from "../components/MapView";

/** MapLibre kaynak kimlikleri; etiket/arazi hataları yanlışlıkla altlık hatası sayılmaz. */
export function activeBaseSource(baseMap: BaseMapStyle): string {
  return baseMap === "dark" ? "openfreemap-openmaptiles" : baseMap;
}

export function isActiveBaseSourceError(event: unknown, baseMap: BaseMapStyle): boolean {
  return typeof event === "object" && event !== null && "sourceId" in event &&
    event.sourceId === activeBaseSource(baseMap);
}
