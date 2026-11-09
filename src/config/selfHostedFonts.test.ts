import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Fontlar kendi origin'imizden servis edilir.
 *
 * Neden: `fonts.googleapis.com` üzerinden gelen render-bloklayan CSS bir RTT
 * ekliyordu ve font takası ilk boyamadan sonra kaldığı için tanıtım hero'su
 * kayıyordu (Lighthouse CLS 0,002 ↔ 0,049 arasında salınıyordu; kaynak
 * `<div class="max-w-[700px]">`). Aynı dosyalar artık `/fonts/` altında.
 *
 * Bu test, dosyaların ya da `@font-face` kurallarının sessizce silinmesini ve
 * üçüncü taraf font isteğinin geri gelmesini engeller.
 */
const root = new URL("../../", import.meta.url);
const html = readFileSync(fileURLToPath(new URL("index.html", root)), "utf8");
const css = readFileSync(fileURLToPath(new URL("src/index.css", root)), "utf8");
const headers = readFileSync(fileURLToPath(new URL("public/_headers", root)), "utf8");
const styleBlock = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? "";

const families = ["DM Sans", "Bricolage Grotesque"] as const;

describe("fontlar kendi origin'imizden (CLS + LCP)", () => {
  it("üçüncü taraf font isteği yok", () => {
    expect(html).not.toMatch(/fonts\.googleapis\.com/);
    expect(html).not.toMatch(/fonts\.gstatic\.com/);
    // Yorumda anılması serbest, ama gerçek bir <link>/@import olmamalı.
    expect(html).not.toMatch(/<link[^>]+fonts\./);
    expect(css).not.toMatch(/@import[^;]*fonts\./);
  });

  it("her aile için latin + latin-ext yüzü tanımlı ve dosyalar var", () => {
    for (const family of families) {
      const faces = styleBlock.match(new RegExp(`@font-face\\{font-family:"${family}";[^}]*\\}`, "g")) ?? [];
      expect(faces).toHaveLength(2);
      const sources = faces.map((face) => /url\((\/fonts\/[^)]+)\)/.exec(face)?.[1] ?? "");
      expect(sources.every((src) => src.startsWith("/fonts/"))).toBe(true);
      for (const src of sources) {
        const file = fileURLToPath(new URL(`public${src}`, root));
        expect(existsSync(file)).toBe(true);
        expect(statSync(file).size).toBeGreaterThan(10_000);
      }
      // Türkçe karakterler (ş/ğ/İ) latin-ext aralığında: aralık bildirilmezse
      // bu harfler yedek fontla çizilir ve tasarım bozulur.
      expect(faces.some((face) => /unicode-range:[^}]*U\+0100-024F/.test(face))).toBe(true);
      expect(faces.some((face) => /unicode-range:[^}]*U\+00A0-00FF/.test(face))).toBe(true);
    }
  });

  it("CSS'teki aile adları @font-face adlarıyla aynı", () => {
    expect(css).toMatch(/--font-display: "Bricolage Grotesque"/);
    expect(css).toMatch(/--font-sans: "DM Sans"/);
  });

  it("CSP üçüncü taraf font host'una izin vermiyor, 'self' yeterli", () => {
    expect(headers).toMatch(/font-src 'self' data:(?! [^;]*gstatic)/);
    expect(headers).not.toMatch(/style-src[^;]*fonts\.googleapis/);
  });

  it("dört font dosyası da önceden yüklenir (font takası geç kalmasın)", () => {
    // NEDEN: `font-display: swap` yüzünden metin önce yedek fontla diziliyor,
    // gerçek font gelince yeniden diziliyordu. Alt kenara sabit çerez paneli bu
    // yüzden yükseklik değiştirip üst kenarından kayıyordu; Lighthouse
    // `?tab=kesfet` CLS'i (0,120) bu paneldi. Preload, takası ilk boyamadan
    // önceye çeker. Dört dosya da Türkçe sayfada zaten kullanılıyor.
    const preloads = [...html.matchAll(/<link rel="preload" as="font"[^>]*href="(\/fonts\/[^"]+)"[^>]*>/g)].map((m) => m[1]);
    expect(preloads.sort()).toEqual([
      "/fonts/bricolage-latin-ext.woff2",
      "/fonts/bricolage-latin.woff2",
      "/fonts/dm-sans-latin-ext.woff2",
      "/fonts/dm-sans-latin.woff2",
    ]);
    for (const link of html.matchAll(/<link rel="preload" as="font"[^>]*>/g)) {
      // Font isteği CORS modunda gider; `crossorigin` yoksa preload iki kez indirilir.
      expect(link[0]).toContain("crossorigin");
      expect(link[0]).toContain('type="font/woff2"');
    }
    for (const src of preloads) {
      expect(existsSync(fileURLToPath(new URL(`public${src}`, root)))).toBe(true);
    }
  });

  it("lisans dosyası yayında (SIL OFL zorunluluğu)", () => {
    const license = readFileSync(fileURLToPath(new URL("public/fonts/OFL.txt", root)), "utf8");
    expect(license).toMatch(/SIL Open Font License/);
  });
});
