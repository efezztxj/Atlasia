import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth";

describe("Firebase giriş yapılandırma mesajları", () => {
  it("yetkisiz alan adını kullanıcıya Türkçe ve eyleme dönük açıklar", () => {
    expect(authErrorMessage({ code: "auth/unauthorized-domain" })).toBe(
      "Bu site adresi giriş için yetkilendirilmemiş. Yayın alanının Firebase'e eklenmesi gerekiyor.",
    );
  });

  it("kapalı giriş yöntemini genel hataya düşürmeden Türkçe açıklar", () => {
    expect(authErrorMessage({ code: "auth/operation-not-allowed" })).toBe(
      "Bu giriş yöntemi henüz etkin değil. Başka bir yöntem seçebilir veya daha sonra deneyebilirsin.",
    );
  });

  it("SMS için Blaze gereksinimini net Türkçe açıklar", () => {
    expect(authErrorMessage({ code: "auth/billing-not-enabled" })).toBe(
      "SMS ile giriş için Firebase projesinde Blaze faturalandırma planının etkinleştirilmesi gerekiyor. Şimdilik başka bir giriş yöntemi kullanabilirsin.",
    );
  });
});
