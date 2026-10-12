/**
 * Atlasia — Firebase bağlantı katmanı.
 * Firestore ve Auth instance'larını tek yerden dışa aktarır.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
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
let _auth: Auth | null = null;

if (firebaseConfigured) {
  try {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    _db = getFirestore(app);
    _auth = getAuth(app);
    _auth.languageCode = "tr";
  } catch (e) {
    // Firebase init başarısız olursa fallback'e düş
    console.error("[Atlasia] Firebase init başarısız:", e);
    app = null;
    _db = null;
    _auth = null;
  }
}

export const firebaseApp = app;
export const db = _db;
export const auth = _auth;
