/**
 * Atlasia — Takip listesi (rozet/takip özelliğinin kural + istemci önkoşulu)
 *
 * Veri modeli: users/{uid}/following/{targetUid}
 * - Yazan/silen/okuyan yalnız listenin sahibi (kurallar `uid == request.auth.uid`).
 * - Kendini takip yok; kayıt güncellenemez, takipten çıkma belgeyi siler.
 * - "Takipçiler" yolu bilinçli olarak yok: birinin kimi takip ettiğinin
 *   listesi yalnız sahibine açık kalır.
 *
 * Arayüz bu modüle henüz bağlı değil; önce kural ve sözleşme kilitlenir.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { withoutUndefined } from "./firestoreValue";

/** Kuraldaki `boundedList(100)` ile birebir aynı tavan. */
export const FOLLOWING_LIMIT = 100;
const UID_MAX = 128;

export interface FollowRecord {
  followerUid: string;
  targetUid: string;
  createdAt: number;
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

/** Takip çiftini kural sınırlarıyla doğrular; geçersizse kodlu hata fırlatır. */
export function validateFollowPair(uid: string, targetUid: string): { followerUid: string; targetUid: string } {
  const followerUid = uid.trim();
  const cleanTarget = targetUid.trim();
  if (!followerUid || followerUid.length > UID_MAX || !cleanTarget || cleanTarget.length > UID_MAX) {
    throw dataError("follow/uid-invalid", "Kullanıcı kimliği geçersiz.");
  }
  if (followerUid === cleanTarget) throw dataError("follow/self", "Kendini takip edemezsin.");
  return { followerUid, targetUid: cleanTarget };
}

export function normalizeFollow(targetUid: string, raw: DocumentData): FollowRecord {
  return {
    followerUid: typeof raw.followerUid === "string" ? raw.followerUid : "",
    targetUid: typeof raw.targetUid === "string" ? raw.targetUid : targetUid,
    createdAt: toMillis(raw.createdAt),
  };
}

export async function followUser(uid: string, targetUid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const pair = validateFollowPair(uid, targetUid);
  await setDoc(
    doc(db, `users/${pair.followerUid}/following/${pair.targetUid}`),
    withoutUndefined({
      followerUid: pair.followerUid,
      targetUid: pair.targetUid,
      createdAt: serverTimestamp(),
    }),
  );
}

export async function unfollowUser(uid: string, targetUid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const pair = validateFollowPair(uid, targetUid);
  await deleteDoc(doc(db, `users/${pair.followerUid}/following/${pair.targetUid}`));
}

/** Kendi takip listen (en yeni 100). Kurallar başkasının listesini okutmaz. */
export async function fetchFollowing(uid: string): Promise<FollowRecord[]> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const clean = uid.trim();
  if (!clean) throw dataError("follow/uid-invalid", "Kullanıcı kimliği geçersiz.");
  const snap = await getDocs(query(
    collection(db, `users/${clean}/following`),
    orderBy("createdAt", "desc"),
    limit(FOLLOWING_LIMIT),
  ));
  return snap.docs.map((item) => normalizeFollow(item.id, item.data()));
}

export function subscribeFollowing(
  uid: string,
  onChange: (items: FollowRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const clean = uid.trim();
  if (!db || !clean) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collection(db, `users/${clean}/following`),
    orderBy("createdAt", "desc"),
    limit(FOLLOWING_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeFollow(item.id, item.data()))),
    onError,
  );
}
