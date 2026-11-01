import type { Locator, Page } from "@playwright/test";

/**
 * E2E ağ sahtekârlığı: harita karoları, geocoder, hava durumu, yazı tipleri ve
 * görseller ağa çıkmadan deterministik yanıtlanır. Böylece erişilebilirlik
 * taraması ağ gecikmesine/kota durumuna bağlı kalmaz.
 */
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

export async function stubExternalServices(page: Page): Promise<void> {
  await page.route(/arcgisonline\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG }),
  );
  await page.route(/openfreemap\.org/, (route) => {
    const url = route.request().url();
    if (url.endsWith(".json") || url.includes("/styles/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/octet-stream", body: "" });
  });
  await page.route(/photon\.komoot\.io/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ features: [] }),
    }),
  );
  await page.route(/api\.open-meteo\.com/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ current: { temperature_2m: 18, weather_code: 0 } }),
    }),
  );
  await page.route(/api\.pwnedpasswords\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: "" }),
  );
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await page.route(/images\.pexels\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: TRANSPARENT_PNG }),
  );
}

/**
 * Kayıtlı temayı ilk boyamadan önce uygular (theme-boot.js ile aynı anahtar).
 * Varsayılan koyu; anahtar `v2` — `v1` yalnız geçiş için okunur.
 */
export async function presetTheme(page: Page, theme: "light" | "dark" | "midnight"): Promise<void> {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("atlasia.theme.v2", value);
    } catch {
      // Depolama kapalıysa varsayılan tema ile devam edilir.
    }
  }, theme);
}

/** Çerez panelini "yalnız zorunlular" ile kapatır (analitik ağ trafiği yok). */
export async function acceptEssentialCookies(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Yalnız zorunlularla devam et" });
  if (!(await button.isVisible().catch(() => false))) return;
  await button.click();
  await page
    .getByRole("heading", { name: "Çerez ve cihaz depolaması" })
    .waitFor({ state: "hidden" });
}

/**
 * Etkileşimli öğeyi klavyeyle etkinleştirir (odak + Enter).
 *
 * Neden: erişilebilirlik kapısı klavye kullanılabilirliğini de ölçmeli; ayrıca
 * mobilde işaretçi ile tıklama, sürekli animasyon/örtüşme yüzünden kararsız
 * olabiliyor. Odak + Enter hem daha kararlı hem de gerçekten test edilmesi
 * gereken yol.
 */
export async function activateWithKeyboard(page: Page, locator: Locator): Promise<void> {
  await locator.focus();
  await page.keyboard.press("Enter");
}

/** Misafir keşif kabuğunu açar ve karşılama diyaloğunu kapatır. */
export async function enterGuestExplorer(page: Page): Promise<void> {
  const cta = page.getByRole("button", { name: /Dünyayı keşfet/ });
  try {
    await cta.click({ timeout: 8_000 });
  } catch {
    // Mobilde işaretçi tıklaması örtüşme/animasyon yüzünden kararsız olabiliyor;
    // klavye yolu hem kararlı hem de erişilebilirlik açısından anlamlı.
    await activateWithKeyboard(page, cta);
  }
  const onboarding = page.getByRole("dialog", { name: "Nereden başlayalım?" });
  if (await onboarding.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Karşılamayı kapat" }).click();
    await onboarding.waitFor({ state: "hidden" });
  }
}
