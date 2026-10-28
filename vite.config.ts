import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { parseAllowedHosts } from "./src/config/allowedHosts.ts";
// T17: JS'siz gelen ziyaretçiye (ve JS render etmeyen bota) boş sayfa yerine
// gerçek tanıtım metnini ver. Metin tek kaynakta: `src/content/landingStatic.ts`.
import { renderLandingStaticHtml } from "./src/content/landingStatic.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const allowedHosts = parseAllowedHosts(env.ATLASIA_ALLOWED_HOSTS);

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "atlasia-noscript-landing",
        // `<noscript>` JS açıkken render edilmez: düzen, CLS ve LCP etkilenmez;
        // hidrasyon da gerekmez (createRoot kökü kendi kurar).
        transformIndexHtml: (html) => {
          const marker = '<div id="root"></div>';
          // Sessiz gerileme olmasın: kök işareti değişirse derleme kırılır,
          // sayfa "metinsiz HTML" olarak yayına çıkmaz.
          if (!html.includes(marker)) {
            throw new Error("atlasia-noscript-landing: index.html içinde #root bulunamadı");
          }
          return html.replace(marker, `${marker}\n${renderLandingStaticHtml()}`);
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
      // A6: Kaynak haritaları üretilir ama pakete referans YAZILMAZ ("hidden").
      // Böylece üretimde hata ayıklanabilir (CI artifact), Lighthouse
      // "valid-source-maps" geçer ve haritalar tarayıcıya ipucu olarak sızmaz.
      // `postbuild` bunları dist dışına taşır (scripts/collect-sourcemaps.mjs):
      // Cloudflare `dist` klasörünü yayınladığı için .map dosyaları herkese açık
      // URL'de kalmaz.
      sourcemap: "hidden",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/maplibre-gl") || id.includes("node_modules/@mapbox") || id.includes("node_modules/@maplibre")) return "map-vendor";
            const firebaseAuthModule = id.includes("node_modules/firebase/auth") || id.includes("node_modules/@firebase/auth");
            if (firebaseAuthModule) return "firebase-auth";
            if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) return "firebase-vendor";
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/scheduler")) return "react-vendor";
            if (id.includes("node_modules/lucide-react")) return "icons-vendor";
            return undefined;
          },
        },
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts,
      strictPort: true,
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts,
      strictPort: true,
    },
  };
});
