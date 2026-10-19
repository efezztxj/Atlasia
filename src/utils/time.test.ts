import { describe, expect, it } from "vitest";
import { isStoryAlive, storyRemaining } from "./time";

const DAY = 24 * 60 * 60 * 1000;

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
