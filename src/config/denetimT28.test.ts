/**
 * 28 Ekim 2026 canlı denetim turu — düzeltmelerin regresyon kilidi.
 *
 * NEDEN TEK DOSYA: Denetim listesi ID'lerle geldi (E1, E4, E5, D4, D6, E2, E7,
 * E8). Her ID için kaynak düzeyinde bir iddia burada duruyor; böylece teslimat
 * raporundaki "yapıldı" satırları yoruma değil, koşan testlere dayanıyor.
 * Davranış testleri ilgili bileşenlerin kendi testlerinde (a11yThemes,
 * routeMeta, gorsel köprüsü düğüm testi) ayrıca var.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const css = read("src/index.css");
const bottomPanel = read("src/components/BottomPanel.tsx");
const searchBox = read("src/components/SearchBox.tsx");
const cookie = read("src/components/CookieConsent.tsx");
const landing = read("src/components/LandingPage.tsx");
const assistant = read("src/components/AtlasAssistant.tsx");
const audioGuide = read("src/components/NearbyAudioGuide.tsx");
const headers = read("public/_headers");
const bridge = read("functions/gorsel.js");

describe("E1 · mobil keşif paneli header/tab bar'ı örtmüyor", () => {
  it("tam ekran panel alt sekme çubuğunun üstünde bitiyor", () => {
    expect(bottomPanel).toContain("mobile-discovery-panel mobile-fullscreen");
    expect(css).toMatch(/\.mobile-discovery-panel\.mobile-fullscreen\s*\{[^}]*inset: 0 0 calc\(58px \+ env\(safe-area-inset-bottom\)\) 0;/s);
    // Yükseklik sabitlenmemeli: kalan alan kullanılır.
    expect(css).toMatch(/\.mobile-discovery-panel\.mobile-fullscreen\s*\{[^}]*height: auto;/s);
  });
});

describe("E4 · mobilde kesilen metin", () => {
  it("ipucu tek satırda kesilmiyor, iki satıra kadar sarıyor", () => {
    expect(bottomPanel).toContain("line-clamp-2 text-[10.5px]");
    expect(bottomPanel).not.toMatch(/mt-1 block truncate text-\[10\.5px\]/);
  });
});

describe("E5 · arama listesi harita rayına girmiyor", () => {
  it("açılır listeler masaüstünde sağdan 64 px içeride", () => {
    const dropdowns = searchBox.match(/absolute top-14 right-0 left-0 z-20 md:right-\[64px\]/g) ?? [];
    expect(dropdowns).toHaveLength(2);
  });
});

describe("D4 · çerez bandı birincil eylemi örtmüyor", () => {
  it("bant gerçek yüksekliğini ölçüp köke yazıyor", () => {
    expect(cookie).toContain("--consent-space");
    expect(cookie).toContain('root.dataset.consent = "open"');
    expect(cookie).toContain("ResizeObserver");
  });

  it("CSS sabit eylemleri bu kadar yukarı kaydırıyor", () => {
    expect(css).toContain('html[data-consent="open"] .mobile-walk-fab');
    expect(css).toContain('html[data-consent="open"] .atlas-launcher');
  });

  it("mobil bant ekranın %52'sinden fazlasını kaplamıyor", () => {
    expect(cookie).toContain("max-h-[52dvh]");
  });
});

describe("D6 · tanıtımda örnek rota kartları", () => {
  it("üç örnek var ve hepsi aynı birincil eyleme çıkıyor", () => {
    expect(landing).toContain("EXAMPLE_ROUTES");
    expect(landing).toContain("ornek-rotalar");
    expect((landing.match(/title: "/g) ?? []).length).toBeGreaterThanOrEqual(3);
    // Ekstra CTA satırı yok: kartlar düğme (entry bütçesi).
    expect(landing).toMatch(/onStart\("how_it_works"\)/);
    // CTA hiyerarşisi bozulmuyor: örnek kartlar "secondary" sayılmaz
    // (LandingPage.test.ts hero'da 1 birincil / 2 ikincil bekler).
    expect(landing).toContain("data-route-example");
    expect(landing).not.toMatch(/data-cta-level="secondary" onClick=\{\(\) => onStart\("how_it_works"\)\} className="w-full/);
  });
});

describe("E2 · Atlas AI referans bağlamı tazeleniyor", () => {
  it("seçili yer değişince bağlam güncelleniyor, adı geçen yer bağlam oluyor", () => {
    expect(assistant).toContain("activeReference");
    expect(assistant).toMatch(/named \?\? selectedPlace \?\? activeReference/);
    expect(assistant).toMatch(/if \(selectedPlace\) setActiveReference\(selectedPlace\)/);
    // Rozet gerçekten kullanılan bağlamı gösteriyor.
    expect(assistant).toContain("Referans: {activeReference?.title");
  });
});

describe("E7 · Pexels hotlink yok, kendi köprümüz var", () => {
  it("tarayıcı üçüncü taraf görsel alan adına bağlanmıyor", () => {
    expect(read("src/data/places.ts")).toContain("/gorsel?u=");
    expect(read("src/data/galleries.ts")).toContain("/gorsel?u=");
    expect(headers).not.toContain("images.pexels.com");
  });

  it("köprü açık proxy değil: host + yol + yöntem allowlist'i var", () => {
    expect(bridge).toContain('const ALLOWED_HOST = "images.pexels.com"');
    expect(bridge).toContain("ALLOWED_PATH");
    expect(bridge).toMatch(/method !== "GET" && request\.method !== "HEAD"/);
    expect(bridge).toContain("cache-control");
  });

  it("yerel geliştirme aynı kuralı uyguluyor (görseller kırılmıyor)", () => {
    const vite = read("vite.config.ts");
    expect(vite).toContain("atlasia-image-bridge-dev");
    expect(vite).toContain('server.middlewares.use("/gorsel"');
  });
});

describe("E8 · sesli rehber izin sırası ve geri bildirim", () => {
  it("ölçüm ses gerçekten başlayınca, hata görünür biçimde bildiriliyor", () => {
    expect(audioGuide).toContain("utterance.onstart");
    expect(audioGuide).toContain("voiceIssue");
    // Eski davranış: istek anında sayıyordu (ekran okuyucuda sessiz kalabiliyordu).
    expect(audioGuide).not.toMatch(/speak\(utterance\);\s*\n\s*\/\/ T2:[^\n]*\n\s*analytics\.audioGuideStart/);
  });
});
