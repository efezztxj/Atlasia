import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { parseAllowedHosts } from "./src/config/allowedHosts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const allowedHosts = parseAllowedHosts(env.ATLASIA_ALLOWED_HOSTS);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
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
