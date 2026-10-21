import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountAccess = readFileSync("src/components/AccountAccess.tsx", "utf8");
const authTs = readFileSync("src/lib/auth.ts", "utf8");

describe("T1-AUTH telefon bayrağı", () => {
  it("VITE_PHONE_AUTH_ENABLED desenini birebir izler (yalnız 'true' ise açık, varsayılan kapalı)", () => {
    expect(accountAccess).toContain('VITE_PHONE_AUTH_ENABLED === "true"');
    expect(accountAccess).toContain("const PHONE_AUTH_ENABLED =");
    // Apple deseniyle aynı olmalı
    expect(accountAccess).toContain('VITE_APPLE_AUTH_ENABLED === "true"');
  });

  it("kapalıyken telefon düğmesi render edilmez", () => {
    // Düğme yalnız PHONE_AUTH_ENABLED && olduğunda render edilmeli
    expect(accountAccess).toContain('PHONE_AUTH_ENABLED && <button type="button" disabled={blocked || !authConfigured}');
    expect(accountAccess).toContain("Telefon numarasıyla giriş yap");
    // Eski koşulsuz düğme kalmamalı: disabled={blocked || !authConfigured} onClick ... tek başına olmamalı, her zaman bayrakla sarmalı
    const phoneButtonOccurrences = (accountAccess.match(/Telefon numarasıyla giriş yap/g) ?? []).length;
    expect(phoneButtonOccurrences).toBe(1);
    // Bayrak sarmalı dışı doğrudan <button ...>Telefon numarasıyla... olmamalı
    expect(accountAccess).not.toMatch(/[^&] <button type="button" disabled=\{blocked \|\| !authConfigured\} onClick=\{\(\) => \{ resetMessages\(\); setScreen\("phone"\)/);
  });

  it("phone/code ekranlarına hiçbir yoldan ulaşılamaz (render bayrakla kapalı)", () => {
    expect(accountAccess).toContain('PHONE_AUTH_ENABLED && screen === "phone"');
    expect(accountAccess).toContain('PHONE_AUTH_ENABLED && screen === "code"');
    // sendCode / verifyCode başında bayrak kontrolü
    expect(accountAccess).toContain("if (!PHONE_AUTH_ENABLED) return;");
  });

  it("Firebase yokken gösterilen notta SMS'ten etkin yöntem gibi söz etmez", () => {
    expect(accountAccess).toContain('<p className="auth-provider-note">Google ve Apple bağlantısı henüz etkin değil.');
    expect(accountAccess).not.toContain("Google, Apple ve SMS bağlantısı henüz etkin değil");
    // auth.ts not-configured mesajı da SMS içermemeli
    expect(authTs).not.toContain("Google, Apple ve SMS girişi");
    expect(authTs).toContain("Google ve Apple girişi için sağlayıcı bağlantısı henüz kurulmamış");
  });

  it("kalan öğelerin yerleşimi değişmez: providers + ayırıcı + form sırası korunur", () => {
    // credentials ekranında providers ve e-posta formu aynı sırada
    const idxProviders = accountAccess.indexOf('const providers = <div className="auth-provider-actions');
    const idxHeading = accountAccess.indexOf('const heading = screen === "reset"');
    expect(idxProviders).toBeGreaterThan(0);
    expect(idxHeading).toBeGreaterThan(idxProviders);
  });
});
