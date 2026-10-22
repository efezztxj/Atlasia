/**
 * Atlasia — Kişisel gruplar ve sohbet (Adım 16)
 *
 * Karar (g) BAĞLI: yalnız Firestore. Realtime Database ve üçüncü taraf yok.
 * Ücretsiz katman kotası için:
 *   - grup listesi kullanıcının kendi indeksinden en fazla 20 kayıt,
 *   - her sohbet tek sorguda en yeni 50 mesaj,
 *   - grup dokümanı yalnız üyeye tek `get` ile açık,
 *   - geniş koleksiyon taraması (limitsiz list) kurallarla kapalı.
 *   - gruplarda 6-8 haneli katılma kodu (JOIN_CODE_MIN/MAX) — C2: 4 hane brute-force zayıf, en az 6 hane 1M uzay
 *   - kilit: 5 hatalı denemede 15 dk kilit (grup başına ve kullanıcı başına)
 *   - davet akışı: kurucu + bekleyen davet, sadece davetli kendini ekler
 */
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  arrayUnion,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { withoutUndefined, isPermissionDenied } from "./firestoreValue";
import { createNotification } from "./notifications";

import {
  GROUPS_LIMIT,
  GROUP_MEMBERS_MAX,
  MESSAGES_LIMIT,
  MESSAGE_TEXT_MAX,
  JOIN_CODE_MIN,
  JOIN_CODE_MAX,
  JOIN_ATTEMPTS_LIMIT,
  JOIN_ATTEMPTS_WINDOW_MS,
} from "../config/firestoreLimits";

export interface Group {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  joinCode?: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: { text: string; senderUid: string; senderName: string; createdAt: number };
}

export interface GroupIndexEntry {
  groupId: string;
  name: string;
  role: "owner" | "member";
  joinedAt: number;
}

export interface GroupMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  createdAt: number;
}

export interface GroupInvite {
  id: string;
  invitedUid: string;
  inviterUid: string;
  groupId: string;
  groupName: string;
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

const LOCKED_MESSAGE = "Çok fazla hatalı deneme. Birkaç dakika sonra tekrar dene.";
const BAD_CODE_MESSAGE = "Katılma kodu yanlış ya da bu gruba şu an katılınamıyor.";

/**
 * Katılma denemesini yazar (kendi belgesi; izinli). Pencere 15 dk: pencere
 * içinde attempts +1 (en fazla 5), pencere dolmuşsa 1'e döner. Sayaç kuralda
 * zorlanır; buradaki kontrol yalnızca gereksiz ağ yazımını önler.
 * Bu yazım AYRI commit'tir: yanlış kodda grup güncellemesi reddedilse bile
 * sayaç kalıcı olarak artmış olur.
 */
async function writeJoinAttempt(groupId: string, uid: string, code: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const ref = doc(db, `groups/${groupId}/joinAttempts/${uid}`);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
  const prevStart = prev ? toMillis(prev.windowStart) : 0;
  const prevAttempts = typeof prev?.attempts === "number" ? (prev.attempts as number) : 0;
  const windowOpen = prevStart > 0 && Date.now() < prevStart + JOIN_ATTEMPTS_WINDOW_MS;
  if (windowOpen && prevAttempts >= JOIN_ATTEMPTS_LIMIT) {
    throw dataError("group/locked", LOCKED_MESSAGE);
  }
  try {
    if (windowOpen) {
      await setDoc(ref, { code, at: serverTimestamp(), attempts: prevAttempts + 1, windowStart: prev!.windowStart });
    } else {
      await setDoc(ref, { code, at: serverTimestamp(), attempts: 1, windowStart: serverTimestamp() });
    }
  } catch (failure) {
    // Kural reddi: sayaç sınırı (pencere içi 6. deneme) ya da geri yazma girişimi.
    if (isPermissionDenied(failure)) throw dataError("group/locked", LOCKED_MESSAGE);
    throw failure;
  }
}

/** Davet listesini temizler: kendi UID'i, boşlukları ve tekrarları ayıklar. */
export function normalizeMemberUids(ownerUid: string, raw: string[]): string[] {
  const clean = [ownerUid, ...raw]
    .map((uid) => uid.trim())
    .filter((uid) => uid.length > 0 && uid.length <= 128);
  return [...new Set(clean)].slice(0, GROUP_MEMBERS_MAX);
}

export function validateGroupName(name: string): string | null {
  const clean = name.trim();
  if (clean.length < 2) return "group/name-too-short";
  if (clean.length > 80) return "group/name-too-long";
  return null;
}

export function validateJoinCode(code: string): string | null {
  const clean = code.trim();
  if (clean.length < JOIN_CODE_MIN || clean.length > JOIN_CODE_MAX) return "group/join-code-length";
  if (!/^\d+$/.test(clean)) return "group/join-code-digits";
  return null;
}

export function generateJoinCode(): string {
  const digits = JOIN_CODE_MIN;
  const values = new Uint8Array(digits);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < digits; index += 1) values[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(values, (value) => String(value % 10)).join("");
}

export function normalizeGroup(id: string, raw: DocumentData): Group {
  const last = raw.lastMessage as Record<string, unknown> | undefined;
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "Grup",
    ownerUid: typeof raw.ownerUid === "string" ? raw.ownerUid : "",
    memberUids: Array.isArray(raw.memberUids) ? (raw.memberUids as string[]) : [],
    joinCode: typeof raw.joinCode === "string" ? raw.joinCode : "",
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
    lastMessage: last && typeof last.text === "string"
      ? {
          text: last.text,
          senderUid: typeof last.senderUid === "string" ? last.senderUid : "",
          senderName: typeof last.senderName === "string" ? last.senderName : "",
          createdAt: toMillis(last.createdAt),
        }
      : undefined,
  };
}

