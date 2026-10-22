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
import { withoutUndefined } from "./firestoreValue";
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

/** Firestore hatasının kodunu güvenli biçimde okur (hata nesnesi tanınmazsa boş). */
export function firestoreErrorCode(failure: unknown): string {
  if (typeof failure === "object" && failure && "code" in failure) return String((failure as { code: unknown }).code);
  return "";
}

/**
 * İstek gönderimindeki hataları TEK yerde, kullanıcıya söylenecek kodla eşler.
 * `permission-denied` iki farklı durumdan gelebilir:
 *  1) Bekleyen istek zaten var → `allow update: false` yüzünden create reddedilir.
 *     Bu yüzden önce kendi bekleyen isteğim silinip bir kez daha denenir.
 *  2) Tekrar denemeye rağmen reddediliyor → istemci ile sunucu kuralları uyuşmuyor.
 *     Sessizce yutulmaz; ayrı kodla yüzeye çıkar ve konsola gerçek hata yazılır.
 */
export function friendRequestFailure(failure: unknown, context: { retried: boolean }): Error & { code: string; cause: unknown } {
  const code = firestoreErrorCode(failure);
  let mapped: Error & { code: string };
  if (code === "permission-denied" || code === "already-exists") {
    mapped = context.retried
      ? dataError("friend-request/rules-mismatch", "Istek gonderilemedi: sunucu bu islemi reddetti. Uygulama guncellendiyse guvenlik kurallarinin da guncellenmesi gerekir.")
      : dataError("friend-request/exists", "Bu kisiye zaten istek gonderdin ya da arkadassiniz.");
  } else if (code === "unavailable" || code === "network-request-failed" || code === "deadline-exceeded") {
    mapped = dataError("friend-request/offline", "Istek gonderilemedi: baglanti kurulamadi.");
  } else if (code === "unauthenticated") {
    mapped = dataError("friend-request/not-signed-in", "Istek gondermek icin giris yapmalisin.");
  } else {
    mapped = dataError("friend-request/failed", "Istek gonderilemedi.");
  }
  return Object.assign(mapped, { cause: failure });
}

/** Kendi arkadaş indeksim okunamazsa "arkadaş değil" varsayılır (hata yutulmaz, kod yönlendirir). */
async function isAlreadyFriend(ref: ReturnType<typeof doc>): Promise<boolean> {
  try {
    return (await getDoc(ref)).exists();
  } catch {
    return false;
  }
}

