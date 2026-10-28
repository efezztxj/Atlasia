/**
 * Lighthouse CI yapılandırması — G3 (CI'da mobil Lighthouse) + B5 (bütçe kapısı).
 *
 * NEDEN AYRI DOSYA: `npm run lighthouse` yerelde de çalışsın istiyoruz, ama
 * asıl kapı CI'da. Ölçüm **mobil** profilde (Moto G sınıfı, 4x CPU kısıtı,
 * yavaş 4G) yapılır; masaüstü 100'leri sahada hiçbir şey söylemiyordu.
 *
 * EŞİKLER — denetimle aynı:
 *   performans ≥ 90, erişilebilirlik ≥ 95, en iyi uygulamalar ≥ 95, SEO ≥ 95.
 *   Denetimde ölçülen canlı değerler: perf 97 · a11y 100 · SEO 100 · BP 75.
 *   BP 75'in tek nedeni kaynak haritalarıydı (A6 ile giderildi); bu yüzden 95
 *   makul: kapı, düzelttiğimiz şeyin geri gelmemesini istiyor.
 *
 * BÜTÇE (B5): ağırlık ve istek sayısı üst sınırı ayrıca `budgets.json`'da.
 * Bütçe aşılırsa iş kırmızıya döner — "sonra bakarız" dönemi kapanır.
 */
const url = process.env.LHCI_URL ?? "http://localhost:4173/";

module.exports = {
  ci: {
    collect: {
      // CI'da `dist` doğrudan servis edilir: ağ gürültüsü ve Cloudflare kenarı
      // ölçüme karışmaz. Yerelde `LHCI_URL` ile canlı adres de ölçülebilir.
      ...(process.env.LHCI_URL ? { url: [url] } : { staticDistDir: "./dist", url: ["/"] }),
      numberOfRuns: 2,
      settings: {
        preset: "mobile",
        // Tanıtım sayfası tek sayfa; form factor ve önbellek gerçekçi olsun.
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 3, disabled: false },
        throttlingMethod: "simulate",
        // B5: ağırlık/istek bütçesi (lighthouse-budgets.json) her koşuda denetlenir.
        budgetPath: "./lighthouse-budgets.json",
        skipAudits: ["canonical", "is-crawlable"],
      },
    },
    assert: {
      preset: "lighthouse:no-pwa",
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        // Regresyon kilidi: denetimden geçen maddeler sessizce geri gelmesin.
        "uses-responsive-images": "error",
        "unused-javascript": ["warn", { maxLength: 0 }],
        "render-blocking-resources": "error",
        "color-contrast": "error",
        "image-alt": "error",
        "label": "error",
        "meta-description": "error",
        "document-title": "error",
        "html-has-lang": "error",
        "viewport": "error",
        // Kaynak haritaları yayında görünmemeli (A6).
        "valid-source-maps": "error",
        "performance-budget": "error",
      },
    },
    // B5: ağırlık/istek bütçesi ayrı dosyada; aşım işi kırmızıya çevirir.
    // (Lighthouse budgets yalnız `collect.settings.budgets` yerine assert
    // üzerinden değil, doğrudan bu dosyayla denetlenir.)
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
