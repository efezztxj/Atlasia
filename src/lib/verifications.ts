/**
 * Atlasia — Ziyaret doğrulamaları (Adım 14 tazelik döngüsü).
 *
 * Okuma tavanı: tek canlı sorgu, en yeni 50 doğrulama (`limit(50)`). Ücretsiz
 * Firestore kotasında kalmak için toplam görünürlük taranmaz; eski doğrulamalar
 * pencereden düşer ve tazelik "eski" bandına geçer.
 *
 * Belge kimliği deterministiktir: `{placeId}_{uid}` (kurallar zorunlu tutar).
 * Aynı kişinin aynı yere ikinci doğrulaması aynı belgeyi günceller; tazelik
 * özeti her kişi için en güncel durumu sayar. Eski rastgele kimlikli belgeler
 * okuma tarafında aynen görünür, sahipleri yeniden doğruladıkça deterministik
 * belgeye geçilir.
 */
import {
  collection,
  doc,
  getCountFromServer,
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

/** Doğrulama belge kimliği: rozet/takip sorgularının tek okumayla çalışması için. */
export function verificationIdFor(placeId: string, uid: string): string {
  return `${placeId.trim()}_${uid.trim()}`;
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

/**
 * Tazelik okuması yalnız Firebase üyesiyle yapılır: kural `signedIn()` ister
 * (D5.1-A). Cihaz hesabında bulut oturumu yoktur; istek atmak `permission-denied`
 * üretir, bu yüzden hiç abone olunmaz.
 */
export function freshnessReaderUid(
  account: { uid?: string | null; backend?: string | null } | null | undefined,
): string | undefined {
  const uid = account?.uid?.trim();
  if (!uid || account?.backend !== "firebase") return undefined;
  return uid;
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
  // Belge kimliği placeId içerdiği için "/" kimliği bölerdi; yer kimlikleri
  // Firestore belge kimliği olduğundan zaten "/" içeremez, yine de erken ret.
  if (placeId.includes("/") || uid.includes("/")) {
    throw Object.assign(new Error("Doğrulama bilgileri geçersiz."), { code: "verification/place-invalid" });
  }
  const id = verificationIdFor(placeId, uid);
  const payload: Record<string, unknown> = {
    placeId,
    uid,
    status: input.status,
    createdAt: serverTimestamp(),
  };
  const note = input.note?.trim();
  if (note) payload.note = note.slice(0, 280);
  await setDoc(doc(db, "verifications", id), payload);
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
 * Bir yerin doğrulama sayısı (rozet önkoşulu).
 *
 * `count()` toplama sorgusudur: belge okumaz, ücretsiz planda da çalışır. Kural
 * `list` için `signedIn()` + `boundedList(50)` istediği için sorguya aynı tavanı
 * (`limit`) koyuyoruz; kural gevşetilmedi, istemci kurala uyuyor.
 */
export async function countPlaceVerifications(placeId: string): Promise<number> {
  const clean = placeId.trim();
  if (!db || !clean) return 0;
  const snap = await getCountFromServer(query(
    collection(db, "verifications"),
    where("placeId", "==", clean),
    limit(VERIFICATIONS_LIMIT),
  ));
  return snap.data().count;
}
