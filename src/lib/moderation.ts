/**
 * Atlasia — Moderasyon katmanı (Adım 13)
 * Ücretli servis yok: yalnız Firestore + Auth.
 * İşlevler: içerik bildir, kullanıcı engelle, hesap silme (verisi kalkıyor).
 */
import {
  collection,
  collectionGroup,
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
import { deleteGroup } from "./groups";
import { ACCOUNT_DATA_PAGE_SIZE } from "../config/firestoreLimits";

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
      // Kural kanıtı (firestore.rules → notificationProof) "reports/{targetId} var ve
      // reporterUid == aktör" diyor; bu yüzden hedef, içeriğin değil RAPORUN kimliğidir.
      // İçerik kimliği rapor belgesinin targetId alanında durur.
      targetId: id,
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

// KARAR: Her adım sırayla çalışır; bir adımın hatası YUTULMAZ, adım raporuna yazılır
// ve hesap silme durur. Auth hesabı, tüm adımlar başarılı değilse SİLİNMEZ.
// Tüm adımlar idempotenttir (olmayan belge atlanır), yeniden denenebilir.
// Rules boundedList sınırlarının en küçüğü (users/{uid}/groups = 20); bkz. firestoreLimits.
const DELETE_PAGE_SIZE = ACCOUNT_DATA_PAGE_SIZE;
const DELETE_MAX_PAGES = 200;
const JOIN_WINDOW_MS = 15 * 60 * 1000;
// İstemci saati sunucudan geride olabilir: pencerenin dolduğu kesin değilse silinmez.
const JOIN_CLOCK_SKEW_MS = 2 * 60 * 1000;

const OWNED_TOP_LEVEL: Array<{ collectionName: string; uidField: string }> = [
  { collectionName: "places", uidField: "authorUid" },
  { collectionName: "posts", uidField: "authorUid" },
  { collectionName: "stories", uidField: "authorUid" },
  { collectionName: "routes", uidField: "authorUid" },
  { collectionName: "tracks", uidField: "authorUid" },
  { collectionName: "reports", uidField: "reporterUid" },
  { collectionName: "blocks", uidField: "blockerUid" },
  { collectionName: "verifications", uidField: "uid" },
  // KARAR: geri bildirim hesapla birlikte silinir (kurallar yalnız sahibine liste/silme verir).
  { collectionName: "feedback", uidField: "uid" },
];

// users/{uid}/... altında yalnız sahibin silebildiği koleksiyonlar (3a: blocks dahil).
// following: takip listesi hesabın kendi verisidir, hesapla birlikte silinir
// (kural listesi boundedList(100); DELETE_PAGE_SIZE=20 sınırın altında kalır).
const OWN_SUBCOLLECTIONS = ["notifications", "savedPlaces", "friendRequests", "blocks", "following"] as const;

/** Adım sonucu: silinen sayısı; kilit penceresi dolmadığı için bırakılanlar ayrıca raporlanır. */
export interface AccountDeletionOutcome {
  deleted: number;
  kept?: number;
}

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
  return drainQuery(() => query(collection(firestore, collectionName), where(uidField, "==", uid), limit(DELETE_PAGE_SIZE)));
}

async function deleteOwnSubcollection(uid: string, subcollection: string): Promise<number> {
  const firestore = requireDb();
  return drainQuery(() => query(collection(firestore, `users/${uid}/${subcollection}`), limit(DELETE_PAGE_SIZE)));
}

/** 3b: kullanıcının başka gönderilerdeki yanıtları (collection-group, yalnız authorUid == uid). */
async function deleteOwnReplies(uid: string): Promise<number> {
  const firestore = requireDb();
  return drainQuery(() => query(collectionGroup(firestore, "replies"), where("authorUid", "==", uid), limit(DELETE_PAGE_SIZE)));
}

