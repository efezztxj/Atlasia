import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Site yüzeyi sözleşmesi: tanıtım sayfası, arama motoru dosyaları ve ölçüm
 * kablolaması. Bu testler "profesyonel site" için geri dönüşü olmayan
 * davranışları kilitler; biri bozulursa CI kırmızı olur.
 */

const landing = readFileSync("src/components/LandingPage.tsx", "utf8");
const indexHtml = readFileSync("index.html", "utf8");
const sitemap = readFileSync("public/sitemap.xml", "utf8");
const robots = readFileSync("public/robots.txt", "utf8");

describe("tanıtım sayfası · yasal erişim", () => {
  it("gizlilik, KVKK ve kullanım koşulları bağlantıları tanıtım sayfasından açılır", () => {
    expect(landing).toContain('{ type: "privacy", label: "Gizlilik" }');
    expect(landing).toContain('{ type: "kvkk", label: "KVKK aydınlatma" }');
    expect(landing).toContain('{ type: "terms", label: "Kullanım koşulları" }');
    // Yasal metin ağır bir bileşen: yalnız istendiğinde yüklenmeli.
    expect(landing).toContain('lazy(() => import("./LegalNotice"))');
    expect(landing).toContain("setLegal(type)");
  });

  it("yasal pencere kapatılabilir (durum sıfırlanır)", () => {
    expect(landing).toContain("onClose={() => setLegal(null)}");
  });
});

describe("tanıtım sayfası · güven ve SSS", () => {
  it("sık sorulanlar bölümü ve çapa hedefi var", () => {
    expect(landing).toContain('id="sss"');
    expect(landing).toContain('href="#sss"');
    expect(landing).toContain("const FAQ = [");
    // Ayrıntılar JS gerektirmeden açılmalı (erişilebilir, hafif).
    expect(landing).toContain("<details key={item.q}");
    expect(landing).toContain("<summary");
  });

  it("güven maddeleri abartısız ve ölçülebilir", () => {
    expect(landing).toContain("Reklam ve takip pikseli yok");
    expect(landing).toContain("Konum yalnız senin onayınla");
    expect(landing).toContain("Çevrimdışı paket desteği");
  });

  it("SSS metinleri vaat uydurmaz: fiyat ve konum iddiası dürüst", () => {
    expect(landing).not.toMatch(/ücretsiz.*sonsuza|garanti|%100/i);
    expect(landing).toContain("Konum yalnız sen açıkça izin verdiğinde");
  });
});

describe("site meta · arama motorları", () => {
  it("sitemap geçerli biçimde ve mutlak adreslerle yazılmış", () => {
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    for (const loc of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      expect(loc[1].startsWith("https://")).toBe(true);
    }
    expect(sitemap).toContain("https://atlasia.pages.dev/");
    expect(sitemap).toContain("https://atlasia.pages.dev/uygulama/");
  });

  it("robots.txt siteyi taramaya açık bırakır ve sitemap'i bildirir", () => {
    expect(robots).toMatch(/User-agent: \*/);
    expect(robots).toMatch(/Allow: \//);
    expect(robots).toContain("Sitemap: https://atlasia.pages.dev/sitemap.xml");
  });

  it("HTML içinde sitemap bağlantısı ve geçerli JSON-LD var", () => {
    expect(indexHtml).toContain('<link rel="sitemap" type="application/xml" href="/sitemap.xml" />');
    const match = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match, "JSON-LD bloğu bulunamadı").toBeTruthy();
    const data = JSON.parse(match![1]) as { "@graph": { "@type": string }[] };
    const types = data["@graph"].map((node) => node["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("WebApplication");
    // Puan/oylama gibi doğrulanamayan zengin sonuç verisi yazılmaz.
    expect(match![1]).not.toContain("aggregateRating");
  });
});

describe("arayüz metni · kaldırılan sekme", () => {
  it("bildirim paneli artık olmayan 'Kaydet sekmesi'ni işaret etmez", () => {
    const notifications = readFileSync("src/components/NotificationsPanel.tsx", "utf8");
    expect(notifications).not.toContain("Kaydet sekmesinde");
    expect(notifications).toContain("“Kayıtlarım”");
  });
});

describe("ölçüm · tanımlı her olay gerçekten çağrılıyor", () => {
  const sources = [
    "src/components/AtlasAssistant.tsx",
    "src/components/OfflinePackage.tsx",
    "src/components/ReportDialog.tsx",
    "src/App.tsx",
    "src/components/Explorer.tsx",
    "src/contexts/AuthContext.tsx",
    "src/hooks/useFirestoreAtlasData.ts",
    "src/lib/telemetryBootstrap.ts",
  ].map((path) => readFileSync(path, "utf8")).join("\n");

  it.each([
    "appOpen",
    "sessionStart",
    "signUp",
    "signIn",
    "placeCreated",
    "routePublished",
    "postCreated",
    "share",
    "offlinePack",
    "reportCreated",
  ])("%s olayı bağlı", (method) => {
    expect(sources).toContain(`analytics.${method}(`);
  });
});
