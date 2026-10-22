/**
 * Atlasia — Tazelik döngüsü (Adım 14)
 *
 * Bir yerin bilgisinin "hâlâ doğru" olduğunu gösteren tek dokunuşluk ziyaret
 * doğrulamaları burada hesaplanır. Ürün kararı (d, 2026-10-22): XP yok;
 * rozet/takip ileride sunucu tarafında gelir. Tazelik Cloud Functions olmadan, istemci + Firestore kurallarıyla
 * güvenli biçimde çalışır (kullanıcı yalnız kendi doğrulamasını yazar).
 */
import type { Place } from "../types";

export const VERIFICATION_STATUSES = [
  "still_open",
  "fee_changed",
  "road_closed",
  "free_entry",
  "closed",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  still_open: "Hâlâ açık",
  fee_changed: "Ücret değişti",
  road_closed: "Yol kapalı",
  free_entry: "Ücretsiz giriliyor",
  closed: "Kapalı",
};

export interface PlaceVerification {
  id: string;
  placeId: string;
  uid: string;
  status: VerificationStatus;
  note?: string;
  createdAt: number;
}

export type FreshnessBand = "fresh" | "aging" | "stale" | "unknown";

export interface PlaceFreshness {
  /** En son doğrulamanın zamanı (ms); hiç doğrulama yoksa null. */
  latestAt: number | null;
  /** Son 90 gündeki bağımsız doğrulama sayısı. */
  recentCount: number;
  totalCount: number;
  /** Son doğrulamanın durumu; hiç yoksa null. */
  latestStatus: VerificationStatus | null;
  band: FreshnessBand;
  /** Rota motorunda kullanılan 0.8–1.35 arası güven çarpanı. */
  score: number;
  /** Kullanıcıya gösterilecek Türkçe özet. */
  label: string;
}

export const FRESHNESS_WINDOW_DAYS = 90;
export const FRESH_DAYS = 30;
export const AGING_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Doğrulama yükünü yazmadan önce doğrular; kural katmanıyla aynı sınırlar. */
export function validateVerificationInput(input: {
  placeId: string;
  status: string;
  note?: string;
}): string | null {
  const placeId = input.placeId.trim();
  if (!placeId || placeId.length > 200) return "verification/place-invalid";
  if (!(VERIFICATION_STATUSES as readonly string[]).includes(input.status)) return "verification/status-invalid";
  if (input.note !== undefined && input.note.trim().length > 280) return "verification/note-too-long";
  return null;
}

/** Aynı gün içinde tekrar doğrulama göndermeyi engellemek için yerel kontrol. */
export function canVerifyAgain(latestAt: number | null, uid: string, verifications: PlaceVerification[], now = Date.now()): boolean {
  return !verifications.some(
    (verification) => verification.uid === uid && latestAt !== null && verification.createdAt >= now - DAY_MS,
  );
}

export function freshnessBand(latestAt: number | null, now = Date.now()): FreshnessBand {
  if (latestAt === null) return "unknown";
  const ageDays = (now - latestAt) / DAY_MS;
  if (ageDays <= FRESH_DAYS) return "fresh";
  if (ageDays <= AGING_DAYS) return "aging";
  return "stale";
}

function relativeDays(latestAt: number, now: number): string {
  const days = Math.max(0, Math.round((now - latestAt) / DAY_MS));
  if (days === 0) return "bugün";
  if (days === 1) return "dün";
  if (days < 30) return `${days} gün önce`;
  const months = Math.round(days / 30);
  return `${months} ay önce`;
}

export function summarizeFreshness(
  placeId: string,
  verifications: PlaceVerification[],
  now = Date.now(),
): PlaceFreshness {
  const mine = verifications
    .filter((verification) => verification.placeId === placeId)
    .sort((a, b) => b.createdAt - a.createdAt);
  if (mine.length === 0) {
    return {
      latestAt: null,
      recentCount: 0,
      totalCount: 0,
      latestStatus: null,
      band: "unknown",
      score: 1,
      label: "Henüz doğrulanmadı · bilgi eski olabilir",
    };
  }
  const latest = mine[0];
  const recentCount = mine.filter((verification) => verification.createdAt >= now - FRESHNESS_WINDOW_DAYS * DAY_MS).length;
  const band = freshnessBand(latest.createdAt, now);
  const score = band === "fresh" ? 1.35 : band === "aging" ? 1.1 : 0.8;
  const statusLabel = VERIFICATION_LABELS[latest.status];
  const people = recentCount > 1 ? `${recentCount} kişi son 3 ayda doğruladı` : "Son doğrulama";
  return {
    latestAt: latest.createdAt,
    recentCount,
    totalCount: mine.length,
    latestStatus: latest.status,
    band,
    score,
    label: `${people} · ${relativeDays(latest.createdAt, now)} · ${statusLabel}`,
  };
}

/** Tüm doğrulamaları yer kimliğine göre gruplar; tek geçişte O(n). */
export function groupVerificationsByPlace(verifications: PlaceVerification[]): Map<string, PlaceVerification[]> {
  const grouped = new Map<string, PlaceVerification[]>();
  verifications.forEach((verification) => {
    const list = grouped.get(verification.placeId);
    if (list) list.push(verification);
    else grouped.set(verification.placeId, [verification]);
  });
  return grouped;
}

/** Yer listesine tazelik özeti ekler; orijinal nesneleri değiştirmez. */
export function applyFreshness(
  places: Place[],
  verifications: PlaceVerification[],
  now = Date.now(),
): Place[] {
  const grouped = groupVerificationsByPlace(verifications);
  return places.map((place) => {
    const list = grouped.get(place.id);
    if (!list?.length) return place;
    return { ...place, freshness: summarizeFreshness(place.id, list, now) };
  });
}
