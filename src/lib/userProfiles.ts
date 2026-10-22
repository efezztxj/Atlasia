/**
 * Atlasia — Kullanici profilleri (arkadas arama icin public dizin)
 *
 * C4: sadece displayName ve photoURL okunur/yazilir, baska alan yok.
 * Karar: yalniz Firestore, ucretsiz kota. Her kullanici kendi profilini yazar;
 * digerleri 20 kayitla sinirli arama yapar.
 */
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { withoutUndefined } from "./firestoreValue";
import {
  isSearchableQuery,
  legacyDisplayNamePrefixes,
  rankProfiles,
  turkishLower,
} from "./profileSearch";

export const USER_PROFILES_LIMIT = 20;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 40;

/**
 * Kuraldaki `displayNameLower` biçim denetiminin istemci aynası
 * (firestore.rules → validUserProfileShape). Küme dışındaki karakter
 * (nokta, kesme işareti, alt çizgi, é gibi) taşıyan adların arama anahtarı
 * kuralla yazılamaz; istemci bunu yazmadan ÖNCE kodlu hatayla söyler —
 * yarıda kalmış sil+yaz ile profil kaybetme yolu kapalıdır.
 */
export const DISPLAY_NAME_LOWER_PATTERN = /^[a-z0-9 ığüşöçâîû-]+$/;

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

/** Ad arama dizinine yazılabilir mi? (Türkçe küçük harfi kural kümesinde mi) */
export function profileNameIndexable(displayName: string): boolean {
  const lower = turkishLower(displayName.trim().slice(0, DISPLAY_NAME_MAX));
  return lower.length >= DISPLAY_NAME_MIN && DISPLAY_NAME_LOWER_PATTERN.test(lower);
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
      : turkishLower(displayName),
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
 * Profili arama dizinine yazar. Kurallar oluşturma/güncelleme ayrımını
 * yapar: oluşturmada iki damga da sunucu zamanı, güncellemede `createdAt`
 * değişmez. Bu yüzden var olan belge `updateDoc` ile (silmeden) güncellenir;
 * ad/foto/anahtar değişmediyse hiç yazılmaz (gereksiz kota yok).
 */
export async function syncUserProfile(input: { uid: string; displayName: string; photoURL?: string }): Promise<"created" | "updated" | "unchanged"> {
  if (!db) return "unchanged";
  const uid = input.uid.trim();
  if (!uid) throw dataError("profile/uid-invalid", "Kullanici kimligi gecersiz.");
  const invalid = validateDisplayName(input.displayName);
  if (invalid) throw dataError(invalid, "Profil adi 2-40 karakter olmali.");
  const displayName = input.displayName.trim().slice(0, DISPLAY_NAME_MAX);
  const displayNameLower = turkishLower(displayName);
  if (!DISPLAY_NAME_LOWER_PATTERN.test(displayNameLower)) {
    throw dataError("profile/name-not-indexable", "Bu ad arama dizinine yazilamaz (desteklenmeyen karakter).");
  }
  const photo = input.photoURL?.trim();
  const photoURL = photo && /^https?:\/\//.test(photo) && photo.length <= 500 ? photo : undefined;
  const ref = doc(db, "userProfiles", uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const current = existing.data();
    const currentPhoto = typeof current.photoURL === "string" ? current.photoURL : undefined;
    // Geçiş: alan yoksa belge bir kez güncellenir; aksi hâlde eski belge
    // sonsuza dek kural dışı (displayNameLower'sız) kalırdı.
    if (current.displayName === displayName && current.displayNameLower === displayNameLower && currentPhoto === photoURL) return "unchanged";
    const updates: Record<string, unknown> = {
      displayName,
      displayNameLower,
      updatedAt: serverTimestamp(),
    };
    if (photoURL !== undefined) updates.photoURL = photoURL;
    else if (currentPhoto !== undefined) updates.photoURL = deleteField();
    await updateDoc(ref, updates);
    return "updated";
  }
  await setDoc(ref, withoutUndefined({
    uid,
    displayName,
    displayNameLower,
    photoURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return "created";
}

/**
 * Arama öneki: Türkçe küçük harfe indirgenmiş tek değer (İrem → irem).
 * Patch 7'deki "ilk harfi büyüt" hack'i kaldırıldı; alan artık normalize.
 */
export function profilePrefixes(text: string): string[] {
  const clean = text.trim().slice(0, DISPLAY_NAME_MAX);
  if (!clean) return [];
  return [turkishLower(clean)];
}

function rangeQuery(firestore: NonNullable<typeof db>, field: "displayNameLower" | "displayName", prefix: string) {
  return query(
    collection(firestore, "userProfiles"),
    orderBy(field),
    where(field, ">=", prefix),
    where(field, "<", `${prefix}\uf8ff`),
    limit(USER_PROFILES_LIMIT),
  );
}

/**
 * İsimle tek seferlik arama (en çok 20 sonuç, kendisi ve adsızlar hariç).
 * Birincil yol `displayNameLower` önek aralığıdır. Sonuç 20'den azsa,
 * alanı olmayan eski belgeler için `displayName` üzerinden sınırlı bir geri
 * dönüş taraması yapılır; her aday yine önek doğrulamasından geçer
 * (bkz. rankProfiles — kelime içi arama yoktur).
 */
export async function searchUserProfiles(text: string, excludeUid: string): Promise<UserProfile[]> {
  if (!db) return [];
  if (!isSearchableQuery(text)) return [];
  const firestore = db;
  const prefix = profilePrefixes(text)[0];
  const snap = await getDocs(rangeQuery(firestore, "displayNameLower", prefix));
  const candidates = snap.docs.map((item) => normalizeUserProfile(item.id, item.data()));
  if (candidates.length < USER_PROFILES_LIMIT) {
    const seen = new Set(candidates.map((profile) => profile.uid));
    for (const legacyPrefix of legacyDisplayNamePrefixes(text)) {
      if (candidates.length >= USER_PROFILES_LIMIT) break;
      const legacySnap = await getDocs(rangeQuery(firestore, "displayName", legacyPrefix));
      for (const item of legacySnap.docs) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        candidates.push(normalizeUserProfile(item.id, item.data()));
      }
    }
  }
  return rankProfiles(candidates, text, { excludeUid, limit: USER_PROFILES_LIMIT });
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
  const start = turkishLower(clean);
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

/**
 * Eldeki listede önek araması. Eskiden kelime içi (`includes`) eşleşme
 * yapıyordu; arama sözleşmesi artık her yerde önek-only (rankProfiles).
 */
export function searchProfilesLocal(profiles: UserProfile[], queryText: string): UserProfile[] {
  return rankProfiles(profiles, queryText, { limit: USER_PROFILES_LIMIT });
}
