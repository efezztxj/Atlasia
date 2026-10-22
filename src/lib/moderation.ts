/**
 * Atlasia — Moderasyon katmanı (Adım 13)
 * Ücretli servis yok: yalnız Firestore + Auth.
 * İşlevler: içerik bildir, kullanıcı engelle, hesap silme (verisi kalkıyor).
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
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db, firebaseApp } from "./firebase";
import { getAtlasAuth } from "./auth";
import { createNotification } from "./notifications";
// GRUP İNDEKSİ LİMİTİ: `users/{uid}/groups` liste kuralı `boundedList(20)` koşar.
// Bu sabit tek kaynak olsun diye groups.ts'ten alınır; elle 50 yazmak kuralı aşar.
import { GROUPS_LIMIT } from "./groups";

export const REPORT_REASONS = ["spam", "harassment", "hate", "misinfo", "privacy", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ReportInput {
  targetType: "place" | "post" | "story" | "user";
  targetId: string;
  targetOwnerUid?: string;
  reason: ReportReason;
  details?: string;
}

export interface Report {
  id: string;
  reporterUid: string;
  targetType: ReportInput["targetType"];
  targetId: string;
  targetOwnerUid?: string;
  reason: ReportReason;
  details?: string;
  createdAt: number;
}

const REPORT_LIMIT = 50;
const BLOCK_LIMIT = 50;

function dataError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function toMillis(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ─────────────── Raporlama ─────────────── */

export const REPORT_TARGET_TYPES = ["place", "post", "story", "user"] as const;

/** Rapor yükünü yazmadan önce doğrular; kural katmanıyla aynı sınırları kullanır. */
export interface ReportValidationInput {
  targetType: string;
  targetId: string;
  reason: string;
  targetOwnerUid?: string;
  details?: string;
}

export function validateReportInput(input: ReportValidationInput, uid: string): string | null {
  if (!uid.trim()) return "auth/required";
  if (!(REPORT_TARGET_TYPES as readonly string[]).includes(input.targetType)) return "report/target-type-invalid";
  if (!(REPORT_REASONS as readonly string[]).includes(input.reason)) return "report/reason-invalid";
  if (!input.targetId.trim() || input.targetId.trim().length > 200) return "report/target-invalid";
  if (input.targetOwnerUid !== undefined && (!input.targetOwnerUid.trim() || input.targetOwnerUid.trim().length > 128)) return "report/owner-invalid";
  if (input.details !== undefined && input.details.trim().length > 1000) return "report/details-too-long";
  return null;
}

/** Engelleme belgesi kimliği deterministiktir: aynı çift için tek kayıt kalır. */
export function blockIdFor(blockerUid: string, blockedUid: string): string {
  return `${blockerUid.trim()}_${blockedUid.trim()}`;
}

export async function createReport(input: ReportValidationInput, uid: string): Promise<string> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const cleanUid = uid.trim();
  const invalid = validateReportInput(input, cleanUid);
  if (invalid) throw dataError(invalid, "Rapor bilgileri geçersiz.");
  const cleanTargetId = input.targetId.trim();
  const id = newId("rp");
  const payload: Record<string, unknown> = {
    reporterUid: cleanUid,
    targetType: input.targetType,
    targetId: cleanTargetId,
    reason: input.reason,
    createdAt: serverTimestamp(),
  };
  if (input.targetOwnerUid) payload.targetOwnerUid = input.targetOwnerUid;
  if (input.details?.trim()) payload.details = input.details.trim().slice(0, 1000);
  await setDoc(doc(db, "reports", id), payload);
  // İçerik sahibine şeffaflık bildirimi: kurala göre aktör raporlayandır.
  if (input.targetOwnerUid && input.targetOwnerUid !== cleanUid) {
    await createNotification({
      recipientUid: input.targetOwnerUid,
      actorUid: cleanUid,
      type: "report_received",
      title: "İçeriğin bildirildi",
      body: "Bir içeriğin topluluk kuralları kapsamında bildirildi. İnceleme sonrası sonuç bildirilecek.",
      targetId: cleanTargetId,
    }).catch((error: unknown) => {
      console.warn("[Atlasia] Bildirim yazılamadı; rapor yine kaydedildi:", error);
    });
  }
  return id;
}

