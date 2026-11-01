import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLARITY_TAG_URL,
  CRAWL_LIMITS,
  assetPriority,
  prioritizeAssets,
  entryAssetPath,
  evaluateConfig,
  extractFirebaseConfig,
  inspectClarity,
  inspectLiveSite,
  mainAssetPaths,
  mergeConfigs,
  referencedAssetPaths,
} from "./canli-yapilandirma.mjs";

const HTML = `<!doctype html><html><head>
<script type="module" crossorigin src="/assets/index-DjplQzf3.js"></script>
<link rel="modulepreload" href="/assets/firebase-vendor-UhAKRl8V.js">
<link rel="stylesheet" href="/assets/index-CzOdj8rO.css">
</head><body><div id="root"></div></body></html>`;

const PROD_JS = `const c={apiKey:"AIzaSyABCDEFGHIJKLMNOP",authDomain:"atlasia-prod.firebaseapp.com",projectId:"atlasia-prod",messagingSenderId:"21255827476"};`;
const DEV_JS = `const c={apiKey:"AIzaSyDEVKEY",authDomain:"atlasia-dev.firebaseapp.com",projectId:"atlasia-dev"};`;
// Vite 8 / Rolldown çıktısı: aynı nesne, dizgiler backtick ile.
const ROLLDOWN_JS =
  "var e={apiKey:`AIzaSyPRODKEY`,authDomain:`atlasia-prod.firebaseapp.com`,projectId:`atlasia-prod`,messagingSenderId:`21255827476`};";

