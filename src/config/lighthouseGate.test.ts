import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * S4 — Lighthouse kapısının kilidi.
 *
 * NEDEN VAR: kapı dosyası (`lighthouserc.cjs`) serbest metindir; eşiği sessizce
 * düşürmek ya da ölçülen sayfayı listeden çıkarmak CI'yı "yeşil" gösterir ama
 * kapıyı boşaltır. Bu test eşikleri, sayfa listesini ve CI kablolamasını kilitler.
 *
 * Eşik düşürme yasağı repo kuralıdır (`AGENTS.md`): sayı düşükse iş kodda yapılır.
 */
const config = readFileSync("lighthouserc.cjs", "utf8");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
const gitignore = readFileSync(".gitignore", "utf8");

/** `minScore` değerini config metninden okur (yapılandırma CJS, import edilmez). */
function minScore(key: string): number {
  const match = new RegExp(`"${key}":\\s*\\["error",\\s*\\{\\s*minScore:\\s*([0-9.]+)`).exec(config);
  if (!match) throw new Error(`eşik yok: ${key}`);
  return Number(match[1]);
}

describe("S4 Lighthouse kapısı", () => {
  it("performans ve erişilebilirlik eşikleri S4 kabul listesinin altına inmez", () => {
    expect(minScore("categories:performance")).toBeGreaterThanOrEqual(0.85);
    expect(minScore("categories:accessibility")).toBeGreaterThanOrEqual(0.95);
    expect(config).toMatch(/"cumulative-layout-shift":\s*\["error",\s*\{\s*maxNumericValue:\s*0\.0?5\s*\}/);
  });

  it("hem tanıtım hem uygulama kabuğu ölçülür ve gürültü medyanla kırılır", () => {
    expect(config).toContain('"http://localhost/"');
    expect(config).toContain('"http://localhost/?tab=kesfet"');
    expect(config).toMatch(/numberOfRuns:\s*([3-9]|\d{2,})/);
    expect(config).toContain('formFactor: "mobile"');
  });

  it("CI adımı zorunlu (continue-on-error yok) ve rapor artifact olarak saklanır", () => {
    expect(manifest.scripts["test:lighthouse"]).toBe("lhci autorun");
    const step = /- name: Lighthouse CI kapısı[\s\S]*?(?=\n {6}- name:)/.exec(workflow);
    expect(step, "Lighthouse adımı CI'da yok").toBeTruthy();
    expect(step?.[0]).toContain("npm run test:lighthouse");
    expect(step?.[0]).not.toContain("continue-on-error");
    expect(workflow).toContain("name: lighthouse-reports");
  });

  it("raporlar depoya sızmaz", () => {
    expect(gitignore).toContain(".lighthouseci");
  });
});
