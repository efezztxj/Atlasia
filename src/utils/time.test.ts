import { describe, expect, it } from "vitest";
import { isStoryAlive, storyRemaining, relativeTime } from "./time";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const T0 = 1_760_000_000_000;

describe("24 saatlik story zamanı", () => {
  it("tam 24 saat dolana kadar aktiftir, dolduğu anda kapanır", () => {
    const createdAt = 1_000_000;
    expect(isStoryAlive(createdAt, createdAt + DAY - 1)).toBe(true);
    expect(isStoryAlive(createdAt, createdAt + DAY)).toBe(false);
  });

  it("süre dolunca kalan zamanı null yapar", () => {
    const createdAt = 1_000_000;
    expect(storyRemaining(createdAt, createdAt + DAY)).toBeNull();
    expect(storyRemaining(createdAt, createdAt + DAY - 60_000)).toBe("1 dk kaldı");
  });
});

describe("storyRemaining ek kilitler", () => {
  it("storyRemaining son saati dakika olarak söyler", () => {
    expect(storyRemaining(T0, T0 + DAY - 5 * HOUR)).toBe("5 sa kaldı");
    expect(storyRemaining(T0, T0 + DAY - 30 * MIN)).toBe("30 dk kaldı");
    // 1 dakikadan az kalsa bile en az "1 dk" gösterilir.
    expect(storyRemaining(T0, T0 + DAY - 1)).toBe("1 dk kaldı");
  });
});

describe("relativeTime", () => {
  it("dakika/saat/gün eşiklerini Türkçe kısa etiketlerle verir", () => {
    expect(relativeTime(T0, T0 + 30_000)).toBe("az önce");
    expect(relativeTime(T0, T0 + 12 * MIN)).toBe("12 dk");
    expect(relativeTime(T0, T0 + 3 * HOUR)).toBe("3 sa");
    expect(relativeTime(T0, T0 + 2 * DAY)).toBe("2 g");
  });

  it("haftayı aşan eski kayıtlar göreli etiket yerine tarih döndürür", () => {
    const label = relativeTime(T0, T0 + 10 * DAY);
    expect(label).not.toBe("az önce");
    expect(label).not.toMatch(/^\d+ (dk|sa|g)$/);
    expect(label.length).toBeGreaterThan(0);
  });
});