describe("canli-yapilandirma (canlı paket denetimi)", () => {
  it("entry paketini module script'ten bulur", () => {
    assert.equal(entryAssetPath(HTML), "/assets/index-DjplQzf3.js");
  });

  it("module script yoksa ilk same-origin asset'e düşer", () => {
    assert.equal(entryAssetPath('<a href="./assets/main-A1.js"></a>'), "/assets/main-A1.js");
    assert.equal(entryAssetPath("<html></html>"), null);
  });

  it("tüm same-origin js yollarını toplar, css'i karıştırmaz", () => {
    const paths = mainAssetPaths(HTML);
    assert.deepEqual(paths.sort(), ["/assets/firebase-vendor-UhAKRl8V.js", "/assets/index-DjplQzf3.js"]);
  });

  it("minify paketten projectId/authDomain/apiKey okur ve anahtarı maskeler", () => {
    const config = extractFirebaseConfig(PROD_JS);
    assert.equal(config.projectId, "atlasia-prod");
    assert.equal(config.authDomain, "atlasia-prod.firebaseapp.com");
    assert.equal(config.apiKeyPresent, true);
    assert.equal(config.apiKeyMasked, "AIza…MNOP");
    assert.ok(!JSON.stringify(config).includes("AIzaSyABCDEFGHIJKLMNOP"), "tam anahtar sızmamalı");
    assert.equal(config.mentionsDevProject, false);
  });

  it("Vite 8 / Rolldown backtick çıktısını da okur (1 Kasım canlı hatası)", () => {
    const config = extractFirebaseConfig(ROLLDOWN_JS);
    assert.equal(config.projectId, "atlasia-prod");
    assert.equal(config.authDomain, "atlasia-prod.firebaseapp.com");
    assert.equal(config.apiKeyPresent, true);
    assert.equal(config.apiKeyMasked, "AIza…DKEY");
    assert.equal(evaluateConfig(config, { expectedProject: "atlasia-prod" }).ok, true);
  });

  it("atlasia-device-* yerel depolama adları yanlış alarm vermez", () => {
    const config = extractFirebaseConfig(
      `${PROD_JS}const k="atlasia-device-accounts-v1",s="atlasia-device-sessions";`,
    );
    assert.equal(config.mentionsDevProject, false);
  });

  it("atlasia-dev tek başına hata değil; not olarak raporlanır", () => {
    // Depoda tek Firebase projesi var ve canlı site onun üzerinde çalışıyor.
    const verdict = evaluateConfig(extractFirebaseConfig(DEV_JS), { expectedProject: "atlasia-dev" });
    assert.equal(verdict.ok, true);
    assert.deepEqual(verdict.problems, []);
    assert.ok(verdict.notes.some((n) => n.includes("atlasia-dev")));
  });

  it("beyan edilen üretim projesinden farklıysa hatalı sayar", () => {
    const verdict = evaluateConfig(extractFirebaseConfig(DEV_JS), { expectedProject: "atlasia-uretim" });
    assert.equal(verdict.ok, false);
    assert.ok(verdict.problems.some((p) => p.includes("uyuşmuyor")));
  });

  it("beyan yoksa hata değil, not üretir", () => {
    const verdict = evaluateConfig(extractFirebaseConfig(DEV_JS));
    assert.equal(verdict.ok, true);
    assert.ok(verdict.notes.some((n) => n.includes("ATLASIA_URETIM_PROJESI")));
  });

  it("sağlıklı üretim yapılandırmasını geçirir", () => {
    const verdict = evaluateConfig(extractFirebaseConfig(PROD_JS), { expectedProject: "atlasia-prod" });
    assert.equal(verdict.ok, true);
    assert.deepEqual(verdict.problems, []);
  });

  it("beklenen proje kimliği tutmazsa uyarır", () => {
    const verdict = evaluateConfig(extractFirebaseConfig(PROD_JS), { expectedProject: "atlasia" });
    assert.equal(verdict.ok, false);
    assert.ok(verdict.problems.some((p) => p.includes("uyuşmuyor")));
  });

  it("eksik yapılandırmayı yakalar", () => {
    const verdict = evaluateConfig(extractFirebaseConfig("const x=1;"));
    assert.equal(verdict.ok, false);
    assert.equal(verdict.problems.length, 3);
  });

  it("inspectLiveSite: HTML → entry paketini çeker ve cache busting uygular", async () => {
    const seen = [];
    const fetchImpl = async (url) => {
      seen.push(url);
      if (url.includes("/assets/")) {
        return { ok: true, status: 200, text: async () => PROD_JS };
      }
      return { ok: true, status: 200, text: async () => HTML };
    };
    const result = await inspectLiveSite({ base: "https://ornek.test", fetchImpl, stamp: "T1" });
    assert.equal(result.entry, "/assets/index-DjplQzf3.js");
    assert.equal(result.config.projectId, "atlasia-prod");
    assert.equal(seen.length, 2);
    assert.ok(seen.every((url) => url.includes("dogrula=T1")), "her istek cache busting taşımalı");
  });

  it("HTTP hatasında anlaşılır hata verir", async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, text: async () => "" });
    await assert.rejects(
      () => inspectLiveSite({ base: "https://ornek.test", fetchImpl, stamp: "T1" }),
      /HTTP 503/,
    );
  });

  it("tembel parça referanslarını (./x.js ve /assets/x.js) toplar", () => {
    const paths = referencedAssetPaths(
      'const a=()=>import("./firebaseConfig-DWU9OYui.js");const b="/assets/react-vendor-BkL.js";const c="./icons-vendor-x.js";',
    );
    assert.deepEqual(paths.sort(), [
      "/assets/firebaseConfig-DWU9OYui.js",
      "/assets/icons-vendor-x.js",
      "/assets/react-vendor-BkL.js",
    ]);
  });

  it("T11 sonrası: girişte yapılandırma yoksa tembel parçayı tarayıp bulur", async () => {
    // 1 Kasım 2026 canlı hatasının birebir modeli: giriş paketi yalnız import taşıyor,
    // Firebase yapılandırması `firebaseConfig-*.js` parçasında.
    const entryJs = 'import("./firebaseConfig-DWU9OYui.js");const x=1;';
    const fetchImpl = async (url) => {
      if (!url.includes("/assets/")) return { ok: true, status: 200, text: async () => HTML };
      if (url.includes("index-")) return { ok: true, status: 200, text: async () => entryJs };
      if (url.includes("firebaseConfig-")) return { ok: true, status: 200, text: async () => PROD_JS };
      return { ok: false, status: 404, text: async () => "" };
    };
    const result = await inspectLiveSite({ base: "https://ornek.test", fetchImpl, stamp: "T1" });
    assert.equal(result.config.projectId, "atlasia-prod");
    assert.equal(result.config.apiKeyPresent, true);
    assert.equal(result.chunksScanned, 2);
    assert.equal(evaluateConfig(result.config, { expectedProject: "atlasia-prod" }).ok, true);
  });

  it("gerçekten eksik yapılandırmayı hâlâ hatalı sayar (yanlış yeşil yok)", async () => {
    const entryJs = 'import("./baska-DWU9OYui.js");const x=1;';
    const fetchImpl = async (url) => {
      if (!url.includes("/assets/")) return { ok: true, status: 200, text: async () => HTML };
      if (url.includes("index-")) return { ok: true, status: 200, text: async () => entryJs };
      return { ok: true, status: 200, text: async () => 'const y="merhaba";' };
    };
    const result = await inspectLiveSite({ base: "https://ornek.test", fetchImpl, stamp: "T1" });
    assert.equal(result.config.projectId, null);
    assert.equal(evaluateConfig(result.config).ok, false);
  });

  it("düşen parça denetimi çökertmez, kalan parçalarla karar verir", async () => {
    const entryJs = 'import("./a-A1.js");import("./firebaseConfig-DWU9OYui.js");';
    const fetchImpl = async (url) => {
      if (!url.includes("/assets/")) return { ok: true, status: 200, text: async () => HTML };
      if (url.includes("index-")) return { ok: true, status: 200, text: async () => entryJs };
      if (url.includes("firebaseConfig-")) return { ok: true, status: 200, text: async () => PROD_JS };
      throw new Error("ağ koptu");
    };
    const result = await inspectLiveSite({ base: "https://ornek.test", fetchImpl, stamp: "T1" });
    assert.equal(result.config.projectId, "atlasia-prod");
  });

  it("parça taraması üst sınırı aşmaz", async () => {
    const many = Array.from({ length: 60 }, (_, index) => `import("./parca-${index}.js");`).join("");
    let calls = 0;
    const fetchImpl = async (url) => {
      calls += 1;
      if (!url.includes("/assets/")) return { ok: true, status: 200, text: async () => HTML };
      return { ok: true, status: 200, text: async () => (url.includes("index-") ? many : 'import("./parca-0.js");') };
    };
    const result = await inspectLiveSite({ base: "https://ornek.test", fetchImpl, stamp: "T1" });
    assert.ok(result.chunksScanned <= CRAWL_LIMITS.maxChunks, `sınır aşıldı: ${result.chunksScanned}`);
    assert.ok(calls <= CRAWL_LIMITS.maxChunks + 1, `fazla istek: ${calls}`);
  });

  it("alanları farklı parçalara dağılmış yapılandırmayı birleştirir", () => {
    const merged = mergeConfigs([
      extractFirebaseConfig('const x={apiKey:"AIzaSyAAAA1111"};'),
      extractFirebaseConfig('const y={projectId:"atlasia-prod",authDomain:"atlasia-prod.firebaseapp.com"};'),
      extractFirebaseConfig('const z="atlasia-dev";'),
    ]);
    assert.equal(merged.projectId, "atlasia-prod");
    assert.equal(merged.authDomain, "atlasia-prod.firebaseapp.com");
    assert.equal(merged.apiKeyPresent, true);
    assert.equal(merged.mentionsDevProject, true);
  });

  it("yapılandırma parçası tarama sırasında öne alınır", () => {
    const sorted = prioritizeAssets([
      "/assets/MapView-abc.js",
      "/assets/config-abc.js",
      "/assets/firebaseConfig-DWU9OYui.js",
      "/assets/react-vendor-BkL.js",
    ]);
    assert.equal(sorted[0], "/assets/firebaseConfig-DWU9OYui.js");
    assert.equal(sorted[1], "/assets/config-abc.js");
    assert.equal(assetPriority("/assets/MapView-abc.js"), 2);
  });

  it("giriş 40+ parçaya referans verse de yapılandırma erken bulunur (erken çıkış)", async () => {
    const bulk = Array.from({ length: 45 }, (_, index) => `import("./MapView-${index}.js");`).join("");
    const entryJs = `${bulk}import("./firebaseConfig-DWU9OYui.js");`;
    let calls = 0;
    const fetchImpl = async (url) => {
      calls += 1;
      if (!url.includes("/assets/")) return { ok: true, status: 200, text: async () => HTML };
      if (url.includes("index-")) return { ok: true, status: 200, text: async () => entryJs };
      if (url.includes("firebaseConfig-")) return { ok: true, status: 200, text: async () => PROD_JS };
      return { ok: true, status: 200, text: async () => "const z=1;" };
    };
    const result = await inspectLiveSite({ base: "https://ornek.test", fetchImpl, stamp: "T1" });
    assert.equal(result.config.projectId, "atlasia-prod");
    assert.equal(result.chunksScanned, 2, "yapılandırma bulununca tarama durmalı");
    assert.ok(calls <= 3, `fazla istek: ${calls}`);
  });

  describe("Clarity canlı doğrulaması", () => {
    const CSP_OK =
      "default-src 'self'; script-src 'self' https://www.clarity.ms https://scripts.clarity.ms https://apis.google.com; " +
      "connect-src 'self' https://www.clarity.ms https://*.clarity.ms; img-src 'self' https://*.clarity.ms";

    const siteWith = (csp) => async (url) => {
      if (url.startsWith(CLARITY_TAG_URL)) {
        return { ok: true, status: 200, headers: new Map([["content-type", "text/javascript"]]), text: async () => "" };
      }
      return {
        ok: true,
        status: 200,
        headers: new Map(csp ? [["content-security-policy", csp]] : []),
        text: async () => "<html></html>",
      };
    };

    it("CSP iki Clarity adresini de izliyorsa ve tag 200 ise yeşil", async () => {
      const result = await inspectClarity({ base: "https://ornek.test", fetchImpl: siteWith(CSP_OK) });
      assert.equal(result.ok, true, result.problems.join(" | "));
      assert.equal(result.tag.status, 200);
      assert.ok(result.scriptSrc.includes("https://scripts.clarity.ms"));
    });

    it("scripts.clarity.ms eksikse kırmızı (1 Kasım öncesi durum)", async () => {
      const broken = CSP_OK.replace(" https://scripts.clarity.ms", "");
      const result = await inspectClarity({ base: "https://ornek.test", fetchImpl: siteWith(broken) });
      assert.equal(result.ok, false);
      assert.ok(result.problems.some((p) => p.includes("scripts.clarity.ms")));
    });

    it("connect-src *.clarity.ms yoksa oturum verisi gönderilemez diye uyarır", async () => {
      const broken = CSP_OK.replace(" https://*.clarity.ms;", ";");
      const result = await inspectClarity({ base: "https://ornek.test", fetchImpl: siteWith(broken) });
      assert.equal(result.ok, false);
      assert.ok(result.problems.some((p) => p.includes("connect-src")));
    });

    it("CSP başlığı hiç yoksa kırmızı", async () => {
      const result = await inspectClarity({ base: "https://ornek.test", fetchImpl: siteWith(null) });
      assert.equal(result.ok, false);
      assert.ok(result.problems.some((p) => p.includes("Content-Security-Policy")));
    });

    it("tag adresi 200 değilse proje kimliğini sorgular", async () => {
      const fetchImpl = async (url) => {
        if (url.startsWith(CLARITY_TAG_URL)) {
          return { ok: false, status: 404, headers: new Map(), text: async () => "" };
        }
        return {
          ok: true,
          status: 200,
          headers: new Map([["content-security-policy", CSP_OK]]),
          text: async () => "<html></html>",
        };
      };
      const result = await inspectClarity({ base: "https://ornek.test", fetchImpl });
      assert.equal(result.ok, false);
      assert.ok(result.problems.some((p) => p.includes("HTTP 404")));
    });

    it("ağ engeli kırmızı değil, not üretir", async () => {
      const fetchImpl = async (url) => {
        if (url.startsWith(CLARITY_TAG_URL)) throw new Error("fetch failed");
        return {
          ok: true,
          status: 200,
          headers: new Map([["content-security-policy", CSP_OK]]),
          text: async () => "<html></html>",
        };
      };
      const result = await inspectClarity({ base: "https://ornek.test", fetchImpl });
      assert.equal(result.ok, true);
      assert.ok(result.notes.some((n) => n.includes("ulaşılamadı")));
    });
  });
});
