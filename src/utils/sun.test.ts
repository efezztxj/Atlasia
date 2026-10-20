import { describe, expect, it } from "vitest";
import { goldenHourWindow, solarElevation } from "./sun";

describe("altın saat aralığı", () => {
  it("normal bir günde sabah akşam aralığını ve yerel saat dilimini üretir", () => {
    const result = goldenHourWindow(41.0082, 28.9784, new Date("2026-06-21T12:00:00.000Z"));
    expect(result.timeZone).toBe("Europe/Istanbul");
    expect(result.morning).not.toBeNull();
    expect(result.evening).not.toBeNull();
    expect(result.sunset).not.toBeNull();
    const morningStart = result.morning!.split(" - ")[0];
    const eveningStart = result.evening!.split(" - ")[0];
    expect(morningStart < eveningStart).toBe(true);
  });

  it("kutup enleminde hesaplanamayan güneş saatlerini null döndürür", () => {
    const result = goldenHourWindow(90, 0, new Date("2026-06-21T12:00:00.000Z"));
    expect(["UTC", "Etc/GMT"]).toContain(result.timeZone);
    expect(result.morning).toBeNull();
    expect(result.evening).toBeNull();
    expect(result.sunset).toBeNull();
  });
});

describe("goldenHourWindow ek kilitler", () => {
  it("geçersiz koordinatlarda UTC'ye düşer ve saat üretmez", () => {
    const window = goldenHourWindow(91, 181, new Date("2026-06-21T12:00:00Z"));
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
