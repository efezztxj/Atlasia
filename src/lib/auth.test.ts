import type { User } from "firebase/auth";
import { describe, expect, it } from "vitest";
import {
  authBackend,
  authConfigured,
  getAtlasAuth,
  isSupportedAccount,
  isVerifiedMember,
  requestPasswordReset,
  toFirebaseAccount,
} from "./auth";

// P16 2. tur: auth kapılarının karakterizasyonu. Test ortamında Firebase env
// yok → authConfigured=false, backend "device" beklenir. Provider kapıları
// gerçek üye/anonim ayrımı olduğu için saf fonksiyonlarla kilitlenir.

function sahteUser(partial: Partial<User>): User {
  return {
    uid: "u1",
    email: "efe@example.com",
    displayName: "efe",
    phoneNumber: null,
    photoURL: null,
    emailVerified: false,
    isAnonymous: false,
    providerData: [],
    ...partial,
  } as User;
}

describe("auth", () => {
  it("yapılandırma olmadan cihaz backend'ine düşer ve SDK reddeder", async () => {
    expect(authConfigured).toBe(false);
    expect(authBackend).toBe("device");
    await expect(getAtlasAuth()).rejects.toMatchObject({ message: "auth/not-configured" });
    await expect(requestPasswordReset("efe@example.com")).rejects.toMatchObject({ code: "device/recovery-required" });
  });

  it("isSupportedAccount anonim ve bilinmeyen provider'ı reddeder", () => {
    expect(isSupportedAccount(null)).toBe(false);
    expect(isSupportedAccount(sahteUser({ isAnonymous: true, providerData: [{ providerId: "password" } as User["providerData"][number]] }))).toBe(false);
    expect(isSupportedAccount(sahteUser({ providerData: [{ providerId: "twitter.com" } as User["providerData"][number]] }))).toBe(false);
    expect(isSupportedAccount(sahteUser({ providerData: [{ providerId: "google.com" } as User["providerData"][number]] }))).toBe(true);
  });

  it("isVerifiedMember e-posta provider'ında emailVerified ister; telefonda numara ister", () => {
    const parola = [{ providerId: "password" } as User["providerData"][number]];
    expect(isVerifiedMember(sahteUser({ providerData: parola, emailVerified: false }))).toBe(false);
    expect(isVerifiedMember(sahteUser({ providerData: parola, emailVerified: true }))).toBe(true);

    const telefon = [{ providerId: "phone" } as User["providerData"][number]];
    expect(isVerifiedMember(sahteUser({ providerData: telefon, phoneNumber: null }))).toBe(false);
    expect(isVerifiedMember(sahteUser({ providerData: telefon, phoneNumber: "+905551112233" }))).toBe(true);
    expect(isVerifiedMember(null)).toBe(false);
  });

  it("toFirebaseAccount backend'i firebase işaretler, requiresEmailVerification=false bırakır", () => {
    const hesap = toFirebaseAccount(sahteUser({ emailVerified: true }));
    expect(hesap).toMatchObject({
      backend: "firebase",
      emailVerified: true,
      requiresEmailVerification: false,
      uid: "u1",
    });
  });
});