export function normalizeGroupMessage(id: string, raw: DocumentData): GroupMessage {
  return {
    id,
    senderUid: typeof raw.senderUid === "string" ? raw.senderUid : "",
    senderName: typeof raw.senderName === "string" ? raw.senderName : "Gezgin",
    text: typeof raw.text === "string" ? raw.text : "",
    createdAt: toMillis(raw.createdAt),
  };
}

export function normalizeGroupIndex(groupId: string, raw: DocumentData): GroupIndexEntry {
  return {
    groupId,
    name: typeof raw.name === "string" ? raw.name : "Grup",
    role: raw.role === "owner" ? "owner" : "member",
    joinedAt: toMillis(raw.joinedAt),
  };
}

export function normalizeGroupInvite(id: string, raw: DocumentData): GroupInvite {
  return {
    id,
    invitedUid: typeof raw.invitedUid === "string" ? raw.invitedUid : id,
    inviterUid: typeof raw.inviterUid === "string" ? raw.inviterUid : "",
    groupId: typeof raw.groupId === "string" ? raw.groupId : "",
    groupName: typeof raw.groupName === "string" ? raw.groupName : "Grup",
    createdAt: toMillis(raw.createdAt),
  };
}

/** Yalnız kullanıcının kendi index'i; limit 20. */
export function subscribeMyGroups(
  uid: string,
  onChange: (groups: GroupIndexEntry[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid.trim()) return () => {};
  const q = query(
    collection(db, `users/${uid}/groups`),
    orderBy("joinedAt", "desc"),
    limit(GROUPS_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeGroupIndex(item.id, item.data()))),
    onError,
  );
}

export function subscribeMyGroupInvites(
  uid: string,
  onChange: (invites: GroupInvite[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !uid.trim()) return () => {};
  const q = query(
    collection(db, `users/${uid}/groupInvites`),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeGroupInvite(item.id, item.data()))),
    onError,
  );
}

