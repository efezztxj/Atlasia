/**
 * Atlasia — Takip (İŞ 1d önkoşulu)
 *
 * Model (ücretsiz kota, Spark):
 * - `users/{uid}/following/{targetUid}` → { targetUid, targetName, since }
 *   Yazan: yalnız sahibi. Kendini takip edemez. Alanlar dar (kural hasOnly).
 * - Takipçi sayısı: `collectionGroup("following").where("targetUid","==",uid)`
 *   üzerinden `getCountFromServer()` — Spark planında toplama sorgusu vardır,
 *   belge okumaz.
 *
 * Arayüz YOK: bu modül yalnız veri katmanı ve sözleşmedir (İŞ 1d).
 * Kural tarafı `firestore.rules` içindeki `users/{uid}/following` bloğu;
 * liste kuralı `targetUid == request.auth.uid` kanıtı istediği için toplama
 * sorgusu **her zaman** where taşımak zorundadır (kural filtre değildir).
 */
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
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

export const FOLLOWING_LIMIT = 100;

export interface FollowRef {
  targetUid: string;
  targetName: string;
  since: number;
}

function toMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export function normalizeFollow(id: string, raw: DocumentData): FollowRef {
  return {
    targetUid: typeof raw.targetUid === "string" ? raw.targetUid : id,
    targetName: typeof raw.targetName === "string" ? raw.targetName : "",
    since: toMillis(raw.since),
  };
}

export function validateFollowInput(input: { uid: string; targetUid: string; targetName: string }): string | null {
  const uid = input.uid.trim();
  const targetUid = input.targetUid.trim();
  const targetName = input.targetName.trim();
  if (!uid) return "follow/uid-invalid";
  if (!targetUid) return "follow/target-invalid";
  // Kural da reddeder; istemci boşuna yazmasın diye burada da durur.
  if (uid === targetUid) return "follow/self";
  if (targetUid.length > 128) return "follow/target-invalid";
  if (targetName.length < 1 || targetName.length > 100) return "follow/name-invalid";
  return null;
}

function requireDb() {
  if (!db) throw Object.assign(new Error("Firestore hazır değil."), { code: "data/unavailable" });
  return db;
}

function dataError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

/** Takip et. Kendini takip etmek ve boş ad kural/istemci tarafında reddedilir. */
export async function followUser(input: { uid: string; targetUid: string; targetName: string }): Promise<void> {
  const firestore = requireDb();
  const invalid = validateFollowInput(input);
  if (invalid) throw dataError(invalid, "Takip bilgileri geçersiz.");
  const uid = input.uid.trim();
  const targetUid = input.targetUid.trim();
  await setDoc(
    doc(firestore, "users", uid, "following", targetUid),
    withoutUndefined({
      targetUid,
      targetName: input.targetName.trim(),
      since: serverTimestamp(),
    }),
  );
}

/** Takipten çık. Yalnız kendi listesinde çalışır. */
export async function unfollowUser(uid: string, targetUid: string): Promise<void> {
  const firestore = requireDb();
  const cleanUid = uid.trim();
  const cleanTarget = targetUid.trim();
  if (!cleanUid || !cleanTarget) throw dataError("follow/target-invalid", "Takip bilgileri geçersiz.");
  await deleteDoc(doc(firestore, "users", cleanUid, "following", cleanTarget));
}

/** Kendi takip listesi (en yeni önce, 100 kayıt tavanı — kural ile aynı). */
export function subscribeFollowing(
  uid: string,
  onChange: (items: FollowRef[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid.trim()) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collection(db, "users", uid.trim(), "following"),
    orderBy("since", "desc"),
    limit(FOLLOWING_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeFollow(item.id, item.data()))),
    onError,
  );
}

/**
 * Takipçi sayısı — collection-group `count()`.
 *
 * `where("targetUid","==",uid)` ZORUNLU: kural listeyi yalnız bu kanıtla açar.
 * Toplama sorgusu limit göndermez; bu yüzden kuralda boundedList yok (bkz.
 * firestore.rules → `match /{path=**}/following`).
 */
export async function countFollowers(uid: string): Promise<number> {
  const firestore = requireDb();
  const clean = uid.trim();
  if (!clean) return 0;
  const snapshot = await getCountFromServer(
    query(collectionGroup(firestore, "following"), where("targetUid", "==", clean)),
  );
  return snapshot.data().count;
}

/** Takip edilen kişi sayısı — kendi listesi üzerinden count(). */
export async function countFollowing(uid: string): Promise<number> {
  const firestore = requireDb();
  const clean = uid.trim();
  if (!clean) return 0;
  const snapshot = await getCountFromServer(collection(firestore, "users", clean, "following"));
  return snapshot.data().count;
}
