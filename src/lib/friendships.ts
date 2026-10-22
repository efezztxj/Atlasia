/**
 * Atlasia — Arkadaslik / istek-kabul modeli (T1-C1 duzeltmesi)
 *
 * Tasarim (ucretsiz kota, Blaze yok):
 * - Bekleyen istekler: users/{recipientUid}/friendRequests/{requesterUid}
 *   Yazan: istek gonderen (fromUid==auth.uid)
 *   Okuyan/listeleyen/silen: alici (uid==auth.uid) + gonderen de silebilir (iptal)
 * - Kabul edilen arkadaslik: friendships/{sortedUidA_sortedUidB}
 *   Yazan: alici (kabul eden) — yalniz bekleyen istek varken, ayni batch'te istek silinir
 *   Okuyan: users icinde olan
 * - Arkadas indeksi: users/{uid}/friends/{friendUid}
 *   Yazan: yalniz kendi listesine, gecerli friendship varsa
 *
 * C1: friendships create yalniz karsi tarafin bekleyen friendRequest'i varken (batch getAfter)
 * C3: .catch(() => {}) yok — hatalar gorunur
 * IO: withoutUndefined ile undefined alanlar ayiklanir, ic ice dizi yazilmaz
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { isPermissionDenied, withoutUndefined } from "./firestoreValue";
import { createNotification } from "./notifications";

export const FRIEND_REQUESTS_LIMIT = 50;
export const FRIENDS_LIMIT = 100;
export const FRIENDSHIPS_LIMIT = 50;

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  createdAt: number;
}

export interface Friendship {
  id: string;
  users: [string, string];
  requesterUid: string;
  recipientUid: string;
  status: "accepted";
  createdAt: number;
  updatedAt: number;
}

export interface FriendIndex {
  friendUid: string;
  friendName: string;
  since: number;
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

export function friendshipIdFor(uidA: string, uidB: string): string {
  const a = uidA.trim();
  const b = uidB.trim();
  if (!a || !b) throw dataError("friendship/uid-invalid", "Kullanici kimligi gecersiz.");
  if (a === b) throw dataError("friendship/self", "Kendine arkadaslik istegi gonderemezsin.");
  const sorted = [a, b].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

export function normalizeFriendRequest(id: string, raw: DocumentData): FriendRequest {
  return {
    id,
    fromUid: typeof raw.fromUid === "string" ? raw.fromUid : id,
    fromName: typeof raw.fromName === "string" ? raw.fromName : "Gezgin",
    toUid: typeof raw.toUid === "string" ? raw.toUid : "",
    createdAt: toMillis(raw.createdAt),
  };
}

export function normalizeFriendship(id: string, raw: DocumentData): Friendship {
  const users = Array.isArray(raw.users) ? (raw.users as string[]) : [];
  const sorted = [...users].sort() as [string, string];
  return {
    id,
    users: sorted.length === 2 ? sorted : [users[0] ?? "", users[1] ?? ""] as [string, string],
    requesterUid: typeof raw.requesterUid === "string" ? raw.requesterUid : sorted[0] ?? "",
    recipientUid: typeof raw.recipientUid === "string" ? raw.recipientUid : sorted[1] ?? "",
    status: "accepted",
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}

export function normalizeFriendIndex(raw: DocumentData): FriendIndex {
  return {
    friendUid: typeof raw.friendUid === "string" ? raw.friendUid : "",
    friendName: typeof raw.friendName === "string" ? raw.friendName : "Gezgin",
    since: toMillis(raw.since),
  };
}

export function subscribeFriendRequests(
  recipientUid: string,
  onChange: (requests: FriendRequest[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !recipientUid.trim()) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collection(db, `users/${recipientUid}/friendRequests`),
    orderBy("createdAt", "desc"),
    limit(FRIEND_REQUESTS_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeFriendRequest(item.id, item.data()))),
    onError,
  );
}

export function subscribeFriends(
  uid: string,
  onChange: (friends: FriendIndex[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid.trim()) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(db, `users/${uid}/friends`), orderBy("since", "desc"), limit(FRIENDS_LIMIT));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeFriendIndex(item.data()))),
    onError,
  );
}

export async function sendFriendRequest(input: { fromUid: string; fromName: string; toUid: string }): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const fromUid = input.fromUid.trim();
  const toUid = input.toUid.trim();
  if (!fromUid || !toUid) throw dataError("friend-request/uid-invalid", "Kullanici kimligi gecersiz.");
  if (fromUid === toUid) throw dataError("friend-request/self", "Kendine istek gonderemezsin.");
  const fromName = input.fromName.trim().slice(0, 40) || "Gezgin";
  // Kural: başkasının istek kutusu ve var olmayan arkadaşlık belgesi okunamaz
  // (get reddedilir). Bu yüzden yalnız KENDİ belgelerimize bakılır; "zaten
  // istek gönderdin / zaten arkadaşsınız" koşullarını kural create'te zorlar.
  const ownIndex = await getDoc(doc(db, `users/${fromUid}/friends/${toUid}`));
  if (ownIndex.exists()) throw dataError("friend-request/already-friends", "Zaten arkadassiniz.");
  const opposite = await getDoc(doc(db, `users/${fromUid}/friendRequests/${toUid}`));
  if (opposite.exists()) throw dataError("friend-request/opposite-exists", "Karsi taraf zaten sana istek gondermis; onun isteğini kabul et.");
  const ref = doc(db, `users/${toUid}/friendRequests/${fromUid}`);
  try {
    await setDoc(
      ref,
      withoutUndefined({
        fromUid,
        fromName,
        toUid,
        createdAt: serverTimestamp(),
      }),
    );
  } catch (failure) {
    // Var olan istek üzerine yazmak update sayılır (kapalı); arkadaşlık varsa create reddedilir.
    if (isPermissionDenied(failure)) throw dataError("friend-request/exists", "Bu kisiye zaten istek gondermis olabilirsin ya da zaten arkadassiniz.");
    throw failure;
  }
  try {
    await createNotification({
      recipientUid: toUid,
      actorUid: fromUid,
      type: "friend_request",
      title: "Arkadaslik istegi",
      body: `${fromName} seni arkadas olarak eklemek istiyor.`,
      targetId: fromUid,
    });
  } catch (error) {
    console.warn("[Atlasia] Arkadaslik istegi bildirimi yazilamadi:", error);
  }
}

export async function cancelFriendRequest(fromUid: string, toUid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const cleanFrom = fromUid.trim();
  const cleanTo = toUid.trim();
  if (!cleanFrom || !cleanTo) throw dataError("friend-request/uid-invalid", "Kullanici kimligi gecersiz.");
  await deleteDoc(doc(db, `users/${cleanTo}/friendRequests/${cleanFrom}`));
}

export async function declineFriendRequest(recipientUid: string, requesterUid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const cleanRecipient = recipientUid.trim();
  const cleanRequester = requesterUid.trim();
  if (!cleanRecipient || !cleanRequester) throw dataError("friend-request/uid-invalid", "Kullanici kimligi gecersiz.");
  await deleteDoc(doc(db, `users/${cleanRecipient}/friendRequests/${cleanRequester}`));
  try {
    await createNotification({
      recipientUid: cleanRequester,
      actorUid: cleanRecipient,
      type: "friend_declined",
      title: "Istek reddedildi",
      body: "Arkadaslik istegin reddedildi.",
      targetId: cleanRecipient,
    });
  } catch (error) {
    console.warn("[Atlasia] Red bildirimi yazilamadi:", error);
  }
}

async function writeFriendIndex(ownerUid: string, friendUid: string, friendName: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const cleanOwner = ownerUid.trim();
  const cleanFriend = friendUid.trim();
  if (!cleanOwner || !cleanFriend) throw dataError("friend-index/uid-invalid", "Kullanici kimligi gecersiz.");
  await setDoc(
    doc(db, `users/${cleanOwner}/friends/${cleanFriend}`),
    withoutUndefined({
      friendUid: cleanFriend,
      friendName: friendName.trim().slice(0, 40) || "Gezgin",
      since: serverTimestamp(),
    }),
  );
}

export async function acceptFriendRequest(recipientUid: string, requesterUid: string, recipientName: string): Promise<Friendship> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const cleanRecipient = recipientUid.trim();
  const cleanRequester = requesterUid.trim();
  if (!cleanRecipient || !cleanRequester) throw dataError("friend-request/uid-invalid", "Kullanici kimligi gecersiz.");
  const fid = friendshipIdFor(cleanRequester, cleanRecipient);
  const requestRef = doc(db, `users/${cleanRecipient}/friendRequests/${cleanRequester}`);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) throw dataError("friend-request/not-found", "Bekleyen arkadaslik istegi bulunamadi.");
  const fromName = (requestSnap.data().fromName as string) ?? "Gezgin";
  const batch = writeBatch(db);
  const friendshipRef = doc(db, `friendships/${fid}`);
  batch.set(
    friendshipRef,
    withoutUndefined({
      users: [cleanRequester, cleanRecipient].sort(),
      requesterUid: cleanRequester,
      recipientUid: cleanRecipient,
      status: "accepted",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  batch.delete(requestRef);
  await batch.commit();
  await writeFriendIndex(cleanRecipient, cleanRequester, fromName);
  // İstek sahibinin listesine yazmak kuralca yasak (yalnız kendi listesi). O
  // taraf "friend_accepted" bildirimini görünce ensureFriendIndex ile kendisi yazar.
  try {
    await createNotification({
      recipientUid: cleanRequester,
      actorUid: cleanRecipient,
      type: "friend_accepted",
      title: "Istek kabul edildi",
      body: `${recipientName.trim().slice(0, 40) || "Gezgin"} arkadaslik isteğini kabul etti.`,
      targetId: cleanRecipient,
    });
  } catch (error) {
    console.warn("[Atlasia] Kabul bildirimi yazilamadi:", error);
  }
  return {
    id: fid,
    users: [cleanRequester, cleanRecipient].sort() as [string, string],
    requesterUid: cleanRequester,
    recipientUid: cleanRecipient,
    status: "accepted",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Kendi arkadaş listende eksik olan kabul edilmiş arkadaşlığı tamamlar
 * (istek sahibi tarafı). Arkadaşlık yoksa ya da okunamıyorsa false döner.
 */
