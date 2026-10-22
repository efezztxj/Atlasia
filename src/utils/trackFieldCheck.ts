/**
 * P17 saha protokolü — saha ölçümlerini fixture tablosuyla karşılaştıran saf
 * yardımcı. Formun kendisi `docs/teslimatlar/saha-test-formu-p17.md`dedir;
 * bu dosya formdaki sayıların **makineyle denetlenebilir** karşılığıdır:
 * sahada doldurulan değerler buraya verilir, hangi senaryonun hangi eşikte
 * kaldığı satır satır çıkar.
 *
 * Eşikler uydurma değildir:
 * - Mesafe hatası ≤ %15: ROADMAP Adım 4 "bitti kanıtı" (1 km yürüyüşte
 *   mesafe makul, ±%15).
 * - Sapma ≤ 10 m: sahada 1 km yürüyüşte ölçülen bütçe (fixture dosyası notu);
 *   DP sözleşmesi (≤7 m) sadeleştirme toleransıdır, saha ölçümü değildir.
 */
import { TRACK_FIXTURES, type TrackFixture } from "./fixtures/trackFixtures";

export const FIELD_DISTANCE_TOLERANCE_PCT = 15;
export const FIELD_MAX_DEVIATION_M = 10;

/** Sahada tek senaryo için doldurulan ölçüm kaydı. */
export interface FieldMeasurement {
  /** `TRACK_FIXTURES` içindeki senaryo kimliği (ör. "molali"). */
  fixtureId: string;
  /** Uygulamanın bu yürüyüşte bulduğu durak sayısı. */
  measuredStops: number;
  /** Uygulamanın gösterdiği mesafe (km). */
  measuredDistanceKm: number;
  /** Bilinen gerçek mesafe (km): ölçülü parkur/harita ölçümü. */
  referenceDistanceKm: number;
  /** Taslak özetindeki en büyük sapma (m); panelden okunur, yoksa boş. */
  maxDeviationM?: number;
}

export interface FieldCheckRow {
  fixtureId: string;
  name: string;
  expectedStops: number | null;
  measuredStops: number;
  /** Yüzde olarak işaretli hata: (ölçülen - gerçek) / gerçek × 100. */
  distanceErrorPct: number;
  stopsOk: boolean;
  distanceOk: boolean;
  /** Sapma ölçülmediyse `null` (denetlenmedi), ölçüldüyse eşik sonucu. */
  deviationOk: boolean | null;
  ok: boolean;
  /** Kullanıcıya/raporda gösterilecek Türkçe sorun satırları; boşsa sorun yok. */
  problems: string[];
}

export interface FieldCheckResult {
  rows: FieldCheckRow[];
  passed: number;
  failed: number;
  /** Fixture tablosunda olmayan kimlikler (formda yazım hatası olabilir). */
  unknownIds: string[];
  /** Hiç ölçüm girilmemiş senaryolar (saha turu eksik kalmış olabilir). */
  missingIds: string[];
}

export function checkFieldMeasurements(
  measurements: readonly FieldMeasurement[],
  fixtures: readonly TrackFixture[] = TRACK_FIXTURES,
): FieldCheckResult {
  const byId = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const rows: FieldCheckRow[] = [];
  const unknownIds: string[] = [];
  const seen = new Set<string>();

  for (const measurement of measurements) {
    const fixture = byId.get(measurement.fixtureId);
    if (!fixture) {
      unknownIds.push(measurement.fixtureId);
      rows.push({
        fixtureId: measurement.fixtureId,
        name: "(bilinmeyen senaryo)",
        expectedStops: null,
        measuredStops: measurement.measuredStops,
        distanceErrorPct: Number.NaN,
        stopsOk: false,
        distanceOk: false,
        deviationOk: null,
        ok: false,
        problems: [`"${measurement.fixtureId}" fixture tablosunda yok; kimliği formdan doğrula.`],
      });
      continue;
    }
    seen.add(fixture.id);
    const problems: string[] = [];

    const stopsOk = measurement.measuredStops === fixture.expectedStops;
    if (!stopsOk) {
      problems.push(`Durak sayısı ${measurement.measuredStops}, beklenen ${fixture.expectedStops}.`);
    }

    const reference = measurement.referenceDistanceKm;
    const distanceErrorPct = reference > 0
      ? Math.round((((measurement.measuredDistanceKm - reference) / reference) * 100) * 10) / 10
      : Number.NaN;
    const distanceOk = Number.isFinite(distanceErrorPct)
      && Math.abs(distanceErrorPct) <= FIELD_DISTANCE_TOLERANCE_PCT;
    if (!Number.isFinite(distanceErrorPct)) {
      problems.push("Gerçek (referans) mesafe girilmemiş; mesafe hatası hesaplanamadı.");
    } else if (!distanceOk) {
      problems.push(
        `Mesafe hatası %${Math.abs(distanceErrorPct)} (ölçülen ${measurement.measuredDistanceKm} km, gerçek ${reference} km); eşik ±%${FIELD_DISTANCE_TOLERANCE_PCT}.`,
      );
    }

    let deviationOk: boolean | null = null;
    if (typeof measurement.maxDeviationM === "number" && Number.isFinite(measurement.maxDeviationM)) {
      deviationOk = measurement.maxDeviationM <= FIELD_MAX_DEVIATION_M;
      if (!deviationOk) {
        problems.push(`En büyük sapma ${measurement.maxDeviationM} m; saha bütçesi ${FIELD_MAX_DEVIATION_M} m.`);
      }
    }

    rows.push({
      fixtureId: fixture.id,
      name: fixture.name,
      expectedStops: fixture.expectedStops,
      measuredStops: measurement.measuredStops,
      distanceErrorPct,
      stopsOk,
      distanceOk,
      deviationOk,
      ok: stopsOk && distanceOk && deviationOk !== false,
      problems,
    });
  }

  const missingIds = fixtures.filter((fixture) => !seen.has(fixture.id)).map((fixture) => fixture.id);
  const passed = rows.filter((row) => row.ok).length;
  return { rows, passed, failed: rows.length - passed, unknownIds, missingIds };
}

/** Rapor/teslimata yapıştırılacak tek paragraflık Türkçe özet. */
export function fieldCheckSummary(result: FieldCheckResult): string {
  const parts = [`${result.passed}/${result.rows.length} senaryo eşiği geçti.`];
  const failed = result.rows.filter((row) => !row.ok);
  if (failed.length > 0) {
    parts.push(`Kalanlar: ${failed.map((row) => `${row.fixtureId} (${row.problems.join(" ")})`).join("; ")}`);
  }
  if (result.missingIds.length > 0) {
    parts.push(`Ölçülmemiş senaryolar: ${result.missingIds.join(", ")}.`);
  }
  if (result.unknownIds.length > 0) {
    parts.push(`Bilinmeyen kimlikler: ${result.unknownIds.join(", ")}.`);
  }
  return parts.join(" ");
}
