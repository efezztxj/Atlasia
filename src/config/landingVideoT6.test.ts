// @vitest-environment jsdom
/**
 * T6 — tanıtım filmi sözleşmesi.
 *
 * NEDEN VAR: video, mobil 4G'de en pahalı varlıktır (reels klibi 4 MB). Kural:
 *  1. `preload="none"` — kullanıcı oynatmadan **tek bayt** inmez,
 *  2. `poster` zorunlu — boş siyah kutu değil, mevcut marka görseli (ek ağ yok),
 *  3. otomatik oynatma / döngü / otomatik ses yok,
 *  4. `width`/`height` yazılı — yer ayırır, CLS üretmez,
 *  5. klip `public/` altında ve SW kabuğu onu önbelleğe almaz.
 */
import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landing = readFileSync("src/components/LandingPage.tsx", "utf8");
const sw = readFileSync("public/sw.js", "utf8");
const CLIP = "public/social/goreme-yuruyus.mp4";
const POSTER = "public/images/atlasia-earth-hero.jpg";

describe("T6 · tanıtım filmi", () => {
  it("video bloğu var ve `preload=\"none\"` ile işaretli", () => {
    expect(landing).toContain("<video");
    expect(landing).toMatch(/preload="none"/);
    expect(landing).toContain('type="video/mp4"');
  });

  it("otomatik oynatma, döngü ve otomatik ses yok", () => {
    const videoTag = landing.slice(landing.indexOf("<video"), landing.indexOf("</video>"));
    expect(videoTag).not.toContain("autoPlay");
    expect(videoTag).not.toContain("autoplay");
    expect(videoTag).not.toContain("loop");
    // `muted` yalnız otomatik oynatma için gerekir; burada kullanıcı başlatır.
    expect(videoTag).not.toContain("muted");
    expect(videoTag).toContain("controls");
    expect(videoTag).toContain("playsInline");
  });

  it("poster zorunlu ve var olan bir dosya", () => {
    const poster = landing.match(/poster="([^"]+)"/)?.[1];
    expect(poster).toBe("/images/atlasia-earth-hero.jpg");
    expect(statSync(POSTER).size).toBeGreaterThan(10_000);
  });

  it("genişlik/yükseklik yazılı: yer ayırır, düzen zıplamaz", () => {
    expect(landing).toMatch(/width=\{1080\}/);
    expect(landing).toMatch(/height=\{1920\}/);
    expect(landing).toContain("aspect-[9/16]");
  });

  it("klip gerçekten var ve kabul edilebilir boyutta", () => {
    const { size } = statSync(CLIP);
    expect(size).toBeGreaterThan(1_000_000);
    // 8 MB üstü mobilde kabul edilemez; klip bunun altında kalmalı.
    expect(size).toBeLessThan(8_000_000);
    expect(landing).toContain('src="/social/goreme-yuruyus.mp4"');
  });

  it("SW kabuğu videoyu ön önbelleğe almaz (4 MB indirme tuzağı)", () => {
    expect(sw).not.toContain("goreme-yuruyus");
    // SW varlık keşfi yalnız `/assets/` altındaki statikleri toplar.
    expect(sw).not.toMatch(/mp4/);
  });

  it("erişilebilir ad: figure/figcaption (video `aria-label` ile değil)", () => {
    const block = landing.slice(landing.indexOf("<figure"), landing.indexOf("</figure>"));
    expect(block).toContain("<figcaption className=\"sr-only\">");
    expect(block).toContain("tanıtım filmi");
    expect(block).toContain("<video");
    // `aria-label` doğrudan <video>'ya konmaz: ekran okuyucularda tutarlı değil.
    expect(block).not.toContain('aria-label="Kapadokya');
  });

  it("video yoksa okunabilir geri dönüş bağlantısı var", () => {
    const videoTag = landing.slice(landing.indexOf("<video"), landing.indexOf("</video>"));
    expect(videoTag).toMatch(/<a href="\/social\/goreme-yuruyus\.mp4">/);
  });
});