export async function ensureFriendIndex(uid: string, friendUid: string, friendName: string): Promise<boolean> {
  if (!db) return false;
  const cleanUid = uid.trim();
  const cleanFriend = friendUid.trim();
  if (!cleanUid || !cleanFriend || cleanUid === cleanFriend) return false;
  const own = await getDoc(doc(db, `users/${cleanUid}/friends/${cleanFriend}`));
  if (own.exists()) return false;
  let friendship: Friendship | null = null;
  try {
    friendship = await fetchFriendship(cleanUid, cleanFriend);
  } catch {
    return false;
  }
  if (!friendship || !friendship.users.includes(cleanUid) || !friendship.users.includes(cleanFriend)) return false;
  await writeFriendIndex(cleanUid, cleanFriend, friendName);
  return true;
}

export async function removeFriend(uid: string, friendUid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const cleanUid = uid.trim();
  const cleanFriend = friendUid.trim();
  if (!cleanUid || !cleanFriend) throw dataError("friendship/uid-invalid", "Kullanici kimligi gecersiz.");
  const fid = friendshipIdFor(cleanUid, cleanFriend);
  const friendshipRef = doc(db, `friendships/${fid}`);
  const snap = await getDoc(friendshipRef);
  if (!snap.exists()) throw dataError("friendship/not-found", "Arkadaslik bulunamadi.");
  const data = snap.data() as { users?: string[] };
  if (!data.users || !data.users.includes(cleanUid) || !data.users.includes(cleanFriend)) {
    throw dataError("friendship/not-member", "Bu arkadasligin parcasi degilsin.");
  }
  // C3: hatalar yutulmaz — silme reddedilirse hata yuzeye cikar, "silindi" sanilmaz
  await deleteDoc(doc(db, `users/${cleanUid}/friends/${cleanFriend}`));
  await deleteDoc(friendshipRef);
  try {
    await deleteDoc(doc(db, `users/${cleanFriend}/friends/${cleanUid}`));
  } catch (error) {
    console.warn("[Atlasia] Karsi taraf arkadas indeksi silinemedi (yetki yoksa normal):", error);
    // Karsi taraf indeksi silinemezse bile kendi tarafin silindi, hata yuzeye cikmaz ama loglanir
  }
}

export async function fetchFriendship(uidA: string, uidB: string): Promise<Friendship | null> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const fid = friendshipIdFor(uidA, uidB);
  const snap = await getDoc(doc(db, `friendships/${fid}`));
  if (!snap.exists()) return null;
  return normalizeFriendship(snap.id, snap.data());
}
