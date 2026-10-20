/**
 * Atlasia — Firebase çekirdek bağlantı katmanı.
 * Firestore uygulamayla birlikte hazırlanır; ağır Authentication SDK'sı ilk
 * kimlik doğrulama ihtiyacında auth.ts tarafından dinamik olarak yüklenir.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getFirestore, type Firestore } from "firebase/firestore";
import { appCheckConfig } from "./appCheckConfig";
import { installAppCheckDebugToken } from "./appCheckDebug";

// Firebase web kimlikleri gizli değildir. Proje yönetim API'sinden doğrulanan
// değerleri burada sabitlemek, eski Cloudflare ortam değişkenlerinin App Check'i
// yanlış uygulama kimliğiyle başlatmasını engeller.
const ATLASIA_MESSAGING_SENDER_ID = "21255827476";
const ATLASIA_FIREBASE_APP_ID = "1:21255827476:web:318093fd0d09738b3b7701";
const ATLASIA_APP_CHECK_CONFIG = appCheckConfig();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: ATLASIA_MESSAGING_SENDER_ID,
  appId: ATLASIA_FIREBASE_APP_ID,
};

/** Auth ve Firestore alanları doluysa Firebase hazır; Storage zorunlu değildir. */
export const firebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
].every((v) => !!v && v.trim().length > 0);
/** Diğer modüllerden "cloud hazır mı" sorarken kısa ad. */
export const isCloudReady = firebaseConfigured;

/** Debug için env değerlerini özet olarak döndürür. */
export const firebaseConfigSummary = {
  apiKey: !!firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain || "(missing)",
  projectId: firebaseConfig.projectId || "(missing)",
  messagingSenderId: !!firebaseConfig.messagingSenderId,
  appId: !!firebaseConfig.appId,
};

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