export function normalizeReport(id: string, raw: Record<string, unknown>): Report {
  return {
    id,
    reporterUid: typeof raw.reporterUid === "string" ? raw.reporterUid : "",
    targetType: (raw.targetType as Report["targetType"]) ?? "post",
    targetId: typeof raw.targetId === "string" ? raw.targetId : "",
    targetOwnerUid: typeof raw.targetOwnerUid === "string" ? raw.targetOwnerUid : undefined,
    reason: (raw.reason as ReportReason) ?? "other",
    details: typeof raw.details === "string" ? raw.details : undefined,
    createdAt: toMillis(raw.createdAt),
  };
}

export function subscribeMyReports(
  uid: string,
  onChange: (reports: Report[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid.trim()) return () => {};
  const q = query(
    collection(db, "reports"),
    where("reporterUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(REPORT_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => normalizeReport(d.id, d.data()))),
    onError,
  );
}

/* ─────────────── Engelleme ─────────────── */

export interface BlockRecord {
  id: string;
  blockerUid: string;
  blockedUid: string;
  createdAt: number;
}

function normalizeBlock(id: string, raw: Record<string, unknown>): BlockRecord {
  return {
    id,
    blockerUid: typeof raw.blockerUid === "string" ? raw.blockerUid : "",
    blockedUid: typeof raw.blockedUid === "string" ? raw.blockedUid : "",
    createdAt: toMillis(raw.createdAt),
  };
}

export async function blockUser(blockedUid: string, blockerUid: string): Promise<string> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const blocker = blockerUid.trim();
  const blocked = blockedUid.trim();
  if (!blocker || !blocked) throw dataError("block/uid-invalid", "Kullanıcı bilgisi geçersiz.");
  if (blocker === blocked) throw dataError("block/self", "Kendini engelleyemezsin.");
  const id = blockIdFor(blocker, blocked);
  const ref = doc(db, "blocks", id);
  const existing = await getDoc(ref);
  if (existing.exists()) return id;
  await setDoc(ref, {
    blockerUid: blocker,
    blockedUid: blocked,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function unblockUser(blockedUid: string, blockerUid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const id = blockIdFor(blockerUid, blockedUid);
  await deleteDoc(doc(db, "blocks", id));
}

export function subscribeBlocks(
  blockerUid: string,
  onChange: (blocks: BlockRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !blockerUid.trim()) return () => {};
  const q = query(
    collection(db, "blocks"),
    where("blockerUid", "==", blockerUid),
    orderBy("createdAt", "desc"),
    limit(BLOCK_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => normalizeBlock(d.id, d.data()))),
    onError,
  );
}

export async function listBlockedUids(blockerUid: string): Promise<string[]> {
  if (!db || !blockerUid.trim()) return [];
  const q = query(collection(db, "blocks"), where("blockerUid", "==", blockerUid), limit(BLOCK_LIMIT));
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data().blockedUid as string)).filter(Boolean);
}

/* ─────────────── Hesap silme (verisi kalkıyor) ─────────────── */

async function deleteOwnedCollection(
  uid: string,
  collectionName: string,
  uidField: string,
): Promise<number> {
  if (!db) return 0;
  const q = query(collection(db, collectionName), where(uidField, "==", uid), limit(50));
  let deleted = 0;
  let snap = await getDocs(q);
  while (snap.size > 0) {
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    snap = await getDocs(q);
  }
  return deleted;
}

async function deleteOwnedPlaces(uid: string): Promise<number> {
  return deleteOwnedCollection(uid, "places", "authorUid");
}

async function deleteOwnedPosts(uid: string): Promise<number> {
  return deleteOwnedCollection(uid, "posts", "authorUid");
}

async function deleteOwnedStories(uid: string): Promise<number> {
  return deleteOwnedCollection(uid, "stories", "authorUid");
}

async function deleteOwnedReports(uid: string): Promise<number> {
  return deleteOwnedCollection(uid, "reports", "reporterUid");
}

async function deleteOwnedBlocks(uid: string): Promise<number> {
  if (!db) return 0;
  const q = query(collection(db, "blocks"), where("blockerUid", "==", uid), limit(50));
  let deleted = 0;
  let snap = await getDocs(q);
  while (snap.size > 0) {
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    snap = await getDocs(q);
  }
  return deleted;
}

/**
 * Kendi alt koleksiyonunu sayfalayarak boşaltır.
 *
 * `limit` PARAMETREDİR çünkü her alt koleksiyonun kural sınırı farklıdır:
 * `users/{uid}/groups` → boundedList(20), `notifications` ve `friendships` →
 * boundedList(50). Sabit 50 yazmak grup indeksinde HER ZAMAN permission-denied
 * üretiyordu. Döngü sildiği için sayfa her turda küçülür ve terimler.
 */
async function deleteOwnSubcollection(
  uid: string,
  subcollection: "notifications" | "groups" | "friendships",
  pageLimit: number,
): Promise<number> {
  if (!db) return 0;
  const q = query(collection(db, `users/${uid}/${subcollection}`), limit(pageLimit));
  let deleted = 0;
  let snap = await getDocs(q);
  while (snap.size > 0) {
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    snap = await getDocs(q);
  }
  return deleted;
}

async function leaveOrDeleteGroups(uid: string): Promise<number> {
  if (!db) return 0;
  let cleaned = 0;
  // KANITLANAN HATA: burada limit(50) vardı ama `users/{uid}/groups` liste
  // kuralı boundedList(20) koşar → sorgu HER ZAMAN permission-denied döner.
  // Bu tek hata deleteUserData'daki catch'e düştüğü için grup indeksi ve
  // BİLDİRİMLER de hiç silinmiyordu (kişisel veri hesap silme sonrası kalıyordu).
  //
  // Sayfalama `seen` kümesiyle korunur: işlenemeyen bir grup sonsuz döngü
  // yaratmaz, yeni grup kalmadığında döngü biter. Her işlenen grubun indeks
  // belgesi de silinir, böylece sayfa gerçekten ilerler.
  const seen = new Set<string>();
  for (;;) {
    const indexSnap = await getDocs(
      query(collection(db, `users/${uid}/groups`), limit(GROUPS_LIMIT)),
    );
    const pending = indexSnap.docs.filter((indexDoc) => !seen.has(indexDoc.id));
    if (pending.length === 0) break;
    for (const indexDoc of pending) {
      const groupId = indexDoc.id;
      seen.add(groupId);
      try {
        const groupRef = doc(db, "groups", groupId);
        const snap = await getDoc(groupRef);
        if (!snap.exists()) {
          await deleteDoc(indexDoc.ref);
          continue;
        }
        const data = snap.data();
        // Kişinin kendi mesajlarını sil (kural: yalnız gönderen).
        const messages = await getDocs(query(
          collection(db, "groups", groupId, "messages"),
          where("senderUid", "==", uid),
          limit(50),
        ));
        if (messages.size > 0) {
          const batch = writeBatch(db);
          messages.docs.forEach((message) => batch.delete(message.ref));
          await batch.commit();
          cleaned += messages.size;
        }
        const members = Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [];
        if (data.ownerUid === uid) {
          await deleteDoc(groupRef);
        } else if (members.includes(uid)) {
          await updateDoc(groupRef, {
            memberUids: members.filter((member) => member !== uid),
            updatedAt: serverTimestamp(),
          });
        }
        await deleteDoc(indexDoc.ref);
        cleaned += 1;
      } catch (error) {
        console.warn(`[Atlasia] ${groupId} grubundan ayrılma tamamlanamadı:`, error);
      }
    }
  }
  return cleaned;
}

/**
 * Arkadaşlık kayıtlarını temizler (hesap silme).
 *
 * Sıra önemlidir: önce own-scoped aynadan pairId'ler okunur, sonra YETKİLİ rıza
 * kayıtları (`friendships/{pairId}`) silinir. Rıza kaydı kalktığı için karşı
 * tarafın aynası da aynı batch'te silinebilir — kural bunu
 * `!existsAfter(friendships/{pairId})` ile onaylar.
 *
 * Kalan durum: karşı tarafın aynası silinememişse (ör. ağ hatası), o kullanıcı
 * aynayı kendi başına silebilir çünkü kural rıza kaydı yokken `uid == auth.uid`
 * koşuluna ek olarak `!existsAfter` dalını da kabul eder. Bu bilinen ve kabul
 * edilen bir artıktır; teslim raporunda risk olarak listelenmiştir.
 */
async function deleteOwnedFriendships(uid: string): Promise<number> {
  if (!db) return 0;
  const mirrorSnap = await getDocs(query(collection(db, `users/${uid}/friendships`), limit(50)));
  let deleted = 0;
  for (const mirrorDoc of mirrorSnap.docs) {
    const pairId = mirrorDoc.id;
    try {
      const friendshipRef = doc(db, "friendships", pairId);
      const snap = await getDoc(friendshipRef);
      const batch = writeBatch(db);
      if (snap.exists()) {
        const data = snap.data();
        const participants = Array.isArray(data.participants) ? (data.participants as string[]) : [];
        batch.delete(friendshipRef);
        for (const participant of participants) {
          if (participant === uid) continue;
          batch.delete(doc(db, `users/${participant}/friendships/${pairId}`));
        }
      }
      batch.delete(doc(db, `users/${uid}/friendships/${pairId}`));
      await batch.commit();
      deleted += 1;
    } catch (error) {
      console.warn(`[Atlasia] Arkadaşlık kaydı temizlenemedi (${pairId}):`, error);
    }
  }
  return deleted;
}

async function deleteOwnedVerifications(uid: string): Promise<number> {
  // Adım 14'te eklenir; yoksa sessizce 0 döner
  if (!db) return 0;
  try {
    const q = query(collection(db, "verifications"), where("uid", "==", uid), limit(50));
    let deleted = 0;
    let snap = await getDocs(q);
    while (snap.size > 0) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += snap.size;
      snap = await getDocs(q);
    }
    return deleted;
  } catch {
    return 0;
  }
}

