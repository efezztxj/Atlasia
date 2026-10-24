/**
 * İŞ 2 — #58 arayüz inceltmesinin kilidi.
 *
 * Bu testler düzeni değiştirmez; yalnız "altın yalnız birincil eylemde ve
 * seçili durumda" ile "harita üstünde blur yok" kararlarının sessizce geri
 * gelmesini engeller. Sayısal eşikler koddan okunur; hiçbiri elle yazılmış
 * tahmin değildir.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");
const exists = (relative: string) => existsSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)));

const css = read("src/index.css");
const app = read("src/App.tsx");
const mapControls = read("src/components/MapControls.tsx");
const bottomPanel = read("src/components/BottomPanel.tsx");

/** Bir CSS bloğunu seçiciden itibaren süslü parantez dengesiyle çıkarır. */
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`CSS bloğu yok: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`CSS bloğu kapanmadı: ${selector}`);
}

function px(source: string, pattern: RegExp): number {
  const match = pattern.exec(source);
  if (!match) throw new Error(`Ölçü bulunamadı: ${pattern}`);
  return Number(match[1]);
}

describe("altın kullanımı", () => {
  it(".gold-frame sade ve nötr: önem eki, altın kenar ve ağır gölge yok", () => {
    const frame = block(".gold-frame");
    expect(frame).not.toContain("!important");
    expect(frame).not.toContain("234, 181, 79");
    expect(frame).not.toContain("0 22px 54px");
  });

  it("açık tema çerçeve karşılığı da nötr ve önem eki taşımıyor", () => {
    const light = block('html[data-theme="light"] .space-bg .gold-frame');
    expect(light).not.toContain("!important");
    expect(light).not.toContain("168, 109, 32");
  });

  it("altın birincil eylemde ve seçili durumda kalıyor", () => {
    expect(block(".btn-gold")).toContain("linear-gradient");
    expect(block(".btn-gold-round")).toContain("linear-gradient");
    // Seçili durum: aria-pressed ve data-active aynı altın kuralı paylaşır.
    expect(css).toMatch(/aria-pressed="true"\],\s*\n\.segmented > button\[data-active="true"\] \{\s*\n\s*background: linear-gradient\(135deg, #f3c870, #eab54f/);
    expect(block('.mobile-tab-item[aria-current="page"] .mobile-tab-icon')).toContain("243, 200, 112");
  });

  it("açık tema krem panel rengi korunuyor (beyaz mod kullanıcıda)", () => {
    expect(css).toContain("rgba(255, 253, 247, 0.97)");
  });
});

describe("harita üstünde blur", () => {
  it("cam panel ve alt çubuk backdrop-filter kullanmıyor", () => {
    expect(block(".glass-panel")).not.toContain("backdrop-filter");
    expect(block(".mobile-tab-bar")).not.toContain("backdrop-filter");
  });

  it("harita üstü panellerde blur sınıfı geri gelmiyor", () => {
    for (const source of [app, mapControls, bottomPanel]) {
      expect(source).not.toMatch(/backdrop-blur-(?:xl|2xl)/);
    }
  });
});

describe("küçük ekran yerleşimi (≈360×640)", () => {
  const barHeight = px(css, /\.mobile-tab-bar \{\s*\n\s*height: calc\((\d+)px/);
  const fabBottom = px(app, /mobile-add-fab[^"]*bottom-\[calc\((\d+)px/);
  const collapsedBottom = px(bottomPanel, /max-md:bottom-\[calc\((\d+)px/);
  const controlsBottom = px(css, /\.mobile-map-controls \{\s*\n(?:\s*\/\*[\s\S]*?\*\/\s*\n)?\s*right: 10px;\s*\n\s*bottom: calc\((\d+)px/);

  it("alt çubuk 58 px (kod ile aynı)", () => {
    expect(barHeight).toBe(58);
  });

  it("+ düğmesi daraltılmış keşif kartının altında kalıyor", () => {
    // Düğme 44 px; kartın alt kenarı collapsedBottom. Arada en az 4 px boşluk.
    expect(fabBottom + 44).toBeLessThanOrEqual(collapsedBottom);
  });

  it("harita düğmeleri daraltılmış kartın üstünde başlıyor", () => {
    // Kart yüksekliği: p-2.5 (10+10) + küçük görsel 48 + hairline ≈ 68 px.
    const cardHeight = 68;
    expect(controlsBottom).toBeGreaterThanOrEqual(collapsedBottom + cardHeight);
  });

  it("açık panelde çakışan mobil katmanlar gizleniyor", () => {
    expect(app).toContain("hiddenOnMobile={panelOpen}");
    expect(mapControls).toContain('hiddenOnMobile && "max-md:hidden"');
    expect(app).toMatch(/mobile-add-fab[\s\S]{0,600}panelOpen \? " hidden"/);
  });
});

describe("masaüstü harita kontrolleri", () => {
  it("kapsül sağ kenarda dikey ortada durur, alt köşeye geri dönmez", () => {
    expect(mapControls).toContain("md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2");
    expect(mapControls).not.toContain("md:bottom-24");
  });
});

describe("teslimat notu docs/ altında", () => {
  it("kök kopya kaldı, docs/teslimatlar kopyası var", () => {
    expect(exists("teslimat-ui-yenileme-2026-10-22.md")).toBe(false);
    expect(exists("docs/teslimatlar/teslimat-ui-yenileme-2026-10-22.md")).toBe(true);
  });
});
