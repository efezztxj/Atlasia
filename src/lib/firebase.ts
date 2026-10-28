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

if (firebaseConfigured) {
  try {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    if (typeof window !== "undefined") {
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
    _db = getFirestore(app);
  } catch (error) {
    // Firebase init başarısız olursa fallback'e düş.
    console.error("[Atlasia] Firebase init başarısız:", error);
    app = null;
    _db = null;
  }
}

export const firebaseApp = app;
export const db = _db;
