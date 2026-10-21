import { describe, expect, it } from "vitest";
import type { SimplificationStats } from "./track";
import { DRAFT_LOSS_NOTICE, DRAFT_RETENTION, draftSummaryText, summarizeDraft } from "./trackDraft";

const stats: SimplificationStats = {
  coords: [
    [27.1, 38.4],
    [27.11, 38.4],
  ],
  keptCount: 2,
  removedCount: 159,
  maxDeviationM: 5.94,
  rawLengthKm: 1.02,
  simplifiedLengthKm: 1,
};

const draft = {
  track: {
    distanceKm: 0.996,
    stops: [{}, {}],
    accuracy: { sampleCount: 161, meanMeters: 7.6 },
  },
  stats,
};

describe("trackDraft · kaydedilmemiş taslak politikası", () => {
  it("taslak yalnız bellekte tutulur (ham konum habersiz kalıcılaşmaz)", () => {
    expect(DRAFT_RETENTION).toBe("memory");
    expect(DRAFT_LOSS_NOTICE).toContain("silinir");
    expect(DRAFT_LOSS_NOTICE).toContain("hiçbir yere yazılmaz");
  });

  it("özet değerleri kayıttan gelir, yuvarlanır", () => {
    expect(summarizeDraft(draft)).toEqual({
      distanceKm: 1,
      stopCount: 2,
      meanAccuracyM: 8,
      maxDeviationM: 5.9,
      keptPoints: 2,
      rawPoints: 161,
    });
  });

  it("özet metni tüm ölçüleri tek satırda verir", () => {
    const text = draftSummaryText(summarizeDraft(draft));
    expect(text).toBe("1.00 km · 2 durak · ortalama doğruluk ±8 m · 2/161 nokta · en büyük sapma 5.9 m");
  });
});
