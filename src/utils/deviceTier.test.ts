import { describe, expect, it } from "vitest";
import {
  detectDeviceTier,
  measuredFps,
  recommendedPixelRatio,
  recommendedTerrain,
  shouldLowerMapQuality,
  FRAME_SAMPLE_MIN_MS,
  HIGH_TIER_MAX_PIXEL_RATIO,
  LOW_TIER_MAX_PIXEL_RATIO,
  MIN_SMOOTH_FPS,
} from "./deviceTier";

const signals = (over: Partial<Parameters<typeof detectDeviceTier>[0]> = {}) => ({
  hardwareConcurrency: 8,
  deviceMemory: 8,
  coarsePointer: false,
  saveData: false,
  reducedMotion: false,
  ...over,
});

describe("cihaz kademesi", () => {
  it("güçlü masaüstünü yüksek kademe sayar", () => {
    expect(detectDeviceTier(signals())).toBe("high");
  });

  it("zayıf donanımı ve veri/erişilebilirlik tercihlerini düşük kademe sayar", () => {
    expect(detectDeviceTier(signals({ hardwareConcurrency: 2 }))).toBe("low");
    expect(detectDeviceTier(signals({ deviceMemory: 4 }))).toBe("low");
    expect(detectDeviceTier(signals({ saveData: true }))).toBe("low");
    expect(detectDeviceTier(signals({ reducedMotion: true }))).toBe("low");
    // Dokunmatik + orta seviye CPU: telefonların çoğunluğu buraya düşer.
    expect(detectDeviceTier(signals({ coarsePointer: true, hardwareConcurrency: 6 }))).toBe("low");
  });

  it("olağan masaüstünü (4 çekirdek, ince işaretçi) sadeleştirmez", () => {
    // Görünümü boşuna değiştirmemek için 4 çekirdekli masaüstü yüksek kalır.
    expect(detectDeviceTier(signals({ hardwareConcurrency: 4, coarsePointer: false }))).toBe("high");
    expect(detectDeviceTier(signals({ hardwareConcurrency: 8, coarsePointer: true }))).toBe("high");
  });

  it("bilinmeyen donanım bilgisinde yanlışlıkla kalite düşürmez", () => {
    expect(detectDeviceTier({ coarsePointer: false, reducedMotion: false })).toBe("high");
    expect(detectDeviceTier({ coarsePointer: true, reducedMotion: false })).toBe("low");
  });
});

describe("piksel oranı", () => {
  it("düşük kademede DPR'ı sınırlar, 1'in altına inmez", () => {
    expect(recommendedPixelRatio(3, "low")).toBe(LOW_TIER_MAX_PIXEL_RATIO);
    expect(recommendedPixelRatio(1, "low")).toBe(1);
    expect(recommendedPixelRatio(0.8, "low")).toBe(1);
  });

  it("yüksek kademede 2'nin üzerine çıkmaz (telefon DPR'ı 3 olsa bile)", () => {
    expect(recommendedPixelRatio(3, "high")).toBe(HIGH_TIER_MAX_PIXEL_RATIO);
    expect(recommendedPixelRatio(1.5, "high")).toBe(1.5);
  });

  it("geçersiz DPR'da 1 döner", () => {
    expect(recommendedPixelRatio(Number.NaN, "high")).toBe(1);
    expect(recommendedPixelRatio(-2, "low")).toBe(1);
  });
});

describe("ağır arazi katmanı varsayılanı", () => {
  it("modern telefonda (6+ çekirdek) açık kalır: 3B görünüm korunur", () => {
    expect(recommendedTerrain(signals({ coarsePointer: true, hardwareConcurrency: 8 }))).toBe(true);
    expect(recommendedTerrain(signals({ coarsePointer: true, hardwareConcurrency: 6 }))).toBe(true);
    expect(recommendedTerrain(signals())).toBe(true);
  });

  it("gerçekten zayıf cihazda kapalı başlar", () => {
    expect(recommendedTerrain(signals({ coarsePointer: true, hardwareConcurrency: 4 }))).toBe(false);
    expect(recommendedTerrain(signals({ deviceMemory: 3 }))).toBe(false);
    expect(recommendedTerrain(signals({ saveData: true }))).toBe(false);
    expect(recommendedTerrain(signals({ reducedMotion: true }))).toBe(false);
  });
});

describe("ölçüme dayalı kalite düşürme", () => {
  it("kare hızı eşiğin altındaysa bir kez düşürür", () => {
    expect(shouldLowerMapQuality(MIN_SMOOTH_FPS - 1, 2, false)).toBe(true);
    expect(shouldLowerMapQuality(MIN_SMOOTH_FPS, 2, false)).toBe(false);
    expect(shouldLowerMapQuality(MIN_SMOOTH_FPS - 1, 2, true)).toBe(false);
  });

  it("piksel oranı zaten 1 ise ve ölçüm geçersizse dokunmaz", () => {
    expect(shouldLowerMapQuality(10, 1, false)).toBe(false);
    expect(shouldLowerMapQuality(Number.NaN, 2, false)).toBe(false);
    expect(shouldLowerMapQuality(0, 2, false)).toBe(false);
  });

  it("çok kısa hareket penceresi FPS üretmez (gürültüyle kalite düşürülmesin)", () => {
    expect(measuredFps(5, FRAME_SAMPLE_MIN_MS - 1)).toBe(0);
    expect(measuredFps(0, 1000)).toBe(0);
    // 20 kare / 500 ms = 40 FPS
    expect(measuredFps(20, 500)).toBeCloseTo(40, 5);
  });
});
