/**
 * T12 — landing krem bölümündeki altın metinlerin WCAG AA kilidi.
 *
 * NEDEN VAR: 2026-10-28 ölçümünde eyebrow altını (#a37c35) krem zeminde
 * 3,35:1, büyük "istersin?" başlığı (#ba8f45) 2,59:1 kontrast veriyordu; axe
 * bunları hata olarak işaretliyordu. Renkler koyulaştırıldı ve bu test, tonun
 * sessizce eski hâline dönmesini engeller. Renkler elle yazılmış sayı değil,
 * doğrudan bileşen kaynağından okunur.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WCAG_AA_LARGE, WCAG_AA_NORMAL, contrastRatio, parseHex } from "../utils/contrast";

const landing = readFileSync("src/components/LandingPage.tsx", "utf8");
/** Krem bölümün zemini (`bg-[#f1f0e9]`). */
const CREAM = "#f1f0e9";
/** Yalnız krem bölüm: koyu hero'daki altınlar ayrı zeminde ölçülür. */
const creamSection = landing.slice(landing.indexOf('id="kesfet"'), landing.indexOf('id="nasil"'));

function colorOf(pattern: RegExp, label: string): string {
  const match = pattern.exec(creamSection);
  if (!match) throw new Error(`${label} rengi LandingPage.tsx içinde bulunamadı`);
  return match[1];
}

describe("landing krem bölümü kontrastı", () => {
  const eyebrow = colorOf(/text-\[(#[0-9a-f]{6})\] uppercase/, "eyebrow");
  const headingAccent = colorOf(/<span className="text-\[(#[0-9a-f]{6})\]">istersin\?/, "büyük başlık vurgusu");
  const cardNumber = colorOf(/font-mono text-\[11px\] text-\[(#[0-9a-f]{6})\]/, "kart numarası");

  it("küçük altın metinler (eyebrow, kart numarası) AA'yı geçer", () => {
    expect(contrastRatio(parseHex(eyebrow), parseHex(CREAM))).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    expect(contrastRatio(parseHex(cardNumber), parseHex(CREAM))).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    // Tek altın tonu: küçük metinler aynı token'ı paylaşır.
    expect(cardNumber).toBe(eyebrow);
  });

  it("büyük başlık vurgusu büyük metin eşiğini (3:1) geçer", () => {
    expect(contrastRatio(parseHex(headingAccent), parseHex(CREAM))).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
  });

  it("AA'yı geçmeyen eski tonlar geri gelmiyor", () => {
    expect(landing).not.toContain("#a37c35");
    expect(landing).not.toContain("#ba8f45");
  });
});
