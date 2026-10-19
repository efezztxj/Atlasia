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
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db, firebaseApp } from "./firebase";
import { getAtlasAuth } from "./auth";
import { createNotification } from "./notifications";

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
export function validateReportInput(input: ReportInput, uid: string): string | null {
  if (!uid.trim()) return "auth/required";
  if (!REPORT_TARGET_TYPES.includes(input.targetType)) return "report/target-type-invalid";
  if (!REPORT_REASONS.includes(input.reason)) return "report/reason-invalid";
  if (!input.targetId.trim() || input.targetId.trim().length > 200) return "report/target-invalid";
  if (input.targetOwnerUid !== undefined && (!input.targetOwnerUid.trim() || input.targetOwnerUid.trim().length > 128)) return "report/owner-invalid";
  if (input.details !== undefined && input.details.trim().length > 1000) return "report/details-too-long";
  return null;
}

/** Engelleme belgesi kimliği deterministiktir: aynı çift için tek kayıt kalır. */
export function blockIdFor(blockerUid: string, blockedUid: string): string {
  return `${blockerUid.trim()}_${blockedUid.trim()}`;
}

export async function createReport(input: ReportInput, uid: string): Promise<string> {
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

export async function deleteUserData(uid: string): Promise<{ places: number; posts: number; stories: number; reports: number; blocks: number; verifications: number }> {
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
  // Top-level veriler silindi; local storage temizliği çağıran tarafta yapılır.
  try {
    // Firestore'da groups/messages temizliği Adım 16'da eklenecek; şimdilik yer tutucu
    const groupQuery = query(collection(db, "groups"), where("createdBy", "==", cleanUid), limit(50));
    const groupSnap = await getDocs(groupQuery);
    if (groupSnap.size > 0) {
      const batch = writeBatch(db);
      groupSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    console.warn("[Atlasia] Grup verisi temizlenemedi:", error);
  }
  return { places, posts, stories, reports, blocks, verifications };
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
