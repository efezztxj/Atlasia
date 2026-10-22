/**
 * Atlasia — Kullanici profilleri (arkadas arama icin public dizin)
 *
 * C4: sadece displayName ve photoURL okunur/yazilir, baska alan yok.
 * Karar: yalniz Firestore, ucretsiz kota. Her kullanici kendi profilini yazar;
 * digerleri 20 kayitla sinirli arama yapar.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
  /** Arama anahtarı: displayName'in Türkçe küçük harfi (kural zorunlu tutar). */
  displayNameLower: string;
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
  const displayName = typeof raw.displayName === "string" ? raw.displayName : "Gezgin";
  return {
    uid,
    displayName,
    // Geçiş: eski belgelerde alan yok; okuma tarafında türetilir, yazma tarafı
    // syncUserProfile'ın ilk oturumunda alanı kalıcılaştırır.
    displayNameLower: typeof raw.displayNameLower === "string"
      ? raw.displayNameLower
      : displayName.toLocaleLowerCase("tr"),
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

/**
 * Profili arama dizinine yazar. Kural `createdAt == request.time` istediği için
 * var olan belge güncellenemez; ad/foto değiştiyse belge silinip yeniden
 * yazılır, değişmediyse hiç yazılmaz (gereksiz kota yok).
 */
export async function syncUserProfile(input: { uid: string; displayName: string; photoURL?: string }): Promise<"created" | "replaced" | "unchanged"> {
  if (!db) return "unchanged";
  const uid = input.uid.trim();
  if (!uid) throw dataError("profile/uid-invalid", "Kullanici kimligi gecersiz.");
  const invalid = validateDisplayName(input.displayName);
  if (invalid) throw dataError(invalid, "Profil adi 2-40 karakter olmali.");
  const displayName = input.displayName.trim().slice(0, DISPLAY_NAME_MAX);
  const displayNameLower = displayName.toLocaleLowerCase("tr");
  const photo = input.photoURL?.trim();
  const photoURL = photo && /^https?:\/\//.test(photo) && photo.length <= 500 ? photo : undefined;
  const ref = doc(db, "userProfiles", uid);
  const existing = await getDoc(ref);
  const existed = existing.exists();
  if (existed) {
    const current = existing.data();
    const samePhoto = (typeof current.photoURL === "string" ? current.photoURL : undefined) === photoURL;
    // Geçiş: alan yoksa belge bir kez yeniden yazılır; aksi hâlde eski belge
    // sonsuza dek kural dışı (displayNameLower'sız) kalırdı.
    const sameLower = current.displayNameLower === displayNameLower;
    if (current.displayName === displayName && samePhoto && sameLower) return "unchanged";
    await deleteDoc(ref);
  }
  await setDoc(ref, withoutUndefined({
    uid,
    displayName,
    displayNameLower,
    photoURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return existed ? "replaced" : "created";
}

/**
 * Arama öneki: Türkçe küçük harfe indirgenmiş tek değer (İrem → irem).
 * Patch 7'deki "ilk harfi büyüt" hack'i kaldırıldı; alan artık normalize.
 */
export function profilePrefixes(text: string): string[] {
  const clean = text.trim().slice(0, DISPLAY_NAME_MAX);
  if (!clean) return [];
  return [clean.toLocaleLowerCase("tr")];
}

/** İsimle tek seferlik arama (en çok 20 sonuç, kendisi hariç). */
export async function searchUserProfiles(text: string, excludeUid: string): Promise<UserProfile[]> {
  if (!db) return [];
  const prefixes = profilePrefixes(text);
  if (prefixes.length === 0) return [];
  const prefix = prefixes[0];
  const firestore = db;
  const snap = await getDocs(query(
    collection(firestore, "userProfiles"),
    orderBy("displayNameLower"),
    where("displayNameLower", ">=", prefix),
    where("displayNameLower", "<", `${prefix}\uf8ff`),
    limit(USER_PROFILES_LIMIT),
  ));
  return snap.docs
    .filter((item) => item.id !== excludeUid)
    .map((item) => normalizeUserProfile(item.id, item.data()))
    .slice(0, USER_PROFILES_LIMIT);
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
  const start = clean.toLocaleLowerCase("tr");
  const end = `${start}\uf8ff`;
  const q = query(
    collection(db, "userProfiles"),
    orderBy("displayNameLower"),
    where("displayNameLower", ">=", start),
    where("displayNameLower", "<", end),
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
