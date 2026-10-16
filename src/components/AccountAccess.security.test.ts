import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const accountAccess = readFileSync(fileURLToPath(new URL("./AccountAccess.tsx", import.meta.url)), "utf8");
const authMessages = readFileSync(fileURLToPath(new URL("../lib/auth.ts", import.meta.url)), "utf8");

describe("account access security guidance contract", () => {
  it("keeps the strength meter and live password rules accessible", () => {
    expect(accountAccess).toContain('role="meter"');
    expect(accountAccess).toContain('aria-valuemin={0}');
    expect(accountAccess).toContain('aria-valuemax={4}');
    expect(accountAccess).toContain('"8–128 karakter"');
    expect(accountAccess).toContain('"En az bir harf"');
    expect(accountAccess).toContain('"En az bir rakam"');
  });

  it("states the k-anonymity boundary without promising absolute safety", () => {
    expect(accountAccess).toContain("Ağa yalnız SHA-1 özetinin ilk 5 karakteri gönderilir");
    expect(accountAccess).toContain("ham şifren ve tam özet gönderilmez");
    expect(accountAccess).toContain("Bu sonuç güvenlik garantisi değildir");
    expect(accountAccess).toContain("Sızıntı kontrolü şu anda kullanılamıyor");
  });

  it("checks exposure immediately before both password-writing operations", () => {
    expect(accountAccess.match(/await verifyPasswordBeforeWrite\(\);/g)).toHaveLength(2);
    expect(accountAccess.indexOf("await verifyPasswordBeforeWrite();")).toBeLessThan(accountAccess.indexOf("await signup({ email, password"));
    expect(accountAccess.lastIndexOf("await verifyPasswordBeforeWrite();")).toBeLessThan(accountAccess.indexOf("await resetDevicePassword(email"));
    expect(accountAccess).toContain('new AccountError("auth/password-exposed")');
  });

  it("explains temporary rate limits and phone reCAPTCHA honestly in Turkish", () => {
    expect(authMessages).toContain("geçici güvenlik sınırına ulaşıldı");
    expect(authMessages).toContain('"auth/password-exposed"');
    expect(accountAccess).toContain("Google reCAPTCHA");
    expect(accountAccess).toContain("cihaz ve etkileşim sinyallerini");
    expect(accountAccess).toContain("mutlak güvenlik garantisi vermez");
  });
});
