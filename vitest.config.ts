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
     * F0-2 — kapsam kapısı. Eşikler işkembeden değil, ÖLÇÜMDEN gelir. Amaç
     * "yüksek eşik" değil, **düşememek**; her faz sonunda ölçülenin tam sayı
     * tabanına çekilir (plan §F0-2).
     *  · İlk ölçüm (F1-1 öncesi): 61,21 / 53,68 / 56,88 / 66,07
     *  · F1-1 sonrası:             61,50 / 53,78 / 57,21 / 66,40
     *  · F1-2…F1-5 sonrası:        62,93 / 54,41 / 58,57 / 67,73
     *  · F2-1b/F2-1c sonrası:      64,64 / 55,47 / 59,94 / 69,60
     *  · F1-6 adım 4/5 sonrası:    65,42 / 56,02 / 60,67 / 70,38  ← buradaki taban
     *    (run 41333227503'teki kırmızı kapsam değil, `.nvmrc` 22.13.0'ın kırdığı
     *     vitest/undici çökmesiydi; hat 22'ye çekilince eşik yükseltisi geçti.)
     * Eşiği düşürmek için önce buradaki gerekçe satırının değişmesi gerekir.
     */
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.*"],
      thresholds: {
        lines: 69,
        statements: 64,
        functions: 60,
        branches: 55,
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
