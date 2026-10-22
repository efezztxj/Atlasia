import { describe, expect, it } from "vitest";
import { shouldAdvanceSpin, SPIN_FRAME_INTERVAL_MS } from "./mapLifecycle";

const eligible = (now: number, last: number) => shouldAdvanceSpin(now, last, true, false, false, 2, 3.2, false);

describe("MapLibre spin frame limit", () => {
  it("limits frame updates to at most 15 FPS", () => {
    expect(eligible(66, 0)).toBe(false);
    expect(eligible(SPIN_FRAME_INTERVAL_MS, 0)).toBe(true);
    expect(eligible(SPIN_FRAME_INTERVAL_MS * 2, SPIN_FRAME_INTERVAL_MS)).toBe(true);
  });
  it("stops for disabled spin, hidden tab, reduced motion, zoom cap, or active motion", () => {
    expect(shouldAdvanceSpin(100, 0, false, false, false, 2, 3.2, false)).toBe(false);
    expect(shouldAdvanceSpin(100, 0, true, true, false, 2, 3.2, false)).toBe(false);
    expect(shouldAdvanceSpin(100, 0, true, false, true, 2, 3.2, false)).toBe(false);
    expect(shouldAdvanceSpin(100, 0, true, false, false, 3.2, 3.2, false)).toBe(false);
    expect(shouldAdvanceSpin(100, 0, true, false, false, 2, 3.2, true)).toBe(false);
  });
});