export async function sendFriendRequest(input: { fromUid: string; fromName: string; toUid: string }): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const fromUid = input.fromUid.trim();
  const toUid = input.toUid.trim();
  if (!fromUid || !toUid) throw dataError("friend-request/uid-invalid", "Kullanici kimligi gecersiz.");
  if (fromUid === toUid) throw dataError("friend-request/self", "Kendine istek gonderemezsin.");
  const fromName = input.fromName.trim().slice(0, 40) || "Gezgin";
  const ref = doc(db, `users/${toUid}/friendRequests/${fromUid}`);
  // Alıcının kuyruğu ve friendships belgesi gönderen tarafından OKUNAMAZ
  // (kurallar yalnız alıcıya/üyeye izin verir). İlk istek bu okumalara
  // bağlanmamalı: yalnız kendi gelen kuyruğum okunur.
  const opposite = await getDoc(doc(db, `users/${fromUid}/friendRequests/${toUid}`));
  if (opposite.exists()) throw dataError("friend-request/opposite-exists", "Karsi taraf zaten sana istek gondermis; onun isteğini kabul et.");
  // Kendi arkadaş indeksim okunabilir; zaten arkadaşsak kural reddetmeden önce
  // doğru mesajı verebilmek için burada bakılır (create, friendship varken kapalı).
  const friendRef = doc(db, `users/${fromUid}/friends/${toUid}`);
  if (await isAlreadyFriend(friendRef)) throw dataError("friend-request/already-friends", "Bu kisi zaten arkadasin.");
  const payload = () => withoutUndefined({ fromUid, fromName, toUid, createdAt: serverTimestamp() });

  try {
    await setDoc(ref, payload());
  } catch (failure) {
    const code = firestoreErrorCode(failure);
    if (code !== "permission-denied" && code !== "already-exists") {
      if (code === "failed-precondition") {
        console.error("[Atlasia] Arkadaslik istegi yazilamadi (failed-precondition):", failure);
      }
      throw friendRequestFailure(failure, { retried: false });
    }
    // 1) Bekleyen istek zaten varsa temizle, 2) bir kez daha dene.
    let healed = false;
    try {
      await deleteDoc(ref);
      healed = true;
    } catch (cleanupFailure) {
      console.warn("[Atlasia] Bekleyen istek temizlenemedi:", cleanupFailure);
    }
    if (!healed) throw friendRequestFailure(failure, { retried: true });
    try {
      await setDoc(ref, payload());
    } catch (retryFailure) {
      // Ret sonrası en olası iki neden: zaten arkadaş olmak ya da dağıtılmış
      // kuralların istemciden eski olması. İkisi ayrı kodla raporlanır.
      if (await isAlreadyFriend(friendRef)) throw dataError("friend-request/already-friends", "Bu kisi zaten arkadasin.");
      // Teşhis izi: "istek gönderilemedi" şikayetinde ilk bakılacak iki şey
      // (yol ve kural ipucu) konsolda tek satırda görünür. Bkz. runbook §3.1.
      console.error("[Atlasia] Arkadaslik istegi sunucu kurallari tarafindan reddedildi.", {
        code: firestoreErrorCode(retryFailure),
        path: `users/${toUid}/friendRequests/${fromUid}`,
        hint: "firestore.rules icinde users/{uid}/friendRequests tanimli mi? Kurallar istemciden once dagitilmali (docs/deploy-runbook.md 3.1).",
      }, retryFailure);
      throw friendRequestFailure(retryFailure, { retried: true });
    }
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
  // "Reddedildi" bildirimi bilinçli olarak GÖNDERİLMEZ: ret sonrası istek belgesi
  // silindiği için kural tarafında kanıtlanacak bir ilişki kalmaz ve kurallar bu
  // tipi istemciye kapatır (bkz. firestore.rules notificationProof). Sunucu
  // fonksiyonu yok; kanıtsız bildirim yazmak kuralı gevşetmeyi gerektirirdi.
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
  // Kendi indeksim aynı atomik batch'te yazılır (kural getAfter ile kabul
  // edilmiş arkadaşlığı doğrular). Karşı tarafın indeksini ben yazamam
  // (kural: uid == auth); onu kendi hesabı ensureFriendIndex ile yazar.
  batch.set(
    doc(db, `users/${cleanRecipient}/friends/${cleanRequester}`),
    withoutUndefined({
      friendUid: cleanRequester,
      friendName: fromName.trim().slice(0, 40) || "Gezgin",
      since: serverTimestamp(),
    }),
  );
  await batch.commit();
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

/**
 * Kabul edilmiş arkadaşlık için kendi indeksimi yazar (idempotent).
 * Karşı taraf kabul ettiğinde benim adıma indeks yazması kural gereği mümkün
 * değildir; bu yüzden kabul/davet bildirimi aldığımda kendi indeksimi kurarım.
 */
export async function ensureFriendIndex(uid: string, friendUid: string, friendName: string): Promise<boolean> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const me = uid.trim();
  const other = friendUid.trim();
  if (!me || !other || me === other) throw dataError("friend-request/uid-invalid", "Kullanici kimligi gecersiz.");
  const indexRef = doc(db, `users/${me}/friends/${other}`);
  const existing = await getDoc(indexRef);
  if (existing.exists()) return false;
  // Kimlik sıradan bağımsız olduğu için tek okuma yeterli; kural da bu
  // belgeyi yalnız üyelerine okutur.
  const accepted = await getDoc(doc(db, `friendships/${friendshipIdFor(me, other)}`));
  const data = accepted.exists() ? accepted.data() : null;
  if (!data || data.status !== "accepted") return false;
  const users = Array.isArray(data.users) ? (data.users as string[]) : [];
  if (!users.includes(me) || !users.includes(other)) return false;
  await setDoc(indexRef, withoutUndefined({
    friendUid: other,
    friendName: friendName.trim().slice(0, 40) || "Gezgin",
    since: serverTimestamp(),
  }));
  return true;
}

export async function fetchFriendship(uidA: string, uidB: string): Promise<Friendship | null> {
  if (!db) throw dataError("data/unavailable", "Firestore hazir degil.");
  const fid = friendshipIdFor(uidA, uidB);
  const snap = await getDoc(doc(db, `friendships/${fid}`));
  if (!snap.exists()) return null;
  return normalizeFriendship(snap.id, snap.data());
}
