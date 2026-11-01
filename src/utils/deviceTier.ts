/**
 * Cihaz kalitesi — "kullanırken kasmayan" harita için uyarlanabilir ayarlar.
 *
 * NEDEN: MapLibre tuvali varsayılan olarak cihazın `devicePixelRatio`
 * değeriyle çizilir. Telefonlarda bu değer 3'e kadar çıkar; yani 1 px'lik
 * görüntü için 9 kat piksel taranır. Kamera hareketi (sürükleme, zoom)
 * sırasında bu, GPU'ya bağlı kasmanın en büyük tek sebebidir. Uyarlanabilir
 * katman, zayıf cihazlarda piksel oranını ve ağır arazi katmanını düşürür;
 * güçlü cihazlarda görünüm aynı kalır.
 */

export type DeviceTier = "low" | "high";

export interface DeviceSignals {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  coarsePointer: boolean;
  saveData?: boolean;
  reducedMotion: boolean;
}

/** Düşük kademede tuvalin çizileceği en yüksek piksel oranı. */
export const LOW_TIER_MAX_PIXEL_RATIO = 1.25;
/** Yüksek kademede bile 2'nin üzeri pratikte görünür kazanç sağlamaz. */
export const HIGH_TIER_MAX_PIXEL_RATIO = 2;
/** Bu FPS'in altındaki hareket "akıcı değil" sayılır. */
export const MIN_SMOOTH_FPS = 40;
/** Ölçüm için en az bu kadar süre hareket gözlenmeli (ms). */
export const FRAME_SAMPLE_MIN_MS = 250;

/**
 * Sinyallerden cihaz kademesi.
 *
 * `hardwareConcurrency` ve `deviceMemory` her tarayıcıda yok; bilinmeyen
 * değer "yüksek" sayılır (yanlışlıkla kalite düşürmemek için).
 */
export function detectDeviceTier(signals: DeviceSignals): DeviceTier {
  if (signals.reducedMotion || signals.saveData) return "low";
  if (typeof signals.deviceMemory === "number" && signals.deviceMemory > 0 && signals.deviceMemory <= 4) {
    return "low";
  }
  if (typeof signals.hardwareConcurrency === "number" && signals.hardwareConcurrency > 0) {
    if (signals.hardwareConcurrency <= 4) return "low";
    if (signals.coarsePointer && signals.hardwareConcurrency <= 6) return "low";
    return "high";
  }
  return signals.coarsePointer ? "low" : "high";
}

/** Cihaz kademesine göre güvenli piksel oranı (1'in altına inmez). */
export function recommendedPixelRatio(devicePixelRatio: number, tier: DeviceTier): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const cap = tier === "low" ? LOW_TIER_MAX_PIXEL_RATIO : HIGH_TIER_MAX_PIXEL_RATIO;
  return Math.max(1, Math.min(dpr, cap));
}

/** Ağır arazi (terrain + tepe gölgesi) yalnız güçlü cihazda varsayılan açık. */
export function recommendedTerrain(tier: DeviceTier): boolean {
  return tier === "high";
}

/**
 * Ölçülen kare hızına göre kalite bir kez daha düşürülmeli mi?
 *
 * Yalnız bir kez düşürülür; ölçüm gürültüsü yüzünden kalitenin sürekli
 * inip çıkması engellenir.
 */
export function shouldLowerMapQuality(fps: number, pixelRatio: number, alreadyLowered: boolean): boolean {
  if (alreadyLowered) return false;
  if (!Number.isFinite(fps) || fps <= 0) return false;
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 1) return false;
  return fps < MIN_SMOOTH_FPS;
}

/** Hareket penceresindeki kare sayısından FPS; pencere çok kısaysa 0. */
export function measuredFps(frames: number, elapsedMs: number): number {
  if (!Number.isFinite(frames) || !Number.isFinite(elapsedMs)) return 0;
  if (frames <= 0 || elapsedMs < FRAME_SAMPLE_MIN_MS) return 0;
  return (frames * 1000) / elapsedMs;
}

/** Tarayıcıdan sinyalleri güvenli biçimde okur (SSR ve test ortamında da). */
export function readDeviceSignals(): DeviceSignals {
  const nav = typeof navigator === "undefined"
    ? undefined
    : (navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } });
  const matches = (query: string) => (typeof matchMedia === "function" ? matchMedia(query).matches : false);
  return {
    hardwareConcurrency: nav?.hardwareConcurrency,
    deviceMemory: nav?.deviceMemory,
    coarsePointer: matches("(pointer: coarse)"),
    saveData: nav?.connection?.saveData,
    reducedMotion: matches("(prefers-reduced-motion: reduce)"),
  };
}
