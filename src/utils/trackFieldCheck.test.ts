import { describe, expect, it } from "vitest";
import {
  FIELD_DISTANCE_TOLERANCE_PCT,
  checkFieldMeasurements,
  fieldCheckSummary,
  type FieldMeasurement,
} from "./trackFieldCheck";

const okWalk: FieldMeasurement = {
  fixtureId: "duz-yuruyus",
  measuredStops: 0,
  measuredDistanceKm: 1.03,
  referenceDistanceKm: 1.0,
  maxDeviationM: 6.4,
};

describe("saha ölçümü ↔ fixture karşılaştırması", () => {
  it("eşik içindeki ölçüm geçer; hata yüzde olarak raporlanır", () => {
    const result = checkFieldMeasurements([okWalk]);
    expect(result.passed).toBe(1);
    expect(result.rows[0]).toMatchObject({
      fixtureId: "duz-yuruyus",
      expectedStops: 0,
      distanceErrorPct: 3,
      stopsOk: true,
      distanceOk: true,
      deviationOk: true,
      ok: true,
      problems: [],
    });
    // Ölçülmeyen senaryolar sessizce kaybolmaz.
    expect(result.missingIds).toContain("molali");
    expect(result.unknownIds).toEqual([]);
  });

  it("yanlış durak sayısı ve %15 üstü mesafe hatası ayrı ayrı yakalanır", () => {
    const result = checkFieldMeasurements([
      {
        fixtureId: "molali",
        measuredStops: 1, // beklenen 2
        measuredDistanceKm: 1.32, // gerçek 1,1 km → +%20
        referenceDistanceKm: 1.1,
      },
    ]);
    const [row] = result.rows;
    expect(row.ok).toBe(false);
    expect(row.stopsOk).toBe(false);
    expect(row.distanceOk).toBe(false);
    expect(row.distanceErrorPct).toBe(20);
    expect(row.deviationOk).toBeNull(); // ölçülmedi
    expect(row.problems.join(" ")).toContain("Durak sayısı 1, beklenen 2");
    expect(row.problems.join(" ")).toContain(`±%${FIELD_DISTANCE_TOLERANCE_PCT}`);
  });

  it("sapma bütçesi (10 m) aşılırsa senaryo kalır", () => {
    const result = checkFieldMeasurements([{ ...okWalk, maxDeviationM: 12.5 }]);
    expect(result.rows[0].deviationOk).toBe(false);
    expect(result.rows[0].ok).toBe(false);
    expect(result.rows[0].problems.join(" ")).toContain("12.5 m");
  });

  it("bilinmeyen kimlik satırı sorun olarak döner, referanssız ölçüm hata üretemez", () => {
    const result = checkFieldMeasurements([
      { fixtureId: "boyle-yok", measuredStops: 0, measuredDistanceKm: 1, referenceDistanceKm: 1 },
      { ...okWalk, fixtureId: "kisa-durus", referenceDistanceKm: 0 },
    ]);
    expect(result.unknownIds).toEqual(["boyle-yok"]);
    expect(result.rows[0].ok).toBe(false);
    expect(result.rows[1].distanceOk).toBe(false);
    expect(result.rows[1].problems.join(" ")).toContain("hesaplanamadı");
  });

  it("özet metni geçen/kalan/eksik sayıları tek paragrafta söyler", () => {
    const result = checkFieldMeasurements([okWalk]);
    const summary = fieldCheckSummary(result);
    expect(summary).toContain("1/1 senaryo eşiği geçti.");
    expect(summary).toContain("Ölçülmemiş senaryolar:");
    expect(summary).toContain("molali");
  });
});