export function subscribeGroupInvites(
  uid: string,
  onChange: (invites: GroupInvite[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return subscribeMyGroupInvites(uid, onChange, onError);
}

export function subscribeGroupInvitesForGroup(
  groupId: string,
  onChange: (invites: GroupInvite[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !groupId.trim()) return () => {};
  const q = query(
    collection(db, `groups/${groupId}/invites`),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeGroupInvite(item.id, item.data()))),
    onError,
  );
}

async function writeGroupIndex(uid: string, groupId: string, name: string, role: "owner" | "member") {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  await setDoc(
    doc(db, `users/${uid}/groups/${groupId}`),
    withoutUndefined({
      groupId,
      name: name.slice(0, 80),
      role,
      joinedAt: serverTimestamp(),
    }),
  );
}

/** Grup dokümanını yalnız üye okuyabilir; üye değilse Firestore reddeder. */
export async function fetchGroup(groupId: string): Promise<Group | null> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const snap = await getDoc(doc(db, "groups", groupId.trim()));
  if (!snap.exists()) return null;
  return normalizeGroup(snap.id, snap.data());
}

interface DeliverInvitesInput {
  groupId: string;
  groupName: string;
  ownerUid: string;
  ownerName: string;
  invitedUids: string[];
}

/** Her davet kendi batch'i: biri reddedilirse (arkadaş değil / zaten davetli) diğerleri gider. */
async function deliverGroupInvites(input: DeliverInvitesInput): Promise<{ delivered: string[]; invited: number; skipped: number }> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const delivered: string[] = [];
  for (const invitedUid of input.invitedUids) {
    const invite = withoutUndefined({
      invitedUid,
      inviterUid: input.ownerUid,
      groupId: input.groupId,
      groupName: input.groupName.slice(0, 80),
      createdAt: serverTimestamp(),
    });
    const inviteBatch = writeBatch(db);
    inviteBatch.set(doc(db, `groups/${input.groupId}/invites/${invitedUid}`), invite);
    inviteBatch.set(doc(db, `users/${invitedUid}/groupInvites/${input.groupId}`), invite);
    try {
      await inviteBatch.commit();
      delivered.push(invitedUid);
    } catch (error) {
      if (!isPermissionDenied(error)) throw error;
    }
  }
  let invited = 0;
  for (const memberUid of delivered) {
    try {
      await createNotification({
        recipientUid: memberUid,
        actorUid: input.ownerUid,
        type: "group_invite",
        title: "Grup daveti",
        body: `${input.ownerName} seni “${input.groupName}” grubuna davet etti. Daveti kabul ederek katılabilirsin.`,
        targetId: input.groupId,
      });
      invited += 1;
    } catch (error) {
      console.warn("[Atlasia] Grup daveti bildirimi yazılamadı:", error);
    }
  }
  return { delivered, invited, skipped: input.invitedUids.length - delivered.length };
}

/** Kurucu, kurulmuş gruba arkadaşlarını ekler (davet gider; kabul edince üye olurlar). */
export async function inviteFriendsToGroup(
  group: Pick<Group, "id" | "name" | "ownerUid" | "memberUids">,
  owner: { uid: string; name: string },
  friendUids: string[],
): Promise<{ delivered: string[]; invited: number; skipped: number }> {
  if (group.ownerUid !== owner.uid) throw dataError("group/not-owner", "Yalnız grup kurucusu kişi ekleyebilir.");
  const room = Math.max(0, GROUP_MEMBERS_MAX - group.memberUids.length);
  const invitedUids = [...new Set(friendUids.map((uid) => uid.trim()))]
    .filter((uid) => uid && uid !== owner.uid && uid.length <= 128 && !group.memberUids.includes(uid))
    .slice(0, room);
  return deliverGroupInvites({ groupId: group.id, groupName: group.name, ownerUid: owner.uid, ownerName: owner.name, invitedUids });
}

/** Kurucunun bu gruba gönderdiği bekleyen davetler (kural: inviterUid == kendisi). */
export function subscribeSentGroupInvites(
  groupId: string,
  inviterUid: string,
  onChange: (invites: GroupInvite[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !groupId.trim() || !inviterUid.trim()) return () => {};
  const q = query(
    collection(db, `groups/${groupId}/invites`),
    where("inviterUid", "==", inviterUid),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeGroupInvite(item.id, item.data()))),
    onError,
  );
}

