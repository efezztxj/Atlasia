export const SPIN_FRAME_INTERVAL_MS = 1000 / 15;

/**
 * Hareket sırasında görünüm bildiriminin en sık aralığı.
 *
 * Harita `zoom` olayını animasyon boyunca her karede yayar. Bu olay doğrudan
 * iki React state'ini güncellediğinde (görünüm + viewport) tüm keşif ağacı
 * saniyede ~60 kez yeniden çiziliyor, parmakla zoom/pan sırasında arayüz
 * kasıyordu. Arayüz okumaları için ~8 bildirim/saniye fazlasıyla yeterli;
 * hareket bittiğinde (`moveend`) tam bildirim zaten yapılır.
 */
export const VIEW_REPORT_INTERVAL_MS = 120;

/** Hareket sırasında yeni bir görünüm bildirimi yapılmalı mı? */
export function shouldReportView(now: number, lastReportAt: number): boolean {
  if (!Number.isFinite(lastReportAt)) return true;
  if (!Number.isFinite(now)) return false;
  return now - lastReportAt >= VIEW_REPORT_INTERVAL_MS;
}

export function shouldAdvanceSpin(
  now: number,
  lastFrameAt: number,
  enabled: boolean,
  hidden: boolean,
  reducedMotion: boolean,
  zoom: number,
  maxZoom: number,
  moving: boolean,
): boolean {
  return enabled && !hidden && !reducedMotion && !moving && zoom < maxZoom &&
    Number.isFinite(now) && now - lastFrameAt >= SPIN_FRAME_INTERVAL_MS;
}
