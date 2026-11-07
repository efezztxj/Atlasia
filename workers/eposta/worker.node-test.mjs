import assert from "node:assert/strict";
import { test } from "node:test";
import worker, { MAX_BODY_BYTES, RATE_LIMIT, readTokenClaims } from "./src/index.js";
import { escapeHtml, feedbackEmail, resetEmail, safeUrl, verificationEmail } from "./src/sablonlar.js";

const origin = "https://atlasia.pages.dev";
const endpoint = "https://atlasia-eposta.example.workers.dev/";

/** İmzası doğrulanmayan ama `sub`/`aud` taşıyan sahte JWT (yalnız çözümleme testi). */
function fakeToken(claims = {}) {
  const payload = { sub: "uid-1", aud: "atlasia-dev", exp: Math.floor(Date.now() / 1000) + 600, ...claims };
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64(payload)}.imza`;
}

function environment(overrides = {}) {
  const counters = new Map();
  const rateLimit = {
    async get(key) {
      return counters.has(key) ? counters.get(key) : null;
    },
    async put(key, value) {
      counters.set(key, value);
    },
  };
  return {
    counters,
    env: {
      ALLOWED_ORIGINS: origin,
      RESEND_API_KEY: "re_test_abc",
      MAIL_FROM: "Atlasia <no-reply@mail.atlasia.test>",
      FIREBASE_API_KEY: "fb-test-key",
      APP_URL: "https://atlasia.pages.dev/",
      FEEDBACK_TO: "ekip@atlasia.test",
      RATE_LIMIT: rateLimit,
      ...overrides,
    },
  };
}

function post(body, options = {}) {
  return new Request(endpoint, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...options.headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...options.request,
  });
}

/** Global `fetch` sahtesi: Firebase ve Resend çağrılarını kaydeder. */
function stubFetch({ lookup = { users: [{ localId: "uid-1", email: "Efe@Example.com", emailVerified: true, displayName: "Efe" }] }, oobLink = "https://atlasia-dev.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=abc123", resendOk = true, oobOk = true } = {}) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    calls.push({ url: target, body: init.body ? JSON.parse(init.body) : null, headers: init.headers ?? {} });
    if (target.includes("accounts:lookup")) {
      return new Response(JSON.stringify(lookup), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (target.includes("accounts:sendOobCode")) {
      return new Response(JSON.stringify(oobOk ? { oobLink } : { error: { message: "OPERATION_NOT_ALLOWED" } }), {
        status: oobOk ? 200 : 400,
        headers: { "content-type": "application/json" },
      });
    }
    if (target === "https://api.resend.com/emails") {
      return new Response(JSON.stringify(resendOk ? { id: "mail-1" } : { message: "domain not verified" }), {
        status: resendOk ? 200 : 403,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`beklenmeyen istek: ${target}`);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("CORS yalnız listedeki origin'i yansıtır; listede olmayan 403", async () => {
  const { env } = environment();
  const preflight = await worker.fetch(new Request(endpoint, { method: "OPTIONS", headers: { origin } }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);

  const denied = await worker.fetch(new Request(endpoint, { method: "OPTIONS", headers: { origin: "https://attacker.invalid" } }), env);
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});

test("GET ve JSON dışı gövdeler reddedilir", async () => {
  const { env } = environment();
  assert.equal((await worker.fetch(new Request(endpoint, { headers: { origin } }), env)).status, 405);
  assert.equal((await worker.fetch(post("[]", { headers: { "content-type": "text/plain" } }), env)).status, 415);
  assert.equal((await worker.fetch(post({ kind: "bilinmeyen" }), env)).status, 400);
  assert.equal((await worker.fetch(post({ kind: "reset" }), env)).status, 401);
});

test("gövde sınırı aşılırsa 413 döner", async () => {
  const { env } = environment();
  const huge = JSON.stringify({ kind: "feedback", message: "a".repeat(MAX_BODY_BYTES + 64) });
  const response = await worker.fetch(post(huge, { request: { body: huge } }), env);
  assert.equal(response.status, 413);
});

test("kimlik doğrulanmış kullanıcıya Resend ile kendi adresine doğrulama e-postası gönderir", async () => {
  const { env } = environment();
  const stub = stubFetch({
    lookup: { users: [{ localId: "uid-1", email: "Efe@Example.com", emailVerified: false, displayName: "Efe" }] },
  });
  try {
    const response = await worker.fetch(
      post({ kind: "verification", to: "saldirgan@example.com" }, { headers: { authorization: `Bearer ${fakeToken()}` } }),
      env,
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload, { ok: true, delivery: "resend" });

    const send = stub.calls.find((call) => call.url === "https://api.resend.com/emails");
    assert.ok(send, "Resend çağrısı yapılmalı");
    // İstemciden gelen `to` YOK SAYILIR: alıcı her zaman token sahibinin adresidir.
    assert.deepEqual(send.body.to, ["efe@example.com"]);
    assert.equal(send.body.from, "Atlasia <no-reply@mail.atlasia.test>");
    assert.match(send.body.subject, /doğrula/i);
    assert.match(send.body.html, /mode=verifyEmail/);
    assert.ok(send.headers.authorization.startsWith("Bearer re_"));
  } finally {
    stub.restore();
  }
});

test("şifre yenileme isteği PASSWORD_RESET üretir ve Türkçe şablon kullanır", async () => {
  const { env } = environment();
  const stub = stubFetch();
  try {
    const response = await worker.fetch(post({ kind: "reset" }, { headers: { authorization: `Bearer ${fakeToken()}` } }), env);
    assert.equal(response.status, 200);
    const oob = stub.calls.find((call) => call.url.includes("sendOobCode"));
    assert.equal(oob.body.requestType, "PASSWORD_RESET");
    assert.equal(oob.body.returnOobLink, true);
    assert.equal(oob.body.continueUrl, "https://atlasia.pages.dev/");
    const send = stub.calls.find((call) => call.url === "https://api.resend.com/emails");
    assert.match(send.body.subject, /Şifre yenileme/);
  } finally {
    stub.restore();
  }
});

test("zaten doğrulanmış hesaba yeni doğrulama bağlantısı gönderilmez", async () => {
  const { env } = environment();
  const stub = stubFetch();
  try {
    const response = await worker.fetch(
      post({ kind: "verification" }, { headers: { authorization: `Bearer ${fakeToken()}` } }),
      env,
    );
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, "durum/zaten-dogrulanmis");
    assert.equal(stub.calls.filter((call) => call.url === "https://api.resend.com/emails").length, 0);
  } finally {
    stub.restore();
  }
});

test("hız sınırı pencere içinde uygulanır", async () => {
  const { env } = environment();
  const stub = stubFetch();
  try {
    const send = () =>
      worker.fetch(post({ kind: "reset" }, { headers: { authorization: `Bearer ${fakeToken()}` } }), env);
    for (let index = 0; index < RATE_LIMIT.max; index += 1) {
      assert.equal((await send()).status, 200, `istek ${index + 1} geçmeli`);
    }
    const blocked = await send();
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error, "sinir/cok-fazla");
  } finally {
    stub.restore();
  }
});

test("sayaç deposu yoksa istek reddedilir; sınırsız gönderim olmaz", async () => {
  const { env } = environment({ RATE_LIMIT: undefined });
  const stub = stubFetch();
  try {
    const response = await worker.fetch(
      post({ kind: "reset" }, { headers: { authorization: `Bearer ${fakeToken()}` } }),
      env,
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "hat/sinir-yok");
    // Kimlik Firebase'e sorulabilir; ama hiç e-posta gönderilmez.
    assert.equal(stub.calls.filter((call) => call.url === "https://api.resend.com/emails").length, 0);
  } finally {
    stub.restore();
  }
});

test("Resend doğrulanmış domain isterse hata kodu sızdırmadan döner", async () => {
  const { env } = environment();
  const stub = stubFetch({ resendOk: false });
  try {
    const response = await worker.fetch(
      post({ kind: "reset" }, { headers: { authorization: `Bearer ${fakeToken()}` } }),
      env,
    );
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.deepEqual(payload, { ok: false, error: "hat/resend-hata" });
    // Sağlayıcı hata metni (alıcı adresi içerebilir) yanıta taşınmaz.
    assert.doesNotMatch(JSON.stringify(payload), /domain not verified/);
  } finally {
    stub.restore();
  }
});

test("Firebase link üretemezse kullanıcıya hata döner", async () => {
  const { env } = environment();
  const stub = stubFetch({ oobOk: false });
  try {
    const response = await worker.fetch(
      post({ kind: "reset" }, { headers: { authorization: `Bearer ${fakeToken()}` } }),
      env,
    );
    assert.equal(response.status, 502);
  } finally {
    stub.restore();
  }
});

test("geri bildirim ekibe iletilir ve gövde kaçıştan geçer", async () => {
  const { env } = environment();
  const stub = stubFetch();
  try {
    const response = await worker.fetch(
      post({
        kind: "feedback",
        message: "Harita <script>alert(1)</script> olmasa daha iyi olurdu",
        category: "harita",
        path: "/harita",
      }),
      env,
    );
    assert.equal(response.status, 200);
    const send = stub.calls.find((call) => call.url === "https://api.resend.com/emails");
    assert.deepEqual(send.body.to, ["ekip@atlasia.test"]);
    assert.doesNotMatch(send.body.html, /<script>/);
    assert.match(send.body.html, /&lt;script&gt;/);
    assert.equal(send.body.reply_to, undefined);
  } finally {
    stub.restore();
  }
});

test("feedback hedefi tanımlı değilse 503", async () => {
  const { env } = environment({ FEEDBACK_TO: "" });
  const stub = stubFetch();
  try {
    const response = await worker.fetch(post({ kind: "feedback", message: "on karakterden uzun bir mesaj" }), env);
    assert.equal(response.status, 503);
    assert.equal(stub.calls.filter((call) => call.url === "https://api.resend.com/emails").length, 0);
  } finally {
    stub.restore();
  }
});

test("feedback ve action uçları birbirinin gövdesini kabul etmez", async () => {
  const { env } = environment();
  const wrongPath = await worker.fetch(
    new Request("https://atlasia-eposta.example.workers.dev/geri-bildirim", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ kind: "reset" }),
    }),
    env,
  );
  assert.equal(wrongPath.status, 400);
  assert.equal((await wrongPath.json()).error, "istek/tur");
});

test("sağlık ucu yalnız yapılandırma durumunu söyler", async () => {
  const { env } = environment();
  const response = await worker.fetch(
    new Request("https://atlasia-eposta.example.workers.dev/saglik", { headers: { origin } }),
    env,
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.resend, true);
  assert.equal(payload.firebaseKey, true);
  assert.equal(payload.rateLimit, true);
  assert.doesNotMatch(JSON.stringify(payload), /re_test_abc|fb-test-key/);
});

test("token çözümleme: eksik/bozuk JWT null döner", () => {
  assert.equal(readTokenClaims(""), null);
  assert.equal(readTokenClaims("a.b"), null);
  assert.equal(readTokenClaims("!!!.!!!.!!!"), null);
  assert.equal(readTokenClaims(fakeToken({ aud: "" })), null);
  assert.deepEqual(readTokenClaims(fakeToken({ sub: "abc" })), { uid: "abc", aud: "atlasia-dev", exp: readTokenClaims(fakeToken({ sub: "abc" })).exp });
});

test("şablon: kaçış ve güvenli adres kuralları", () => {
  assert.equal(escapeHtml('<a href="x">&\''), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("https://atlasia.pages.dev/?a=1"), "https://atlasia.pages.dev/?a=1");
  assert.throws(() => verificationEmail({ link: "javascript:alert(1)" }), /link-gecersiz/);
  const mail = verificationEmail({ link: "https://x.test/a?b=1&c=2", displayName: "<Efe>", appUrl: "https://atlasia.pages.dev/" });
  assert.match(mail.html, /&lt;Efe&gt;/);
  assert.match(mail.html, /b=1&amp;c=2/);
  assert.match(mail.text, /https:\/\/x\.test\/a\?b=1&c=2/);
  assert.match(resetEmail({ link: "https://x.test/r" }).subject, /Şifre yenileme/);
  const feedback = feedbackEmail({ message: "satır1\nsatır2 <b>", fromEmail: "a@b.test" });
  assert.match(feedback.html, /satır1<br>satır2 &lt;b&gt;/);
  assert.match(feedback.text, /a@b\.test/);
});
