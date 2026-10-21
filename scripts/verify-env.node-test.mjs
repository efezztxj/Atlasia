import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { missingVars, shouldEnforce, verify } from "./verify-env.mjs";

function envWith(overrides) {
  return { ...overrides };
}

describe("verify-env (Cloudflare Pages üretim kapısı)", () => {
  it("CF yok: yerel geliştirme — hiçbir şey yapmaz", () => {
    const env = envWith({
      VITE_FIREBASE_API_KEY: "",
      VITE_FIREBASE_AUTH_DOMAIN: "",
      VITE_FIREBASE_PROJECT_ID: "",
    });
    assert.equal(shouldEnforce(env), false);
    const logs = [];
    const result = verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.enforced, false);
    assert.deepEqual(result.missing, []);
    assert.equal(logs.length, 0);
  });

  it("CF preview: CF_PAGES=1 ama branch preview — hiçbir şey yapmaz", () => {
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
    assert.equal(logs.length, 0);
  });

  it("CF main eksik: üretimde eksik değişken — hata mesajı yalnız adı içerir", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: "  ", // boşluk
      VITE_FIREBASE_AUTH_DOMAIN: "atlasia.firebaseapp.com",
      // VITE_FIREBASE_PROJECT_ID eksik
    });
    assert.equal(shouldEnforce(env), true);
    assert.deepEqual(missingVars(env), ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID"]);
    const logs = [];
    const result = verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.equal(result.enforced, true);
    assert.deepEqual(result.missing, ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID"]);
    // Mesaj yalnız adı içerir, değeri asla
    assert.ok(logs.some((m) => m.includes("VITE_FIREBASE_API_KEY")));
    assert.ok(logs.some((m) => m.includes("VITE_FIREBASE_PROJECT_ID")));
    assert.ok(!logs.some((m) => m.includes("atlasia.firebaseapp.com")), "değer sızmamalı");
    // En az bir log eksik değişkeni belirtmeli
    assert.equal(logs.filter((m) => m.startsWith("Missing required environment variable:")).length, 2);
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
    assert.equal(logs.length, 0);
  });

  it("boşluk-only değer eksik sayılır", () => {
    const env = envWith({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      VITE_FIREBASE_API_KEY: " \t\n ",
      VITE_FIREBASE_AUTH_DOMAIN: "ok",
      VITE_FIREBASE_PROJECT_ID: "ok",
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
    // PROJECT_ID dolu, API_KEY eksik — loglarda secret görünmemeli
    const logs = [];
    verify(env, { exit: false, log: (m) => logs.push(m) });
    assert.ok(logs.every((m) => !m.includes(secret)));
  });
});
