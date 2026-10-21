import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";

// P16 2. tur: cihaz hesabı akışının karakterizasyonu. PBKDF2 600k iterasyon
// gerçek olarak koşar (node webcrypto) — test başına geniş timeout kasıtlı.
// IndexedDB fake-indexeddb ile, sessionStorage Map ile taklit edilir; modül
// durumu (databasePromise/attempts) her testte resetModules ile sıfırlanır.

type Mod = typeof import("./deviceAccounts");

const DETAY = {
  email: "  efe@Atlasia.APP ",
  password: "Kıbrıs2026!",
  displayName: "efe",
  country: "TR",
};

async function yukle(): Promise<Mod> {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("IDBKeyRange", IDBKeyRange);
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return import("./deviceAccounts");
}

describe("deviceAccounts", () => {
  it("kayıt kurtarma kodu verir; finish oturum açar, restore aynı uid'yi döndürür", async () => {
    const mod = await yukle();
    const kayit = await mod.registerDeviceAccount(DETAY);
    expect(kayit.recoveryCode).toMatch(/^[A-F0-9]{4}(-[A-F0-9]{4}){7}$/);
    const hesap = await kayit.finish();
    expect(hesap.email).toBe("efe@atlasia.app");
    expect(hesap.backend).toBe("device");
    expect(hesap.uid).toMatch(/^device-[a-f0-9]{32}$/);

    const geri = await mod.restoreDeviceSession();
    expect(geri?.uid).toBe(hesap.uid);

    await mod.signOutDeviceAccount();
    expect(await mod.restoreDeviceSession()).toBeNull();
  }, 30_000);

  it("geçersiz girdi kodlu reddedilir; yinelenen e-posta yakalanır", async () => {
    const mod = await yukle();
    await expect(mod.registerDeviceAccount({ ...DETAY, email: "bozuk" })).rejects.toMatchObject({ code: "auth/invalid-email" });
    await expect(mod.registerDeviceAccount({ ...DETAY, password: "zayıf" })).rejects.toMatchObject({ code: "auth/weak-password" });
    await expect(mod.registerDeviceAccount({ ...DETAY, displayName: "E" })).rejects.toMatchObject({ code: "auth/invalid-profile-name" });

    await mod.registerDeviceAccount(DETAY);
    await expect(mod.registerDeviceAccount(DETAY)).rejects.toMatchObject({ code: "auth/email-already-in-use" });
  }, 30_000);

  it("yanlış parola invalid-credential; doğru parola oturum açar; silinen hesap giremez", async () => {
    const mod = await yukle();
    const { finish } = await mod.registerDeviceAccount(DETAY);
    const hesap = await finish();

    await expect(mod.signInDeviceAccount(DETAY.email, "Yanlış2026!")).rejects.toMatchObject({ code: "auth/invalid-credential" });
    const giris = await mod.signInDeviceAccount(DETAY.email, DETAY.password);
    expect(giris.uid).toBe(hesap.uid);

    const guncelle = await mod.updateDeviceProfile("  efe Yılmaz  ");
    expect(guncelle.displayName).toBe("efe Yılmaz");

    await mod.deleteDeviceAccount(hesap.uid);
    await expect(mod.signInDeviceAccount(DETAY.email, DETAY.password)).rejects.toMatchObject({ code: "auth/invalid-credential" });
  }, 60_000);

  it("kurtarma kodu parolayı değiştirir; eski parola ve yanlış kod reddedilir", async () => {
    const mod = await yukle();
    const { recoveryCode } = await mod.registerDeviceAccount(DETAY);

    await expect(mod.resetDevicePassword(DETAY.email, "AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-0000-1111", "YeniParola42"))
      .rejects.toMatchObject({ code: "device/invalid-recovery-code" });

    await mod.resetDevicePassword(DETAY.email, recoveryCode, "YeniParola42");
    await expect(mod.signInDeviceAccount(DETAY.email, DETAY.password)).rejects.toMatchObject({ code: "auth/invalid-credential" });
    const giris = await mod.signInDeviceAccount(DETAY.email, "YeniParola42");
    expect(giris.email).toBe("efe@atlasia.app");
  }, 60_000);

  it("IndexedDB yoksa güvenli storage-unavailable reddi; oturum geri yükleme null döner", async () => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", undefined);
    vi.stubGlobal("sessionStorage", undefined);
    const mod = await import("./deviceAccounts");
    await expect(mod.registerDeviceAccount(DETAY)).rejects.toMatchObject({ code: "device/storage-unavailable" });
    expect(await mod.restoreDeviceSession()).toBeNull();
    vi.unstubAllGlobals();
  }, 30_000);
});
