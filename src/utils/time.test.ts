import { describe, expect, it } from "vitest";
import { isStoryAlive, relativeTime, storyRemaining } from "./time";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const T0 = 1_760_000_000_000;

describe("story 24 saat penceresi", () => {
  it("isStoryAlive 24 saat sınırını açık üstten zorlar", () => {
    expect(isStoryAlive(T0, T0 + 1)).toBe(true);
    expect(isStoryAlive(T0, T0 + DAY - 1)).toBe(true);
    // Tam 24 saatte ve sonrasında story canlı değildir.
    expect(isStoryAlive(T0, T0 + DAY)).toBe(false);
    expect(isStoryAlive(T0, T0 + DAY + 1)).toBe(false);
  });

  it("storyRemaining son saati dakika olarak söyler", () => {
    expect(storyRemaining(T0, T0 + DAY - 5 * HOUR)).toBe("5 sa kaldı");
    expect(storyRemaining(T0, T0 + DAY - 30 * MIN)).toBe("30 dk kaldı");
    // 1 dakikadan az kalsa bile en az "1 dk" gösterilir.
    expect(storyRemaining(T0, T0 + DAY - 1)).toBe("1 dk kaldı");
  });

  it("storyRemaining tam bitişte ve sonrasında null döner", () => {
    expect(storyRemaining(T0, T0 + DAY)).toBeNull();
    expect(storyRemaining(T0, T0 + DAY + 5 * MIN)).toBeNull();
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
