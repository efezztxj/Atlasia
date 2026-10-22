/**
 * Atlasia — açık rızalı arkadaşlık ve arkadaş seçmeli grup daveti.
 *
 * NEDEN: Kullanıcı grup üyelerini elle UID yazarak davet etmekte zorlanıyordu.
 * Grup kurulumu artık kabul edilmiş arkadaşlar arasından SEÇİM yapıyor.
 *
 * GÜVENLİK MODELİ (ücretli servis yok, Cloud Functions yok, dizin koleksiyonu yok):
 *
 *   friendships/{pairId}                 — yetkili rıza kaydı. pairId sıralı çift.
 *       get    : yalnız iki taraf (`request.auth.uid in participants`)
 *       list   : false (koleksiyon taraması kapalı → enumeration yok)
 *       create : isteyen taraf, status='pending', engelleme kontrolü
 *       update : YALNIZ alıcı, YALNIZ pending → accepted
 *       delete : iki taraftan biri (geri çekme / arkadaşlıktan çıkma)
 *
 *   users/{uid}/friendships/{pairId}     — own-scoped ayna; UI bunu listeler.
 *       Her iki tarafın da kendi görünümlerini canlı tutar (gönderilen/alınan
 *       istekler + kabul edilmiş arkadaşlar). Grup seçim listesi buradan
 *       status == 'accepted' filtrelenerek gelir.
 *
 * KİŞİSEL VERİ: Repoda `profiles` dizini YOK; görünen ad yalnız Firebase Auth'ta
 * durur ve istemci başka birinin UID'sinden adını çözemez (Admin SDK gerekir =
 * Blaze). Bu yüzden görünen adlar YALNIZCA `friendships/{pairId}` belgesinde ve
 * own-scoped aynada taşınır; her ikisini de yalnızca ilgili iki kullanıcı
 * okuyabilir. Telefon/e-posta HİÇBİR YERE yazılmaz. Kullanıcı adı zaten
 * places/posts üzerindeki `author` alanıyla uygulamada görünürdür.
 *
 * RIZA: Kabul edilmiş arkadaşlık veya kabul edilmiş grup daveti olmadan kimse
 * başka birini doğrudan gruba EKLEYEMEZ. `createGroup` artık üye zorla eklemez,
 * davet gönderir; davet edilen kişi `acceptGroupInvite` ile KENDİNİ ekler ve
 * kural bunu `friendships/{pairId}.status == 'accepted'` kanıtıyla denetler.
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
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notifications";

/** Ayna listesi tek sorguda en fazla 50 kayıt (ücretsiz kota + boundedList kuralı). */
export const FRIENDSHIPS_LIMIT = 50;
/** Görünen ad Auth'ta 40 karaktere kırpılıyor; aynı sınır burada da geçerli. */
export const FRIEND_NAME_MAX = 40;
/** Firebase UID'leri 28 karakter [A-Za-z0-9]; cihaz hesapları da aynı biçimi üretir. */
export const UID_MAX = 128;

export const FRIENDSHIP_ID_SEPARATOR = "_";

export type FriendshipStatus = "pending" | "accepted" | "declined";
export type FriendshipDirection = "outgoing" | "incoming";

export interface Friendship {
  id: string;
  requesterUid: string;
  recipientUid: string;
  /** Sıralı çift; kurallardaki `a < b ? a+'_'+b : b+'_'+a` ile birebir aynı. */
  participants: [string, string];
  status: FriendshipStatus;
  requesterName: string;
  recipientName: string;
  createdAt: number;
  updatedAt: number;
  acceptedAt: number;
}

