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
     * F0-2 — kapsam kapısı. Eşikler işkembeden değil, bu ağaçtaki İLK ÖLÇÜMDEN
     * gelir (2026-11-01: statements %61,21 · branches %53,68 · functions %56,88 ·
     * lines %66,07; 176 dosya / 1.346 test). Amaç "yüksek eşik" değil,
     * **düşememek**: her faz sonunda +3 puan yukarı çekilir (plan §F0-2).
     * Eşiği düşürmek için önce buradaki gerekçe satırının değişmesi gerekir.
     */
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.*"],
      thresholds: {
        lines: 65,
        statements: 60,
        functions: 55,
        branches: 52,
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
