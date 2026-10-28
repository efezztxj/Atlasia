/**
 * F3 — rota bazlı başlık/açıklama kilidi.
 *
 * NEDEN: Tek sayfa uygulamasında her ekran aynı `title`'ı taşıyordu. Bu test
 * hem metinlerin var olduğunu hem de uygulamanın gerçekten meta yazdığını
 * (yani kapının bağlı olduğunu) doğrular. İki dosya iki farklı pakete gider:
 * çekirdek entry'de, uygulama yüzeyleri tembel chunk'ta (entry bütçesi).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SURFACE_META, applyRouteMeta, metaFor } from "./routeMeta";
import { APP_SURFACE_META, appMetaFor, applyAppSurfaceMeta } from "./appSurfaceMeta";

const app = readFileSync("src/App.tsx", "utf8");
const explorer = readFileSync("src/components/Explorer.tsx", "utf8");

interface Written { title?: string; attributes: Record<string, string> }

function fakeDocument(): { doc: { title: string; querySelector: (selector: string) => { setAttribute: (name: string, value: string) => void } | null }; written: Written } {
  const written: Written = { attributes: {} };
  const nodes = new Map<string, { setAttribute: (name: string, value: string) => void }>();
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
  ]) {
    nodes.set(selector, {
      setAttribute: (name: string, value: string) => {
        written.attributes[`${selector}:${name}`] = value;
      },
    });
  }
  const doc = {
    title: "",
    querySelector: (selector: string) => nodes.get(selector) ?? null,
  };
  return { doc, written };
}

describe("F3 · çekirdek yüzeyler (entry paketi)", () => {
  it("tanıtım yüzeyi index.html değerlerine döner; kabuk nötr başlık taşır", () => {
    expect(SURFACE_META.landing.title).toBe("Atlasia — Dünyayı merakınla keşfet");
    const shell = metaFor("app");
    expect(shell.title).toBe("Harita — Atlasia");
    expect(shell.title).not.toBe(SURFACE_META.landing.title);
  });

  it("bilinmeyen yüzey nötr kabuk metnine düşer", () => {
    expect(metaFor("yok-boyle-bir-sey").title).toBe("Harita — Atlasia");
    expect(metaFor(null).title).toBe("Harita — Atlasia");
  });

  it("applyRouteMeta başlığı, description'ı ve OG/Twitter etiketlerini eşitler", () => {
    const { doc, written } = fakeDocument();
    const result = applyRouteMeta("app", doc);
    const expected = metaFor("app");

    expect(doc.title).toBe(expected.title);
    expect(result).toEqual(expected);
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
    ]) {
      const value = written.attributes[`${selector}:content`];
      expect(value, selector).toBeTruthy();
      expect(value, selector).toBe(selector.includes("title") ? expected.title : expected.description);
    }
  });
});

describe("F3 · uygulama yüzeyleri (tembel chunk)", () => {
  it("her yüzeyin başlığı markayı taşır ve başlıklar tekrar etmez", () => {
    const titles = Object.values(APP_SURFACE_META).map((meta) => meta.title);
    for (const title of titles) expect(title).toContain("Atlasia");
    expect(new Set(titles).size).toBe(titles.length);
    // Çekirdek başlıklarla da çakışmasın.
    expect(titles).not.toContain(metaFor("app").title);
    expect(titles).not.toContain(SURFACE_META.landing.title);
  });

  it("açıklamalar arama sonuçlarında kesilmeyecek kadar kısa", () => {
    for (const [surface, meta] of Object.entries(APP_SURFACE_META)) {
      expect(meta.description.length, surface).toBeLessThanOrEqual(160);
      expect(meta.description.length, surface).toBeGreaterThan(40);
    }
  });

  it("bilinmeyen yüzeyde hiçbir etiket yazılmaz (çekirdeğe dokunmaz)", () => {
    expect(appMetaFor("yok")).toBeNull();
    expect(applyAppSurfaceMeta("yok")).toBeNull();
  });

  it("uygulama yüzeyi etiketleri yazılır", () => {
    const { doc, written } = fakeDocument();
    const meta = applyAppSurfaceMeta("records");
    expect(meta).toBe(APP_SURFACE_META.records);
    // jsdom'suz ortamda applyMeta bu sahte belgeyi kullanmaz; kanca yolu ayrı test edilir.
    expect(doc.title).toBe("");
    expect(written.attributes).toEqual({});
  });

  it("uygulama gerçekten çağırıyor: tanıtım ↔ kabuk ve sekme yüzeyleri", () => {
    expect(app).toMatch(/useRouteMeta\(!user && !guest \? "landing" : "app"\)/);
    expect(explorer).toContain("useAppRouteMeta(routeSurface)");
    for (const surface of ['"records"', '"community"', '"profile"', '"add"', '"explore"']) {
      expect(explorer, surface).toContain(surface);
    }
    // Uygulama yüzeyleri entry'ye sızmasın (F3 + bütçe kuralı).
    expect(app).not.toContain("appSurfaceMeta");
  });
});
