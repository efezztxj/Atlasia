import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

// M-03b: uygulama kabuğu App.tsx (giriş kapısı) + Explorer.tsx (harita/paneller)
// olarak ikiye ayrıldı; "kabuk" testleri ikisini birlikte okur.
const readShell = () => [read("src/App.tsx"), read("src/Explorer.tsx")].join("\n");

describe("ağır istemci modüllerinin tembel yüklenmesi", () => {
  it("MapView bileşenini Suspense iskeleti arkasında dinamik yükler", () => {
    const app = readShell();
    expect(app).toContain('lazy(() => import("./components/MapView"))');
    expect(app).toContain("<Suspense fallback={<MapLoadingSkeleton />}> ".trim());
    expect(app).toContain('aria-label="Harita yükleniyor"');
    expect(app).not.toMatch(/^import MapView.+from "\.\/components\/MapView";/m);
  });

  it("P14 tarihçe kodu ve Efes fixture verisi entry'ye girmez", () => {
    const sources = [readShell(), read("src/components/PlaceDetails.tsx"), read("src/components/NearbyHistory.tsx")].join("\n");
    // Statik import tüm fixture modülünü entry'ye taşır; yalnız ephesusCenter statik olabilir.
    expect(sources).not.toMatch(/^import [^;]+ from "[./]+data\/ephesusFixture";/m);
    expect(sources).not.toMatch(/^import (?!type )[^;]+ from "[./]+utils\/historicSites";/m);
    expect(read("src/components/PlaceDetails.tsx")).toContain('lazy(() => import("./NearbyHistory"))');
  });

  it("koşullu paneller (yer detayı, yürüyüş kaydı) statik import edilmez", () => {
    const app = readShell();
    // Bu iki panel yalnız kullanıcı eylemiyle açılır. Statik import, panelin
    // bağımlılıklarını (yer tavsiyeleri, iz toplama/sadeleştirme) ilk yüke taşır.
    expect(app).toContain('lazy(() => import("./components/PlaceDetails"))');
    expect(app).toContain('lazy(() => import("./components/TrackRecorderPanel"))');
    expect(app).not.toMatch(/^import PlaceDetails from "\.\/components\/PlaceDetails";/m);
    expect(app).not.toMatch(/^import TrackRecorderPanel from "\.\/components\/TrackRecorderPanel";/m);
    // Lazy bileşen Suspense içinde olmalı; aksi hâlde React askıya almayı işleyemez.
    expect(app).toMatch(/<Suspense fallback=\{null\}>\s*<PlaceDetails/);
    expect(app).toMatch(/<Suspense fallback=\{null\}>\s*<TrackRecorderPanel/);
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

  it("shareLink ve fflate başlangıç grafiğine statik import edilmez", () => {
    for (const path of ["src/components/RouteEditor.tsx"]) {
      const source = read(path);
      expect(source, path).toContain("shareLinkUrl");
      expect(source, path).not.toMatch(/^import [^;]+ from "[./]+utils\/shareLink";/m);
      expect(source, path).not.toContain('from "fflate"');
    }
  });
});
