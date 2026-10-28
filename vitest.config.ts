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
