import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  declaredProductionProject,
  missingVars,
  policyMode,
  policyViolations,
  shouldEnforce,
  shouldFail,
  verify,
} from "./verify-env.mjs";

function envWith(overrides) {
  return { ...overrides };
}

describe("verify-env (Cloudflare Pages üretim ve güvenlik kapısı)", () => {
  it("CF yok: yerel geliştirme — debug token olsa bile hiçbir şey yapmaz", () => {
    const env = envWith({
      VITE_FIREBASE_API_KEY: "",
      VITE_FIREBASE_AUTH_DOMAIN: "",
      VITE_FIREBASE_PROJECT_ID: "",
      VITE_APPCHECK_DEBUG_TOKEN: "local-debug-uuid",
    });
    assert.equal(shouldEnforce(env), false);
    const logs = [];
    const result = verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.enforced, false);
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.violations, []);
    assert.equal(logs.length, 0);
  });

  it("CF preview: CF_PAGES=1 ama branch preview — temizse hiçbir şey yapmaz", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "preview",
      VITE_FIREBASE_API_KEY: "",
      VITE_FIREBASE_AUTH_DOMAIN: "",
      VITE_FIREBASE_PROJECT_ID: "",
    });
    assert.equal(shouldEnforce(env), false);
    const logs = [];
    const result = verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.enforced, false);
    assert.deepEqual(result.violations, []);
    assert.equal(logs.length, 0);
  });

  it("CF preview ve main: VITE_APPCHECK_DEBUG_TOKEN sızıntısını reddeder, değeri loglamaz", () => {
    const debugSecret = "debug-token-secret-999";
    for (const branch of ["preview", "main"]) {
      const env = envWith({
        CF_PAGES: "1",
        CF_PAGES_BRANCH: branch,
        VITE_FIREBASE_API_KEY: "AIza...",
        VITE_FIREBASE_AUTH_DOMAIN: "atlasia.firebaseapp.com",
        VITE_FIREBASE_PROJECT_ID: "atlasia-prod",
        ATLASIA_URETIM_PROJESI: "atlasia-prod",
        VITE_APPCHECK_DEBUG_TOKEN: debugSecret,
      });
      const logs = [];
      const result = verify(env, { exit: false, log: (m) => logs.push(m) });
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0].code, "forbidden_debug_token");
      assert.ok(logs.some((m) => m.includes("VITE_APPCHECK_DEBUG_TOKEN")));
      assert.ok(logs.every((m) => !m.includes(debugSecret)), "debug token değeri sızmamalı");
    }
  });

  it("CF main: beyan edilen proje ile yapılandırma uyuşursa ihlal yok (atlasia-dev gerçek üretim)", () => {
    // 2026-10-25 bulgusu: depoda tek Firebase projesi var ve canlı site atlasia-dev
    // üzerinde çalışıyor. Kapının "atlasia-dev asla üretim olamaz" varsayımı yanlıştı.
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "AIza...",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia-dev.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "atlasia-dev",
      ATLASIA_URETIM_PROJESI: "atlasia-dev",
    });
    assert.deepEqual(policyViolations(env), []);
  });

  it("CF main: beyan edilen projeden farklı proje ihlal sayılır", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "AIza...",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "atlasia-dev",
      ATLASIA_URETIM_PROJESI: "atlasia-uretim",
    });
    const violations = policyViolations(env);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].code, "production_project_mismatch");
    assert.ok(violations[0].message.includes("ATLASIA_URETIM_PROJESI"), "değişken adı mesajda olmalı");
    assert.ok(!violations[0].message.includes("atlasia-dev"), "değer sızmamalı");
    const logs = [];
    const result = verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.violations.length, 1);
    assert.ok(logs.some((m) => m.includes("VITE_FIREBASE_PROJECT_ID")));
  });

  it("CF main: proje beyan edilmemişse uyarı verir, adı söyler", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "AIza...",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia-dev.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "atlasia-dev",
    });
    const violations = policyViolations(env);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].code, "production_project_undeclared");
    assert.equal(violations[0].name, "ATLASIA_URETIM_PROJESI");
    assert.equal(declaredProductionProject(env), null);
    assert.equal(declaredProductionProject({ ATLASIA_URETIM_PROJESI: "  atlasia-dev " }), "atlasia-dev");
  });

  it("CF preview: preview dalında atlasia-dev kullanılabilir", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "preview",
      VITE_FIREBASE_API_KEY: "AIza...",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia-dev.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "atlasia-dev",
    });
    assert.deepEqual(policyViolations(env), []);
  });

  it("CF main: VITE_PHONE_AUTH_ENABLED=true üretimde reddedilir; false/boş geçer", () => {
    const blockedEnv = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "AIza...",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "atlasia-prod",
      ATLASIA_URETIM_PROJESI: "atlasia-prod",
      VITE_PHONE_AUTH_ENABLED: "true",
    });
    const blocked = verify(blockedEnv, { exit: false, log: () => {} });
    assert.equal(blocked.violations.length, 1);
    assert.equal(blocked.violations[0].code, "phone_auth_forbidden_in_production");

    const allowedEnv = envWith({
      ...blockedEnv,
      VITE_PHONE_AUTH_ENABLED: "false",
    });
    const allowed = verify(allowedEnv, { exit: false, log: () => {} });
    assert.deepEqual(allowed.violations, []);
  });

  it("CF main eksik: üretimde eksik değişken — hata mesajı yalnız adı içerir", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "  ",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia.firebaseapp.com",
    });
    assert.equal(shouldEnforce(env), true);
    assert.deepEqual(missingVars(env), ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID"]);
    const logs = [];
    const result = verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.enforced, true);
    assert.deepEqual(result.missing, ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID"]);
    assert.ok(logs.some((m) => m.includes("VITE_FIREBASE_API_KEY")));
    assert.ok(logs.some((m) => m.includes("VITE_FIREBASE_PROJECT_ID")));
    assert.ok(!logs.some((m) => m.includes("atlasia.firebaseapp.com")), "değer sızmamalı");
    assert.equal(
      logs.filter((m) => m.startsWith("Missing required environment variable:")).length,
      2,
    );
  });

  it("CF main tam: üretimde tüm değişkenler tam — geçer", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "AIza...",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "atlasia-prod",
      ATLASIA_URETIM_PROJESI: "atlasia-prod",
    });
    assert.equal(shouldEnforce(env), true);
    assert.deepEqual(missingVars(env), []);
    const logs = [];
    const result = verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.enforced, true);
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.violations, []);
    assert.equal(logs.length, 0);
  });

  it("boşluk-only değer eksik sayılır", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: " \t\n ",
      VITE_FIREBASE_AUTH_DOMAIN: "ok",
      VITE_FIREBASE_PROJECT_ID: "atlasia-prod",
    });
    assert.deepEqual(missingVars(env), ["VITE_FIREBASE_API_KEY"]);
  });

  it("değer sızıntısı yapmaz: loglarda secret değeri yok", () => {
    const secret = "super-secret-api-key-12345";
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "",
      VITE_FIREBASE_AUTH_DOMAIN: "ok",
      VITE_FIREBASE_PROJECT_ID: secret,
      ATLASIA_URETIM_PROJESI: "atlasia-uretim",
    });
    const logs = [];
    verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.ok(logs.every((m) => !m.includes(secret)));
  });
});