export interface CreateGroupInput {
  name: string;
  ownerUid: string;
  ownerName: string;
  memberUids: string[];
  joinCode?: string;
}

export async function createGroup(input: CreateGroupInput): Promise<{ group: Group; invited: number; skipped: number }> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const invalid = validateGroupName(input.name);
  if (invalid) throw dataError(invalid, "Grup adı 2–80 karakter olmalı.");
  const name = input.name.trim();
  // Grup ilk olusturuldugunda yalniz kurucu uye olsun. Arkadaslar bekleyen davet olarak kaydedilsin.
  const joinCode = (input.joinCode ?? generateJoinCode()).trim();
  const invalidCode = validateJoinCode(joinCode);
  if (invalidCode) throw dataError(invalidCode, `Katılma kodu ${JOIN_CODE_MIN}–${JOIN_CODE_MAX} hane olmalı (yalnız rakam).`);
  const invitedUids = [...new Set(input.memberUids.map((uid) => uid.trim()).filter((uid) => uid && uid !== input.ownerUid && uid.length <= 128))].slice(0, GROUP_MEMBERS_MAX - 1);

  const ref = doc(collection(db, "groups"));
  const batch = writeBatch(db);
  batch.set(
    ref,
    withoutUndefined({
      name,
      ownerUid: input.ownerUid,
      memberUids: [input.ownerUid],
      joinCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await batch.commit();
  await writeGroupIndex(input.ownerUid, ref.id, name, "owner");

  // Davetler grup kurulumundan AYRI yazılır: kural yalnız kabul edilmiş
  // arkadaşa davete izin verir. Tek bir yanlış/arkadaş olmayan kimlik grubu
  // kurdurmamazlık etmesin; o davet atlanır ve sayısı bildirilir.
  const { invited, skipped } = await deliverGroupInvites({ groupId: ref.id, groupName: name, ownerUid: input.ownerUid, ownerName: input.ownerName, invitedUids });

  return {
    group: {
      id: ref.id,
      name,
      ownerUid: input.ownerUid,
      memberUids: [input.ownerUid],
      joinCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    invited,
    skipped,
  };
}

/**
 * Davet kabulü — okumasız: grup belgesi okunmaz. Grup adı davet aynasından
 * (users/{uid}/groupInvites/{g}) alınır. Üyelik, davet silme ve aynanın silinmesi
 * tek batch'te; grup yalnız katılımdan SONRA okunur.
 */
export async function acceptGroupInvite(groupId: string, uid: string): Promise<Group> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const cleanId = groupId.trim();
  const cleanUid = uid.trim();
  if (!cleanId || !cleanUid) throw dataError("group/id-invalid", "Grup kimliği geçersiz.");
  const mirrorRef = doc(db, `users/${cleanUid}/groupInvites/${cleanId}`);
  const mirrorSnap = await getDoc(mirrorRef);
  if (!mirrorSnap.exists()) {
    throw dataError("group/invite-not-found", "Bu gruba davetin yok. Kurucudan davet iste veya katılma kodunu kullan.");
  }
  const invite = normalizeGroupInvite(cleanId, mirrorSnap.data()!);
  const batch = writeBatch(db);
  batch.update(doc(db, "groups", cleanId), {
    memberUids: arrayUnion(cleanUid),
    updatedAt: serverTimestamp(),
  });
  batch.delete(doc(db, `groups/${cleanId}/invites/${cleanUid}`));
  batch.delete(mirrorRef);
  try {
    await batch.commit();
  } catch (failure) {
    if (isPermissionDenied(failure)) throw dataError("group/join-failed", "Gruba katılırken bir sorun oluştu.");
    throw failure;
  }
  await writeGroupIndex(cleanUid, cleanId, invite.groupName, "member");
  const fresh = await fetchGroup(cleanId);
  if (!fresh || !fresh.memberUids.includes(cleanUid)) throw dataError("group/join-failed", "Gruba katılırken bir sorun oluştu.");
  return fresh;
}

/**
 * Kod ile katılma — okumasız: gruba hiçbir `get`/`transaction.get` yapılmaz.
 * 1) Kendi deneme belgesi ayrı commit (sayaç kalıcı).
 * 2) Tek batch: yalnız memberUids arrayUnion + updatedAt. Kural kodu ve sayacı
 *    kendi deneme belgesinden okur.
 * 3) Katılımdan sonra grup okunur ve indeks yazılır.
 */
export async function joinGroupWithCode(groupId: string, code: string, uid: string): Promise<Group> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const clean = code.trim();
  const invalidCode = validateJoinCode(clean);
  if (invalidCode) throw dataError(invalidCode, `Katılma kodu ${JOIN_CODE_MIN}–${JOIN_CODE_MAX} hane olmalı (yalnız rakam).`);
  const cleanUid = uid.trim();
  const cleanId = groupId.trim();
  if (!cleanId || !cleanUid) throw dataError("group/id-invalid", "Grup kimliği geçersiz.");

  // Kendi grup indeksi (kendi belgesi; grup belgesi değil): zaten üyeyse kod denemesi gerekmez.
  const ownIndex = await getDoc(doc(db, `users/${cleanUid}/groups/${cleanId}`));
  if (ownIndex.exists()) throw dataError("group/already-member", "Bu gruptasın.");

  await writeJoinAttempt(cleanId, cleanUid, clean);

  const batch = writeBatch(db);
  batch.update(doc(db, "groups", cleanId), {
    memberUids: arrayUnion(cleanUid),
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (failure) {
    if (isPermissionDenied(failure)) throw dataError("group/bad-code", BAD_CODE_MESSAGE);
    throw failure;
  }

  const fresh = await fetchGroup(cleanId);
  if (!fresh || !fresh.memberUids.includes(cleanUid)) throw dataError("group/not-found", "Grup bulunamadı.");
  await writeGroupIndex(cleanUid, fresh.id, fresh.name, fresh.ownerUid === cleanUid ? "owner" : "member");
  return fresh;
}

/** Kurucu katılma kodunu yeniler (kod paylaşıldıysa eskisi geçersizleşir). */
export async function rotateGroupCode(groupId: string, uid: string): Promise<string> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const group = await fetchGroup(groupId);
  if (!group) throw dataError("group/not-found", "Grup bulunamadı.");
  if (group.ownerUid !== uid) throw dataError("group/not-owner", "Yalnız grup sahibi kodu yenileyebilir.");
  const joinCode = generateJoinCode();
  await updateDoc(doc(db, "groups", groupId), { joinCode, updatedAt: serverTimestamp() });
  return joinCode;
}

export const GROUP_NOT_MEMBER_MESSAGE =
  "Bu gruba katılamadın. Grup kimliğinin tamamını yazdığından emin ol; kurucunun seni grubu kurarken hesap kimliğinle eklemiş olması gerekir.";

export async function joinGroup(rawGroupId: string, uid: string): Promise<Group> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const groupId = rawGroupId.trim();
  if (!groupId) throw dataError("group/not-found", "Grup kimliğini yaz.");
  let group: Group | null;
  try {
    group = await fetchGroup(groupId);
  } catch (failure) {
    if (isPermissionDenied(failure)) {
      throw dataError("group/not-member", GROUP_NOT_MEMBER_MESSAGE);
    }
    throw failure;
  }
  if (!group) throw dataError("group/not-found", "Grup bulunamadı.");
  if (!group.memberUids.includes(uid)) {
    throw dataError("group/not-member", GROUP_NOT_MEMBER_MESSAGE);
  }
  const existingIndex = await getDoc(doc(db, `users/${uid}/groups/${group.id}`));
  if (!existingIndex.exists()) {
    await writeGroupIndex(uid, group.id, group.name, group.ownerUid === uid ? "owner" : "member");
  }
  return group;
}

export async function declineGroupInvite(groupId: string, uid: string): Promise<void> {
  if (!db) return;
  const cleanId = groupId.trim();
  const cleanUid = uid.trim();
  if (!cleanId || !cleanUid) throw dataError("group/id-invalid", "Grup kimliği geçersiz.");
  const batch = writeBatch(db);
  batch.delete(doc(db, `groups/${cleanId}/invites/${cleanUid}`));
  batch.delete(doc(db, `users/${cleanUid}/groupInvites/${cleanId}`));
  await batch.commit();
}

export async function cancelGroupInvite(groupId: string, ownerUid: string, invitedUid: string): Promise<void> {
  if (!db) return;
  const cleanId = groupId.trim();
  const cleanOwner = ownerUid.trim();
  const cleanInvited = invitedUid.trim();
  if (!cleanId || !cleanOwner || !cleanInvited) throw dataError("group/id-invalid", "Grup kimliği geçersiz.");
  const group = await fetchGroup(cleanId);
  if (!group || group.ownerUid !== cleanOwner) throw dataError("group/not-owner", "Yalnız kurucu daveti iptal edebilir.");
  const batch = writeBatch(db);
  batch.delete(doc(db, `groups/${cleanId}/invites/${cleanInvited}`));
  batch.delete(doc(db, `users/${cleanInvited}/groupInvites/${cleanId}`));
  await batch.commit();
}

export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const group = await fetchGroup(groupId);
  if (!group) throw dataError("group/not-found", "Grup bulunamadı.");
  if (group.ownerUid === uid) {
    throw dataError("group/owner-leave", "Grup sahibi önce grubu silmeli veya devretmelidir.");
  }
  if (!group.memberUids.includes(uid)) throw dataError("group/not-member", "Bu grubun üyesi değilsin.");
  const updated = group.memberUids.filter((member) => member !== uid);
  const batch = writeBatch(db);
  batch.update(doc(db, "groups", groupId), {
    memberUids: updated,
    updatedAt: serverTimestamp(),
  });
  batch.delete(doc(db, `users/${uid}/groups/${groupId}`));
  await batch.commit();
}