/** own-scoped ayna kaydı: UI'ın tek doğruluk kaynağı. */
export interface FriendshipMirror {
  pairId: string;
  otherUid: string;
  otherName: string;
  direction: FriendshipDirection;
  status: FriendshipStatus;
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

/**
 * UID'ler yalnız ASCII olmalı ki istemcideki `<` karşılaştırması (UTF-16 kod
 * birimi) ile Firestore kurallarındaki `<` (Unicode kod noktası) aynı sırayı
 * versin. ASCII'de ikisi özdeştir; aksi hâlde pairId kuralla uyuşmaz ve yazım
 * reddedilir. Ayraç da UID içinde geçmemelidir.
 */
export function isSafeFriendUid(uid: string): boolean {
  const clean = uid.trim();
  if (clean.length === 0 || clean.length > UID_MAX) return false;
  if (clean.includes(FRIENDSHIP_ID_SEPARATOR)) return false;
  // Yalnız basılabilir ASCII (0x20–0x7E). ASCII dışında istemcideki '<'
  // (UTF-16 kod birimi) ile kurallardaki '<' (kod noktası) farklı sıra verebilir
  // ve pairId uyuşmazlığı rıza kaydının reddine yol açar.
  return !/[^\u0020-\u007E]/.test(clean);
}

/** Sıralı çift. Kurallardaki üçlü operatörle AYNI sıralamayı üretmelidir. */
export function sortParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Deterministik arkadaşlık belge kimliği: iki taraf da aynı yolu hesaplar. */
export function friendshipIdFor(a: string, b: string): string {
  return sortParticipants(a, b).join(FRIENDSHIP_ID_SEPARATOR);
}

/** Görünen adı sınırla ve temizle; boşsa tarafsız bir etiket döner. */
export function normalizeFriendName(name: string | null | undefined): string {
  const clean = (name ?? "").trim().slice(0, FRIEND_NAME_MAX);
  return clean || "Gezgin";
}

/**
 * İstek göndermeden önce istemci tarafı doğrulama. Kurallar yine son kararı
 * verir; bu yalnız erken ve anlaşılır hata üretmek içindir.
 */
export function validateFriendRequest(requesterUid: string, recipientUid: string): string | null {
  const requester = requesterUid.trim();
  const recipient = recipientUid.trim();
  if (!requester) return "friend/requester-required";
  if (!recipient) return "friend/recipient-required";
  if (requester === recipient) return "friend/self";
  if (!isSafeFriendUid(requester)) return "friend/requester-uid-invalid";
  if (!isSafeFriendUid(recipient)) return "friend/recipient-uid-invalid";
  return null;
}

export function normalizeFriendship(id: string, raw: DocumentData): Friendship {
  const requesterUid = typeof raw.requesterUid === "string" ? raw.requesterUid : "";
  const recipientUid = typeof raw.recipientUid === "string" ? raw.recipientUid : "";
  const rawParticipants = Array.isArray(raw.participants) ? (raw.participants as string[]) : [];
  const participants: [string, string] = rawParticipants.length === 2
    ? [rawParticipants[0], rawParticipants[1]]
    : sortParticipants(requesterUid, recipientUid);
  const status: FriendshipStatus = raw.status === "accepted" || raw.status === "declined" ? raw.status : "pending";
  return {
    id,
    requesterUid,
    recipientUid,
    participants,
    status,
    requesterName: normalizeFriendName(raw.requesterName as string | undefined),
    recipientName: normalizeFriendName(raw.recipientName as string | undefined),
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
    acceptedAt: toMillis(raw.acceptedAt),
  };
}

export function normalizeFriendshipMirror(pairId: string, raw: DocumentData): FriendshipMirror {
  const status: FriendshipStatus = raw.status === "accepted" || raw.status === "declined" ? raw.status : "pending";
  return {
    pairId,
    otherUid: typeof raw.otherUid === "string" ? raw.otherUid : "",
    otherName: normalizeFriendName(raw.otherName as string | undefined),
    direction: raw.direction === "outgoing" ? "outgoing" : "incoming",
    status,
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}

/** Grup seçim listesi: yalnız karşılıklı kabul edilmiş arkadaşlar. */
export function acceptedFriends(mirror: readonly FriendshipMirror[]): FriendshipMirror[] {
  return mirror
    .filter((entry) => entry.status === "accepted" && entry.otherUid.length > 0)
    .sort((a, b) => a.otherName.localeCompare(b.otherName, "tr"));
}

/** Bekleyen gelen istekler (kabul/ret edilebilecekler). */
export function incomingRequests(mirror: readonly FriendshipMirror[]): FriendshipMirror[] {
  return mirror
    .filter((entry) => entry.status === "pending" && entry.direction === "incoming")
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Bekleyen giden istekler (geri çekilebilecekler). */
export function outgoingRequests(mirror: readonly FriendshipMirror[]): FriendshipMirror[] {
  return mirror
    .filter((entry) => entry.status === "pending" && entry.direction === "outgoing")
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Ayna kaydının gövdesi. `otherName` karşı tarafın görünen adıdır; istek anında
 * isteyen kendi adını, alıcı taraf ise kabul anında kendi adını yazar.
 */
export function mirrorPayload(
  pairId: string,
  otherUid: string,
  otherName: string,
  direction: FriendshipDirection,
  status: FriendshipStatus,
): Record<string, unknown> {
  return {
    pairId,
    otherUid,
    otherName: normalizeFriendName(otherName),
    direction,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/** Aynayı own-scoped dinleyiciyle izler; liste kuralı `uid == request.auth.uid`. */
export function subscribeFriendships(
  uid: string,
  onChange: (mirror: FriendshipMirror[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid.trim()) return () => {};
  const q = query(
    collection(db, `users/${uid}/friendships`),
    orderBy("updatedAt", "desc"),
    limit(FRIENDSHIPS_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeFriendshipMirror(item.id, item.data()))),
    onError,
  );
}

/** Yetkili rıza kaydını okur; taraf değilsek Firestore reddeder. */
export async function fetchFriendship(pairId: string): Promise<Friendship | null> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const snap = await getDoc(doc(db, "friendships", pairId));
  if (!snap.exists()) return null;
  return normalizeFriendship(snap.id, snap.data());
}

/**
 * Arkadaşlık isteği gönderir. Tek batch'te üç yazım:
 *   1. friendships/{pairId}          — pending rıza kaydı
 *   2. users/{BEN}/friendships/…     — kendi aynam (gönderildi)
 *   3. users/{KARŞI}/friendships/…   — karşı ayna (kural getAfter ile denetler)
 * Bildirim en iyi çabayla ayrıca yazılır; başarısız olursa istek yine geçerlidir
 * çünkü karşı tarafın aynası canlı dinleyiciyle gelir.
 */
export async function sendFriendRequest(recipientUid: string, requester: { uid: string; name: string }): Promise<string> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const requesterUid = requester.uid.trim();
  const recipient = recipientUid.trim();
  const invalid = validateFriendRequest(requesterUid, recipient);
  if (invalid) throw dataError(invalid, invalid === "friend/self"
    ? "Kendine arkadaşlık isteği gönderemezsin."
    : "Hesap kimliği geçersiz. Karşı tarafın Profil panelindeki kimliğini kullan.");

  const pairId = friendshipIdFor(requesterUid, recipient);
  const participants = sortParticipants(requesterUid, recipient);
  const requesterName = normalizeFriendName(requester.name);

  const batch = writeBatch(db);
  batch.set(doc(db, "friendships", pairId), {
    requesterUid,
    recipientUid: recipient,
    participants,
    status: "pending",
    requesterName,
    recipientName: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, `users/${requesterUid}/friendships/${pairId}`),
    mirrorPayload(pairId, recipient, "", "outgoing", "pending"));
  batch.set(doc(db, `users/${recipient}/friendships/${pairId}`),
    mirrorPayload(pairId, requesterUid, requesterName, "incoming", "pending"));
  await batch.commit();

  try {
    await createNotification({
      recipientUid: recipient,
      actorUid: requesterUid,
      type: "friend_request",
      title: "Arkadaşlık isteği",
      body: `${requesterName} seninle arkadaş olmak istiyor. Gruplar panelinden kabul edebilirsin.`,
      targetId: pairId,
    });
  } catch (error) {
    console.warn("[Atlasia] Arkadaşlık isteği bildirimi yazılamadı:", error);
  }
  return pairId;
}

/** İsteği geri çeker (isteyen taraf) veya arkadaşlığı bitirir (iki taraf). */
export async function removeFriendship(pairId: string, uid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const clean = uid.trim();
  const friendship = await fetchFriendship(pairId);
  if (!friendship) {
    // Rıza kaydı zaten yok; kendi aynamızı yine de temizle.
    await deleteDoc(doc(db, `users/${clean}/friendships/${pairId}`)).catch(() => {});
    return;
  }
  if (!friendship.participants.includes(clean)) {
    throw dataError("friend/not-party", "Bu arkadaşlık kaydının tarafı değilsin.");
  }
  const otherUid = friendship.participants.find((participant) => participant !== clean) ?? "";
  const batch = writeBatch(db);
  batch.delete(doc(db, "friendships", pairId));
  batch.delete(doc(db, `users/${clean}/friendships/${pairId}`));
  // Karşı tarafın aynası da kalkar; kural `!existsAfter(friendships/{pairId})`
  // ile bu çapraz silmeye izin verir.
  if (otherUid) batch.delete(doc(db, `users/${otherUid}/friendships/${pairId}`));
  await batch.commit();
}

/** Gelen isteği reddeder. Rıza kaydı `declined` olur; istek tekrarlanabilir. */
export async function declineFriendRequest(pairId: string, uid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const clean = uid.trim();
  const friendship = await fetchFriendship(pairId);
  if (!friendship) throw dataError("friend/not-found", "Arkadaşlık isteği bulunamadı.");
  if (friendship.recipientUid !== clean) {
    throw dataError("friend/not-recipient", "Bu isteği yalnızca alıcı reddedebilir.");
  }
  if (friendship.status !== "pending") {
    throw dataError("friend/not-pending", "Bu istek zaten sonuçlanmış.");
  }
  const batch = writeBatch(db);
  batch.update(doc(db, "friendships", pairId), {
    status: "declined",
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, `users/${clean}/friendships/${pairId}`), {
    status: "declined",
    updatedAt: serverTimestamp(),
  });
  const requesterMirror = doc(db, `users/${friendship.requesterUid}/friendships/${pairId}`);
  batch.update(requesterMirror, { status: "declined", updatedAt: serverTimestamp() });
  await batch.commit();
}

/**
 * İsteği KABUL eder — açık rıza anı. Tek batch'te:
 *   1. friendships/{pairId} → status 'accepted' + recipientName + acceptedAt
 *   2. kendi aynam        → 'accepted'
 *   3. karşı ayna         → 'accepted' (kural katılımcı olmayı + accepted'ı denetler)
 * Böylece iki tarafın da grup seçim listesi aynı anda dolar; ayrıca bir
 * "self-healing" turu gerekmez.
 */
export async function acceptFriendRequest(pairId: string, me: { uid: string; name: string }): Promise<Friendship> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const uid = me.uid.trim();
  const friendship = await fetchFriendship(pairId);
  if (!friendship) throw dataError("friend/not-found", "Arkadaşlık isteği bulunamadı.");
  if (friendship.recipientUid !== uid) {
    throw dataError("friend/not-recipient", "Bu isteği yalnızca alıcı kabul edebilir.");
  }
  if (friendship.status === "accepted") return friendship;
  if (friendship.status !== "pending") {
    throw dataError("friend/not-pending", "Bu istek artık geçerli değil.");
  }
  const myName = normalizeFriendName(me.name);

  const batch = writeBatch(db);
  batch.update(doc(db, "friendships", pairId), {
    status: "accepted",
    recipientName: myName,
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, `users/${uid}/friendships/${pairId}`), {
    otherName: friendship.requesterName,
    status: "accepted",
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, `users/${friendship.requesterUid}/friendships/${pairId}`), {
    otherName: myName,
    status: "accepted",
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  try {
    await createNotification({
      recipientUid: friendship.requesterUid,
      actorUid: uid,
      type: "friend_accepted",
      title: "Arkadaşlık kabul edildi",
      body: `${myName} arkadaşlık isteğini kabul etti. Artık gruplarına davet edebilirsin.`,
      targetId: pairId,
    });
  } catch (error) {
    console.warn("[Atlasia] Arkadaşlık kabul bildirimi yazılamadı:", error);
  }

  return { ...friendship, status: "accepted", recipientName: myName };
}

/** Aynası eksik kalmış kabul edilmiş arkadaşlıkları onarır (idempotent). */
export async function syncFriendshipMirror(uid: string, pairIds: string[]): Promise<number> {
  if (!db) return 0;
  const clean = uid.trim();
  let repaired = 0;
  for (const pairId of pairIds) {
    try {
      const friendship = await fetchFriendship(pairId);
      if (!friendship || friendship.status !== "accepted") continue;
      if (!friendship.participants.includes(clean)) continue;
      const otherUid = friendship.participants.find((participant) => participant !== clean);
      if (!otherUid) continue;
      const otherName = friendship.requesterUid === clean ? friendship.recipientName : friendship.requesterName;
      const direction: FriendshipDirection = friendship.requesterUid === clean ? "outgoing" : "incoming";
      const mirrorRef = doc(db, `users/${clean}/friendships/${pairId}`);
      // NEDEN: Ayna ZATEN varsa kör setDoc, kurallarda `update` dalı olarak
      // değerlendirilir. O dal createdAt'i değişmez sayar ve yalnız
      // ['status','otherName','updatedAt'] anahtarlarına izin verir; bu yüzden
      // serverTimestamp() ile tazelenen createdAt `permission-denied` üretirdi
      // ve onarım sessizce hiç çalışmazdı. Önce varlığı ölçüp doğru dalı seçiyoruz.
      const existing = await getDoc(mirrorRef);
      if (existing.exists()) {
        await updateFriendshipMirrorStatus(clean, pairId, "accepted", normalizeFriendName(otherName));
      } else {
        await setDoc(mirrorRef, {
          pairId,
          otherUid,
          otherName: normalizeFriendName(otherName),
          direction,
          status: "accepted",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      repaired += 1;
    } catch (error) {
      console.warn(`[Atlasia] Arkadaşlık aynası onarılamadı (${pairId}):`, error);
    }
  }
  return repaired;
}

/** Tek bir arkadaşlık durumunu okur (teşhis ve test için). */
export async function readFriendshipMirror(uid: string, pairId: string): Promise<FriendshipMirror | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, `users/${uid}/friendships/${pairId}`));
  if (!snap.exists()) return null;
  return normalizeFriendshipMirror(snap.id, snap.data());
}

/** Ayna kaydını elle siler (hesap kapatma temizliğinde kullanılır). */
export async function deleteFriendshipMirror(uid: string, pairId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, `users/${uid}/friendships/${pairId}`));
}

/** Yalnız durum güncellemesi; kural `hasOnly(['status','updatedAt','otherName'])` ister. */
export async function updateFriendshipMirrorStatus(
  uid: string,
  pairId: string,
  status: FriendshipStatus,
  otherName?: string,
): Promise<void> {
  if (!db) return;
  const payload: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
  if (otherName !== undefined) payload.otherName = normalizeFriendName(otherName);
  await updateDoc(doc(db, `users/${uid}/friendships/${pairId}`), payload);
}
