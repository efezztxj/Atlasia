import { describe, expect, it } from "vitest";
import { GUIDE_PLACES } from "./places";

/**
 * Rehber kartlarının kilit listesi. Bir kart kaldırılırsa ya da kimliği
 * değişirse test kırılır; içerik ve kaynak güncellemeleri bu listeyle
 * birlikte yapılır.
 */
const EXPECTED_IDS = [
  "efes",
  "kapadokya",
  "pamukkale",
  "kaputas",
  "galata",
  "gaziantep",
  "gobeklitepe",
  "likya",
  "kackar",
  "moda",
  "santorini",
  "navagio",
  "napoli",
  "venedik",
  "camino",
  "skogafoss",
  "lofoten",
  "machu",
  "kyoto",
  "aral",
  "girne",
  "buyuk-han",
  "salamis",
  "karpaz",
  "petra",
  "chefchaouen",
  "banff",
  "positano",
];

describe("GUIDE_PLACES — rehber kartları", () => {
  it("kart listesi ve sırası kilitlidir", () => {
    expect(GUIDE_PLACES.map((place) => place.id)).toEqual(EXPECTED_IDS);
  });

  it("her kartın zorunlu alanları doludur", () => {
    for (const place of GUIDE_PLACES) {
      expect(place.title.trim(), `${place.id} başlık`).not.toBe("");
      expect(place.region.trim(), `${place.id} bölge`).not.toBe("");
      expect(place.note.trim(), `${place.id} not`).not.toBe("");
      expect(place.author, `${place.id} yazar`).toBe("Atlasia rehberi");
      expect(place.kind, `${place.id} tür`).toBe("guide");
      expect(Number.isFinite(place.lat), `${place.id} enlem`).toBe(true);
      expect(Number.isFinite(place.lng), `${place.id} boylam`).toBe(true);
      expect(place.lat, `${place.id} enlem aralığı`).toBeGreaterThanOrEqual(-90);
      expect(place.lat, `${place.id} enlem aralığı`).toBeLessThanOrEqual(90);
      expect(place.lng, `${place.id} boylam aralığı`).toBeGreaterThanOrEqual(-180);
      expect(place.lng, `${place.id} boylam aralığı`).toBeLessThanOrEqual(180);
    }
  });

  it("rehber kartlarında kullanıcı üretimi alan yoktur", () => {
    for (const place of GUIDE_PLACES) {
      expect(place.authorUid, `${place.id} yazar kimliği`).toBeUndefined();
      expect(place.kind, `${place.id} tür`).toBe("guide");
    }
  });
});