/**
 * Kayıtlı rotalar: rota sayacı, silme ile aynı batch'te düşürülür (kural
 * savedRouteCounterDecreased / routeCounterChange bunu zorunlu kılar).
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
        if (count <= 0) throw dataError("data/route-counter", "Kayıtlı rota sayacı tutarsız; hesap silinmedi.");
        batch.update(routeRef, { saveCount: count - 1, updatedAt: serverTimestamp() });
      }
      await batch.commit();
      deleted += 1;
    }
  }
  throw dataError("data/delete-incomplete", "Kayıtlı rota silme sınırına ulaşıldı; tekrar deneyin.");
}

/** Arkadaşlık: friendships belgesi (varsa) + kendi arkadaş indeksi. */
async function deleteOwnFriendships(uid: string): Promise<number> {
  const firestore = requireDb();
  let deleted = 0;
  for (let page = 0; page < DELETE_MAX_PAGES; page += 1) {
    const snap = await getDocs(query(collection(firestore, `users/${uid}/friends`), limit(DELETE_PAGE_SIZE)));
    if (snap.size === 0) return deleted;
    for (const index of snap.docs) {
      const friendshipRef = doc(firestore, "friendships", friendshipIdFor(uid, index.id));
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

/** 3e: gelen davetler — grubun davet kaydı (varsa) ve kendi aynası birlikte silinir. */
async function deleteOwnGroupInvites(uid: string): Promise<number> {
  const firestore = requireDb();
  let deleted = 0;
  for (let page = 0; page < DELETE_MAX_PAGES; page += 1) {
    const snap = await getDocs(query(collection(firestore, `users/${uid}/groupInvites`), limit(DELETE_PAGE_SIZE)));
    if (snap.size === 0) return deleted;
    for (const mirror of snap.docs) {
      const inviteRef = doc(firestore, `groups/${mirror.id}/invites/${uid}`);
      const invite = await getDoc(inviteRef);
      const batch = writeBatch(firestore);
      batch.delete(mirror.ref);
      if (invite.exists()) batch.delete(inviteRef);
      await batch.commit();
      deleted += 1;
    }
  }
  throw dataError("data/delete-incomplete", "Davet silme sınırına ulaşıldı; tekrar deneyin.");
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
 * 3d: katılma denemesi. Yalnız kendi belgesi ve pencere (15 dk + saat payı) dolmuşsa silinir.
 * Pencere içindeki kayıt silinmez (sayaç atlatılmasın): "kept" olarak raporlanır.
 */
async function cleanupOwnJoinAttempt(groupId: string, uid: string): Promise<"none" | "deleted" | "kept"> {
  const firestore = requireDb();
  const attemptRef = doc(firestore, `groups/${groupId}/joinAttempts/${uid}`);
  const attempt = await getDoc(attemptRef);
  if (!attempt.exists()) return "none";
  const windowStart = toMillis(attempt.data()?.windowStart);
  if (windowStart + JOIN_WINDOW_MS + JOIN_CLOCK_SKEW_MS > Date.now()) return "kept";
  await deleteDoc(attemptRef);
  return "deleted";
}

/**
 * Grup üyelikleri (3c: sayfalı). Her indeks kaydı için: katılma denemesi, kendi
 * mesajları, sahipse grubun tamamı (mesajlar dahil, deleteGroup), değilse
 * üyelikten çıkarma. Hata yutulmaz.
 */
async function leaveOrDeleteGroups(uid: string): Promise<AccountDeletionOutcome> {
  const firestore = requireDb();
  let processed = 0;
  let kept = 0;
  for (let page = 0; page < DELETE_MAX_PAGES; page += 1) {
    const indexSnap = await getDocs(query(collection(firestore, `users/${uid}/groups`), limit(DELETE_PAGE_SIZE)));
    if (indexSnap.size === 0) return { deleted: processed, kept };
    for (const indexDoc of indexSnap.docs) {
      const groupId = indexDoc.id;
      const groupRef = doc(firestore, "groups", groupId);
      const snap = await getDoc(groupRef);
      if (snap.exists()) {
        const data = snap.data();
        if ((await cleanupOwnJoinAttempt(groupId, uid)) === "kept") kept += 1;
        await drainQuery(() => query(
          collection(firestore, `groups/${groupId}/messages`),
          where("senderUid", "==", uid),
          limit(DELETE_PAGE_SIZE),
        ));
        if (data.ownerUid === uid) {
          // deleteGroup: sahibin grubu, tüm mesajları ve kendi indeksini siler.
          await deleteGroup(groupId, uid);
        } else {
          const members = Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [];
          if (members.includes(uid)) {
            await updateDoc(groupRef, {
              memberUids: members.filter((member) => member !== uid),
              updatedAt: serverTimestamp(),
            });
          }
          await deleteDoc(indexDoc.ref);
        }
      } else {
        await deleteDoc(indexDoc.ref);
      }
      processed += 1;
    }
  }
  throw dataError("data/delete-incomplete", "Grup üyeliği temizleme sınırına ulaşıldı; tekrar deneyin.");
}

export interface AccountDataDeletionStep {
  step: string;
  deleted: number;
  failed: boolean;
  error?: string;
  /** Kilit penceresi dolmadığı için silinemeyen kayıt sayısı (açık kalan). */
  kept?: number;
}

export interface AccountDataDeletionReport {
  ok: boolean;
  steps: AccountDataDeletionStep[];
}

/**
 * Tüm kullanıcı verisini adım adım siler. Hiçbir adımın hatası yutulmaz.
 * Herhangi bir adım başarısızsa `data/delete-incomplete` fırlatılır; hata
 * nesnesinde `steps` tam raporu taşır. Çağıran Auth hesabını silmemelidir.
 */
export async function deleteUserData(uid: string): Promise<AccountDataDeletionReport> {
  requireDb();
  const cleanUid = uid.trim();
  if (!cleanUid) throw dataError("auth/required", "Hesap bilgisi geçersiz.");

  const steps: Array<{ name: string; run: () => Promise<AccountDeletionOutcome> }> = [
    ...OWNED_TOP_LEVEL.map(({ collectionName, uidField }) => ({
      name: collectionName,
      run: async () => ({ deleted: await deleteOwnedTopLevel(cleanUid, collectionName, uidField) }),
    })),
    ...OWN_SUBCOLLECTIONS.map((sub) => ({
      name: `users/${sub}`,
      run: async () => ({ deleted: await deleteOwnSubcollection(cleanUid, sub) }),
    })),
    { name: "replies", run: async () => ({ deleted: await deleteOwnReplies(cleanUid) }) },
    { name: "users/savedRoutes", run: async () => ({ deleted: await deleteOwnSavedRoutes(cleanUid) }) },
    { name: "users/friends+friendships", run: async () => ({ deleted: await deleteOwnFriendships(cleanUid) }) },
    { name: "users/groupInvites", run: async () => ({ deleted: await deleteOwnGroupInvites(cleanUid) }) },
    { name: "groups", run: () => leaveOrDeleteGroups(cleanUid) },
    { name: "userProfiles", run: async () => ({ deleted: await deleteOwnProfile(cleanUid) }) },
  ];

  const report: AccountDataDeletionStep[] = [];
  for (const step of steps) {
    try {
      const outcome = await step.run();
      report.push({ step: step.name, deleted: outcome.deleted, failed: false, ...(outcome.kept !== undefined ? { kept: outcome.kept } : {}) });
    } catch (error) {
      const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "unknown";
      report.push({ step: step.name, deleted: 0, failed: true, error: code });
    }
  }
  const failed = report.filter((item) => item.failed);
  if (failed.length > 0) {
    const names = failed.map((item) => `${item.step} (${item.error})`).join(", ");
    const err = dataError(
      "data/delete-incomplete",
      `Silme tamamlanamadı: ${names}. Hesabın silinmedi; tekrar dene.`,
    ) as Error & { code: string; steps: AccountDataDeletionStep[] };
    err.steps = report;
    throw err;
  }
  return { ok: true, steps: report };
}

export type AccountBackend = "firebase" | "device";

export interface DeleteAccountInput {
  uid: string;
  backend: AccountBackend;
  /** E-posta/şifre hesabında zorunlu; Google/Apple'da boş bırakılır (popup ile doğrulanır). */
  password?: string;
}

function clearLocalAccountData(uid: string): void {
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
}

/**
 * Silmeden ÖNCE kimlik doğrulaması. Başarısızsa hiçbir veri silinmez.
 * E-posta/şifre: şifre ile; Google/Apple: popup ile yeniden doğrulama.
 */
export async function reauthenticateForAccountDeletion(
  current: { email: string | null; providerData: Array<{ providerId: string }> },
  password: string | undefined,
  reauth: {
    credential: (email: string, password: string) => unknown;
    withCredential: (credential: unknown) => Promise<unknown>;
    withPopup: (providerId: "google.com" | "apple.com") => Promise<unknown>;
  },
): Promise<void> {
  const providers = current.providerData.map((item) => item.providerId);
  const isPassword = providers.includes("password");
  if (isPassword) {
    if (!password) throw dataError("auth/password-required", "Hesabını silmek için şifreni gir. Hiçbir veri silinmedi.");
    if (!current.email) throw dataError("auth/reauth-unsupported", "Hesap e-postası okunamadı; hiçbir veri silinmedi.");
    try {
      await reauth.withCredential(reauth.credential(current.email, password));
    } catch (error) {
      const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "unknown";
      const wrong = code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/invalid-login-credentials";
      throw dataError(
        "auth/reauth-failed",
        wrong ? "Şifre yanlış. Hiçbir veri silinmedi." : `Yeniden doğrulama tamamlanamadı (${code}). Hiçbir veri silinmedi.`,
      );
    }
    return;
  }
  const provider = providers.includes("google.com") ? "google.com" : providers.includes("apple.com") ? "apple.com" : null;
  if (!provider) throw dataError("auth/reauth-unsupported", "Bu hesap türüyle yeniden doğrulama yapılamıyor; hiçbir veri silinmedi.");
  try {
    await reauth.withPopup(provider);
  } catch (error) {
    const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "unknown";
    throw dataError("auth/reauth-failed", `Yeniden doğrulama tamamlanamadı (${code}). Hiçbir veri silinmedi.`);
  }
}

/**
 * Hesap silme. KARAR: backend hesabın kendisinden gelir (firebaseApp varlığından değil).
 * - device: yalnız cihaz hesabı + yerel veri; Firestore'a hiç dokunulmaz.
 * - firebase: yeniden doğrulama → veri silme (hata varsa durur) → Auth hesabı.
 */
export async function deleteAccount(input: DeleteAccountInput): Promise<AccountDataDeletionReport | null> {
  const uid = input.uid.trim();
  if (!uid) throw dataError("auth/required", "Hesap bilgisi geçersiz.");

  if (input.backend === "device") {
    const { deleteDeviceAccount } = await import("./deviceAccounts");
    await deleteDeviceAccount(uid);
    clearLocalAccountData(uid);
    return null;
  }

  if (!firebaseApp) throw dataError("auth/unavailable", "Firebase bu derlemede yapılandırılmamış; hesap silinemedi.");
  const auth = await getAtlasAuth();
  const current = auth.currentUser;
  if (!current || current.uid !== uid) throw dataError("auth/session-expired", "Oturumun doğrulanamadı, yeniden giriş yap.");
  // Auth SDK'sı yalnız hesap silme gibi seyrek işlemlerde yüklenir.
  const authSdk = await import("firebase/auth");
  await reauthenticateForAccountDeletion(current, input.password, {
    credential: (email, pass) => authSdk.EmailAuthProvider.credential(email, pass),
    withCredential: (credential) => authSdk.reauthenticateWithCredential(current, credential as Parameters<typeof authSdk.reauthenticateWithCredential>[1]),
    withPopup: (providerId) => authSdk.reauthenticateWithPopup(
      current,
      providerId === "google.com" ? new authSdk.GoogleAuthProvider() : new authSdk.OAuthProvider("apple.com"),
    ),
  });
  const report = await deleteUserData(uid);
  await authSdk.deleteUser(current);
  clearLocalAccountData(uid);
  return report;
}
