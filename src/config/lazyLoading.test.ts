import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("ağır istemci modüllerinin tembel yüklenmesi", () => {
  it("MapView bileşenini Suspense iskeleti arkasında dinamik yükler", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('lazy(() => import("./components/MapView"))');
    expect(app).toContain("<Suspense fallback={<MapLoadingSkeleton />}> ".trim());
    expect(app).toContain('aria-label="Harita yükleniyor"');
    expect(app).not.toMatch(/^import MapView.+from "\.\/components\/MapView";/m);
  });

  it("P14 tarihçe kodu ve Efes fixture verisi entry'ye girmez", () => {
    const sources = ["src/App.tsx", "src/components/PlaceDetails.tsx", "src/components/NearbyHistory.tsx"].map(read).join("\n");
    // Statik import tüm fixture modülünü entry'ye taşır; yalnız ephesusCenter statik olabilir.
    expect(sources).not.toMatch(/^import [^;]+ from "[./]+data\/ephesusFixture";/m);
    expect(sources).not.toMatch(/^import (?!type )[^;]+ from "[./]+utils\/historicSites";/m);
    expect(read("src/components/PlaceDetails.tsx")).toContain('lazy(() => import("./NearbyHistory"))');
  });

  it("Firebase Auth çalışma kodunu statik başlangıç grafiğine eklemez", () => {
    const runtimeFiles = [
      "src/lib/auth.ts",
      "src/contexts/AuthContext.tsx",
      "src/components/AccountAccess.tsx",
      "src/lib/moderation.ts",
    ];
    for (const path of runtimeFiles) {
      const source = read(path);
      expect(source, path).toContain('import("firebase/auth")');
      expect(source, path).not.toMatch(/^import(?!\s+type\b)[^;]+from "firebase\/auth";/m);
    }
    expect(read("src/lib/firebase.ts")).not.toContain('from "firebase/auth"');
  });

  it("Rollup Firebase Auth'u çekirdek vendor parçasından ayrı tutar", () => {
    const config = read("vite.config.ts");
    const authChunk = config.indexOf('return "firebase-auth"');
    const coreChunk = config.indexOf('return "firebase-vendor"');
    expect(authChunk).toBeGreaterThan(-1);
    expect(coreChunk).toBeGreaterThan(authChunk);
  });
});
