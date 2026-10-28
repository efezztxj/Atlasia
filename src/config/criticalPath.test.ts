import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// `scripts/bundle-budget.mjs` tipli değil; eşikleri metinden okuruz.
const budgetSource = readFileSync("scripts/bundle-budget.mjs", "utf8");
const threshold = (key: string): number => {
  const match = budgetSource.match(new RegExp(`${key}\\s*:\\s*([0-9_]+)`));
  if (!match) throw new Error(`bütçe anahtarı bulunamadı: ${key}`);
  return Number(match[1].replace(/_/g, ""));
};

/**
 * T7 uzantısı — kritik yol sözleşmesi.
 *
 * NEDEN VAR (2026-10-28): giriş paketi (`entry`) 20.915 B ile 20.900 B eşiğine
 * dayanmıştı; landing'e dokunan her yeni satır kapıyı kırıyordu. Çözüm eşiği
 * yükseltmek değil, **ilk boya için gerekmeyen** iki bloğu `entry` dışına
 * almaktı: tanıtımın alt bloğu (SSS + footer) ve rıza paneli. Bu test o kararı
 * ve geri gelmemesini kilitler.
 */
const landing = readFileSync("src/components/LandingPage.tsx", "utf8");
const main = readFileSync("src/main.tsx", "utf8");
const footer = readFileSync("src/components/LandingFooter.tsx", "utf8");

describe("T7 · kritik yol", () => {
  it("tanıtım alt bloğu (SSS + footer) tembel parçada", () => {
    expect(landing).toContain('const LandingFooter = lazy(() => import("./LandingFooter"))');
    expect(landing).toContain("<LandingFooter");
    // SSS ve footer JSX'i artık giriş paketinde değil. Sayfada kalan tek
    // `#sss` yer tutucu çapadır (yavaş ağda menü bağlantısı ölmesin).
    const anchors = landing.match(/id="sss"/g) ?? [];
    expect(anchors).toHaveLength(1);
    expect(landing).toContain('<div id="sss" aria-hidden');
    expect(landing).not.toContain("<footer");
    expect(footer).toContain('id="sss"');
    expect(footer).toContain("<footer");
  });

  it("alt bloğun yükleme yer tutucusu kaymayı sınırlar", () => {
    // Yer tutucu yükseklik + aynı zemin rengi: parça gelince düzen zıplamaz.
    expect(landing).toMatch(/min-h-\[5\d\dpx\] bg-\[#f1f0e9\]/);
  });

  it("rıza paneli tembel yüklenir ve yerinde bağlıdır", () => {
    expect(main).toContain('const CookieConsent = lazy(() => import("./components/CookieConsent"))');
    expect(main).toMatch(/<Suspense fallback=\{null\}>\s*<CookieConsent \/>/);
    // Panel hâlâ kabuğun en üstünde: ağ/güncelleme bildirimleriyle aynı yerde.
    expect(main).toContain("<NetworkStatus />");
    expect(main).toContain("<UpdateNotice />");
  });

  it("eşikler ölçüme bağlı: giriş payı ölçümün üstünde ama %20'den yakın", () => {
    // Ölçüm (npm ci + npm run build, 2026-10-28, Vite 8/Rolldown): entry 16.180 B.
    const entry = threshold("entry");
    expect(entry).toBeGreaterThanOrEqual(16_180);
    expect(entry).toBeLessThan(16_180 * 1.2);
    // Toplam JS eşiği de ölçüme (988.185 B) bağlı kalmalı.
    const total = threshold("totalJsGzipBytes");
    expect(total).toBeGreaterThanOrEqual(988_185);
    expect(total).toBeLessThan(988_185 * 1.2);
  });
});
