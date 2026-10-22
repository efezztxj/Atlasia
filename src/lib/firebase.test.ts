import { describe, expect, it, vi } from "vitest";

// P16 2. tur: firebase.ts env kapısının karakterizasyonu. resetModules +
// stubEnv ile modül her senaryoda baştan yüklenir; böylece yerel .env.local
// ya da CI env değerleri sonucu etkilemez.

const ANAHTARLAR = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID"] as const;

async function yukle(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const k of ANAHTARLAR) vi.stubEnv(k, env[k]);
  const mod = await import("./firebase");
  vi.unstubAllEnvs();
  return mod;
}

describe("firebase env kapısı", () => {
  it("eksik env → configured=false, app/db null, summary eksikleri gösterir", async () => {
    const mod = await yukle({});
    expect(mod.firebaseConfigured).toBe(false);
    expect(mod.isCloudReady).toBe(false);
    expect(mod.firebaseApp).toBeNull();
    expect(mod.db).toBeNull();
    expect(mod.firebaseConfigSummary).toMatchObject({
      apiKey: false,
      authDomain: "(missing)",
      projectId: "(missing)",
      messagingSenderId: true, // sabit gömülü değer
      appId: true,
    });
  });

  it("yarım env (yalnız apiKey) hazır sayılmaz", async () => {
    const mod = await yukle({ VITE_FIREBASE_API_KEY: "x" });
    expect(mod.firebaseConfigured).toBe(false);
    expect(mod.db).toBeNull();
  });

  it("tam env → configured=true ve Firestore örneği kurulur (window gerekmez)", async () => {
    const mod = await yukle({
      VITE_FIREBASE_API_KEY: "test-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia-test.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "atlasia-test-projesi",
    });
    expect(mod.firebaseConfigured).toBe(true);
    expect(mod.isCloudReady).toBe(true);
    expect(mod.firebaseApp).not.toBeNull();
    expect(mod.db).not.toBeNull();
    expect(mod.firebaseConfigSummary.projectId).toBe("atlasia-test-projesi");
  });
});
