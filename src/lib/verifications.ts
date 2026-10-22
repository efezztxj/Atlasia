/**
 * Atlasia — Ziyaret doğrulamaları (Adım 14 tazelik döngüsü).
 *
 * Okuma tavanı: tek canlı sorgu, en yeni 50 doğrulama (`limit(50)`). Ücretsiz
 * Firestore kotasında kalmak için toplam görünürlük taranmaz; eski doğrulamalar
 * pencereden düşer ve tazelik "eski" bandına geçer.
 */
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  validateVerificationInput,
  VERIFICATION_STATUSES,
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

/**
 * Doğrulama belge kimliği — TEK biçim: `{placeId}_{uid}`.
 *
 * Neden: kimlik sunucu tarafında sınırlanmadığında aynı kişi aynı yere sınırsız
 * doğrulama yazabiliyordu (İŞ 1d). Kimlik yer + kişiye bağlanınca bu doğal
 * olarak tekilliğe düşer ve kural da `verificationId == placeId + "_" + uid`
 * eşitliğini isteyebilir.
 *
 * Geriye dönük uyum: eski `vr-…` belgeleri okunmaya ve silinmeye devam eder;
 * kimlik yalnız yeni yazımda değişir (`normalizeVerification` kimliğe bakmaz).
 */
export function verificationDocId(placeId: string, uid: string): string {
  const place = placeId.trim();
  const owner = uid.trim();
  if (!place) throw Object.assign(new Error("Yer kimliği boş."), { code: "verification/place-invalid" });
  if (!owner) throw Object.assign(new Error("Doğrulama için giriş gerekli."), { code: "auth/required" });
  return `${place}_${owner}`;
}

/** Eski (`vr-…`) biçimde yazılmış belge mi? Yalnız göç/teşhis için. */
export function isLegacyVerificationId(id: string, placeId?: string, uid?: string): boolean {
  if (!id.startsWith("vr-")) return false;
  if (placeId && uid) return id !== `${placeId}_${uid}`;
  return true;
}

export function normalizeVerification(id: string, raw: Record<string, unknown>): PlaceVerification {
  const status = typeof raw.status === "string" &&
    (VERIFICATION_STATUSES as readonly string[]).includes(raw.status)
    ? raw.status as VerificationStatus
    : "still_open";
  return {
    id,
    placeId: typeof raw.placeId === "string" ? raw.placeId : "",
    uid: typeof raw.uid === "string" ? raw.uid : "",
    status,
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
  const placeId = input.placeId.trim();
  const id = verificationDocId(placeId, uid);
  const payload: Record<string, unknown> = {
    placeId,
    uid,
    status: input.status,
    createdAt: serverTimestamp(),
  };
  const note = input.note?.trim();
  if (note) payload.note = note.slice(0, 280);

  const ref = doc(db, "verifications", id);
  // Kural güncellemeye izin vermez (createdAt == request.time). Tekrar
  // doğrulamada önceki kendi belgesi silinir; başkasının belgesine dokunulmaz
  // (kimlik uid içerdiği için pratikte çakışmaz, yine de sahiplik kontrol edilir).
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().uid === uid) {
    await deleteDoc(ref);
  }
  await setDoc(ref, payload);
  return {
    id,
    placeId,
    uid,
    status: input.status,
    note: note || undefined,
    createdAt: Date.now(),
  };
}

/**
 * Yer başına doğrulama sayısı — rozet sayacı (İŞ 1d).
 *
 * `getCountFromServer` Spark planında çalışır ve belge okumaz. Sorgu
 * **limit(50)** taşır: kural (`allow list: if signedIn() && boundedList(50)`)
 * limitsiz listeye izin vermez; toplama bu pencereyle sınırlıdır, sayaç da
 * uygulamanın gördüğü pencereyle aynı tavanı paylaşır.
 */
export async function countPlaceVerifications(placeId: string): Promise<number> {
  if (!db) return 0;
  const clean = placeId.trim();
  if (!clean) return 0;
  const snapshot = await getCountFromServer(query(
    collection(db, "verifications"),
    where("placeId", "==", clean),
    limit(VERIFICATIONS_LIMIT),
  ));
  return snapshot.data().count;
}
