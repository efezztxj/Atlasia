/**
 * Atlasia — Firebase yapılandırma kapısı (SDK'sız).
 *
 * NEDEN AYRI: `lib/firebase.ts` Firebase SDK'sını (app + firestore + app-check)
 * modül yüklenirken başlatır; yani onu import eden her modül ~150 KB gzip
 * `firebase-vendor` parçasını da çeker. Landing ve oturum kabuğunun yalnız
 * "bulut yapılandırıldı mı" sorusuna ihtiyacı var. Bu dosya yalnız ortam
 * değişkenlerini okur, hiçbir SDK import etmez; böylece ilk yükleme grafiği
 * Firebase'siz kalır (bkz. docs/teslimatlar/teslimat-t7-t11-t12-2026-10-28.md).
 */

// Firebase web kimlikleri gizli değildir. Proje yönetim API'sinden doğrulanan
// değerleri burada sabitlemek, eski Cloudflare ortam değişkenlerinin App Check'i
// yanlış uygulama kimliğiyle başlatmasını engeller.
const ATLASIA_MESSAGING_SENDER_ID = "21255827476";
const ATLASIA_FIREBASE_APP_ID = "1:21255827476:web:318093fd0d09738b3b7701";

export const firebaseConfig = {
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
