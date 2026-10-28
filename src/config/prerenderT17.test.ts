import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LANDING_STATIC,
  escapeHtml,
  renderLandingStaticHtml,
} from "../content/landingStatic";

/**
 * T17 — JavaScript'siz içerik kilidi.
 *
 * NEDEN VAR: 2026-10-28 denetiminde `index.html` gövdesi yalnız
 * `<div id="root"></div>` idi. JS engelli bir tarayıcıda sayfa boştu. Artık
 * gerçek metin derlemede `<noscript>` olarak gömülüyor; bu test (1) metnin
 * uydurma olmadığını, (2) gömülü bloğun güvenli olduğunu, (3) enjeksiyonun
 * gerçekten bağlı olduğunu doğrular.
 */
const landing = readFileSync("src/components/LandingPage.tsx", "utf8");
const viteConfig = readFileSync("vite.config.ts", "utf8");
const indexHtml = readFileSync("index.html", "utf8");
const html = renderLandingStaticHtml();

describe("T17 · noscript içerik", () => {
  it("başlık, adımlar ve SSS metni gömülür", () => {
    expect(html.startsWith("    <noscript>")).toBe(true);
    expect(html).toContain(LANDING_STATIC.heading);
    expect(html).toContain(LANDING_STATIC.intro);
    expect(html).toContain(LANDING_STATIC.stepsHeading);
    for (const step of LANDING_STATIC.steps) {
      expect(html).toContain(step.title);
      expect(html).toContain(step.text);
    }
    for (const faq of LANDING_STATIC.faqs) {
      expect(html).toContain(faq.question);
      expect(html).toContain(faq.answer);
    }
  });

  it("JS gerektiğini dürüstçe söyler (harita vaadi vermez)", () => {
    expect(LANDING_STATIC.requirement).toContain("JavaScript gerektirir");
    expect(html).toContain("JavaScript gerektirir");
  });

  it("betik, olay özniteliği, satır içi stil ve javascript: bağlantısı yok", () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<iframe|<object|<embed/i);
  });

  it("metin kaçırılır (HTML enjeksiyonu imkânsız)", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("metin uydurma değil: her dize tanıtım sayfasında da geçer", () => {
    // Başlık JSX'te <span> ile bölünmüş: parçaları ayrı ayrı ara.
    for (const fragment of ["Dünyayı", "merakınla", "keşfet."]) {
      expect(landing, `"${fragment}" LandingPage'de yok`).toContain(fragment);
    }
    for (const step of LANDING_STATIC.steps) {
      expect(landing, `"${step.title}" LandingPage'de yok`).toContain(step.title);
      expect(landing, `"${step.text}" LandingPage'de yok`).toContain(step.text);
    }
    for (const faq of LANDING_STATIC.faqs) {
      expect(landing, `"${faq.question}" LandingPage'de yok`).toContain(faq.question);
      expect(landing, `"${faq.answer}" LandingPage'de yok`).toContain(faq.answer);
    }
  });

  it("derleme hattı enjeksiyonu bağlı ve tek kaynak", () => {
    expect(viteConfig).toContain('from "./src/content/landingStatic"');
    expect(viteConfig).toContain("transformIndexHtml");
    expect(viteConfig).toContain('html.replace(\'<div id="root"></div>\'');
    // Kaynak `index.html` içinde metin kopyası tutulmaz: tek kaynak, sürüklenme yok.
    expect(indexHtml).not.toContain(LANDING_STATIC.steps[0].title);
    expect(indexHtml).toContain('<div id="root"></div>');
  });
});
