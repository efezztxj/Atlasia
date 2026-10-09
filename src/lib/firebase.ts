/**
 * Atlasia — Firebase bağlantı katmanı.
 * Firestore, Storage ve Auth instance'larını tek yerden dışa aktarır.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** Tüm config alanları doluysa Firebase hazır, yoksa cihaz-içi moda düşeriz. */
export const firebaseConfigured = Object.values(firebaseConfig).every(
  (v) => !!v && v.trim().length > 0,
);
/** Diğer modüllerden "cloud hazır mı" sorarken kısa ad. */
export const isCloudReady = firebaseConfigured;

let app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _auth: Auth | null = null;

if (firebaseConfigured) {
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  _db = getFirestore(app);
  _storage = getStorage(app);
  _auth = getAuth(app);
  _auth.languageCode = "tr";
}

export const firebaseApp = app;
export const db = _db;
export const storage = _storage;
export const auth = _auth;
