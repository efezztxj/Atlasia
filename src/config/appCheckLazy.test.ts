import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * App Check tembel başlatma kilidi (2026-10-28).
 *
 * NEDEN: `initializeAppCheck` + ReCaptchaEnterpriseProvider modül tepesinde
 * çalışırken landing'de reCAPTCHA Enterprise (~350 KB), Google iframe'i ve
 * `_GRECAPTCHA` çerezi iniyordu; LCP 3,9 s, Best Practices 75. App Check
 * yalnız Firestore/Storage için gerekir, bu yüzden uygulama kabuğu (Explorer)
 * ve hesap akışı (AccountAccess) yüklendiğinde başlatılır.
 */
const firebase = readFileSync("src/lib/firebase.ts", "utf8");
const explorer = readFileSync("src/components/Explorer.tsx", "utf8");
const account = readFileSync("src/components/AccountAccess.tsx", "utf8");
const indexHtml = readFileSync("index.html", "utf8");

describe("App Check landing'de başlamaz", () => {
  it("initializeAppCheck yalnız startAppCheck() içinde çağrılır", () => {
    const fnAt = firebase.indexOf("export function startAppCheck(");
    const callAt = firebase.indexOf("initializeAppCheck(");
    expect(fnAt).toBeGreaterThan(-1);
    expect(callAt).toBeGreaterThan(fnAt);
    // Modül tepesinde (fonksiyondan önce) hiç çağrı olmamalı.
    expect(firebase.slice(0, fnAt)).not.toContain("initializeAppCheck(");
  });

  it("startAppCheck tekrar başlatmaya karşı korumalı ve yalnız tarayıcıda çalışır", () => {
    expect(firebase).toContain("if (appCheckStarted || !app || typeof window === \"undefined\") return;");
    expect(firebase).toContain("appCheckStarted = true;");
  });

  it("uygulama kabuğu ve hesap akışı App Check'i başlatır", () => {
    for (const [name, source] of [["Explorer.tsx", explorer], ["AccountAccess.tsx", account]] as const) {
      expect(source, name).toContain('import { startAppCheck } from "../lib/firebase";');
      expect(source, name).toContain("startAppCheck();");
    }
  });

  it("favicon 512 KB'lik manifest ikonunu indirmez", () => {
    expect(indexHtml).not.toMatch(/rel="icon"[^>]*icon-512\.png/);
    expect(indexHtml).not.toMatch(/rel="apple-touch-icon"[^>]*icon-512\.png/);
    expect(indexHtml).toContain('href="/icons/icon-32.png"');
    expect(indexHtml).toContain('href="/icons/icon-180.png"');
    for (const file of ["public/icons/icon-32.png", "public/icons/icon-180.png"]) {
      expect(existsSync(file), file).toBe(true);
    }
  });
});
