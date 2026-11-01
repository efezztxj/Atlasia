import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * S4 — Lighthouse kapısının kilidi.
 *
 * NEDEN VAR: kapı dosyası (`lighthouserc.cjs`) serbest metindir; eşiği sessizce
 * düşürmek ya da ölçülen sayfayı listeden çıkarmak CI'yı "yeşil" gösterir ama
 * kapıyı boşaltır. Bu test üç şeyi kilitler:
 *   1. `HEDEF` (S4 kabul listesi) asla altına inmez,
 *   2. `TABAN` (ilk gerçek ölçümden bağlanan regresyon tabanı) yalnız **yukarı**
 *      hareket eder — bugünkü değerlerin altına düşürülemez,
 *   3. CI adımı zorunludur ve rapor artifact olarak saklanır.
 *
 * Eşik düşürme yasağı repo kuralıdır (`AGENTS.md`): sayı düşükse iş kodda yapılır.
 */
const config = readFileSync("lighthouserc.cjs", "utf8");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
const gitignore = readFileSync(".gitignore", "utf8");

function frozen(name: "HEDEF" | "TABAN"): Record<string, number> {
  const body = new RegExp(`${name} = Object\\.freeze\\(\\{([^}]*)\\}\\)`).exec(config)?.[1];
  if (!body) throw new Error(`yok: ${name}`);
  return Object.fromEntries(
    [...body.matchAll(/(\w+):\s*([0-9.]+)/g)].map(([, key, value]) => [key, Number(value)]),
  );
}

const HEDEF = frozen("HEDEF");
const TABAN = frozen("TABAN");

// Bugüne kadar ölçülen en iyi değerin altına inilemez (regresyon tabanı).
// tanıtım 0,82 (hero AVIF/WebP sonrası) · uygulama kabuğu 0,36-0,39.
const TABAN_ALT_SINIR = { landing: 0.8, appShell: 0.35 } as const;

describe("S4 Lighthouse kapısı", () => {
  it("HEDEF S4 kabul listesinden aşağı inmez", () => {
    expect(HEDEF.performance).toBeGreaterThanOrEqual(0.85);
    expect(HEDEF.accessibility).toBeGreaterThanOrEqual(0.95);
    expect(HEDEF.cls).toBeLessThanOrEqual(0.05);
  });

  it("regresyon tabanı yalnız yukarı hareket eder", () => {
    expect(TABAN.landing).toBeGreaterThanOrEqual(TABAN_ALT_SINIR.landing);
    expect(TABAN.appShell).toBeGreaterThanOrEqual(TABAN_ALT_SINIR.appShell);
    // Taban hedefi aşarsa zaten hedef geçerlidir; altında kalıyorsa borç kayıtlıdır.
    expect(TABAN.landing).toBeLessThanOrEqual(HEDEF.performance);
    expect(TABAN.appShell).toBeLessThanOrEqual(HEDEF.performance);
  });

  it("her iki sayfa da kendi eşiğiyle değerlendirilir ve a11y tavizsizdir", () => {
    expect(config).toContain('matchingUrlPattern: "/$"');
    expect(config).toContain('matchingUrlPattern: "tab=kesfet"');
    // Erişilebilirlik iki sayfada da HEDEF'ten gelir (taban yok).
    expect((config.match(/"categories:accessibility": \["error", \{ minScore: HEDEF\.accessibility \}\]/g) ?? []).length).toBe(2);
    expect(config).toContain("minScore: TABAN.landing");
    expect(config).toContain("minScore: TABAN.appShell");
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
