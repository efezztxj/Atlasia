import { expect, test } from "@playwright/test";

/**
 * Yayındaki sitede Clarity zincirinin uçtan uca kanıtı.
 *
 * Ölçülen üç ayrı şey:
 *  1. Sunucunun gönderdiği CSP, Clarity yükleyicisini ve çalışma zamanını izliyor mu?
 *  2. Kullanıcı ayrı izni verdiğinde betik gerçekten ekleniyor ve HTTP 200 alıyor mu?
 *  3. CSP ihlali konsola düşüyor mu (betik "eklendi ama çalışmadı" durumu)?
 *
 * Not: reklam engelleyici yok. Tarayıcıda engel varsa panelde "engellendi"
 * uyarısı çıkar; bu test sunucu tarafını doğrular.
 */
test("canlı site: CSP Clarity'ye izin veriyor, rıza sonrası betik 200 ile yükleniyor", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const tagResponse = page.waitForResponse(
    (response) => response.url().startsWith("https://www.clarity.ms/tag/"),
    { timeout: 30_000 },
  );

  const navigation = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(navigation, "canlı ana sayfa açılamadı").not.toBeNull();

  const csp = (await navigation!.allHeaders())["content-security-policy"] ?? "";
  expect(csp, "yayında CSP başlığı yok").toContain("script-src");
  expect(csp).toContain("https://www.clarity.ms");
  expect(csp, "çalışma zamanı adresi CSP'de yok — Clarity sessizce çalışmaz").toContain("https://scripts.clarity.ms");

  const clarityCheckbox = page.getByRole("checkbox", { name: /Microsoft Clarity/i });
  await expect(clarityCheckbox, "çerez panelinde Clarity onay kutusu görünmüyor").toBeVisible();
  await clarityCheckbox.check();
  await page.getByRole("button", { name: "Clarity tercihini kaydet" }).click();

  await expect(page.locator('script[src^="https://www.clarity.ms/tag/"]')).toHaveCount(1);

  const response = await tagResponse;
  expect(response.status(), `Clarity tag adresi ${response.status()} döndü`).toBe(200);

  const snapshot = await page.evaluate(() => {
    const api = (window as unknown as { atlasiaClarityStatus?: () => Record<string, unknown> }).atlasiaClarityStatus;
    return api ? api() : null;
  });
  expect(snapshot, "destek/durum API'si yayında yok").not.toBeNull();
  expect(snapshot).toMatchObject({ consent: true, status: "ready", scriptPresent: true });

  const cspViolations = consoleErrors.filter((text) => /content security policy/i.test(text));
  expect(cspViolations, `CSP ihlali: ${cspViolations.join(" | ")}`).toEqual([]);
});
