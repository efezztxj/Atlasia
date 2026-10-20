/**
 * Atlasia — Arkadaslik / istek-kabul modeli
 *
 * Tasarim (ucretsiz kota, Blaze yok):
 * - Bekleyen istekler: users/{recipientUid}/friendRequests/{requesterUid}
 *   Yazan: istek gonderen (fromUid==auth.uid, toUid==recipientUid)
 *   Okuyan/listeleyen/silen: alici (uid==auth.uid) + gonderen de silebilir (iptal)
 * - Kabul edilen arkadaslik: friendships/{sortedUidA_sortedUidB}
 *   Yazan: alici (kabul eden) tek yazimla olusturur, users array'i sirali [min,max]
 *   Okuyan: users icinde olan
 *   Silme: users icinde olan (arkadasliktan cikarma)
 * - Arkadas indeksi: users/{uid}/friends/{friendUid} (hizli liste, her kullanici kendi yazar)
 *   Yazan: uid==auth.uid
 *
 * Kurallar gevsetilmez: her yolda valid*Shape + boundedList.
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
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
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

export function validateFriendRequestInput(input: { fromUid: string; fromName: string; toUid: string }): string | null {
  const fromUid = input.fromUid.trim();
  const toUid = input.toUid.trim();
  const fromName = input.fromName.trim();
  if (!fromUid || fromUid.length > 128) return "friend/request-from-invalid";
  if (!toUid || toUid.length > 128) return "friend/request-to-invalid";
  if (fromUid === toUid) return "friend/self";
  if (fromName.length < 2 || fromName.length > 100) return "friend/name-invalid";
  return null;
}

export function validateFriendIndexInput(input: { friendUid: string; friendName: string }): string | null {
  if (!input.friendUid.trim() || input.friendUid.trim().length > 128) return "friend/uid-invalid";
  if (input.friendName.trim().length < 2 || input.friendName.trim().length > 100) return "friend/name-invalid";
  return null;
}

export function normalizeFriendRequest(id: string, raw: DocumentData): FriendRequest {
  return {
    id,
    fromUid: typeof raw.fromUid === "string" ? raw.fromUid : "",
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
    requesterUid: typeof raw.requesterUid === "string" ? raw.requesterUid : "",
    recipientUid: typeof raw.recipientUid === "string" ? raw.recipientUid : "",
    status: raw.status === "accepted" ? "accepted" : "accepted",
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}

export function normalizeFriendIndex(friendUid: string, raw: DocumentData): FriendIndex {
  return {
    friendUid,
    friendName: typeof raw.friendName === "string" ? raw.friendName : "Gezgin",
    since: toMillis(raw.since),
  };
}

export function subscribeFriendRequests(
  uid: string,
  onChange: (items: FriendRequest[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid.trim()) return () => {};
  const q = query(
    collection(db, `users/${uid}/friendRequests`),
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
  onChange: (items: FriendIndex[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid.trim()) return () => {};
  const q = query(
    collection(db, `users/${uid}/friends`),
    orderBy("since", "desc"),
    limit(FRIENDS_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeFriendIndex(item.id, item.data()))),
    onError,
  );
}

export function subscribeFriendships(
  uid: string,
  onChange: (items: Friendship[]) => void,
  _onError?: (error: Error) => void,
): () => void {
  // Yedek yol: friendships top-level list kapali, friends indeksi dinlenir.
  // Arkadasliklari friendships doc'undan degil indexten gosteriyoruz.
  void uid;
  void onChange;
  onChange([]);
  return () => {};
}

export async function sendFriendRequest(input: { fromUid: string; fromName: string; toUid: string; toName?: string }): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const invalid = validateFriendRequestInput(input);
  if (invalid) throw dataError(invalid, "Arkadaslik istegi gecersiz.");
  const fromUid = input.fromUid.trim();
  const toUid = input.toUid.trim();
  if (fromUid === toUid) throw dataError("friend/self", "Kendine istek gonderemezsin.");
  const fromName = input.fromName.trim().slice(0, 100);
  // Onceden arkadas mi? Top-level doc var mi kontrol et (en iyi caba, kural da korur).
  const fid = friendshipIdFor(fromUid, toUid);
  const existing = await getDoc(doc(db, "friendships", fid));
  if (existing.exists()) throw dataError("friend/already-friends", "Bu kullanici zaten arkadasin.");
  // Istek zaten var mi? Alıcının kuyruğunda aynı fromUid var mi?
  const pending = await getDoc(doc(db, `users/${toUid}/friendRequests/${fromUid}`));
  if (pending.exists()) throw dataError("friend/request-exists", "Bu kisi icin bekleyen istegin zaten var.");
  // Karsilikli bekleyen istek var mi? (B sana istek atmissa, sen tekrar atamazsin; once onu kabul et)
  const reverse = await getDoc(doc(db, `users/${fromUid}/friendRequests/${toUid}`));
  if (reverse.exists()) throw dataError("friend/reverse-exists", "Bu kisi sana zaten istek gondermis. Gelen istekleri kontrol et.");

  await setDoc(doc(db, `users/${toUid}/friendRequests/${fromUid}`), {
    fromUid,
    fromName,
    toUid,
    createdAt: serverTimestamp(),
  });

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
    console.warn("[Atlasia] Arkadaslik bildirimi yazilamadi:", error);
  }
}

export async function cancelFriendRequest(fromUid: string, toUid: string): Promise<void> {
  if (!db) return;
  const from = fromUid.trim();
  const to = toUid.trim();
  if (!from || !to) throw dataError("friend/uid-invalid", "Kullanici kimligi gecersiz.");
  // Alıcının kuyruğundan sil (gonderen de silebilir — kural buna izin verir)
  await deleteDoc(doc(db, `users/${to}/friendRequests/${from}`));
}

export async function declineFriendRequest(recipientUid: string, fromUid: string): Promise<void> {
  if (!db) return;
  const to = recipientUid.trim();
  const from = fromUid.trim();
  if (!to || !from) throw dataError("friend/uid-invalid", "Kullanici kimligi gecersiz.");
  await deleteDoc(doc(db, `users/${to}/friendRequests/${from}`));
  // Istege bagli ret bildirimi (sessiz olabilir)
  try {
    const me = await getDoc(doc(db, "userProfiles", to));
    const myName = (me.data()?.displayName as string) ?? "Gezgin";
    await createNotification({
      recipientUid: from,
      actorUid: to,
      type: "friend_declined",
      title: "Arkadaslik istegi yanitlandi",
      body: `${myName} arkadaslik istegini simdilik kabul etmedi.`,
      targetId: to,
    });
  } catch (error) {
    console.warn("[Atlasia] Ret bildirimi yazilamadi:", error);
  }
}

async function writeFriendIndex(uid: string, friendUid: string, friendName: string): Promise<void> {
  if (!db) return;
  const cleanUid = uid.trim();
  const cleanFriend = friendUid.trim();
  if (!cleanUid || !cleanFriend) throw dataError("friend/uid-invalid", "Kullanici kimligi gecersiz.");
  const invalid = validateFriendIndexInput({ friendUid: cleanFriend, friendName });
  if (invalid) throw dataError(invalid, "Arkadas bilgisi gecersiz.");
  await setDoc(doc(db, `users/${cleanUid}/friends/${cleanFriend}`), {
    friendUid: cleanFriend,
    friendName: friendName.trim().slice(0, 100),
    since: serverTimestamp(),
  });
}

export async function acceptFriendRequest(input: { recipientUid: string; recipientName: string; fromUid: string; fromName: string }): Promise<Friendship> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const recipientUid = input.recipientUid.trim();
  const fromUid = input.fromUid.trim();
  if (!recipientUid || !fromUid) throw dataError("friend/uid-invalid", "Kullanici kimligi gecersiz.");
  if (recipientUid === fromUid) throw dataError("friend/self", "Kendini ekleyemezsin.");
  const fid = friendshipIdFor(recipientUid, fromUid);
  const requestDoc = await getDoc(doc(db, `users/${recipientUid}/friendRequests/${fromUid}`));
  if (!requestDoc.exists()) throw dataError("friend/request-not-found", "Arkadaslik istegi bulunamadi.");

  const sorted = [recipientUid, fromUid].sort() as [string, string];
  const payload = {
    users: sorted,
    requesterUid: fromUid,
    recipientUid,
    status: "accepted" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Top-level friendships docs: alici yazar (kurallar buna izin verir)
  await setDoc(doc(db, "friendships", fid), payload);

  // Her iki tarafin indeksi tek adimda (kural karsi taraf icin de izin verir)
  await writeFriendIndex(recipientUid, fromUid, input.fromName);
  await writeFriendIndex(fromUid, recipientUid, input.recipientName);
  // İstek kuyruğundan sil
  await deleteDoc(doc(db, `users/${recipientUid}/friendRequests/${fromUid}`));

  // Gonderene kabul bildirimi (o da kendi indeksini yazacak)
  try {
    await createNotification({
      recipientUid: fromUid,
      actorUid: recipientUid,
      type: "friend_accepted",
      title: "Arkadaslik kabul edildi",
      body: `${input.recipientName} arkadaslik istegini kabul etti. Artik birlikte grup kurabilirsiniz.`,
      targetId: recipientUid,
    });
  } catch (error) {
    console.warn("[Atlasia] Kabul bildirimi yazilamadi:", error);
  }

  return {
    id: fid,
    users: sorted,
    requesterUid: fromUid,
    recipientUid,
    status: "accepted",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function confirmFriendship(currentUid: string, friendUid: string, friendName: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const me = currentUid.trim();
  const other = friendUid.trim();
  if (!me || !other) throw dataError("friend/uid-invalid", "Kullanici kimligi gecersiz.");
  if (me === other) throw dataError("friend/self", "Kendini ekleyemezsin.");
  const fid = friendshipIdFor(me, other);
  const friendship = await getDoc(doc(db, "friendships", fid));
  if (!friendship.exists()) throw dataError("friend/not-found", "Arkadaslik bulunamadi. Once karsi tarafin kabul etmesi gerekir.");
  const data = friendship.data() as { users?: string[]; status?: string };
  if (!data.users?.includes(me) || !data.users?.includes(other)) throw dataError("friend/not-member", "Bu arkadasliga dahil degilsin.");
  if (data.status !== "accepted") throw dataError("friend/not-accepted", "Arkadaslik henuz kabul edilmedi.");
  await writeFriendIndex(me, other, friendName);
}

export async function removeFriend(currentUid: string, friendUid: string): Promise<void> {
  if (!db) return;
  const me = currentUid.trim();
  const other = friendUid.trim();
  if (!me || !other) throw dataError("friend/uid-invalid", "Kullanici kimligi gecersiz.");
  const fid = friendshipIdFor(me, other);
  // Her iki indeks de silinir (kendi olanini silebilir; karsi tarafinki onun sorumlulugu)
  await deleteDoc(doc(db, `users/${me}/friends/${other}`)).catch(() => {});
  // Top-level friendships docs silinir (yalniz users icinde olan silebilir)
  await deleteDoc(doc(db, "friendships", fid)).catch(() => {});
  // Karsi tarafa bilgi: arkadasliktan cikarma sessizdir; isterse bildirim eklenebilir.
}

export function areFriends(friendUids: Set<string>, candidate: string): boolean {
  return friendUids.has(candidate.trim());
}
