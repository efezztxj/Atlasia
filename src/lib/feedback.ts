/**
 * Atlasia — Geri bildirim kanalı (P4 Tur 4).
 * Yalnız giriş yapmış kullanıcı yazar. Konum ve cihaz parmak izi toplanmaz.
 * Kurallar: firestore.rules → match /feedback. Alan şeması orada zorlanır;
 * burada aynı sınırlar istemci tarafında da uygulanır (erken hata için).
 *
 * KARAR: istemci hız sınırı 5 dakikada 1 gönderim (yerel depoda, kullanıcı başına).
 * GEREKÇE: rules geçmiş kayıtları sayamaz; spam'i tamamen önlemez, yalnız
 * kolay kötüye kullanımı keser. ALTERNATİF: App Check + Cloud Function (deploy
 * gerektirir, kapsam dışı). GERİ ALMA: FEEDBACK_COOLDOWN_MS = 0.
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const FEEDBACK_CATEGORIES = ["bug", "idea", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export const FEEDBACK_MESSAGE_MAX = 1000;
export const FEEDBACK_APP_VERSION_MAX = 40;
export const FEEDBACK_COOLDOWN_MS = 5 * 60 * 1000;
/** package.json sürümüyle eşleşmeli (test bunu doğrular). */
export const FEEDBACK_APP_VERSION = "0.1.0";

export interface FeedbackDraft {
  category: string;
  message: string;
}

export type FeedbackValidation =
  | { ok: true; category: FeedbackCategory; message: string }
  | { ok: false; error: string };

export function validateFeedbackDraft(draft: FeedbackDraft): FeedbackValidation {
  if (!(FEEDBACK_CATEGORIES as readonly string[]).includes(draft.category)) {
    return { ok: false, error: "Geçersiz kategori." };
  }
  const message = draft.message.trim();
  if (message.length === 0) return { ok: false, error: "Mesaj boş olamaz." };
  if (message.length > FEEDBACK_MESSAGE_MAX) {
    return { ok: false, error: `Mesaj en fazla ${FEEDBACK_MESSAGE_MAX} karakter olabilir.` };
  }
  return { ok: true, category: draft.category as FeedbackCategory, message };
}

/** Kalan bekleme süresi (ms). 0 ise gönderilebilir. */
export function feedbackCooldownRemainingMs(lastSentAt: number | null, now: number): number {
  if (lastSentAt === null || !Number.isFinite(lastSentAt)) return 0;
  const remaining = lastSentAt + FEEDBACK_COOLDOWN_MS - now;
  return remaining > 0 ? remaining : 0;
}

export function feedbackStorageKey(uid: string): string {
  return `atlasia.feedback.lastSentAt.${uid}`;
}

export function readLastSentAt(uid: string, storage: Pick<Storage, "getItem"> | null): number | null {
  if (!storage) return null;
  const raw = storage.getItem(feedbackStorageKey(uid));
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export interface FeedbackSubmitResult {
  ok: boolean;
  error?: string;
  cooldownMs?: number;
}

/**
 * Geri bildirimi gönderir. Hata durumunda `ok: false` ve Türkçe mesaj döner;
 * sessizce yutulmaz. Yazım başarılıysa son gönderim zamanı kaydedilir.
 */
export async function submitFeedback(
  uid: string,
  draft: FeedbackDraft,
  options: { now?: number; storage?: Storage | null } = {},
): Promise<FeedbackSubmitResult> {
  const cleanUid = uid.trim();
  if (!cleanUid) return { ok: false, error: "Geri bildirim için giriş yapman gerekiyor." };
  if (!db) return { ok: false, error: "Geri bildirim şu anda gönderilemiyor." };
  const storage = options.storage === undefined ? (typeof localStorage === "undefined" ? null : localStorage) : options.storage;
  const now = options.now ?? Date.now();
  const cooldownMs = feedbackCooldownRemainingMs(readLastSentAt(cleanUid, storage), now);
  if (cooldownMs > 0) {
    return { ok: false, error: "Çok sık gönderiyorsun. Birkaç dakika sonra tekrar dene.", cooldownMs };
  }
  const validation = validateFeedbackDraft(draft);
  if (!validation.ok) return { ok: false, error: validation.error };

  await addDoc(collection(db, "feedback"), {
    uid: cleanUid,
    category: validation.category,
    message: validation.message,
    appVersion: FEEDBACK_APP_VERSION,
    createdAt: serverTimestamp(),
  });
  storage?.setItem(feedbackStorageKey(cleanUid), String(now));
  return { ok: true };
}
