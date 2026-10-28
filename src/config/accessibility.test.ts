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
  // M-03b: uygulama kabuğunun ikinci yarısı Explorer.tsx.
  sources.set("../Explorer.tsx", readFileSync("src/Explorer.tsx", "utf8"));

function token(block: string, name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,6})`).exec(block);
  if (!match) throw new Error(`token yok: ${name}`);
  return match[1];
}
const themeBlock = css.slice(css.indexOf("@theme {"), css.indexOf("}", css.indexOf("--color-sun-2")));
const lightStart = css.indexOf('html[data-theme="light"] {');
const lightBlock = css.slice(lightStart, css.indexOf("}", lightStart));
const lightCanvas = /--light-canvas:\s*(#[0-9a-fA-F]{6})/.exec(lightBlock)?.[1];
if (!lightCanvas) throw new Error("açık tema kanvas token'ı yok: --light-canvas");
const midnightStart = css.indexOf('html[data-theme="midnight"] {');
const midnightBlock = css.slice(midnightStart, css.indexOf("}", midnightStart));
const THEMES = {
  dark: { mint: token(themeBlock, "mint"), panel: token(themeBlock, "ink-2"), page: token(themeBlock, "ink") },
  light: { mint: token(lightBlock, "mint"), panel: token(lightBlock, "ink-2"), page: token(lightBlock, "ink") },
  midnight: { mint: token(midnightBlock, "mint"), panel: token(midnightBlock, "ink-2"), page: token(midnightBlock, "ink") },
};

describe("P18 kontrast hesabı (WCAG 2.2)", () => {
  it("hesap fonksiyonu bilinen değerleri üretir", () => {
    expect(contrastRatio(parseHex("#000"), parseHex("#fff"))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseHex("#777"), parseHex("#fff"))).toBeCloseTo(4.48, 2);
  });

  it("tam opak ana metin üç temada da AA'yı rahat geçer", () => {
    for (const theme of Object.values(THEMES)) {
      expect(alphaTextContrast(theme.mint, theme.panel, 100)).toBeGreaterThan(12);
      expect(alphaTextContrast(theme.mint, theme.page, 100)).toBeGreaterThan(12);
    }
  });

  it("/70 ve üstü üç temada da AA; beyaz açık temada AA eşiği /65", () => {
    for (const theme of Object.values(THEMES)) {
      expect(alphaTextContrast(theme.mint, theme.panel, 70)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(alphaTextContrast(theme.mint, theme.page, 70)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
    expect(alphaTextContrast(THEMES.light.mint, lightCanvas, 70)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    expect(minimumAaOpacity(THEMES.dark.mint, THEMES.dark.panel)).toBe(50);
    expect(minimumAaOpacity(THEMES.light.mint, THEMES.light.panel)).toBe(65);
    expect(minimumAaOpacity(THEMES.light.mint, THEMES.light.page)).toBe(65);
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

  it("açık temada /70 altı her metin tonu CSS katmanıyla AA'ya çekilir (eksik ton yok)", () => {
    const start = css.indexOf("/* P18-LIGHT-AA:start");
    const end = css.indexOf("/* P18-LIGHT-AA:end */");
    expect(start).toBeGreaterThan(-1);
    const layer = css.slice(start, end);
    const covered = new Map<string, number>();
    for (const rule of layer.matchAll(/:is\(([^)]*)\)[^{]*\{\s*color:\s*color-mix\(in oklab, var\(--color-mint\) (\d+)%, transparent\);/g)) {
      for (const cls of rule[1].matchAll(/\.((?:md\\:)?text-mint\\\/\d+)/g)) covered.set(cls[1].replace(/\\/g, ""), Number(rule[2]));
    }
    const used = new Set<string>();
    for (const source of sources.values()) {
      for (const match of source.matchAll(/(?<![\w-])((?:md:)?text-mint\/(\d+))\b/g)) {
        if (Number(match[2]) < 70) used.add(match[1]);
      }
    }
    expect(used.size).toBeGreaterThan(0);
    const lightTints = [THEMES.light.panel, THEMES.light.page, lightCanvas];
    for (const cls of used) {
      const opacity = covered.get(cls);
      expect(opacity, `${cls} açık tema katmanında yok`).toBeDefined();
      for (const bg of lightTints) expect(alphaTextContrast(THEMES.light.mint, bg, opacity ?? 0), `${cls} @ ${bg}`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
    // Katman yalnız açık temaya uygulanır; koyu tema hiyerarşisi değişmez.
    expect(layer.match(/^html\[data-theme="light"\]/gm)?.length).toBe(3);
  });

  it("P18-13 kararı: giriş ekranı her temada bilinçli olarak koyu; metinleri AA'yı geçer", () => {
    const colorOf = (selector: string, property: "color" | "background") => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&");
      const rule = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
      const value = rule && new RegExp(`(?:^|;|\\s)${property}:\\s*(#[0-9a-fA-F]{6})`).exec(rule[1]);
      if (!value) throw new Error(`${selector} ${property} bulunamadı`);
      return value[1];
    };
    const backgrounds = [colorOf(".auth-access", "background"), colorOf(".auth-login-page", "background")];
    for (const selector of [
      ".auth-heading > p:last-child", ".auth-form-hint", ".auth-consent", ".auth-access-footer",
      ".auth-separator", ".auth-access-security", ".auth-verification-note", ".auth-status",
      ".auth-account-switch", ".auth-error", ".auth-back",
    ]) {
      for (const bg of backgrounds) {
        expect(contrastRatio(parseHex(colorOf(selector, "color")), parseHex(bg)), `${selector} @ ${bg}`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      }
    }
    // Açık tema katmanı giriş yüzeyini değiştirmez (karar: teslimat-p18.md).
    expect(css).not.toMatch(/html\[data-theme="light"\][^{]*\.auth-/);
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
