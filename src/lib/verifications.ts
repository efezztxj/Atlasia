/**
 * Atlasia — Ziyaret doğrulamaları (Adım 14 tazelik döngüsü).
 *
 * Okuma tavanı: tek canlı sorgu, en yeni 50 doğrulama (`limit(50)`). Ücretsiz
 * Firestore kotasında kalmak için toplam görünürlük taranmaz; eski doğrulamalar
 * pencereden düşer ve tazelik "eski" bandına geçer.
 */
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  validateVerificationInput,
  type PlaceVerification,
  type VerificationStatus,
} from "../utils/freshness";

export const VERIFICATIONS_LIMIT = 50;

function toMillis(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function newId(): string {
  return `vr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function normalizeVerification(id: string, raw: Record<string, unknown>): PlaceVerification {
  return {
    id,
    placeId: typeof raw.placeId === "string" ? raw.placeId : "",
    uid: typeof raw.uid === "string" ? raw.uid : "",
    status: (raw.status as VerificationStatus) ?? "still_open",
    note: typeof raw.note === "string" ? raw.note : undefined,
    createdAt: toMillis(raw.createdAt),
  };
}

export function subscribeRecentVerifications(
  onChange: (items: PlaceVerification[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) return () => {};
  const q = query(
    collection(db, "verifications"),
    orderBy("createdAt", "desc"),
    limit(VERIFICATIONS_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => normalizeVerification(item.id, item.data()))),
    onError,
  );
}

export interface NewVerificationInput {
  placeId: string;
  uid: string;
  status: VerificationStatus;
  note?: string;
}

export async function addPlaceVerification(input: NewVerificationInput): Promise<PlaceVerification> {
  if (!db) throw new Error("Firestore hazır değil.");
  const uid = input.uid.trim();
  if (!uid) throw Object.assign(new Error("Doğrulama için giriş gerekli."), { code: "auth/required" });
  const invalid = validateVerificationInput(input);
  if (invalid) throw Object.assign(new Error("Doğrulama bilgileri geçersiz."), { code: invalid });
  const id = newId();
  const payload: Record<string, unknown> = {
    placeId: input.placeId.trim(),
    uid,
    status: input.status,
    createdAt: serverTimestamp(),
  };
  const note = input.note?.trim();
  if (note) payload.note = note.slice(0, 280);
  await setDoc(doc(db, "verifications", id), payload);
  return {
    id,
    placeId: input.placeId.trim(),
    uid,
    status: input.status,
    note: note || undefined,
    createdAt: Date.now(),
  };
}