describe("verify-env (kural şiddeti: warn / enforce)", () => {
  const prodEnv = {
    CF_PAGES: "1",
    CF_PAGES_BRANCH: "main",
    VITE_FIREBASE_API_KEY: "AIza...",
    VITE_FIREBASE_AUTH_DOMAIN: "atlasia.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "atlasia-prod",
    ATLASIA_URETIM_PROJESI: "atlasia-prod",
    VITE_PHONE_AUTH_ENABLED: "true",
  };

  it("varsayılan mod warn; ATLASIA_PROD_ENV_POLICY=enforce ile sertleşir", () => {
    assert.equal(policyMode({}), "warn");
    assert.equal(policyMode({ ATLASIA_PROD_ENV_POLICY: "ENFORCE " }), "enforce");
    assert.equal(policyMode({ ATLASIA_PROD_ENV_POLICY: "warn" }), "warn");
    assert.equal(policyMode({ ATLASIA_PROD_ENV_POLICY: "gecersiz" }), "warn");
  });

  it("eksik zorunlu değişken her modda ölümcül", () => {
    for (const mode of ["warn", "enforce"]) {
      assert.equal(shouldFail({ missing: ["VITE_FIREBASE_API_KEY"], violations: [], mode }), true);
    }
  });

  it("politika ihlali warn modunda deploy'u durdurmaz, enforce modunda durdurur", () => {
    assert.equal(shouldFail({ missing: [], violations: [{ code: "x" }], mode: "warn" }), false);
    assert.equal(shouldFail({ missing: [], violations: [{ code: "x" }], mode: "enforce" }), true);
  });

  it("warn modunda ihlal ADVISORY olarak loglanır ve deploy devam eder", () => {
    const logs = [];
    const result = verify(prodEnv, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.mode, "warn");
    assert.equal(result.failed, false);
    assert.equal(result.violations.length, 1);
    assert.ok(logs.some((m) => m.includes("ADVISORY (deploy continues)")));
    assert.ok(logs.some((m) => m.includes("VITE_PHONE_AUTH_ENABLED")));
    assert.ok(logs.some((m) => m.includes("ATLASIA_PROD_ENV_POLICY=enforce")));
  });

  it("enforce modunda ihlal build'i kırar (failed=true)", () => {
    const logs = [];
    const result = verify(
      { ...prodEnv, ATLASIA_PROD_ENV_POLICY: "enforce" },
      { exit: false, log: (m) => logs.push(m) },
    );
    assert.equal(result.mode, "enforce");
    assert.equal(result.failed, true);
    assert.ok(logs.some((m) => m.startsWith("Forbidden production environment variable")));
  });

  it("temiz üretim env'inde hiçbir mod uyarı üretmez", () => {
    for (const mode of [undefined, "enforce"]) {
      const logs = [];
      const result = verify(
        { ...prodEnv, VITE_PHONE_AUTH_ENABLED: "false", ATLASIA_PROD_ENV_POLICY: mode },
        { exit: false, log: (m) => logs.push(m) },
      );
      assert.deepEqual(result.violations, []);
      assert.equal(result.failed, false);
      assert.equal(logs.length, 0);
    }
  });
});

// PR #103 package.json dosyasına dokunduğu için çakışma yaratmadan
// Spark yerel yedekleme/kota testlerini de CI test:scripts kapısına bağla:
import "./firestore-backup.node-test.mjs";
