import { expect, test, type Page } from "@playwright/test";

// 1x1 geçerli şeffaf PNG (harita karoları için ağa çıkmadan deterministik yanıt).
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

async function stubExternalServices(page: Page): Promise<void> {
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
  await page.route(/api\.pwnedpasswords\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: "" }),
  );
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
}

test.beforeEach(async ({ page }) => {
  await stubExternalServices(page);
});

test("1. Tanıtım sayfası: doğrulanmış katalog kapsamı, çerez onayı ve alt bilgi yeniden açma akışı", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dünyayı merakınla keşfet.");
  await expect(page.getByLabel("Doğrulanmış içerik kapsamı")).toContainText("28");
  await expect(page.getByLabel("Doğrulanmış içerik kapsamı")).toContainText("Antik kent sesli turu");

  const consentHeading = page.getByRole("heading", { name: "Çerez ve cihaz depolaması" });
  await expect(consentHeading).toBeVisible();

  await page.getByRole("button", { name: "Yalnız zorunlularla devam et" }).click();
  await expect(consentHeading).toBeHidden();

  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === "atlasia_consent")).toBe(true);

  await page.getByRole("button", { name: "Çerez tercihleri" }).click();
  await expect(consentHeading).toBeVisible();
});

test("2. Yasal metinler: KVKK aydınlatma modalı açılır, taslak uyarısını gösterir ve Escape ile kapanır", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Yalnız zorunlularla devam et" }).click();

  await page.getByRole("button", { name: "KVKK aydınlatma" }).click();
  const dialog = page.getByRole("dialog", { name: "KVKK Aydınlatma Metni" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Taslak · Künye ve avukat onayı bekleniyor");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("3. Misafir keşif kabuğu: karşılama, harita arayüzü ve Katmanlar sayfası klavye erişimi", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Yalnız zorunlularla devam et" }).click();
  await page.getByRole("button", { name: /Dünyayı keşfet/ }).click();

  const onboarding = page.getByRole("dialog", { name: "Nereden başlayalım?" });
  await expect(onboarding).toBeVisible();
  await expect(onboarding).toContainText("Misafir olarak geziyorsun.");

  await page.getByRole("button", { name: "Karşılamayı kapat" }).click();
  await expect(onboarding).toBeHidden();

  await page.getByRole("button", { name: "Katmanlar sayfasını aç" }).click();
  const layersDialog = page.getByRole("dialog", { name: /Katmanlar/i });
  await expect(layersDialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(layersDialog).toBeHidden();
});

test("4. Misafir kapısı (T8): İz bırakma isteği kayıt ekranını açar ve misafir olarak geri dönülebilir", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Yalnız zorunlularla devam et" }).click();
  await page.getByRole("button", { name: /Dünyayı keşfet/ }).click();

  await page.getByRole("button", { name: /Bir iz bırak/ }).click();

  await expect(page.getByRole("heading", { name: /Atlasia’ya (üye ol|giriş yap)/ })).toBeVisible();
  const guestBack = page.getByRole("button", { name: /Misafir olarak devam et/ });
  await expect(guestBack).toBeVisible();

  await guestBack.click();
  await expect(page.getByRole("button", { name: "Katmanlar sayfasını aç" })).toBeVisible();
});

test("5. Cihaz modu üyelik + kurtarma anahtarı + açık tema (/theme-boot.js) kalıcılığı", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("atlasia.theme.v1", "light");
  });

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Yalnız zorunlularla devam et" }).click();
  await page.getByRole("button", { name: /Dünyayı keşfet/ }).click();
  await page.getByRole("button", { name: /Bir iz bırak/ }).click();

  await expect(page.locator("#account-email")).toBeVisible();
  const switchToSignup = page.getByRole("button", { name: "Üye ol" });
  if (await switchToSignup.isVisible()) {
    await switchToSignup.click();
  }

  await page.locator("#account-email").fill("gezgin@atlasia.example");
  await page.locator("#account-password").fill("Atlasia!Keşif2026Güvenli");
  await page.locator("#account-name").fill("Efe Gezgin");
  await page.getByText("Kullanım koşullarını kabul ediyorum.").click();
  await page.getByRole("button", { name: "Hesap oluştur" }).click();

  await expect(page.getByText("HESABIN OLUŞTURULDU")).toBeVisible();
  const recoveryKey = await page.locator("#account-recovery-key").textContent();
  expect((recoveryKey ?? "").trim().length).toBeGreaterThanOrEqual(16);

  await page.getByText("Anahtarımı güvenli bir yere kaydettim.").click();
  await page.getByRole("button", { name: /Hesabımla devam et/ }).click();

  await expect(page.getByRole("button", { name: "Katmanlar sayfasını aç" })).toBeVisible();
});