const GROUP_CLEANUP_PAGE = 50;
const GROUP_CLEANUP_MAX_PAGES = 200;

/**
 * Grubun TÜM mesajlarını sayfalı siler (yalnız grup sahibi başkasının mesajını
 * silebilir: kural). Hata yutulmaz; sınır aşılırsa fırlatır.
 */
export async function deleteAllGroupMessages(groupId: string): Promise<number> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const firestore = db;
  let deleted = 0;
  for (let page = 0; page < GROUP_CLEANUP_MAX_PAGES; page += 1) {
    const snap = await getDocs(query(collection(firestore, `groups/${groupId}/messages`), limit(GROUP_CLEANUP_PAGE)));
    if (snap.size === 0) return deleted;
    const batch = writeBatch(firestore);
    snap.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    deleted += snap.size;
  }
  throw dataError("data/delete-incomplete", "Grup mesajları silme sınırına ulaşıldı; tekrar deneyin.");
}

/** Sahip grubu siler: önce yetim mesajlar (sayfalı), sonra grup ve sahibin indeksi. */
export async function deleteGroup(groupId: string, uid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const group = await fetchGroup(groupId);
  if (!group) return;
  if (group.ownerUid !== uid) throw dataError("group/not-owner", "Yalnız grup sahibi silebilir.");
  await deleteAllGroupMessages(groupId);
  const batch = writeBatch(db);
  batch.delete(doc(db, "groups", groupId));
  batch.delete(doc(db, `users/${uid}/groups/${groupId}`));
  await batch.commit();
}

