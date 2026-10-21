/**
 * P17-Tur2 · Kaydedilmemiş taslağın kaderi (saf, React'siz).
 *
 * **Karar: taslak yalnız bellekte tutulur.** Sayfa kapanır/yenilenirse
 * kaydedilmemiş taslak kaybolur.
 *
 * Gerekçe:
 * 1. Ham konum geçmişi, kullanıcı "Hesabıma kaydet" demeden **hiçbir** kalıcı
 *    yere yazılmaz (localStorage dahil). Aksi hâlde iz, kullanıcı istemeden
 *    cihazda kalıcı bir dosyaya düşerdi; tarayıcı depolaması yedeklenir ve
 *    başka sekmelerce okunabilir.
 * 2. Kullanıcıya kayıp sürpriz olmasın diye panelde açıkça yazılır
 *    (`DRAFT_LOSS_NOTICE`), taslak ekranı kapanmadan kaydetme düğmesi görünür.
 * 3. Kalıcı yazma tek yoldan yapılır: kullanıcının açık eylemiyle `createTrack`
 *    → Firestore (yalnız sahibi okuyabilir).
 */
import type { SimplificationStats } from "./track";

/** Kaydedilmemiş taslak için depolama politikası. */
export const DRAFT_RETENTION = "memory" as const;

/** Kullanıcıya gösterilen kayıp uyarısı. */
export const DRAFT_LOSS_NOTICE =
  "Kaydetmeden bu ekranı kapatırsan taslak silinir. Ham konum geçmişi senin eylemin olmadan hiçbir yere yazılmaz.";

export interface DraftSummary {
  distanceKm: number;
  stopCount: number;
  meanAccuracyM: number;
  maxDeviationM: number;
  keptPoints: number;
  rawPoints: number;
}

export interface DraftLike {
  track: { distanceKm: number; stops: unknown[]; accuracy: { sampleCount: number; meanMeters: number } };
  stats: SimplificationStats;
}

/** Panelde gösterilecek ölçüler; uydurma değer yok, hepsi kayıttan gelir. */
export function summarizeDraft(draft: DraftLike): DraftSummary {
  return {
    distanceKm: Math.round(draft.track.distanceKm * 100) / 100,
    stopCount: draft.track.stops.length,
    meanAccuracyM: Math.round(draft.track.accuracy.meanMeters),
    maxDeviationM: Math.round(draft.stats.maxDeviationM * 10) / 10,
    keptPoints: draft.stats.keptCount,
    rawPoints: draft.track.accuracy.sampleCount,
  };
}

/** Tek satırlık Türkçe özet (panelde ve testte aynı metin). */
export function draftSummaryText(summary: DraftSummary): string {
  return [
    `${summary.distanceKm.toFixed(2)} km`,
    `${summary.stopCount} durak`,
    `ortalama doğruluk ±${summary.meanAccuracyM} m`,
    `${summary.keptPoints}/${summary.rawPoints} nokta`,
    `en büyük sapma ${summary.maxDeviationM.toFixed(1)} m`,
  ].join(" · ");
}
