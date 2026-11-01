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
 * Eşikler S4 kabul listesinden gelir: performans ≥ 0,85 · erişilebilirlik ≥ 0,95.
 * Eşiği "yeşile çevirmek için" düşürmek repo kuralı gereği yasak; sayı düşükse
 * iş kodda yapılır.
 *
 * Ölçüm gürültüsüne karşı: her URL 3 kez koşar, LHCI medyanı değerlendirir.
 * Yükleme hedefi `filesystem`: dış servise (LHCI sunucusu) ihtiyaç yok, rapor
 * CI artifact'ı olarak saklanır.
 */
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
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        // Kümülatif düzen kayması: eşik S4 hedefiyle aynı (0,05).
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
