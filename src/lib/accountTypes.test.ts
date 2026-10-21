import { describe, expect, it } from "vitest";
import {
  AccountError,
  isValidEmail,
  normalizeEmail,
  passwordRules,
  validPassword,
} from "./accountTypes";

// P16 2. tur: hesap doğrulayıcılarının karakterizasyonu. Bu kilitler Firebase
// ve cihaz hesap akışlarının ortak kapıları — sessiz regresyonda kullanıcının
// kayıt/giriş yapamaması veya zayıf parola kabulü anlamına gelir.
describe("accountTypes", () => {
  it("normalizeEmail boşlukları keser, küçük harfe indirir", () => {
    expect(normalizeEmail("  efe@Atlasia.COM ")).toBe("efe@atlasia.com");
    expect(normalizeEmail("a@b.c")).toBe("a@b.c");
  });

  it("isValidEmail temel biçimi ve 254 tavanını zorlar", () => {
    expect(isValidEmail("efe@example.com")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.d")).toBe(false);
    expect(isValidEmail("@c.d")).toBe(false);
    expect(isValidEmail("a@c.d e")).toBe(false);
    const uzun = `${"a".repeat(245)}@atlasia.app`;
    expect(uzun.length).toBeGreaterThan(254);
    expect(isValidEmail(uzun)).toBe(false);
  });

  it("passwordRules: 8–128 uzunluk, harf (Türkçe dahil) ve rakam", () => {
    const iyi = passwordRules("Kıbrıs2026");
    expect(iyi).toEqual({ length: true, letter: true, number: true });
    expect(validPassword("Kıbrıs2026")).toBe(true);

    expect(validPassword("Kısa12")).toBe(false); // 6 harf+2 rakam ama < 8
    expect(validPassword("sadeceharfvar")).toBe(false);
    expect(validPassword("12345678")).toBe(false);
    const cookUzun = `a1${"x".repeat(127)}`;
    expect(validPassword(cookUzun)).toBe(false); // > 128
    // Türkçe karakterler \p{L} ile harf sayılır.
    expect(passwordRules("ıIğüşöç1234").letter).toBe(true);
  });

  it("AccountError kodu name/message olarak taşır", () => {
    const hata = new AccountError("auth/invalid-email");
    expect(hata).toBeInstanceOf(Error);
    expect(hata.name).toBe("AccountError");
    expect(hata.code).toBe("auth/invalid-email");
    expect(hata.message).toBe("auth/invalid-email");
  });
});