export async function deleteUserData(uid: string): Promise<{ places: number; posts: number; stories: number; reports: number; blocks: number; verifications: number; friendships: number }> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const cleanUid = uid.trim();
  if (!cleanUid) throw dataError("auth/required", "Hesap bilgisi geçersiz.");
  const [places, posts, stories, reports, blocks, verifications] = await Promise.all([
    deleteOwnedPlaces(cleanUid),
    deleteOwnedPosts(cleanUid),
    deleteOwnedStories(cleanUid),
    deleteOwnedReports(cleanUid),
    deleteOwnedBlocks(cleanUid),
    deleteOwnedVerifications(cleanUid),
  ]);
  // Grup üyeliği, gönderdiği mesajlar, arkadaşlıklar ve bildirimler de kalkar.
  let friendships = 0;
  try {
    friendships = await deleteOwnedFriendships(cleanUid);
  } catch (error) {
    console.warn("[Atlasia] Arkadaşlık verisi temizlenemedi:", error);
  }
  // Her adım AYRI try içinde: eskiden üçü tek try'daydı ve ilk adımdaki tek bir
  // permission-denied, grup indeksi ve BİLDİRİM temizliğini tamamen atlıyordu.
  // Hesap silme kişisel veri işlemi olduğu için kısmi başarı sessizce yutulamaz;
  // her adım kendi hatasını raporlar ve diğerleri çalışmaya devam eder.
  try {
    await leaveOrDeleteGroups(cleanUid);
  } catch (error) {
    console.warn("[Atlasia] Gruplardan ayrılma/silme tamamlanamadı:", error);
  }
  try {
    // users/{uid}/groups liste kuralı boundedList(20) → sayfa 20 olmalı.
    await deleteOwnSubcollection(cleanUid, "groups", GROUPS_LIMIT);
  } catch (error) {
    console.warn("[Atlasia] Grup indeksi temizlenemedi:", error);
  }
  try {
    // users/{uid}/notifications liste kuralı boundedList(50).
    await deleteOwnSubcollection(cleanUid, "notifications", 50);
  } catch (error) {
    console.warn("[Atlasia] Bildirimler temizlenemedi:", error);
  }
  return { places, posts, stories, reports, blocks, verifications, friendships };
}

export async function deleteAccount(uid: string): Promise<void> {
  // Önce verisini sil, sonra Auth hesabını sil
  await deleteUserData(uid);
  // Local storage temizliği
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key.includes(uid) || key.startsWith("atlasia."))) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (error) {
    console.warn("[Atlasia] Yerel kayıtlar temizlenemedi:", error);
  }

  if (!firebaseApp) {
    // Cihaz modu: local account sil
    const { deleteDeviceAccount } = await import("./deviceAccounts");
    await deleteDeviceAccount(uid);
    return;
  }
  const auth = await getAtlasAuth();
  const current = auth.currentUser;
  if (!current || current.uid !== uid) throw dataError("auth/session-expired", "Oturumun doğrulanamadı, yeniden giriş yap.");
  await deleteUser(current);
}
