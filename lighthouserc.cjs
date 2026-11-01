/**
 * S4 — Lighthouse CI kapısı.
 *
 * NEDEN VAR: bugüne dek performans yalnız *paket bütçesiyle* (kB) korunuyordu.
 * Paket küçük olsa da gerçek LCP/TBT kötü olabilir; tersi de doğru. Bu kapı
 * üretim derlemesini (`dist/`) mobil profilde gerçek Chromium'da ölçer.
 *
 * İki sayfa ölçülür:
 *  1. `/`            — tanıtım (LCP'nin gerçekten kritik olduğu sayfa).
 *  2. `/?tab=kesfet` — uygulama kabuğu (manifest kısayolu; soğuk açılışta
 *                      haritayı açar — `App.tsx`'teki kısayol düzeltmesi).
 *
 * EŞİK POLİTİKASI (AGENTS.md: eşiği yeşile çevirmek için düşürmek yasak):
 *  - `HEDEF` S4 kabul listesidir ve **değişmez**: perf ≥ 0,85 · a11y ≥ 0,95.
 *  - `TABAN` bu kapının **ilk gerçek ölçümünden** bağlanan regresyon tabanıdır;
 *    bugünkü kod hedefin altındaysa kapı onu gizlemez, ölçülen seviyede tutar
 *    ve hedefe çıkmak `docs/teslimatlar/teslimat-s4-lighthouse-2026-11-01.md`
 *    içinde **açık borç** olarak durur. TABAN yalnız **yukarı** hareket eder;
 *    `src/config/lighthouseGate.test.ts` bu yönü kilitler.
 *  - Erişilebilirlikte taban yok: S3 axe kapısı zaten `critical/serious = 0`
 *    tutuyor, Lighthouse puanı da doğrudan hedefte aranıyor.
 *
 * Ölçüm gürültüsüne karşı: her URL 3 kez koşar, LHCI medyanı değerlendirir.
 * Yükleme hedefi `filesystem`: dış servise (LHCI sunucusu) ihtiyaç yok, rapor
 * CI artifact'ı olarak saklanır.
 */
const HEDEF = Object.freeze({ performance: 0.85, accessibility: 0.95, cls: 0.05 });

// Ölçümler (CI, 1 Kasım 2026, 3 koşu/medyan):
//   1) kapı ilk açıldığında:  /  perf 0,75–0,76 · a11y 0,98 · /?tab=kesfet perf 0,35–0,39
//   2) hero AVIF/WebP'ye çevrildikten sonra: / perf **0,82** · a11y **1,00**
// Taban her turda ölçülenin bir adım altına bağlanır ve **yalnız yukarı** hareket eder:
// böylece kazanılan puan geri kaybedilemez, hedef (0,85) borç olarak açık kalır.
const TABAN = Object.freeze({ landing: 0.8, appShell: 0.35 });

module.exports = {
  ci: {
    collect: {
      // Üretim çıktısı LHCI'nin statik sunucusundan servis edilir.
      staticDistDir: "./dist",
      url: ["http://localhost/", "http://localhost/?tab=kesfet"],
      numberOfRuns: 3,
      settings: {
        // Mobil form faktörü + simüle edilmiş 4G: S4'ün istediği profil.
        formFactor: "mobile",
        throttlingMethod: "simulate",
        // CI konteynerinde /dev/shm küçük ve sandbox kısıtlı; Lighthouse'ın
        // Chromium'u bu iki bayrak olmadan düşebiliyor (ölçümü etkilemez).
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
        onlyCategories: ["performance", "accessibility"],
        // SEO/PWA puanları bu kapının konusu değil; ölçüm süresini kısaltır.
        skipAudits: ["canonical", "is-crawlable", "robots-txt", "structured-data"],
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: "/$",
          assertions: {
            "categories:performance": ["error", { minScore: TABAN.landing }],
            "categories:accessibility": ["error", { minScore: HEDEF.accessibility }],
            "cumulative-layout-shift": ["error", { maxNumericValue: HEDEF.cls }],
          },
        },
        {
          matchingUrlPattern: "tab=kesfet",
          assertions: {
            "categories:performance": ["error", { minScore: TABAN.appShell }],
            "categories:accessibility": ["error", { minScore: HEDEF.accessibility }],
            "cumulative-layout-shift": ["error", { maxNumericValue: HEDEF.cls }],
          },
        },
      ],
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
