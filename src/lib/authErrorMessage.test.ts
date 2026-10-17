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

  it("referrer engelini adres taşıyan kodda da tanır", () => {
    expect(
      authErrorMessage({ code: "auth/requests-from-referer-https://atlasia.pages.dev/-are-blocked" }),
    ).toContain("HTTP referrer kısıtına https://atlasia.pages.dev/*");
  });

  it("API anahtarı yetkisiz uygulama kodunu genel hataya düşürmez", () => {
    expect(authErrorMessage({ code: "auth/app-not-authorized" })).toContain("HTTP referrer kısıtına");
  });

  it("tanınmayan kodda teşhis için kodu mesaja ekler", () => {
    expect(authErrorMessage({ code: "auth/bilinmeyen-kod" })).toContain("(kod: auth/bilinmeyen-kod)");
  });

  it("yalnız message taşıyan hatada da kodu okur", () => {
    expect(authErrorMessage(new Error("auth/operation-not-allowed"))).toBe(
      "Bu giriş yöntemi henüz etkin değil. Başka bir yöntem seçebilir veya daha sonra deneyebilirsin.",
    );
  });
});
