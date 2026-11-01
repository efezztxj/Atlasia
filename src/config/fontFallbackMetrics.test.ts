import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Tanıtım hero'sunun CLS kaynağı web font takasıydı: "DM Sans" / "Bricolage
 * Grotesque" ilk boyamadan sonra geldiğinde paragraf 3 satırdan 2 satıra
 * düşüyor ve blok yukarı kayıyordu (Lighthouse'da CLS 0,049, kaynak
 * `max-w-[700px]`). Çözüm, yerel yedek fontların ölçülerini `size-adjust` ile
 * gerçek fontlara eşitlemek: satır sonları takas anında değişmiyor.
 *
 * Bu dosya, o bloğun sessizce silinmesini/kaymasını engeller. Kurallar
 * `index.html` içinde satır içi duruyor çünkü CSS gzip bütçesi dolu
 * (`npm run bundle-budget`) ve bu kurallar ilk boyamada hazır olmalı.
 */
const html = readFileSync(fileURLToPath(new URL("../../index.html", import.meta.url)), "utf8");
const styleBlock = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? "";

describe("font yedeği ölçüleri (tanıtım CLS)", () => {
  it("satır içi stil bloğu var ve yalnız hero kapsamında", () => {
    expect(styleBlock).not.toBe("");
    expect(styleBlock).toMatch(/#top\{/);
    // Kapsam hero olmalı: global `:root`/`body` override'ı tüm uygulamayı etkiler.
    expect(styleBlock).not.toMatch(/:root\s*\{/);
  });

  it("dört yedek yüz (Arial + DejaVu, metin + başlık) size-adjust taşır", () => {
    const faces = styleBlock.match(/@font-face\{[^}]*\}/g) ?? [];
    expect(faces).toHaveLength(4);
    for (const face of faces) {
      expect(face).toMatch(/src:local\("(Arial|DejaVu Sans)"\)/);
      expect(face).toMatch(/size-adjust:\d+(\.\d+)?%/);
      // Satır kutusu yüksekliği de eşleşmeli, yoksa `line-height: normal`
      // kullanan öğelerde takas anında dikey kayma olur.
      expect(face).toMatch(/ascent-override:/);
      expect(face).toMatch(/descent-override:/);
      expect(face).toMatch(/line-gap-override:0%/);
    }
  });

  it("gerçek fontlar yığında yedeklerden önce gelir (son görünüm değişmez)", () => {
    const sans = /--font-sans:([^;}]*)/.exec(styleBlock)?.[1] ?? "";
    const display = /--font-display:([^;}]*)/.exec(styleBlock)?.[1] ?? "";
    expect(sans).toMatch(/"DM Sans",AtlasiaFallback/);
    expect(display).toMatch(/"Bricolage Grotesque","DM Sans",AtlasiaDisplayFallback/);
  });

  it("#top kendi font-family'sini de çözer (yoksa --font-sans miras alınmış değeri değiştirmez)", () => {
    const rule = /#top\{([^}]*)\}/.exec(styleBlock)?.[1] ?? "";
    expect(rule).toMatch(/font-family:var\(--font-sans\)/);
  });

  it("kaynak fontlar hâlâ Google Fonts'tan ve takas ile geliyor", () => {
    expect(html).toMatch(/fonts\.googleapis\.com\/css2\?family=Bricolage\+Grotesque/);
    expect(html).toMatch(/display=swap/);
  });
});
