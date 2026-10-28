import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LANDING_STATIC,
  VERIFIED_CATALOG_COUNTS,
  renderLandingStaticHtml,
} from "../content/landingStatic";
import { GUIDE_PLACES } from "../data/places";
import { SITE_TOURS } from "../data/siteTours";

describe("T20 ↔ T11 · doğrulanmış katalog kapsamı ve küresel açılış görünümü", () => {
  it("statik katalog sayıları gerçek veri dizileriyle birebir eşleşir (sahte sayaç yok)", () => {
    expect(VERIFIED_CATALOG_COUNTS.guidePlaces).toBe(GUIDE_PLACES.length);
    expect(VERIFIED_CATALOG_COUNTS.siteTours).toBe(SITE_TOURS.length);
    expect(LANDING_STATIC.catalogSummary).toContain(
      `${VERIFIED_CATALOG_COUNTS.guidePlaces} seçilmiş rehber nokta`,
    );
    expect(LANDING_STATIC.catalogSummary).toContain(
      `${VERIFIED_CATALOG_COUNTS.siteTours} antik kent sesli turu`,
    );
  });

  it("tanıtım sayfası ve alt blok Firebase veya ağır katalog dizilerini girişe çekmez (T11 korunur)", () => {
    const landing = readFileSync("src/components/LandingPage.tsx", "utf8");
    const footer = readFileSync("src/components/LandingFooter.tsx", "utf8");

    expect(landing).not.toMatch(/firebase|GUIDE_PLACES|SITE_TOURS/);
    expect(footer).not.toMatch(/firebase|GUIDE_PLACES|SITE_TOURS/);
    expect(footer).toContain("VERIFIED_CATALOG_COUNTS");
    expect(renderLandingStaticHtml()).toContain(LANDING_STATIC.catalogSummary);
  });

  it("M-51 / M-09 kararı: harita başlangıç görünümü küresel dünya görünümünde ({ zoom: 2 }) kalır", () => {
    const explorer = readFileSync("src/components/Explorer.tsx", "utf8");
    expect(explorer).toContain("{ zoom: 2, lng: 30, lat: 30 }");
  });
});
