import { describe, expect, it } from "vitest";
import { goldenHourWindow, solarElevation } from "./sun";

const YAZ_DONUMU = new Date("2026-06-21T12:00:00Z");
const KISI_DONUMU = new Date("2026-12-21T12:00:00Z");

describe("goldenHourWindow", () => {
  it("İstanbul yaz gündönümünde sabah ve akşam aralıklarını yerel saatle verir", () => {
    const window = goldenHourWindow(41.0082, 28.9784, YAZ_DONUMU);
    expect(window.timeZone).toBe("Europe/Istanbul");
    expect(window.morning).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
    expect(window.evening).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
    expect(window.sunset).toMatch(/^\d{2}:\d{2}$/);
    // Doğuş, gün batımından önce olmalı (h23 iki haneli saatlerde sözlüksel sıra güvenli).
    const [morningStart] = (window.morning ?? "").split(" - ");
    const [, eveningEnd] = (window.evening ?? "").split(" - ");
    expect(morningStart < eveningEnd).toBe(true);
  });

  it("kutup gecesinde gün doğumu/batımı pencereleri boş döner", () => {
    const window = goldenHourWindow(78.22, 15.65, KISI_DONUMU);
    expect(window.timeZone).toBe("Arctic/Longyearbyen");
    expect(window.morning).toBeNull();
    expect(window.evening).toBeNull();
    expect(window.sunset).toBeNull();
  });

  it("geçersiz koordinatlarda UTC'ye düşer ve saat üretmez", () => {
    const window = goldenHourWindow(91, 181, YAZ_DONUMU);
    expect(window.timeZone).toBe("UTC");
    expect(window.morning).toBeNull();
    expect(window.evening).toBeNull();
    expect(window.sunset).toBeNull();
  });
});

describe("solarElevation", () => {
  it("İstanbul gündüzünde ufuk üzerindedir", () => {
    expect(solarElevation(41.0082, 28.9784, new Date("2026-06-21T10:00:00Z"))).toBeGreaterThan(0);
  });

  it("gece yarısında ufuk altındadır", () => {
    expect(solarElevation(41.0082, 28.9784, new Date("2026-06-21T00:00:00Z"))).toBeLessThan(0);
  });
});
