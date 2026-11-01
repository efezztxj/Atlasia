import { describe, expect, it } from "vitest";
import {
  shouldAdvanceSpin,
  shouldReportView,
  SPIN_FRAME_INTERVAL_MS,
  VIEW_REPORT_INTERVAL_MS,
} from "./mapLifecycle";

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

describe("harita hareketi görünüm bildirimi", () => {
  it("ilk bildirimi her zaman geçirir", () => {
    expect(shouldReportView(0, Number.NEGATIVE_INFINITY)).toBe(true);
    expect(shouldReportView(1234, Number.NEGATIVE_INFINITY)).toBe(true);
  });

  it("hareket sırasında bildirimleri saniyede ~8 ile sınırlar", () => {
    // 60 FPS'te gelen karelerin çoğu elenir: arayüz her karede yeniden çizilmez.
    expect(VIEW_REPORT_INTERVAL_MS).toBeGreaterThanOrEqual(1000 / 15);
    expect(shouldReportView(16, 0)).toBe(false);
    expect(shouldReportView(VIEW_REPORT_INTERVAL_MS - 1, 0)).toBe(false);
    expect(shouldReportView(VIEW_REPORT_INTERVAL_MS, 0)).toBe(true);
  });

  it("geçersiz zaman değerinde bildirim yapmaz", () => {
    expect(shouldReportView(Number.NaN, 0)).toBe(false);
  });
});
