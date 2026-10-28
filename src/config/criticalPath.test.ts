import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUNDLE_BUDGET } from "../../scripts/bundle-budget.mjs";

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
    // SSS ve footer JSX'i artık giriş paketinde değil.
    expect(landing).not.toContain('id="sss"');
    expect(landing).not.toContain("<footer");
    expect(footer).toContain('id="sss"');
    expect(footer).toContain("<footer");
  });

  it("alt bloğun yükleme yer tutucusu kaymayı sınırlar", () => {
    // Yer tutucu yükseklik + aynı zemin rengi: parça gelince düzen zıplamaz.
    expect(landing).toMatch(/fallback=\{<div aria-hidden className="min-h-\[5\d\dpx\] bg-\[#f1f0e9\]" \/>\}/);
  });

  it("rıza paneli tembel yüklenir ve yerinde bağlıdır", () => {
    expect(main).toContain('const CookieConsent = lazy(() => import("./components/CookieConsent"))');
    expect(main).toMatch(/<Suspense fallback=\{null\}>\s*<CookieConsent \/>/);
    // Panel hâlâ kabuğun en üstünde: ağ/güncelleme bildirimleriyle aynı yerde.
    expect(main).toContain("<NetworkStatus />");
    expect(main).toContain("<UpdateNotice />");
  });

  it("eşikler ölçüme bağlı: giriş payı ölçümün üstünde ama %20'den yakın", () => {
    const entry = BUNDLE_BUDGET.categoryGzipBytes.entry;
    // Ölçüm (npm ci + npm run build, 2026-10-28): 18.344 B.
    expect(entry).toBeGreaterThanOrEqual(18_344);
    expect(entry).toBeLessThan(18_344 * 1.2);
    // Toplam JS eşiği de ölçüme (999.785 B) bağlı kalmalı.
    expect(BUNDLE_BUDGET.totalJsGzipBytes).toBeGreaterThanOrEqual(999_785);
    expect(BUNDLE_BUDGET.totalJsGzipBytes).toBeLessThan(999_785 * 1.2);
  });
});
