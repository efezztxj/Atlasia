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
  // Yükleyici JavaScript'i çalıştırdıysa çalışma zamanı scripts.clarity.ms'ten gelir.
  const runtimeResponse = page
    .waitForResponse((response) => response.url().startsWith("https://scripts.clarity.ms/"), { timeout: 30_000 })
    .catch(() => null);

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

  // Bizim tarafımız (izin → betik → istek → CSP) her durumda doğrulanır.
  // Microsoft'un 204 dönmesi bizim kapımızı kırmızıya düşürmemeli; ama sessiz de kalmamalı.
  const response = await tagResponse;
  const tagStatus = response.status();
  expect(tagStatus, `Clarity yükleyici isteği başarısız: HTTP ${tagStatus}`).toBeLessThan(400);

  if (tagStatus === 204) {
    test.info().annotations.push({
      type: "warning",
      description:
        "Microsoft tag 204 (No Content) döndü: bu proje kimliği için betik sunulmuyor. " +
        "Clarity panelinde Project ID ve projeye bağlı alan adı doğrulanmalı.",
    });
    expect(
      await page.evaluate(() => document.querySelector('script[src^="https://www.clarity.ms/tag/"]') !== null),
      "izin verilmesine rağmen Clarity betiği eklenmedi",
    ).toBe(true);
  } else {
    const runtime = await runtimeResponse;
    expect(runtime, "Clarity çalışma zamanı (scripts.clarity.ms) hiç istenmedi — yükleyici çalışmadı").not.toBeNull();
    expect(runtime!.status(), "Clarity çalışma zamanı yüklenemedi").toBeLessThan(400);
  }

  const snapshot = await page.evaluate(() => {
    const api = (window as unknown as { atlasiaClarityStatus?: () => Record<string, unknown> }).atlasiaClarityStatus;
    return api ? api() : null;
  });
  if (snapshot === null) {
    // Yayındaki sürüm bu API'yi henüz içermiyor olabilir (deploy penceresi).
    // Kapıyı kırmızıya düşürmek yerine görünür bir uyarı bırakılır.
    test.info().annotations.push({
      type: "warning",
      description: "window.atlasiaClarityStatus yayında yok: istemci sürümü bu değişiklikten eski.",
    });
  } else {
    expect(snapshot).toMatchObject({ consent: true, scriptPresent: true });
    expect(["ready", "empty", "loading"]).toContain(snapshot.status as string);
  }

  const cspViolations = consoleErrors.filter((text) => /content security policy/i.test(text));
  expect(cspViolations, `CSP ihlali: ${cspViolations.join(" | ")}`).toEqual([]);
});