/** En yeni 50 mesaj; sohbet başına tek canlı dinleyici. */
export function subscribeMessages(
  groupId: string,
  onChange: (messages: GroupMessage[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !groupId.trim()) return () => {};
  const q = query(
    collection(db, `groups/${groupId}/messages`),
    orderBy("createdAt", "desc"),
    limit(MESSAGES_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeGroupMessage(item.id, item.data()))),
    onError,
  );
}

export function messageRecipients(group: Group, senderUid: string): string[] {
  return group.memberUids.filter((member) => member !== senderUid);
}

export function validateMessageText(text: string): string | null {
  const clean = text.trim();
  if (!clean) return "message/empty";
  if (clean.length > MESSAGE_TEXT_MAX) return "message/too-long";
  return null;
}

export interface OutgoingMessage {
  message: { senderUid: string; senderName: string; text: string };
  lastMessage: { text: string; senderUid: string; senderName: string };
  recipients: string[];
  notifications: Array<{
    recipientUid: string;
    actorUid: string;
    type: "group_message";
    title: string;
    body: string;
    targetId: string;
  }>;
}

/**
 * Mesaj yükünü ve bildirim alıcılarını tek yerde üretir. Aynı grup içindeki iki
 * kullanıcı için birim testte doğrulanabilir; Firestore yazımı ayrı adımdır.
 */
