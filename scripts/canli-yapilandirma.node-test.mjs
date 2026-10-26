import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  entryAssetPath,
  evaluateConfig,
  extractFirebaseConfig,
  inspectLiveSite,
  mainAssetPaths,
} from "./canli-yapilandirma.mjs";

const HTML = `<!doctype html><html><head>
<script type="module" crossorigin src="/assets/index-DjplQzf3.js"></script>
<link rel="modulepreload" href="/assets/firebase-vendor-UhAKRl8V.js">
<link rel="stylesheet" href="/assets/index-CzOdj8rO.css">
</head><body><div id="root"></div></body></html>`;

const PROD_JS = `const c={apiKey:"AIzaSyABCDEFGHIJKLMNOP",authDomain:"atlasia-prod.firebaseapp.com",projectId:"atlasia-prod",messagingSenderId:"21255827476"};`;
const DEV_JS = `const c={apiKey:"AIzaSyDEVKEY",authDomain:"atlasia-dev.firebaseapp.com",projectId:"atlasia-dev"};`;

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

  it("atlasia-device-* yerel depolama adları yanlış alarm vermez", () => {
    const config = extractFirebaseConfig(
      `${PROD_JS}const k="atlasia-device-accounts-v1",s="atlasia-device-sessions";`,
    );
    assert.equal(config.mentionsDevProject, false);
  });

  it("geliştirme projesine bağlı canlı yapıyı hatalı sayar", () => {
    const verdict = evaluateConfig(extractFirebaseConfig(DEV_JS));
    assert.equal(verdict.ok, false);
    assert.ok(verdict.problems.some((p) => p.includes("atlasia-dev")));
  });

  it("sağlıklı üretim yapılandırmasını geçirir", () => {
    const verdict = evaluateConfig(extractFirebaseConfig(PROD_JS), { expectedProject: "atlasia-prod" });
    assert.deepEqual(verdict, { ok: true, problems: [] });
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
});
