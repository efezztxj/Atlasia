/**
 * Telefon tam ekran sözleşmesi (< 768 px).
 *
 * Kullanıcı kararı (2026-10-27): telefonda bir panel, çekmece, sayfa veya
 * pencere açıldığında yarım kart/yüzen kutu yerine tam ekran (100dvh, kenardan
 * kenara, güvenli alan dolgulu, alt sekme çubuğu z-40 üstünde) açılır.
 * Yalnız harita üstündeki daraltılmış keşif şeridi (!open) altta kompakt kalır;
 * masaüstü (md: ve üstü) yerleşimi değişmez.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");

const css = read("src/index.css");

const FULLSCREEN_SURFACES: Array<[string, RegExp]> = [
  ["BottomPanel.tsx", /aria-label="Keşif önerileri"[^>]*mobile-fullscreen\b/],
  ["SocialPanel.tsx", /social-panel\s+mobile-fullscreen-bleed\b/],
  ["ProfilePanel.tsx", /settings-sheet\b[^>]*fixed inset-0/],
  ["MyPlacesPanel.tsx", /atlas-sheet\s+mobile-fullscreen\b/],
  ["AtlasAssistant.tsx", /atlas-sheet\s+mobile-fullscreen-bleed\b/],
  ["Drawer.tsx", /mobile-fullscreen-bleed\s+fixed inset-y-0 right-0 z-\[55\]/],
  ["RecordsDock.tsx", /atlas-sheet\s+mobile-fullscreen\b/],
  ["TrackRecorderPanel.tsx", /mobile-fullscreen\s+gold-frame/],
  ["MapLayersSheet.tsx", /mobile-fullscreen\b/],
  ["NotificationsPanel.tsx", /mobile-fullscreen-bleed\b/],
  ["PlaceDetails.tsx", /settings-sheet\s+mobile-fullscreen-bleed\b/],
  ["StreetPeek.tsx", /mobile-fullscreen-bleed\b[\s\S]{0,120}z-\[66\]/],
  ["GroupsPanel.tsx", /panel-solid\s+mobile-fullscreen-bleed\b/],
  ["AddDiscoveryModal.tsx", /mobile-fullscreen\b/],
  ["RouteEditor.tsx", /panel-solid\s+mobile-fullscreen\b/],
  ["StoryComposer.tsx", /mobile-fullscreen-bleed\b/],
  ["StoryViewer.tsx", /mobile-fullscreen-bleed\b/],
  ["FeedbackDialog.tsx", /panel-solid\s+mobile-fullscreen\b/],
  ["ReportDialog.tsx", /panel-solid\s+mobile-fullscreen\b/],
  ["LegalNotice.tsx", /mobile-fullscreen-bleed\b/],
  ["Onboarding.tsx", /panel-solid\s+mobile-fullscreen\b/],
  ["ModerationNotices.tsx", /panel-solid\s+mobile-fullscreen\b/],
];

describe("telefon tam ekran katman sözleşmesi (< 768 px)", () => {
  it("index.css mobil tam ekran sınıfını 100dvh, kenarsız ve güvenli alan dolgulu tanımlar", () => {
    expect(css).toMatch(/\.mobile-fullscreen,\s*\n\s*\.mobile-fullscreen-bleed,/);
    expect(css).toContain("height: 100dvh;");
    expect(css).toContain("max-height: 100dvh;");
    expect(css).toContain("max-width: none;");
    expect(css).toContain("border-radius: 0;");
    expect(css).toContain("border-width: 0;");
    expect(css).toContain(".mobile-fullscreen-wrap");
  });

  it("mobil arama sayfası tam ekran açılır ve kapatma düğmesi taşır; eski 68dvh/280px sınırları kalktı", () => {
    expect(css).not.toContain("max-height: 68dvh");
    expect(css).not.toContain("width: min(280px, calc(100vw - 20px))");
    const searchBox = read("src/components/SearchBox.tsx");
    expect(searchBox).toContain('aria-label="Aramayı kapat"');
    expect(searchBox).toContain('.closest(".mobile-search-sheet")');
  });

  it("açılan her panel, çekmece, sayfa ve pencere mobil tam ekran sınıfını taşır", () => {
    for (const [file, pattern] of FULLSCREEN_SURFACES) {
      const source = read(`src/components/${file}`);
      expect(source, `${file} mobil tam ekran sınıfı taşımıyor`).toMatch(pattern);
    }
  });

  it("daraltılmış keşif şeridi (!open) tam ekrana dönüşmez; harita üstünde kompakt kalır", () => {
    const bottomPanel = read("src/components/BottomPanel.tsx");
    const collapsedSection = /aria-label="Daraltılmış keşif önerisi"\s+className="([^"]+)"/.exec(bottomPanel)?.[1] ?? "";
    expect(collapsedSection).toContain("max-md:bottom-[calc(88px+env(safe-area-inset-bottom))]");
    expect(collapsedSection).not.toContain("mobile-fullscreen");
  });
});
