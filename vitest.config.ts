import { defineConfig } from "vitest/config";

/*
 * NEDEN `env` SABİTLENİYOR: birim testleri "yapılandırılmamış derleme" varsayımıyla
 * yazılmış (auth → cihaz hesabı, koleksiyonlar → yerel mod). Vite bu değişkenleri
 * geliştiricinin yerel `.env.local` dosyasından da okur; yani `.env.local`'ı dolu
 * olan bir makinede testler kırmızı, CI'da (dosya yok) yeşil oluyordu. Testlerin
 * ortama değil koda bağlı olması için burada boşaltılıyor.
 *
 * İhtiyacı olan test ortamı kendisi kurar: `vi.stubEnv(...)` (bkz.
 * src/lib/firebase.test.ts) veya modül mock'u ile.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: false,
    reporters: ["default"],
      /*
       * Kapsam kapısı (F0-2'den uyarlanmış, 2026-11-09). Eşikler İŞKEMBEDEN
       * değil ÖLÇÜMDEN gelir: amaç "yüksek eşik" değil **düşememek**.
       *
       * Ölçüm (197 test dosyası / 1505 test, bu commit):
       *   statements %63,99 · branches %56,78 · functions %59,54 · lines %69,11
       * Eşik = ölçülenin tam sayı alt sınırı. Kapsam düşerse CI kırmızı olur;
       * yeni test yazıp yükseltmek serbest, düşürmek gerekçe ister.
       */
      coverage: {
        provider: "v8",
        reporter: ["text-summary", "json-summary"],
        reportsDirectory: "coverage",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.*"],
        thresholds: {
          statements: 63,
          branches: 56,
          functions: 59,
          lines: 69,
        },
      },
    env: {
      VITE_FIREBASE_API_KEY: "",
      VITE_FIREBASE_AUTH_DOMAIN: "",
      VITE_FIREBASE_PROJECT_ID: "",
      VITE_APPLE_AUTH_ENABLED: "",
      VITE_PHONE_AUTH_ENABLED: "",
      VITE_TELEMETRY_ENDPOINT: "",
    },
  },
});
