// Atlasia ekran görüntüsü yakalama
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";

const URL = "http://localhost:5173/";
const OUT = "/home/user/atlasia-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=swiftshader"],
});

// 1) Mobil ekran (iPhone benzeri)
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const mPage = await mobile.newPage();
console.log("Mobil: giriş ekranı yükleniyor...");
await mPage.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
await mPage.waitForTimeout(3500);
await mPage.screenshot({ path: `${OUT}/01-mobile-login.png`, fullPage: false });
console.log("✓ 01-mobile-login.png");

// 2) Masaüstü giriş ekranı
const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const dPage = await desktop.newPage();
console.log("Masaüstü: giriş ekranı yükleniyor...");
await dPage.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
await dPage.waitForTimeout(3500);
await dPage.screenshot({ path: `${OUT}/02-desktop-login.png`, fullPage: false });
console.log("✓ 02-desktop-login.png");

// 3) Masaüstü signup sekmesi
console.log("Masaüstü: üye ol sekmesi...");
try {
  // "Üye ol" / "Sign up" linkini bul ve tıkla
  const signupLink = dPage.getByText(/üye ol|sign up|kayıt/i).first();
  if (await signupLink.isVisible({ timeout: 2000 })) {
    await signupLink.click();
    await dPage.waitForTimeout(2000);
    await dPage.screenshot({ path: `${OUT}/03-desktop-signup.png`, fullPage: false });
    console.log("✓ 03-desktop-signup.png");
  }
} catch (e) {
  console.log("signup sekmesi bulunamadı:", e.message);
}

// 4) Tablet görünüm
const tablet = await browser.newContext({
  viewport: { width: 820, height: 1180 },
  deviceScaleFactor: 1,
});
const tPage = await tablet.newPage();
console.log("Tablet: giriş ekranı yükleniyor...");
await tPage.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
await tPage.waitForTimeout(3500);
await tPage.screenshot({ path: `${OUT}/04-tablet-login.png`, fullPage: false });
console.log("✓ 04-tablet-login.png");

await browser.close();
console.log("Bitti!");
