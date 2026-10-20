/**
 * Atlasia — Kişisel gruplar ve sohbet (Adım 16)
 *
 * Karar (g) BAĞLI: yalnız Firestore. Realtime Database ve üçüncü taraf yok.
 * Ücretsiz katman kotası için:
 *   - grup listesi kullanıcının kendi indeksinden en fazla 20 kayıt,
 *   - her sohbet tek sorguda en yeni 50 mesaj,
 *   - grup dokümanı yalnız üyeye tek `get` ile açık,
 *   - geniş koleksiyon taraması (limitsiz list) kurallarla kapalı.
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
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notifications";

export const GROUPS_LIMIT = 20;
export const GROUP_MEMBERS_MAX = 20;
export const MESSAGES_LIMIT = 50;
export const MESSAGE_TEXT_MAX = 1000;
/** Grup katılma kodu: en az 4, en fazla 8 hane (kullanıcı isteği: en az 4 haneli). */
export const JOIN_CODE_MIN = 4;
export const JOIN_CODE_MAX = 8;

export interface Group {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  /** Katılma kodu — yalnız grup üyeleri okuyabilir; kuralda [0-9]{4,8} zorunlu. */
  joinCode: string;
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

/** Varsayılan 6 haneli katılma kodu; mümkünse güvenli rastgelelikle. */
export function generateJoinCode(): string {
  const digits = JOIN_CODE_MIN + 2;
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

async function writeGroupIndex(uid: string, groupId: string, name: string, role: "owner" | "member") {
  if (!db) return;
  await setDoc(doc(db, `users/${uid}/groups/${groupId}`), {
    groupId,
    name: name.slice(0, 80),
    role,
    joinedAt: serverTimestamp(),
  });
}

/** Grup dokümanını yalnız üye okuyabilir; üye değilse Firestore reddeder. */
export async function fetchGroup(groupId: string): Promise<Group | null> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const snap = await getDoc(doc(db, "groups", groupId.trim()));
  if (!snap.exists()) return null;
  return normalizeGroup(snap.id, snap.data());
}

export interface CreateGroupInput {
  name: string;
  ownerUid: string;
  ownerName: string;
  memberUids: string[];
  /** Boş bırakılırsa 6 haneli kod üretilir. */
  joinCode?: string;
}

export async function createGroup(input: CreateGroupInput): Promise<{ group: Group; invited: number }> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const invalid = validateGroupName(input.name);
  if (invalid) throw dataError(invalid, "Grup adı 2–80 karakter olmalı.");
  const name = input.name.trim();
  const memberUids = normalizeMemberUids(input.ownerUid, input.memberUids);
  if (memberUids.length < 1) throw dataError("group/member-required", "Grup için en az bir üye gerekli.");
  const joinCode = (input.joinCode ?? generateJoinCode()).trim();
  const invalidCode = validateJoinCode(joinCode);
  if (invalidCode) throw dataError(invalidCode, `Katılma kodu ${JOIN_CODE_MIN}–${JOIN_CODE_MAX} hane olmalı (yalnız rakam).`);

