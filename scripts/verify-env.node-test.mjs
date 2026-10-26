import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { missingVars, policyViolations, shouldEnforce, verify } from "./verify-env.mjs";

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

  it("CF main: VITE_FIREBASE_PROJECT_ID=atlasia-dev üretimde reddedilir", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "AIza...",
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "atlasia-dev",
    });
    const violations = policyViolations(env);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].code, "dev_project_in_production");
    const logs = [];
    const result = verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.violations.length, 1);
    assert.ok(logs.some((m) => m.includes("VITE_FIREBASE_PROJECT_ID")));
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
    });
    const logs = [];
    verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.ok(logs.every((m) => !m.includes(secret)));
  });
});

// Spark yerel yedekleme, kota ve veri temizliği testlerini de CI test:scripts kapısına bağla:
import "./firestore-backup.node-test.mjs";
import "./firestore-cleanup.node-test.mjs";
