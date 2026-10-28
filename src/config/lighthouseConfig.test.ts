/**
 * G3 + B5 kapı kilidi — Lighthouse yapılandırması ve bütçe dosyası.
 *
 * NEDEN TEST: Eşikler bir dosyada duruyor; biri "bugün kırmızı çıkmasın" diye
 * sessizce düşürülürse kimse fark etmez. Bu test eşiklerin **yalnız
 * sıkılaşabileceğini** ve bütçe dosyasının gerçekten bağlı olduğunu kilitler.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const config = require("../../lighthouserc.cjs");
type BudgetItem = { resourceType: string; budget: number };
const budgets = JSON.parse(readFileSync("lighthouse-budgets.json", "utf8")) as Array<{
  resourceSizes: BudgetItem[];
  resourceCounts: BudgetItem[];
}>;
const workflow = readFileSync(".github/workflows/lighthouse.yml", "utf8");

describe("G3 · mobil Lighthouse kapısı", () => {
  it("mobil profil ve iki koşu ile ölçer (tek koşu gürültülü)", () => {
    // Lighthouse `preset` bayrağı yalnız desktop/perf alır: mobil profil
    // formFactor + screenEmulation ile kurulur (CI'da 39e38e5 ders oldu).
    expect(config.ci.collect.settings.preset).toBeUndefined();
    expect(config.ci.collect.settings.formFactor).toBe("mobile");
    expect(config.ci.collect.numberOfRuns).toBeGreaterThanOrEqual(2);
    expect(config.ci.collect.settings.screenEmulation.width).toBeLessThanOrEqual(400);
  });

  it("eşikler denetimle aynı: perf ≥90, a11y ≥95", () => {
    const assertions = config.ci.assert.assertions;
    expect(assertions["categories:performance"][1].minScore).toBeGreaterThanOrEqual(0.9);
    expect(assertions["categories:accessibility"][1].minScore).toBeGreaterThanOrEqual(0.95);
    // Hepsi "error": uyarı seviyesindeki kapı kapı değildir.
    for (const key of ["categories:performance", "categories:accessibility", "categories:seo"]) {
      expect(assertions[key][0]).toBe("error");
    }
  });

  it("denetimde düzeltilen maddeler regresyon kilidi olarak duruyor", () => {
    for (const audit of ["uses-responsive-images", "color-contrast", "image-alt", "valid-source-maps", "performance-budget"]) {
      expect(config.ci.assert.assertions[audit], audit).toBe("error");
    }
  });

  it("CI iş akışı gerçekten bu yapılandırmayı çalıştırıyor", () => {
    // Koşu ve kapı AYRI adımlar: assert düştüğünde rapor yine saklanır.
    expect(workflow).toContain("@lhci/cli@0.15.1 collect");
    expect(workflow).toContain("@lhci/cli@0.15.1 assert");
    expect(workflow).not.toContain("@lhci/cli@0.15.1 autorun");
    expect(workflow).toContain("npm run build");
    // Sürüm sabit: `latest` bir gün sessizce ölçüm profilini değiştirmesin.
    expect(workflow).not.toMatch(/@lhci\/cli@latest/);
    // Chrome yolu açıkça çözülür (runner imajında chrome-launcher bulamıyor).
    expect(workflow).toContain("CHROME_PATH");
    expect(workflow).toContain("Chrome yolunu belirle");
  });
});

describe("B5 · Lighthouse bütçe kapısı", () => {
  it("yapılandırma bütçe dosyasını bağlıyor", () => {
    expect(config.ci.collect.settings.budgetPath).toBe("./lighthouse-budgets.json");
    expect(config.ci.assert.assertions["performance-budget"]).toBe("error");
  });

  it("bütçe sınırları gerçekçi ama gevşek değil (KB)", () => {
    const sizes = Object.fromEntries(budgets[0].resourceSizes.map((item: BudgetItem) => [item.resourceType, item.budget]));
    expect(sizes.total).toBeLessThanOrEqual(520);
    expect(sizes.image).toBeLessThanOrEqual(130);
    expect(sizes.font).toBeLessThanOrEqual(80);
    // Üçüncü taraf istek yok: Pexels köprüsü ve self-host fontlar bunu garanti eder.
    expect(sizes["third-party"]).toBe(0);
  });

  it("istek sayısı sınırı var (sonsuz istek = bütçe yok)", () => {
    const counts = budgets[0].resourceCounts;
    expect(counts.find((item: BudgetItem) => item.resourceType === "total")?.budget).toBeLessThanOrEqual(20);
    expect(counts.find((item: BudgetItem) => item.resourceType === "third-party")?.budget).toBe(0);
  });
});