  const ref = doc(collection(db, "groups"));
  await setDoc(ref, {
    name,
    ownerUid: input.ownerUid,
    memberUids,
    joinCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await writeGroupIndex(input.ownerUid, ref.id, name, "owner");

  let invited = 0;
  for (const memberUid of memberUids) {
    if (memberUid === input.ownerUid) continue;
    try {
      await createNotification({
        recipientUid: memberUid,
        actorUid: input.ownerUid,
        type: "group_invite",
        title: "Grup daveti",
        body: `${input.ownerName} seni “${name}” grubuna ekledi. Gruplar bölümünden açabilirsin.`,
        targetId: ref.id,
      });
      invited += 1;
    } catch (error) {
      console.warn("[Atlasia] Grup daveti bildirimi yazılamadı:", error);
    }
  }

  return {
    group: {
      id: ref.id,
      name,
      ownerUid: input.ownerUid,
      memberUids,
      joinCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    invited,
  };
}

/**
 * Kod ile katılma: aynı batch'te gizli doğrulama yazısı + üyelik güncellemesi.
 * Kural, `groups/{id}/joinAttempts/{uid}` içindeki kodun `joinCode` ile eşleşmesini
 * getAfter ile atomik denetler; kod yanlışsa tüm batch reddedilir.
 */
export async function joinGroupWithCode(groupId: string, code: string, uid: string): Promise<Group> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const clean = code.trim();
  const invalidCode = validateJoinCode(clean);
  if (invalidCode) throw dataError(invalidCode, `Katılma kodu ${JOIN_CODE_MIN}–${JOIN_CODE_MAX} hane olmalı (yalnız rakam).`);
  const group = await fetchGroup(groupId);
  if (group && group.memberUids.includes(uid)) {
    await writeGroupIndex(uid, group.id, group.name, group.ownerUid === uid ? "owner" : "member");
    return group;
  }

  const groupRef = doc(db, "groups", groupId);
  const attemptRef = doc(db, `groups/${groupId}/joinAttempts/${uid}`);
  try {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(groupRef);
      if (!snapshot.exists()) throw dataError("group/not-found", "Grup bulunamadı.");
      const current = normalizeGroup(groupId, snapshot.data()!);
      if (current.memberUids.includes(uid)) return;
      if (current.memberUids.length >= GROUP_MEMBERS_MAX) {
        throw dataError("group/full", "Grup dolu (en fazla 20 üye).");
      }
      transaction.set(attemptRef, { code: clean, at: serverTimestamp() });
      transaction.update(groupRef, {
        memberUids: [...current.memberUids, uid],
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    const codeText = (error as { code?: string }).code ?? "";
    if (codeText.includes("permission-denied")) {
      throw dataError("group/bad-code", "Katılma kodu yanlış.");
    }
    throw error;
  } finally {
    // Doğrulama izi gizli kalmasın diye temizle (en iyi çaba).
    void deleteDoc(attemptRef).catch(() => {});
  }

  const fresh = await fetchGroup(groupId);
  if (!fresh || !fresh.memberUids.includes(uid)) throw dataError("group/not-found", "Grup bulunamadı.");
  await writeGroupIndex(uid, fresh.id, fresh.name, fresh.ownerUid === uid ? "owner" : "member");
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

export async function joinGroup(groupId: string, uid: string): Promise<Group> {
  const group = await fetchGroup(groupId);
  if (!group) throw dataError("group/not-found", "Grup bulunamadı.");
  if (!group.memberUids.includes(uid)) {
    throw dataError("group/not-member", "Bu gruba eklenmemişsin. Kurucudan davet iste.");
  }
  await writeGroupIndex(uid, group.id, group.name, group.ownerUid === uid ? "owner" : "member");
  return group;
}

export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  if (!db) return;
  const group = await fetchGroup(groupId);
  if (!group) return;
  if (group.ownerUid === uid) {
    throw dataError("group/owner-leave", "Grup sahibi önce grubu silmeli veya devretmelidir.");
  }
  await updateDoc(doc(db, "groups", groupId), {
    memberUids: group.memberUids.filter((member) => member !== uid),
    updatedAt: serverTimestamp(),
  });
  await deleteDoc(doc(db, `users/${uid}/groups/${groupId}`));
}

export async function deleteGroup(groupId: string, uid: string): Promise<void> {
  if (!db) return;
  const group = await fetchGroup(groupId);
  if (!group) return;
  if (group.ownerUid !== uid) throw dataError("group/not-owner", "Yalnız grup sahibi silebilir.");
  await deleteDoc(doc(db, "groups", groupId));
  await deleteDoc(doc(db, `users/${uid}/groups/${groupId}`));
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

/** Engellenen kullanıcıların mesajları görünümden düşer. */
export function visibleMessages(messages: GroupMessage[], blockedUids: Set<string>): GroupMessage[] {
  return messages.filter((message) => !blockedUids.has(message.senderUid));
}

export async function deleteGroupMessage(groupId: string, messageId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, `groups/${groupId}/messages/${messageId}`));
}
