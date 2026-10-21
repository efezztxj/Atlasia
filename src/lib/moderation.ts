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
  type Query,
} from "firebase/firestore";
import { db, firebaseApp } from "./firebase";
import { getAtlasAuth } from "./auth";
import { createNotification } from "./notifications";
import { friendshipIdFor } from "./friendships";

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

// KARAR: Her adım sırayla çalışır; bir adımın hatası YUTULMAZ, toplanır ve sonunda
// fırlatılır. Herhangi bir adım başarısızsa Auth hesabı SİLİNMEZ. Tüm adımlar
// idempotenttir (olmayan belge atlanır), bu yüzden kullanıcı yeniden deneyebilir.
const DELETE_PAGE_SIZE = 50;
const DELETE_MAX_PAGES = 200;

const OWNED_TOP_LEVEL: Array<{ collectionName: string; uidField: string }> = [
  { collectionName: "places", uidField: "authorUid" },
  { collectionName: "posts", uidField: "authorUid" },
  { collectionName: "stories", uidField: "authorUid" },
  { collectionName: "routes", uidField: "authorUid" },
  { collectionName: "tracks", uidField: "authorUid" },
  { collectionName: "reports", uidField: "reporterUid" },
  { collectionName: "blocks", uidField: "blockerUid" },
  { collectionName: "verifications", uidField: "uid" },
];

// users/{uid}/... altında yalnız sahibin silebildiği koleksiyonlar.
const OWN_SUBCOLLECTIONS = ["notifications", "savedPlaces", "friendRequests", "groupInvites"] as const;

function requireDb() {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  return db;
}

/** Sorguyu sayfa sayfa boşaltır. Sınır aşılırsa sessizce bitmez, hata verir. */
async function drainQuery(makeQuery: () => Query): Promise<number> {
  const firestore = requireDb();
  let deleted = 0;
  for (let page = 0; page < DELETE_MAX_PAGES; page += 1) {
    const snap = await getDocs(makeQuery());
    if (snap.size === 0) return deleted;
    const batch = writeBatch(firestore);
    snap.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    deleted += snap.size;
  }
  throw dataError("data/delete-incomplete", "Veri silme turu sınırına ulaşıldı; tekrar deneyin.");
}

async function deleteOwnedTopLevel(uid: string, collectionName: string, uidField: string): Promise<number> {
  const firestore = requireDb();
  return drainQuery(() => query(
    collection(firestore, collectionName),
    where(uidField, "==", uid),
    limit(DELETE_PAGE_SIZE),
  ));
}

async function deleteOwnSubcollection(uid: string, subcollection: string): Promise<number> {
  const firestore = requireDb();
  return drainQuery(() => query(collection(firestore, `users/${uid}/${subcollection}`), limit(DELETE_PAGE_SIZE)));
}

/**
 * Kayıtlı rotalar: rota sayacı, silme ile aynı batch'te düşürülür (kural
 * savedRouteCounterDecreased / routeCounterChange bunu zorunlu kılar).
 * Rota artık yoksa yalnız kayıt silinir.
 */
async function deleteOwnSavedRoutes(uid: string): Promise<number> {
  const firestore = requireDb();
  let deleted = 0;
  for (let page = 0; page < DELETE_MAX_PAGES; page += 1) {
    const snap = await getDocs(query(collection(firestore, `users/${uid}/savedRoutes`), limit(DELETE_PAGE_SIZE)));
    if (snap.size === 0) return deleted;
    for (const saved of snap.docs) {
      const routeRef = doc(firestore, "routes", saved.id);
      const routeSnap = await getDoc(routeRef);
      const batch = writeBatch(firestore);
      batch.delete(saved.ref);
      if (routeSnap.exists()) {
        const count = Number(routeSnap.data()?.saveCount ?? 0);
        if (count <= 0) {
          throw dataError("data/route-counter", "Kayıtlı rota sayacı tutarsız; hesap silinmedi.");
        }
        batch.update(routeRef, { saveCount: count - 1, updatedAt: serverTimestamp() });
      }
      await batch.commit();
      deleted += 1;
    }
  }
  throw dataError("data/delete-incomplete", "Kayıtlı rota silme sınırına ulaşıldı; tekrar deneyin.");
}

/**
 * Arkadaşlık: önce friendships belgesi (yalnız varsa; yoksa batch hata verir),
 * sonra kendi arkadaş indeksi. Karşı tarafın indeksi kuralla yazılamaz; UI
 * indeksi friendships belgesiyle doğrular (açık nokta: teslimat dosyası).
 */
