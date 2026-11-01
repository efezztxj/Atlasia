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

/** Bu kadar zoom farkı arayüzde görülür sayılır. */
export const VIEW_ZOOM_EPSILON = 0.15;
/** Merkez kayması, görünür yüksekliğin bu oranını geçerse anlamlıdır. */
export const VIEW_CENTER_EPSILON_RATIO = 0.015;
/** Çok yüksek zoom'da bile en az bu kadar derece kayma bildirilir. */
const VIEW_CENTER_MIN_DEG = 0.0005;

type Viewish = { zoom: number; lat: number; lng: number };

/**
 * Görünüm değişikliği arayüzde görülecek kadar büyük mü?
 *
 * Sıkı bir eşik, mikro hareketlerde React state'ini hiç güncellememeyi sağlar
 * (state aynı nesne kalınca React yeniden render etmez). Hareket bittiğinde
 * `moveend` eşiği atlayıp kesin değeri yazar, bu yüzden kayıp yoktur.
 */
export function shouldCommitView(prev: Viewish, next: Viewish, spanDeg: number): boolean {
  if (!Number.isFinite(next.zoom) || !Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return false;
  if (Math.abs(next.zoom - prev.zoom) >= VIEW_ZOOM_EPSILON) return true;
  const dLat = next.lat - prev.lat;
  let dLng = next.lng - prev.lng;
  // Tarih çizgisini geçerken boylam farkı sarmalanır.
  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;
  const span = Number.isFinite(spanDeg) ? Math.abs(spanDeg) : 0;
  const threshold = Math.max(VIEW_CENTER_MIN_DEG, span * VIEW_CENTER_EPSILON_RATIO);
  return Math.hypot(dLat, dLng) >= threshold;
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
