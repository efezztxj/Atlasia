import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { acceptEssentialCookies, enterGuestExplorer, presetTheme, stubExternalServices } from "./support/harness";

/**
 * Erişilebilirlik kapısı (P1-4 kalanı).
 *
 * Neden gerçek tarayıcı: bileşen testlerindeki axe (`src/components/*.test.ts`) JSDOM'da
 * koşuyor; CSS, renk hesaplaması ve gerçek odak sırası orada yok. Kontrast, görünür
 * odak ve dokunma hedefi boyutu **yalnız gerçek tarayıcıda** ölçülebilir.
 *
 * Eşik: WCAG 2.1 A/AA kural setinde `critical` veya `serious` ihlal **0**.
 * `moderate`/`minor` ihlaller raporlanır ama kapıyı düşürmez (ilk ölçümde gürültü
 * yüksek; bilinçli karar, `docs/mobil-uygunluk.md` ile birlikte okunmalı).
 */

const IMPACTS_BLOCKING = ["critical", "serious"] as const;

function describeViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 4)
        .map((node) => node.target.join(" "))
        .join(" | ");
      return `${violation.id} [${violation.impact}] x${violation.nodes.length} → ${nodes}`;
    })
    .join("\n");
}

async function auditPage(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter((violation) =>
    (IMPACTS_BLOCKING as readonly string[]).includes(violation.impact ?? ""),
  );
  const soft = results.violations.filter(
    (violation) => !(IMPACTS_BLOCKING as readonly string[]).includes(violation.impact ?? ""),
  );

  if (soft.length) {
    // Görünür kalsın, kapıyı düşürmesin.
    test.info().annotations.push({
      type: "notice",
      description: `${label}: ${soft.length} orta/düşük ihlal — ${describeViolations(soft)}`,
    });
  }

  expect(blocking, `[${label}] erişilebilirlik ihlali:\n${describeViolations(blocking)}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await stubExternalServices(page);
});

test("1. Tanıtım sayfası — masaüstü, açık tema", async ({ page }) => {
  await presetTheme(page, "light");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeVisible();

  await auditPage(page, "tanıtım · masaüstü · açık tema · çerez paneli açık");

  await acceptEssentialCookies(page);
  await auditPage(page, "tanıtım · masaüstü · açık tema · çerez paneli kapalı");
});

test("2. Tanıtım sayfası — mobil 390×844, koyu tema", async ({ page }) => {
  await presetTheme(page, "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await auditPage(page, "tanıtım · mobil 390×844 · koyu tema · çerez paneli açık");
  await acceptEssentialCookies(page);
  await auditPage(page, "tanıtım · mobil 390×844 · koyu tema · çerez paneli kapalı");
});

test("3. Uygulama kabuğu — misafir keşif, karşılama diyaloğu", async ({ page }) => {
  await presetTheme(page, "light");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await acceptEssentialCookies(page);

  await page.getByRole("button", { name: /Dünyayı keşfet/ }).click();
  await expect(page.getByRole("dialog", { name: "Nereden başlayalım?" })).toBeVisible();
  await auditPage(page, "keşif kabuğu · masaüstü · karşılama diyaloğu açık");

  await page.getByRole("button", { name: "Karşılamayı kapat" }).click();
  await expect(page.getByRole("button", { name: "Katmanlar sayfasını aç" })).toBeVisible();
  await auditPage(page, "keşif kabuğu · masaüstü · harita yüzeyi");
});

test("4. Uygulama kabuğu — mobil, katmanlar paneli ve koyu tema", async ({ page }) => {
  await presetTheme(page, "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await acceptEssentialCookies(page);
  await enterGuestExplorer(page);

  const layers = page.getByRole("button", { name: "Katmanlar sayfasını aç" });
  await expect(layers).toBeVisible();
  await layers.click();
  await expect(page.getByRole("dialog", { name: /Katmanlar/i })).toBeVisible();

  await auditPage(page, "keşif kabuğu · mobil 390×844 · koyu tema · katmanlar paneli");
});
