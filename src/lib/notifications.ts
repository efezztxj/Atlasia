/**
 * Atlasia — Bildirim iskeleti (Adım 13 temel, Adım 16'da genişler)
 * Firestore subcollection: users/{recipientUid}/notifications/{id}
 * Otonom karar: bildirimler Firestore'da, limit'li (50), ücretsiz kotada kal.
 */
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type NotificationType = "report_received" | "report_actioned" | "blocked" | "group_invite" | "group_message" | "friend_request" | "friend_accepted" | "friend_declined" | "system";

export interface AppNotification {
  id: string;
  recipientUid: string;
  actorUid: string;
  type: NotificationType;
  title: string;
  body: string;
  targetId?: string;
  read: boolean;
  createdAt: number;
}

function toMillis(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function normalizeNotification(id: string, raw: Record<string, unknown>): AppNotification {
  return {
    id,
    recipientUid: typeof raw.recipientUid === "string" ? raw.recipientUid : "",
    actorUid: typeof raw.actorUid === "string" ? raw.actorUid : "",
    type: (raw.type as NotificationType) ?? "system",
    title: typeof raw.title === "string" ? raw.title : "",
    body: typeof raw.body === "string" ? raw.body : "",
    targetId: typeof raw.targetId === "string" ? raw.targetId : undefined,
    read: raw.read === true,
    createdAt: toMillis(raw.createdAt),
  };
}

export async function createNotification(input: Omit<AppNotification, "id" | "createdAt" | "read"> & { read?: boolean }): Promise<string> {
  if (!db) throw new Error("Firestore hazır değil.");
  const store = db;
  const recipientUid = input.recipientUid.trim();
  if (!recipientUid) throw new Error("Alıcı gerekli.");
  const id = newId("nt");
  const payload: Record<string, unknown> = {
    recipientUid,
    actorUid: input.actorUid,
    type: input.type,
    title: input.title.slice(0, 200),
    body: input.body.slice(0, 500),
    read: input.read ?? false,
    createdAt: serverTimestamp(),
  };
  if (input.targetId) payload.targetId = input.targetId;
  await setDoc(doc(store, `users/${recipientUid}/notifications/${id}`), payload);
  return id;
}

export function subscribeNotifications(
  recipientUid: string,
  onChange: (items: AppNotification[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db || !recipientUid.trim()) return () => {};
  const q = query(
    collection(db, `users/${recipientUid}/notifications`),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => normalizeNotification(d.id, d.data()))),
    onError,
  );
}

export async function markNotificationRead(recipientUid: string, notificationId: string, read = true): Promise<void> {
  if (!db) return;
  const store = db;
  await updateDoc(doc(store, `users/${recipientUid}/notifications/${notificationId}`), { read });
}

export async function deleteNotification(recipientUid: string, notificationId: string): Promise<void> {
  if (!db) return;
  const store = db;
  await deleteDoc(doc(store, `users/${recipientUid}/notifications/${notificationId}`));
}

export async function markAllRead(recipientUid: string, notifications: AppNotification[]): Promise<void> {
  if (!db) return;
  const store = db;
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  const { writeBatch } = await import("firebase/firestore");
  const batch = writeBatch(store);
  unread.forEach((n) => {
    batch.update(doc(store, `users/${recipientUid}/notifications/${n.id}`), { read: true });
  });
  await batch.commit();
}
