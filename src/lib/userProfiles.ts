/**
 * Atlasia — Kullanici profilleri (arkadas arama icin public dizin)
 *
 * C4: sadece displayName ve photoURL okunur/yazilir, baska alan yok.
 * Karar: yalniz Firestore, ucretsiz kota. Her kullanici kendi profilini yazar;
 * digerleri 20 kayitla sinirli arama yapar.
 */
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { withoutUndefined } from "./firestoreValue";

export const USER_PROFILES_LIMIT = 20;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 40;

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;
  updatedAt: number;
}

function toMillis(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function dataError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

export function validateDisplayName(name: string): string | null {
  const clean = name.trim();
  if (clean.length < DISPLAY_NAME_MIN) return "profile/name-too-short";
  if (clean.length > DISPLAY_NAME_MAX) return "profile/name-too-long";
  return null;
}

export function normalizeUserProfile(uid: string, raw: DocumentData): UserProfile {
  return {
    uid,
    displayName: typeof raw.displayName === "string" ? raw.displayName : "Gezgin",
    photoURL: typeof raw.photoURL === "string" ? raw.photoURL : undefined,
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const clean = uid.trim();
  if (!clean) return null;
  const snap = await getDoc(doc(db, "userProfiles", clean));
  if (!snap.exists()) return null;
  return normalizeUserProfile(snap.id, snap.data());
}

export async function syncUserProfile(input: { uid: string; displayName: string; photoURL?: string }): Promise<void> {
  if (!db) return;
  const uid = input.uid.trim();
  if (!uid) throw dataError("profile/uid-invalid", "Kullanici kimligi gecersiz.");
  const invalid = validateDisplayName(input.displayName);
  if (invalid) throw dataError(invalid, "Profil adi 2-40 karakter olmali.");
  const displayName = input.displayName.trim().slice(0, DISPLAY_NAME_MAX);
  const payload: Record<string, unknown> = {
    uid,
    displayName,
    updatedAt: serverTimestamp(),
  };
  if (input.photoURL?.trim()) payload.photoURL = input.photoURL.trim().slice(0, 500);
  const existing = await getDoc(doc(db, "userProfiles", uid));
  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
  } else {
    payload.createdAt = existing.data().createdAt ?? serverTimestamp();
  }
  await setDoc(doc(db, "userProfiles", uid), withoutUndefined(payload), { merge: true });
}

export function subscribeUserProfiles(
  prefix: string,
  onChange: (profiles: UserProfile[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const clean = prefix.trim();
  if (!db || clean.length < 1) {
    onChange([]);
    return () => {};
  }
  const start = clean;
  const end = `${clean}\uf8ff`;
  const q = query(
    collection(db, "userProfiles"),
    orderBy("displayName"),
    where("displayName", ">=", start),
    where("displayName", "<", end),
    limit(USER_PROFILES_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeUserProfile(item.id, item.data()))),
    onError,
  );
}

export function searchProfilesLocal(profiles: UserProfile[], queryText: string): UserProfile[] {
  const needle = queryText.trim().toLocaleLowerCase("tr");
  if (!needle) return [];
  return profiles.filter((profile) => profile.displayName.toLocaleLowerCase("tr").includes(needle)).slice(0, USER_PROFILES_LIMIT);
}
