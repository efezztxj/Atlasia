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
const hero = read("src/components/Hero.tsx");
const drawer = read("src/components/Drawer.tsx");

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

  it("açık tema krem değil gerçek beyaz panel rengi kullanıyor", () => {
    expect(css).toContain("rgba(255, 255, 255, 0.97)");
    expect(block('html[data-theme="light"]')).toContain("--color-ink: #ffffff");
    expect(block('html[data-theme="light"]')).toContain("--color-ink-2: #ffffff");
  });
});

describe("açık tema katmanları", () => {
  it("beyaz kartları nötr kanvas ve harita zemininden ayırır", () => {
    const tokens = block('html[data-theme="light"]');
    const canvas = block('html[data-theme="light"] .space-bg');
    expect(tokens).toContain("--light-canvas: #f3f5f7");
    expect(tokens).toContain("--light-shadow:");
    expect(canvas).toContain("#e9eef2");
    expect(canvas).not.toContain("radial-gradient(1px 1px");
  });

  it("koyu harita için gereken ağır metin gölgelerini açık temada kaldırır", () => {
    const rule = block('html[data-theme="light"] .space-bg :is(.explorer-hero-title, .explorer-map-hint)');
    expect(rule).toContain("filter: none");
    expect(hero).toContain("explorer-hero-title");
    expect(bottomPanel).toContain("explorer-map-hint");
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
  const fabLine = px(css, /--mobile-fab-bottom: calc\((\d+)px/);
  const collapsedBottom = px(bottomPanel, /max-md:bottom-\[calc\((\d+)px/);
  // Kapsül artık sabit sayı yerine eylem çiftine bağlı:
  // bottom: calc(var(--mobile-fab-bottom, 168px) + 58px)
  const controlsOffset = px(css, /--mobile-fab-bottom, (\d+)px\) \+ 58px/);
  const controlsBottom = controlsOffset + 58;

  it("alt çubuk 58 px (kod ile aynı)", () => {
    expect(barHeight).toBe(58);
  });

  it("ekle ayrı yüzen düğme değil, çubuğun ortasındaki birincil eylem", () => {
    // 2026-10-25: ayrı + FAB'ı kaldırıldı; tek altın eylem çubuğun ortasında.
    expect(app).not.toContain("mobile-add-fab");
    expect(app).toContain("mobile-tab-add");
    expect(css).toContain(".mobile-tab-add > span");
    // Çubuk yüksekliği değişmedi; daire çubuğun üstüne taşar.
    expect(barHeight).toBe(58);
  });

  it("alt çubuk dört sekme taşır; Kaydet sekmesi çubuktan kaldırıldı", () => {
    for (const label of ["Keşfet", "Topluluk", "Profil", "İzlerim"]) {
      expect(app).toContain(`label: "${label}"`);
    }
    expect(app).not.toContain('label: "Kaydet"');
  });

  it("kayıtlar sağ üstteki üç çizgi menüsünden açılıyor", () => {
    expect(app).toContain("onRecords={openRecords}");
    expect(drawer).toContain("onRecords");
    expect(drawer).toContain("Kayıtlarım");
  });

  it("alt yığın sırası: çubuk → keşif kartı → eylem çifti", () => {
    // Kart çubuğun üstünde ama çubuktan taşan + dairesini (20 px) örtmüyor.
    expect(collapsedBottom).toBeGreaterThan(barHeight + 20);
    // Eylem çifti kartın üstünde: kart yüksekliği (~70 px) + 10 px nefes.
    expect(fabLine).toBeGreaterThanOrEqual(collapsedBottom + 70 + 10);
    // Harita kontrolleri eylem çiftinin de üstünde başlar.
    expect(controlsBottom).toBeGreaterThanOrEqual(fabLine + 46);
  });

  it("harita düğmeleri daraltılmış kartın üstünde başlıyor", () => {
    // Kart yüksekliği: p-2.5 (10+10) + küçük görsel 48 + hairline ≈ 68 px.
    const cardHeight = 68;
    expect(controlsBottom).toBeGreaterThanOrEqual(collapsedBottom + cardHeight);
  });

  it("açık panelde çakışan mobil katmanlar gizleniyor", () => {
    expect(app).toContain("hiddenOnMobile={panelOpen}");
    expect(mapControls).toContain('hiddenOnMobile && "max-md:hidden"');
    expect(app).toMatch(/mobile-walk-fab[\s\S]{0,400}panelOpen \? " max-md:hidden"/);
  });
});

describe("keşif kartı kalıcılığı", () => {
  const dockLine = /const dockVisible = ([^;]+);/.exec(app)?.[1] ?? "";

  it("profil, izlerim ve topluluk açıkken keşif kartı gizlenmiyor", () => {
    // Kullanıcı isteği 2026-10-25: sekmeye basınca kart kaybolmasın.
    for (const flag of ["profileOpen", "myPlacesOpen", "feedOpen"]) {
      expect(dockLine).not.toContain(flag);
    }
  });

  it("yalnız ekranı bütünüyle kaplayan katmanlar kartı gizliyor", () => {
    for (const flag of ["recordsOpen", "storyPlace", "atlasOpen", "settingsOpen", "drawerOpen"]) {
      expect(dockLine).toContain(flag);
    }
  });

  it("masaüstünde sağdan açılan profil paneli kartı örtmüyor", () => {
    expect(app).toContain("shiftedLeft={profileOpen}");
    expect(bottomPanel).toContain("shiftedLeft");
    expect(bottomPanel).toContain("lg:pr-[540px]");
  });
});

describe("mobil harita kapsülü", () => {
  it("telefonda yalnız 3 düğme: sıfırla, konum, katmanlar", () => {
    // Zoom düğmeleri mobilde gizli (iki parmakla yakınlaştırma); yürüyüş ve
    // Atlas AI alt eylem çiftinde. Bkz. docs/mobil-uygunluk.md §3.7.
    for (const label of ["Yakınlaştır", "Uzaklaştır"]) {
      const line = mapControls.split("\n").find((row) => row.includes(`label="${label}"`)) ?? "";
      expect(line).toContain("max-md:hidden");
    }
    expect(mapControls).toMatch(/label="Konumuma git"/);
    expect(mapControls).toMatch(/label=\{layersOpen \?/);
  });

  it("kapsül eylem çiftinin üstüne bağlı, sabit sayıya değil", () => {
    expect(css).toContain("bottom: calc(var(--mobile-fab-bottom, 168px) + 58px)");
    // Sıra numarasına dayalı gizleme geri gelmesin.
    expect(css).not.toContain(".mobile-map-controls > div:nth-of-type(n + 5)");
  });
});

describe("profil sadeleşmesi", () => {
  const profile = read("src/components/ProfilePanel.tsx");

  it("bölüm gezinmesi üç sekme; Konum çubuğu profilden kalktı", () => {
    expect(profile).toContain('label: "Hesabım"');
    expect(profile).toContain('label: "Keşiflerim"');
    expect(profile).toContain('label: "Ayarlar"');
    expect(profile).not.toContain('{ id: "location-settings"');
  });

  it("hesap türü/kimlik bilgisi katlanır tek satıra indi", () => {
    expect(profile).toContain("<details id=\"profile-account\"");
    expect(profile).toContain("Hesap bilgileri");
  });

  it("tam genişlik altın kaydet düğmesi ana ekrandan kalktı", () => {
    expect(profile).not.toContain("Değişiklikleri kaydet");
    expect(profile).toContain("Kaydet");
  });
});

describe("masaüstü harita kontrolleri", () => {
  it("kapsül sağ kenara yaslı dikey ray içinde durur, alt köşeye geri dönmez", () => {
    expect(mapControls).toContain("md:top-[196px] md:right-0 md:bottom-[96px]");
    expect(mapControls).toContain("md:rounded-l-[30px] md:rounded-r-none");
    expect(mapControls).not.toContain("md:bottom-24");
  });

  it("ray Atlas AI ve yürüyüş kaydı eylemlerini taşır", () => {
    expect(mapControls).toContain("onToggleTrackRecorder");
    expect(mapControls).toContain("onToggleAtlas");
    expect(mapControls).toContain('controls="atlas-assistant"');
    expect(app).toContain("trackRecorderOpen={trackRecorderOpen}");
    expect(app).toContain("atlasOpen={atlasOpen}");
  });
});

describe("teslimat notu docs/ altında", () => {
  it("kök kopya kaldı, docs/teslimatlar kopyası var", () => {
    expect(exists("teslimat-ui-yenileme-2026-10-22.md")).toBe(false);
    expect(exists("docs/teslimatlar/teslimat-ui-yenileme-2026-10-22.md")).toBe(true);
  });
});
