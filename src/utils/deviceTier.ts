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

/**
 * Düşük kademede tuvalin çizileceği en yüksek piksel oranı.
 *
 * Kalite önceliği: 1,25 telefonda gözle görülür biçimde yumuşak kalıyordu.
 * 1,5 hem keskin duruyor hem zayıf cihazda hâlâ ölçülü bir yük bırakıyor.
 */
export const LOW_TIER_MAX_PIXEL_RATIO = 1.5;
/** Yüksek kademede bile 2'nin üzeri pratikte görünür kazanç sağlamaz. */
export const HIGH_TIER_MAX_PIXEL_RATIO = 2;
/**
 * Dokunmatik cihazlarda üst sınır.
 *
 * 2 = retina keskinliği; DPR 3 telefonlarda 9 kat yerine 4 kat piksel taranır,
 * görüntü farkı pratikte ayırt edilmez ama GPU yükü yarıdan fazla azalır.
 * Daha aşağısı (1,5) ekranı yumuşak gösterdiği için kalite önceliğinde
 * kullanılmaz; gerçek yavaşlama ölçülürse kademeli düşürme devreye girer.
 */
export const TOUCH_MAX_PIXEL_RATIO = 2;
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
  // Erişilebilirlik ve veri tasarrufu tercihleri her cihazda geçerlidir.
  if (signals.reducedMotion || signals.saveData) return "low";
  // `deviceMemory` yalnız Chromium tabanlı tarayıcılarda (ağırlıkla Android) var.
  if (typeof signals.deviceMemory === "number" && signals.deviceMemory > 0 && signals.deviceMemory <= 4) {
    return "low";
  }
  const cores = signals.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0) {
    // 2 çekirdek her yerde zayıftır.
    if (cores <= 2) return "low";
    // Dokunmatik + orta seviye CPU: telefonların çoğunluğu.
    if (signals.coarsePointer && cores <= 6) return "low";
    // Masaüstünde 4 çekirdek olağandır; arayüzü/görünümü boşuna sadeleştirme.
    return "high";
  }
  return signals.coarsePointer ? "low" : "high";
}

/** Cihaz kademesine göre güvenli piksel oranı (1'in altına inmez). */
export function recommendedPixelRatio(
  devicePixelRatio: number,
  tier: DeviceTier,
  coarsePointer = false,
): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const tierCap = tier === "low" ? LOW_TIER_MAX_PIXEL_RATIO : HIGH_TIER_MAX_PIXEL_RATIO;
  const cap = coarsePointer ? Math.min(tierCap, TOUCH_MAX_PIXEL_RATIO) : tierCap;
  return Math.max(1, Math.min(dpr, cap));
}

/**
 * Tepe gölgesi (hillshade) varsayılan açık mı?
 *
 * Hillshade, DEM verisini okuyan **ayrı bir tam ekran geçişidir**; bu yüzden
 * yalnız gerçekten zayıf cihazda kapatılır — araziyle aynı kapı. Kalite
 * önceliği: modern telefon (6-8 çekirdek) dokunmatik olsa da gölgesini korur;
 * zorlanırsa kademeli düşürme zaten devreye girer.
 */
export function recommendedHillshade(signals: DeviceSignals): boolean {
  return !isWeakDevice(signals);
}

/**
 * Cihaz "gerçekten zayıf" mı?
 *
 * Ağır görsel katmanları (arazi, tepe gölgesi) varsayılan kapatma kararı bu
 * tek kapıya bağlıdır: veri tasarrufu, azaltılmış hareket, çok az bellek veya
 * dokunmatik + en fazla 4 çekirdek. Diğer herkes tam kaliteyle başlar.
 */
function isWeakDevice(signals: DeviceSignals): boolean {
  if (signals.saveData || signals.reducedMotion) return true;
  if (typeof signals.deviceMemory === "number" && signals.deviceMemory > 0 && signals.deviceMemory <= 3) {
    return true;
  }
  const cores = signals.hardwareConcurrency;
  return signals.coarsePointer && typeof cores === "number" && cores > 0 && cores <= 4;
}

/**
 * Ağır arazi (DEM + tepe gölgesi) varsayılan açık kalsın mı?
 *
 * Arazi kapanınca `flyTo` eğimi de 0'a iner, yani küre/3B his kaybolur. Bu
 * yüzden yalnız gerçekten zayıf cihazlarda kapatılır; modern telefonlar
 * (6-8 çekirdek) dokunmatik olsa da araziyi korur — oradaki yükü piksel
 * oranı sınırı ve ölçüme dayalı düşürme zaten karşılıyor.
 */
export function recommendedTerrain(signals: DeviceSignals): boolean {
  return !isWeakDevice(signals);
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

/** Arazi katmanını kapatma eşiği: bunun altı gerçekten rahatsız edici. */
export const MIN_TERRAIN_FPS = 28;

/** Son çare piksel oranı düşürme eşiği: burada akıcılık kalitenin önüne geçer. */
export const MIN_CRITICAL_FPS = 22;

/** Kare hızı son çare piksel düşürmeyi gerektiriyor mu? */
export function shouldDropToMinimum(fps: number): boolean {
  if (!Number.isFinite(fps) || fps <= 0) return false;
  return fps < MIN_CRITICAL_FPS;
}

/** Kademeli düşürmede ilk adımın piksel oranı (kaliteyi koruyan ara değer). */
export const DEGRADE_PIXEL_RATIO = 1.5;

/** Kare hızı arazi katmanını kapatmayı gerektiriyor mu? */
export function shouldDisableTerrain(fps: number): boolean {
  if (!Number.isFinite(fps) || fps <= 0) return false;
  return fps < MIN_TERRAIN_FPS;
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
