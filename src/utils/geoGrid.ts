/**
 * Atlasia — harita ızgarası yardımcıları.
 *
 * Hava (rüzgâr) katmanı ve benzeri görünüm-kapsamlı veri katmanları, ekranı
 * "yuvarlak" adımlarla kaplayan düzenli bir coğrafi ızgaraya ihtiyaç duyar.
 * Izgara merkezden adım adım dizildiği için küçük kaydırmalarda aynı kalır ve
 * istek önbelleği (cache anahtarı URL'dir) tutar.
 *
 * `weatherLayer.ts`'den ayrıldı: eski dosya hem ızgara yardımcılarını hem de
 * kaldırılan 3×3 sıcaklık etiketi katmanını taşıyordu.
 */

export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

const SNAP_STEPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 45, 90] as const;

/** Görünür açıklığa göre "yuvarlak" adım: küçük kaydırmalarda ızgara aynı kalır. */
function snapStep(span: number, cells: number): number {
  const wanted = span / Math.max(1, cells);
  return SNAP_STEPS.find((step) => step >= wanted) ?? 90;
}

/** Boylamı [-180, 180) aralığına sarar (MapLibre antimeridyen ötesinde 190° gibi değer verebilir). */
export function wrapLng(lng: number): number {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function geoGrid(bounds: GeoBounds, rows = 3, columns = 3): Array<{ lat: number; lng: number }> {
  if (rows < 1 || columns < 1 || !Object.values(bounds).every(Number.isFinite)) return [];
  const south = Math.max(-85, bounds.south);
  const north = Math.min(85, bounds.north);
  if (south > north) return [];
  // Antimeridyeni geçen kutu (west > east) doğuya açılır; dünya turundan geniş görünüm merkezde 360°'ye kırpılır.
  let west = bounds.west;
  let east = bounds.east < west ? bounds.east + 360 : bounds.east;
  if (east - west > 360) {
    const mid = (west + east) / 2;
    west = mid - 180;
    east = mid + 180;
  }
  const latStep = snapStep(north - south, Math.max(1, rows - 1));
  const lngStep = snapStep(east - west, Math.max(1, columns - 1));
  const latCenter = Math.round((south + north) / 2 / latStep) * latStep;
  const lngCenter = Math.round((west + east) / 2 / lngStep) * lngStep;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return Array.from({ length: rows * columns }, (_, index) => {
    const r = Math.floor(index / columns);
    const c = index % columns;
    const lat = Math.min(85, Math.max(-85, latCenter + (r - (rows - 1) / 2) * latStep));
    const lng = lngCenter + (c - (columns - 1) / 2) * lngStep;
    return { lat: round(lat), lng: round(lng) };
  });
}

export function debounce<T extends (...args: never[]) => void>(fn: T, delayMs: number, timers = globalThis) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = (...args: Parameters<T>) => {
    if (timer !== undefined) timers.clearTimeout(timer);
    timer = timers.setTimeout(() => { timer = undefined; fn(...args); }, delayMs);
  };
  run.cancel = () => { if (timer !== undefined) timers.clearTimeout(timer); timer = undefined; };
  return run;
}
