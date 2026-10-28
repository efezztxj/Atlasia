/**
 * Atlasia — Firebase çekirdek bağlantı katmanı (SDK girişi).
 *
 * Bu modül Firebase SDK'sını başlatan TEK yerdir; bu yüzden yalnız gerçekten
 * bulut gerekince (giriş, Firestore) dinamik olarak yüklenmelidir. Yapılandırma
 * kapısı `firebaseConfig.ts` içinde SDK'sız durur; oradan import edin.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getFirestore, type Firestore } from "firebase/firestore";
import { appCheckConfig } from "./appCheckConfig";
import { installAppCheckDebugToken } from "./appCheckDebug";
import { firebaseConfig, firebaseConfigured } from "./firebaseConfig";

export { firebaseConfigured, firebaseConfigSummary, isCloudReady } from "./firebaseConfig";

const ATLASIA_APP_CHECK_CONFIG = appCheckConfig();

let app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let appCheckStarted = false;

if (firebaseConfigured) {
  try {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    _db = getFirestore(app);
  } catch (error) {
    // Firebase init başarısız olursa fallback'e düş.
    console.error("[Atlasia] Firebase init başarısız:", error);
    app = null;
    _db = null;
  }
}

/**
 * App Check'i başlatır.
 *
 * NEDEN MODÜL TEPESİNDE DEĞİL (2026-10-28): `initializeAppCheck`
 * ReCaptchaEnterpriseProvider'ı kurunca reCAPTCHA Enterprise betiği (~350 KB)
 * ve Google iframe'i indirilir, üstelik `_GRECAPTCHA` çerezi onaydan önce
 * yazılır. Bu yalnız Firestore/Storage çağrıları için gerekir; landing'de
 * çağrı yoktur. Bu yüzden App Check, uygulama kabuğu (Explorer) veya hesap
 * akışı (AccountAccess) yüklendiğinde bir kez başlatılır.
 * Kilit: src/config/appCheckLazy.test.ts
 */
export function startAppCheck(): void {
  if (appCheckStarted || !app || typeof window === "undefined") return;
  appCheckStarted = true;
  try {
    // Yalnız yerel geliştirme: Firebase konsolunda kayıtlı debug token'ı varsa
    // App Check atlaması için SDK'ya sun. Üretim derlemesinde bu dal yoktur.
    if (import.meta.env.DEV) {
      installAppCheckDebugToken(import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined);
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(ATLASIA_APP_CHECK_CONFIG.siteKey),
      isTokenAutoRefreshEnabled: ATLASIA_APP_CHECK_CONFIG.isTokenAutoRefreshEnabled,
    });
  } catch (appCheckError) {
    // App Check henüz zorunlu tutulmadığı için doğrulama başlatılamasa bile
    // kullanıcı girişi ve Firestore güvenlik kuralları çalışmaya devam eder.
    console.error("[Atlasia] App Check başlatılamadı:", appCheckError);
  }
}

export const firebaseApp = app;
export const db = _db;
