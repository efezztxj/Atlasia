import { describe, expect, it } from "vitest";
import { openMapRadiusKm } from "./openMapPlaces";

// fetchOpenMapPlaces canlı Photon servisi + window zamanlayıcısına dayanır;
// bu test saf arama yarıçapı sözleşmesini kilitler (ağ karakterizasyonu ayrı tur).

describe("openMapRadiusKm — ulaşım türüne göre arama yarıçapı", () => {
  it("bilinen ulaşım türleri sabit yarıçaplarla eşleşir", () => {
    expect(openMapRadiusKm("walking")).toBe(4.5);
    expect(openMapRadiusKm("cycling")).toBe(12);
    expect(openMapRadiusKm("transit")).toBe(18);
  });

  it("tanınmayan/araç tipi en geniş yarıçapa düşer", () => {
    expect(openMapRadiusKm("driving")).toBe(30);
  });
});
