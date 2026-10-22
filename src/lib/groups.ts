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
  arrayUnion,
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

export const GROUPS_LIMIT = 20;
export const GROUP_MEMBERS_MAX = 20;
export const MESSAGES_LIMIT = 50;
export const MESSAGE_TEXT_MAX = 1000;

export interface Group {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
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

/**
 * Davet listesini KABUL EDİLMİŞ ARKADAŞLARLA kesiştirir.
 *
 * Rıza sınırı: kabul edilmiş arkadaşlık olmadan kimse gruba davet edilemez,
 * hele doğrudan EKLENEMEZ. `acceptedFriendUids` boşsa hiçbir davet üretilmez.
 * Kendi UID'i, boşluklar, tekrarlar ve arkadaş olmayan kimlikler ayıklanır.
 */
export function normalizeInviteUids(
  ownerUid: string,
  acceptedFriendUids: readonly string[],
  raw: readonly string[],
): { invited: string[]; rejected: string[] } {
  const friends = new Set(acceptedFriendUids.map((uid) => uid.trim()).filter(Boolean));
  const clean = raw.map((uid) => uid.trim()).filter((uid) => uid.length > 0 && uid.length <= 128);
  const invited: string[] = [];
  const rejected: string[] = [];
  for (const uid of clean) {
    if (uid === ownerUid.trim()) continue;
    if (friends.has(uid)) {
      if (!invited.includes(uid)) invited.push(uid);
    } else if (!rejected.includes(uid)) {
      rejected.push(uid);
    }
  }
  return { invited: invited.slice(0, GROUP_MEMBERS_MAX - 1), rejected };
}

export function validateGroupName(name: string): string | null {
  const clean = name.trim();
  if (clean.length < 2) return "group/name-too-short";
  if (clean.length > 80) return "group/name-too-long";
  return null;
}

export function normalizeGroup(id: string, raw: DocumentData): Group {
  const last = raw.lastMessage as Record<string, unknown> | undefined;
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "Grup",
    ownerUid: typeof raw.ownerUid === "string" ? raw.ownerUid : "",
    memberUids: Array.isArray(raw.memberUids) ? (raw.memberUids as string[]) : [],
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
  /**
   * Davet edilecek hesap kimlikleri. ARTIK doğrudan üye yazılmaz: bunlar
   * `acceptedFriendUids` ile kesiştirilir ve yalnız davet bildirimi üretir.
   */
  memberUids: string[];
  /** Kabul edilmiş arkadaş kimlikleri; verilmezse hiçbir davet gönderilmez. */
  acceptedFriendUids?: readonly string[];
}

/**
 * Grup kurar ve KABUL EDİLMİŞ ARKADAŞLARA davet gönderir.
 *
 * RIZA DEĞİŞİKLİĞİ (kök neden: kullanıcı UID yazarak davet etmekte zorlanıyordu
 * ve rızasız ekleme mümkündü): grup başlangıçta YALNIZ kurucuyu üye yazar.
 * Seçilen arkadaşlar `memberUids`'e zorla eklenmez; kendilerine `group_invite`
 * bildirimi gider ve daveti `acceptGroupInvite` ile KABUL ETTİKLERİNDE kendi
 * kendilerini eklerler. Firestore kuralı bu kendini-eklemeyi ancak kurucuyla
 * `friendships/{pairId}.status == 'accepted'` ise onaylar; aksi hâlde reddeder.
 *
 * `joinGroup` / katılma akışı bozulmadı: üye listesinde zaten görünen kullanıcı
 * için davranış aynıdır.
 */
export async function createGroup(input: CreateGroupInput): Promise<{ group: Group; invited: number; rejected: string[] }> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const invalid = validateGroupName(input.name);
  if (invalid) throw dataError(invalid, "Grup adı 2–80 karakter olmalı.");
  const name = input.name.trim();
  const ownerUid = input.ownerUid.trim();
  if (!ownerUid) throw dataError("group/member-required", "Grup için kurucu gerekli.");

  const { invited: inviteUids, rejected } = normalizeInviteUids(
    ownerUid,
    input.acceptedFriendUids ?? [],
    input.memberUids ?? [],
  );

  // Kurucu tek başına da grup kurabilir; davetliler kabul ettikçe üye olur.
  const memberUids = normalizeMemberUids(ownerUid, []);

  const ref = doc(collection(db, "groups"));
  await setDoc(ref, {
    name,
    ownerUid,
    memberUids,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await writeGroupIndex(ownerUid, ref.id, name, "owner");

  let invited = 0;
  for (const inviteUid of inviteUids) {
    try {
      await createNotification({
        recipientUid: inviteUid,
        actorUid: ownerUid,
        type: "group_invite",
        title: "Grup daveti",
        body: `${input.ownerName} seni “${name}” grubuna davet etti. Kabul edersen üye olursun.`,
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
      ownerUid,
      memberUids,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    invited,
    rejected,
  };
}

/**
 * Grup davetini KABUL eder: kullanıcı kendini ekler.
 *
 * Kural denetimi: üye olmayan biri `groups/{id}` belgesini OKUYAMAZ
 * (`allow get: request.auth.uid in memberUids`), bu yüzden önce kendini ekler,
 * sonra — artık üye olduğu için — grubu okuyup kendi indeksini yazar.
 * Kurucuyla kabul edilmiş arkadaşlığı yoksa Firestore bu yazımı reddeder.
 */
export async function acceptGroupInvite(groupId: string, uid: string): Promise<Group> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const clean = uid.trim();
  const cleanGroup = groupId.trim();
  if (!clean || !cleanGroup) throw dataError("group/not-found", "Grup bulunamadı.");

  try {
    await updateDoc(doc(db, "groups", cleanGroup), {
      memberUids: arrayUnion(clean),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";
    if (String(code).includes("permission-denied")) {
      throw dataError("group/invite-denied", "Bu daveti kabul edemedin. Kurucuyla arkadaşlığın onaylı olmalı.");
    }
    throw error;
  }

  const group = await fetchGroup(cleanGroup);
  if (!group) throw dataError("group/not-found", "Grup bulunamadı.");
  await writeGroupIndex(clean, group.id, group.name, group.ownerUid === clean ? "owner" : "member");
  return group;
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
