import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * T19 — içerik/SEO meta seti kilidi.
 *
 * NEDEN VAR: 2026-10-28 denetiminde `index.html` içinde canonical, robots ve
 * hreflang yoktu; sayfa `?utm=...` gibi parametrelerle paylaşıldığında arama
 * motoruna iki ayrı adres gibi görünüyordu. Bu test o üçünü ve yapısal verinin
 * gerçekten ayrıştırılabilir olduğunu kilitler.
 */
const indexHtml = readFileSync("index.html", "utf8");
const sitemap = readFileSync("public/sitemap.xml", "utf8");
const robotsTxt = readFileSync("public/robots.txt", "utf8");
const ORIGIN = "https://atlasia.pages.dev";

function jsonLdBlocks(html: string): unknown[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks.map(([match]) => JSON.parse(match.split(">").slice(1).join(">").replace(/<\/script>$/, "")));
}

function graphOf(node: unknown): Array<Record<string, unknown>> {
  const record = node as { "@graph"?: Array<Record<string, unknown>> };
  return record["@graph"] ?? [record as Record<string, unknown>];
}

describe("T19 · head meta seti", () => {
  it("kanonik adres tek ve üretim köküne işaret eder", () => {
    const canonicals = [...indexHtml.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
    expect(canonicals).toEqual([`${ORIGIN}/`]);
  });

  it("robots indekslemeye açık, önizleme boyutu belirtilmiş", () => {
    const robots = indexHtml.match(/<meta name="robots" content="([^"]+)"/);
    expect(robots?.[1]).toBe("index, follow, max-image-preview:large");
  });

  it("hreflang `tr` ve `x-default` aynı üretim adresini gösterir", () => {
    const alternates = [...indexHtml.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
    const map = Object.fromEntries(alternates.map(([, lang, href]) => [lang, href]));
    expect(map).toEqual({ tr: `${ORIGIN}/`, "x-default": `${ORIGIN}/` });
    // Dil iddiası HTML köküyle çelişmesin.
    expect(indexHtml).toContain('<html lang="tr">');
  });

  it("yapısal veri ayrıştırılabilir ve adresler kanonikle aynı", () => {
    const nodes = jsonLdBlocks(indexHtml).flatMap(graphOf);
    const types = nodes.map((node) => node["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", "WebApplication"]));
    for (const node of nodes) {
      const url = String(node.url ?? "");
      if (url) expect(url.startsWith(ORIGIN)).toBe(true);
    }
    const site = nodes.find((node) => node["@type"] === "WebSite")!;
    expect(site.inLanguage).toBe("tr-TR");
    // Doğrulanamayan sosyal kanıt (puan/oylama) yapısal veriye girmez.
    expect(indexHtml).not.toMatch(/"aggregateRating"|"ratingValue"/);
  });

  it("sitemap üretim adreslerini ve güncel tarihi taşır", () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([`${ORIGIN}/`, `${ORIGIN}/uygulama/`]);
    const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    // Bayat sitemap arama motoruna "değişmedi" der; 90 günden eski olamaz.
    for (const lastmod of lastmods) {
      const ageDays = (Date.now() - Date.parse(`${lastmod}T00:00:00Z`)) / 86_400_000;
      expect(ageDays, `${lastmod} tarihi bayat`).toBeLessThan(90);
    }
  });

  it("robots.txt sitemap'i duyurur ve hesap ekranlarını indeksletmez", () => {
    expect(robotsTxt).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(robotsTxt).toMatch(/Disallow: \/uygulama\/\?tab=profil/);
    expect(robotsTxt).not.toMatch(/Disallow: \/\s*$/m);
  });
});
