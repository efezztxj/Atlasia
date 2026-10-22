import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WCAG_AA_NORMAL, alphaTextContrast, contrastRatio, minimumAaOpacity, parseHex } from "../utils/contrast";

/**
 * P18 erişilebilirlik kilidi. Renkler src/index.css'teki token'lardan okunur.
 * Ayrıntı ve karar bekleyen kalemler: docs/teslimatlar/teslimat-p18.md
 */
const css = readFileSync("src/index.css", "utf8");
const componentFiles = readdirSync("src/components").filter((name) => name.endsWith(".tsx") && !name.includes(".test."));
const sources = new Map(componentFiles.map((name) => [name, readFileSync(`src/components/${name}`, "utf8")]));
sources.set("../App.tsx", readFileSync("src/App.tsx", "utf8"));

function token(block: string, name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,6})`).exec(block);
  if (!match) throw new Error(`token yok: ${name}`);
  return match[1];
}
const themeBlock = css.slice(css.indexOf("@theme {"), css.indexOf("}", css.indexOf("--color-sun-2")));
const lightStart = css.indexOf('html[data-theme="light"] {');
const lightBlock = css.slice(lightStart, css.indexOf("}", lightStart));
const THEMES = {
  dark: { mint: token(themeBlock, "mint"), panel: token(themeBlock, "ink-2"), page: token(themeBlock, "ink") },
  light: { mint: token(lightBlock, "mint"), panel: token(lightBlock, "ink-2"), page: token(lightBlock, "ink") },
};

describe("P18 kontrast hesabı (WCAG 2.2)", () => {
  it("hesap fonksiyonu bilinen değerleri üretir", () => {
    expect(contrastRatio(parseHex("#000"), parseHex("#fff"))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseHex("#777"), parseHex("#fff"))).toBeCloseTo(4.48, 2);
  });

  it("tam opak ana metin iki temada da AA'yı rahat geçer", () => {
    for (const theme of Object.values(THEMES)) {
      expect(alphaTextContrast(theme.mint, theme.panel, 100)).toBeGreaterThan(12);
      expect(alphaTextContrast(theme.mint, theme.page, 100)).toBeGreaterThan(12);
    }
  });

  it("/70 ve üstü iki temada da AA; AA eşiği açık temada /65–/70 civarında", () => {
    for (const theme of Object.values(THEMES)) {
      expect(alphaTextContrast(theme.mint, theme.panel, 70)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(alphaTextContrast(theme.mint, theme.page, 70)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
    expect(minimumAaOpacity(THEMES.dark.mint, THEMES.dark.panel)).toBe(50);
    expect(minimumAaOpacity(THEMES.light.mint, THEMES.light.panel)).toBe(65);
    expect(minimumAaOpacity(THEMES.light.mint, THEMES.light.page)).toBe(70);
  });
});

describe("P18 regresyon kilidi", () => {
  it("placeholder metinleri AA'nın altına düşmez (/70 ve üstü)", () => {
    for (const [name, source] of sources) {
      for (const match of source.matchAll(/placeholder:text-mint\/(\d+)/g)) {
        expect(Number(match[1]), `${name}: ${match[0]}`).toBeGreaterThanOrEqual(70);
      }
    }
  });

  it("açık temada AA altı kalan düşük opaklıklı metin sayısı artmaz (cırcır)", () => {
    // Bu kullanımlar açık temada < 4,5:1. Toptan düzeltme renk kararı ister
    // (teslimat-p18.md §Karar). Yeni kod sayıyı artıramaz; düzeltildikçe düşür.
    const BASELINE = 140;
    let count = 0;
    for (const source of sources.values()) {
      for (const match of source.matchAll(/(?<![:\w-])text-mint\/(\d+)/g)) {
        if (Number(match[1]) < 70) count += 1;
      }
    }
    expect(count).toBeLessThanOrEqual(BASELINE);
  });

  it("her modal pencere odak tuzağı + Esc + odak dönüşü sağlar", () => {
    for (const [name, source] of sources) {
      if (!/role="(alert)?dialog"/.test(source)) continue;
      const hook = source.includes("usePanelAccess(");
      const own = source.includes('"Escape"') && source.includes('"Tab"');
      expect(hook || own, `${name}: role="dialog" var ama odak yönetimi yok`).toBe(true);
    }
  });

  it("tıklanabilir arka plan <div onClick> değil, etiketli düğmedir", () => {
    for (const [name, source] of sources) {
      expect(source, name).not.toMatch(/<div[^>]*onClick=\{onClose\}/);
    }
  });

  it("kapalı çekmece Tab sırasından çıkar (inert)", () => {
    expect(sources.get("Drawer.tsx")).toContain("inert={!open}");
  });

  it("katmansız global :focus-visible kuralı Tailwind outline-none'ı ezer", () => {
    // Tailwind v4 yardımcıları @layer utilities içindedir; katmansız kural her zaman kazanır.
    const at = css.indexOf("\n:focus-visible {");
    expect(at).toBeGreaterThan(0);
    const before = css.slice(0, at);
    const opened = (before.match(/@layer[^{]*\{/g) ?? []).length;
    expect(opened).toBe(0);
    expect(css.slice(at, at + 80)).toMatch(/outline:\s*3px solid var\(--color-sun\)/);
  });
});