async function deleteOwnFriendships(uid: string): Promise<number> {
  const firestore = requireDb();
  let deleted = 0;
  for (let page = 0; page < DELETE_MAX_PAGES; page += 1) {
    const snap = await getDocs(query(collection(firestore, `users/${uid}/friends`), limit(DELETE_PAGE_SIZE)));
    if (snap.size === 0) return deleted;
    for (const index of snap.docs) {
      const friendUid = index.id;
      const friendshipRef = doc(firestore, "friendships", friendshipIdFor(uid, friendUid));
      const friendship = await getDoc(friendshipRef);
      const batch = writeBatch(firestore);
      batch.delete(index.ref);
      if (friendship.exists()) batch.delete(friendshipRef);
      await batch.commit();
      deleted += 1;
    }
  }
  throw dataError("data/delete-incomplete", "Arkadaş silme sınırına ulaşıldı; tekrar deneyin.");
}

async function deleteOwnProfile(uid: string): Promise<number> {
  const firestore = requireDb();
  const profileRef = doc(firestore, "userProfiles", uid);
  const profile = await getDoc(profileRef);
  if (!profile.exists()) return 0;
  await deleteDoc(profileRef);
  return 1;
}

/**
 * Grup üyelikleri: sahip olunan grup silinir (KARAR: grup sahibi ayrılamaz, grup
 * kalkar); diğer gruplarda yalnız üyelik çıkarılır. Mesaj silme sahibin kendi
 * mesajlarıyla sınırlıdır (kural). Hata yutulmaz.
 */
async function leaveOrDeleteGroups(uid: string): Promise<number> {
  const firestore = requireDb();
  const indexSnap = await getDocs(query(collection(firestore, `users/${uid}/groups`), limit(DELETE_PAGE_SIZE)));
  let cleaned = 0;
  for (const indexDoc of indexSnap.docs) {
    const groupId = indexDoc.id;
    const groupRef = doc(firestore, "groups", groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) continue;
    const data = snap.data();
    const messages = await getDocs(query(
      collection(firestore, "groups", groupId, "messages"),
      where("senderUid", "==", uid),
      limit(DELETE_PAGE_SIZE),
    ));
    if (messages.size > 0) {
      const batch = writeBatch(firestore);
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
    cleaned += 1;
  }
  return cleaned;
}

export interface AccountDataDeletionFailure {
  step: string;
  code: string;
}

export type AccountDataDeletionReport = Record<string, number>;

/**
 * Tüm kullanıcı verisini siler. Dönüş: adım → silinen belge sayısı.
 * Herhangi bir adım başarısızsa hata fırlatır (`failures` alanıyla); çağıran
 * Auth hesabını silmemelidir.
 */
export async function deleteUserData(uid: string): Promise<AccountDataDeletionReport> {
  requireDb();
  const cleanUid = uid.trim();
  if (!cleanUid) throw dataError("auth/required", "Hesap bilgisi geçersiz.");

  const steps: Array<{ name: string; run: () => Promise<number> }> = [
    ...OWNED_TOP_LEVEL.map(({ collectionName, uidField }) => ({
      name: collectionName,
      run: () => deleteOwnedTopLevel(cleanUid, collectionName, uidField),
    })),
    ...OWN_SUBCOLLECTIONS.map((sub) => ({ name: `users/${sub}`, run: () => deleteOwnSubcollection(cleanUid, sub) })),
    { name: "users/savedRoutes", run: () => deleteOwnSavedRoutes(cleanUid) },
    { name: "users/friends+friendships", run: () => deleteOwnFriendships(cleanUid) },
    {
      name: "groups",
      run: async () => {
        const left = await leaveOrDeleteGroups(cleanUid);
        const index = await deleteOwnSubcollection(cleanUid, "groups");
        return left + index;
      },
    },
    { name: "userProfiles", run: () => deleteOwnProfile(cleanUid) },
  ];

  const report: AccountDataDeletionReport = {};
  const failures: AccountDataDeletionFailure[] = [];
  for (const step of steps) {
    try {
      report[step.name] = await step.run();
    } catch (error) {
      const code = typeof (error as { code?: unknown })?.code === "string"
        ? (error as { code: string }).code
        : "unknown";
      failures.push({ step: step.name, code });
    }
  }
  if (failures.length > 0) {
    const names = failures.map((item) => `${item.step} (${item.code})`).join(", ");
    const err = dataError(
      "data/delete-incomplete",
      `Bazı veriler silinemedi: ${names}. Hesap silinmedi; tekrar dene.`,
    ) as Error & { code: string; failures: AccountDataDeletionFailure[] };
    err.failures = failures;
    throw err;
  }
  return report;
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
  // Auth SDK'sı yalnız hesap silme gibi seyrek işlemlerde yüklenir; statik
  // import, moderasyonu kullanan her ekranı başlangıç grafiğine bağlar.
  const { deleteUser } = await import("firebase/auth");
  await deleteUser(current);
}