export function buildOutgoingMessage(
  group: Group,
  sender: { uid: string; name: string },
  text: string,
): OutgoingMessage {
  const invalid = validateMessageText(text);
  if (invalid) throw dataError(invalid, "Mesaj 1–1000 karakter olmalı.");
  const clean = text.trim();
  const senderName = sender.name.trim().slice(0, 100) || "Gezgin";
  const recipients = messageRecipients(group, sender.uid);
  return {
    message: { senderUid: sender.uid, senderName, text: clean },
    lastMessage: { text: clean.slice(0, 200), senderUid: sender.uid, senderName },
    recipients,
    notifications: recipients.map((recipientUid) => ({
      recipientUid,
      actorUid: sender.uid,
      type: "group_message" as const,
      title: group.name.slice(0, 80),
      body: `${senderName.slice(0, 60)}: ${clean.slice(0, 160)}`,
      targetId: group.id,
    })),
  };
}

export async function sendGroupMessage(
  group: Group,
  sender: { uid: string; name: string },
  text: string,
): Promise<GroupMessage> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const outgoing = buildOutgoingMessage(group, sender, text);
  const messageRef = doc(collection(db, "groups", group.id, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    ...outgoing.message,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "groups", group.id), {
    lastMessage: { ...outgoing.lastMessage, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  for (const notification of outgoing.notifications) {
    try {
      await createNotification(notification);
    } catch (error) {
      console.warn("[Atlasia] Mesaj bildirimi yazılamadı:", error);
    }
  }

  return {
    id: messageRef.id,
    senderUid: outgoing.message.senderUid,
    senderName: outgoing.message.senderName,
    text: outgoing.message.text,
    createdAt: Date.now(),
  };
}

/** Mesaj sayfalama: en yeni 50 canlı, daha eskisi cursor ile. */
type FirestoreCursor = QueryDocumentSnapshot<DocumentData>;

export interface MessagesPage {
  items: GroupMessage[];
  cursor: FirestoreCursor | null;
  hasMore: boolean;
}

function messagesPageQuery(groupId: string, cursor?: FirestoreCursor) {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  return query(
    collection(db, `groups/${groupId}/messages`),
    orderBy("createdAt", "desc"),
    orderBy(documentId(), "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(MESSAGES_LIMIT),
  );
}

export async function listMessagesPage(groupId: string, cursor?: FirestoreCursor): Promise<MessagesPage> {
  if (!groupId.trim()) throw dataError("group/id-invalid", "Grup kimliği geçersiz.");
  const snap = await getDocs(messagesPageQuery(groupId.trim(), cursor));
  return {
    items: snap.docs.map((d) => normalizeGroupMessage(d.id, d.data())),
    cursor: (snap.docs.at(-1) as unknown as FirestoreCursor) ?? null,
    hasMore: snap.size === MESSAGES_LIMIT,
  };
}

/** Engellenen kullanıcıların mesajları görünümden düşer. */
export function visibleMessages(messages: GroupMessage[], blockedUids: Set<string>): GroupMessage[] {
  return messages.filter((message) => !blockedUids.has(message.senderUid));
}

export async function deleteGroupMessage(groupId: string, messageId: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  await deleteDoc(doc(db, `groups/${groupId}/messages/${messageId}`));
}
