import { defineConfig, devices } from "@playwright/test";

/**
 * Yayındaki siteye karşı koşan doğrulama (yerel preview'a değil).
 *
 * Neden ayrı dosya: `playwright.config.ts` CI'da yerel `vite preview` sunucusuna
 * karşı koşuyor ve dış ağa çıkmıyor. Clarity'nin gerçekten yüklenip yüklenmediği
 * yalnız gerçek alan adı + gerçek rıza akışıyla ölçülebilir.
 *
 * Kullanım: npx playwright test --config playwright.canli.config.ts
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /canli-.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 90_000,
  expect: { timeout: 25_000 },
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: process.env.ATLASIA_CANLI_BASE || "https://atlasia.pages.dev",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
