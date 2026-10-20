import { describe, expect, it } from "vitest";
import { fetchHistoricSites, getEphesusFixture } from "./historicSites";
import { EPHESUS_CENTER } from "../data/ephesusFixture";

describe("historicSites – Efes kanıtı (Adım 7)", () => {
  it("Efes koordinatında 15+ gerçek anıt döndürür", async () => {
    const places = await fetchHistoricSites(EPHESUS_CENTER, 1500);
    expect(places.length).toBeGreaterThanOrEqual(15);
  });

  it("her anıtta ad ve özet metin vardır (note tarihçe değil)", async () => {
    const places = await fetchHistoricSites(EPHESUS_CENTER, 1500);
    for (const p of places) {
      expect(p.title.trim().length).toBeGreaterThanOrEqual(2);
      // story Wikipedia özetidir; note ise feragatname içerir
      const hasStory = typeof p.story === "string" && p.story.trim().length >= 20;
      expect(hasStory, `${p.id} özet metin içermeli`).toBe(true);
      expect(p.note).toContain("Güncel erişim");
      expect(p.dataSources?.join(" ")).toContain("OpenStreetMap");
      expect(p.dataSources?.join(" ")).toContain("Wikipedia");
    }
  });

  it("ODbL + CC BY-SA atıf dataSources alanında", () => {
    const places = getEphesusFixture();
    for (const p of places) {
      expect(p.dataSources).toBeDefined();
      expect(p.dataSources?.some((s) => s.includes("ODbL"))).toBe(true);
      expect(p.dataSources?.some((s) => s.includes("CC BY-SA"))).toBe(true);
    }
  });

  it("fixture en az 15 kayıt içerir ve her biri koordinatlıdır", () => {
    const places = getEphesusFixture();
    expect(places.length).toBeGreaterThanOrEqual(15);
    for (const p of places) {
      expect(Number.isFinite(p.lat)).toBe(true);
      expect(Number.isFinite(p.lng)).toBe(true);
      expect(p.category).toBe("history");
    }
  });
});
