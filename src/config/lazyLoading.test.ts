import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("ağır istemci modüllerinin tembel yüklenmesi", () => {
  it("MapView bileşenini Suspense iskeleti arkasında dinamik yükler", () => {
    const explorer = read("src/components/Explorer.tsx");
    expect(explorer).toContain('lazy(() => import("./MapView"))');
    expect(explorer).toContain("<Suspense fallback={<MapLoadingSkeleton />}> ".trim());
    expect(explorer).toContain('aria-label="Harita yükleniyor"');
    expect(explorer).not.toMatch(/^import MapView.+from "\.\/MapView";/m);
  });

  it("isteğe bağlı 6 panel (sosyal, çekmece, Atlas, yerlerim, sokak, ekle) tembel yüklenir", () => {
    const explorer = read("src/components/Explorer.tsx");
    for (const name of ["SocialPanel", "MyPlacesPanel", "Drawer", "AtlasAssistant", "StreetPeek", "AddDiscoveryModal"]) {
      expect(explorer).toContain(`lazy(() => import("./${name}"))`);
      expect(explorer).not.toMatch(new RegExp(`^import ${name} from "\\./${name}";`, "m"));
    }
  });

  it("landing kabuğu Firebase SDK'sını ve keşif kabuğunu ilk grafiğe almaz", () => {
    const app = read("src/App.tsx");
    // Landing'in ilk yüklemesinde firebase-vendor (~150 KB gzip) ve harita
    // bağımlılıkları bulunmamalı: ikisi de yalnız oturum/giriş sonrası gelir.
    expect(app).toContain('lazy(() => import("./components/Explorer"))');
    expect(app).toContain('lazy(() => import("./components/AccountAccess"))');
    expect(app).not.toMatch(/^import(?!\s+type\b)[^;]+from "[./]+lib\/firebase";/m);
    expect(app).not.toMatch(/^import[^;]+from "[./]+components\/Explorer";/m);
    // Auth katmanı SDK'yı statik çekmez; yapılandırma kapısı SDK'sızdır.
    expect(read("src/lib/auth.ts")).not.toMatch(/^import[^;]+from "\.\/firebase";/m);
    expect(read("src/lib/auth.ts")).toContain('import("./firebase")');
    expect(read("src/lib/firebaseConfig.ts")).not.toMatch(/from "firebase\//);
  });

  it("P14 tarihçe kodu ve Efes fixture verisi entry'ye girmez", () => {
    const sources = ["src/components/Explorer.tsx", "src/components/PlaceDetails.tsx", "src/components/NearbyHistory.tsx"].map(read).join("\n");
    // Statik import tüm fixture modülünü entry'ye taşır; yalnız ephesusCenter statik olabilir.
    expect(sources).not.toMatch(/^import [^;]+ from "[./]+data\/ephesusFixture";/m);
    expect(sources).not.toMatch(/^import (?!type )[^;]+ from "[./]+utils\/historicSites";/m);
    expect(read("src/components/PlaceDetails.tsx")).toContain('lazy(() => import("./NearbyHistory"))');
  });

  it("koşullu paneller (yer detayı, yürüyüş kaydı) statik import edilmez", () => {
    const app = read("src/components/Explorer.tsx");
    // Bu iki panel yalnız kullanıcı eylemiyle açılır. Statik import, panelin
    // bağımlılıklarını (yer tavsiyeleri, iz toplama/sadeleştirme) ilk yüke taşır.
    expect(app).toContain('lazy(() => import("./PlaceDetails"))');
    expect(app).toContain('lazy(() => import("./TrackRecorderPanel"))');
    expect(app).not.toMatch(/^import PlaceDetails from "\.\/PlaceDetails";/m);
    expect(app).not.toMatch(/^import TrackRecorderPanel from "\.\/TrackRecorderPanel";/m);
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
    for (const path of ["src/components/Explorer.tsx", "src/components/RouteEditor.tsx"]) {
      const source = read(path);
      expect(source, path).toContain("shareLinkUrl");
      expect(source, path).not.toMatch(/^import [^;]+ from "[./]+utils\/shareLink";/m);
      expect(source, path).not.toContain('from "fflate"');
    }
  });
});
