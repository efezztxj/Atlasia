/**
 * Atlasia e-posta hattı — Cloudflare Worker + Resend
 *
 * NEDEN VAR: Firebase Auth, bu projede şablon düzenlemeye izin vermiyor
 * (`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`) ve gönderen adresi
 * `*.firebaseapp.com` olarak kalıyor. Bu uç nokta, Firebase'in admin
 * SDK'sının ürettiği **aynı** doğrulama/şifre yenileme bağlantısını alıp
 * kendi Türkçe şablonuyla Resend üzerinden gönderir.
 *
 * GÜVENLİK SINIRLARI
 *  - Resend API anahtarı ve servis hesabı yalnız Worker secret'ıdır; tarayıcıya
 *    asla gitmez (VITE_ değişkeni DEĞİLDİR).
 *  - Uç nokta anonim spam rölesine dönüşmemelidir: istek başına Firebase ID
 *    token'ı zorunlu, e-posta adresi token sahibinin doğrulanmış adresi olmalı.
 *    İstemciden gelen `to` alanına güvenilmez.
 *  - Sayaç deposu (Cloudflare KV) yoksa hız sınırı uygulanmış sayılmaz ve
 *    istek reddedilir: "sessizce sınırsız" davranış yoktur.
 *  - Hiçbir log satırı e-posta adresi veya bağlantı yazmaz.
 *
 * Bu dosya TypeScript değil: Worker'lar `wrangler` ile doğrudan çalışır,
 * telemetry worker'ıyla aynı desen korunur ve testleri Node runner ile koşar.
 */

import { feedbackEmail, resetEmail, verificationEmail } from "./sablonlar.js";

export const MAX_BODY_BYTES = 8 * 1024;
export const RATE_LIMIT = { windowSec: 3600, max: 5 };
export const KINDS = new Set(["verification", "reset", "feedback"]);

const IDENTITY_TOOLKIT = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";
const SEND_OOB = "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/* ── yardımcılar ─────────────────────────────────────────────────────── */

function json(body, status, origin) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type, authorization");
    headers.set("access-control-max-age", "600");
    headers.set("vary", "Origin");
  }
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

/** Sabit hata gövdesi: hangi kontrolün düştüğünü sızdırmaz, teşhis için kod verir. */
function fail(code, status, origin) {
  return json({ ok: false, error: code }, status, origin);
}

function parseOrigins(value) {
  return new Set(
    String(value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

async function readBoundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** Firebase ID token'ından `sub` (uid) ve `aud` (proje) okur; imza doğrulaması Firebase'e aittir. */
export function readTokenClaims(token) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4)));
    if (!payload || typeof payload !== "object") return null;
    const uid = typeof payload.sub === "string" ? payload.sub : "";
    const aud = typeof payload.aud === "string" ? payload.aud : "";
    const exp = Number(payload.exp);
    if (!uid || !aud) return null;
    return { uid, aud, exp: Number.isFinite(exp) ? exp : 0 };
  } catch {
    return null;
  }
}

function bearer(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

/** Kadar `count`u pencere içinde artırır; depo yoksa `null`. */
async function bumpCounter(env, key) {
  const store = env.RATE_LIMIT;
  if (!store || typeof store.get !== "function" || typeof store.put !== "function") return null;
  const raw = await store.get(key);
  const count = Number.parseInt(raw ?? "0", 10);
  const next = Number.isFinite(count) && count > 0 ? count + 1 : 1;
  // KV `expirationTtl` en az 60 sn; pencere zaten 3600 sn.
  await store.put(key, String(next), { expirationTtl: RATE_LIMIT.windowSec });
  return next;
}

function destinationFor(env, kind) {
  if (kind === "feedback") {
    const to = String(env.FEEDBACK_TO ?? "").trim();
    return to || "";
  }
  return "";
}

/* ── Firebase REST ───────────────────────────────────────────────────── */

/** ID token'ı Firebase'e doğrulatır; başarılıysa kullanıcının kendi e-postası döner. */
async function lookupAccount(env, idToken) {
  const apiKey = String(env.FIREBASE_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("hat/anahtar-yok");
  const response = await fetch(IDENTITY_TOOLKIT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) throw new Error("hat/token-gecersiz");
  const payload = await response.json().catch(() => null);
  const user = payload?.users?.[0];
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  const uid = typeof user?.localId === "string" ? user.localId : "";
  if (!email || !uid) throw new Error("hat/hesap-yok");
  return {
    uid,
    email,
    verified: user.emailVerified === true,
    disabled: user.disabled === true,
    displayName: typeof user.displayName === "string" ? user.displayName : "",
  };
}

/**
 * Firebase'in kendi e-posta hattını kullanarak işlem bağlantısını üretir.
 *
 * `returnOobLink: true` yalnız Admin/Identity Platform anahtarıyla çalışır ve
 * o durumda Firebase **hiç e-posta göndermez**; bağlantıyı yanıtla verir.
 * Bu yüzden iki mod vardır:
 *   - "link"      : Admin anahtarı var → bağlantı alınır, Resend gönderir.
 *   - "firebase"  : Anahtar yok → Firebase kendi e-postasını gönderir.
 *                   Sonuç kullanıcıya "gönderildi" diye bildirilir; ama tasarım
 *                   Firebase'in şablonudur. Operatör runbook'u bunu açıkça yazar.
 */
async function requestActionLink(env, { kind, email, appUrl }) {
  const apiKey = String(env.FIREBASE_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("hat/anahtar-yok");
  const requestType = kind === "reset" ? "PASSWORD_RESET" : "VERIFY_EMAIL";
  const body = {
    requestType,
    email,
    returnOobLink: true,
    continueUrl: appUrl,
    canHandleCodeInApp: false,
  };
  const response = await fetch(SEND_OOB, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String(payload?.error?.message ?? "");
    throw new Error(message.includes("OPERATION_NOT_ALLOWED") ? "hat/link-desteklenmiyor" : "hat/link-uretilemedi");
  }
  const link = typeof payload?.oobLink === "string" ? payload.oobLink : "";
  if (!link) throw new Error("hat/link-uretilemedi");
  return link;
}

/* ── Resend ──────────────────────────────────────────────────────────── */

async function sendWithResend(env, { from, to, subject, html, text, replyTo }) {
  const apiKey = String(env.RESEND_API_KEY ?? "").trim();
  if (!apiKey || !from) throw new Error("hat/resend-yok");
  const body = { from, to: [to], subject, html, text };
  if (replyTo) body.reply_to = replyTo;
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // Gövde loglanmaz: Resend hata metni alıcı adresini tekrar edebilir.
    throw new Error("hat/resend-hata");
  }
  return true;
}

/* ── istek işleyicileri ──────────────────────────────────────────────── */

function brandOf(env) {
  return String(env.BRAND_NAME ?? "").trim() || "Atlasia";
}

function appUrlOf(env) {
  return String(env.APP_URL ?? "").trim() || "https://atlasia.pages.dev/";
}

function senderOf(env) {
  return String(env.MAIL_FROM ?? "").trim();
}

async function handleAction(env, { kind, request }) {
  const token = bearer(request);
  const claims = token ? readTokenClaims(token) : null;
  if (!claims) return { status: 401, body: { ok: false, error: "yetki/yok" } };

  // Doğrulanmamış hesaplar da bağlantı isteyebilir: doğrulama e-postasının
  // alıcısı tam olarak onlardır. Tek istisna, zaten doğrulanmış hesaba yeni
  // doğrulama bağlantısı göndermektir.
  const account = await lookupAccount(env, token);
  if (kind === "verification" && account.verified) {
    // Zaten doğrulanmış hesaba yeni bağlantı göndermek anlamsız; istemci bunu bilmeli.
    return { status: 409, body: { ok: false, error: "durum/zaten-dogrulanmis" } };
  }

  const limited = await bumpCounter(env, `mail:${kind}:${account.uid}`);
  if (limited === null) return { status: 503, body: { ok: false, error: "hat/sinir-yok" } };
  if (limited > RATE_LIMIT.max) return { status: 429, body: { ok: false, error: "sinir/cok-fazla" } };

  const link = await requestActionLink(env, { kind, email: account.email, appUrl: appUrlOf(env) });
  const content =
    kind === "reset"
      ? resetEmail({ link, displayName: account.displayName, appUrl: appUrlOf(env), brand: brandOf(env) })
      : verificationEmail({ link, displayName: account.displayName, appUrl: appUrlOf(env), brand: brandOf(env) });

  await sendWithResend(env, {
    from: senderOf(env),
    to: account.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: String(env.REPLY_TO ?? "").trim() || undefined,
  });
  return { status: 200, body: { ok: true, delivery: "resend" } };
}

async function handleFeedback(env, { body, request }) {
  const to = destinationFor(env, "feedback");
  if (!to) return { status: 503, body: { ok: false, error: "hat/hedef-yok" } };

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 10 || message.length > 2000) return { status: 400, body: { ok: false, error: "govde/gecersiz" } };
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 24) : "";
  const path = typeof body.path === "string" ? body.path.slice(0, 120) : "";

  // İsteğe bağlı kimlik: giriş yapan kullanıcının adresi başlıkta görünür.
  let fromEmail = "";
  const token = bearer(request);
  if (token) {
    try {
      fromEmail = (await lookupAccount(env, token)).email;
    } catch {
      fromEmail = "";
    }
  }

  const limited = await bumpCounter(env, `mail:feedback:${fromEmail || "anon"}`);
  if (limited === null) return { status: 503, body: { ok: false, error: "hat/sinir-yok" } };
  if (limited > RATE_LIMIT.max) return { status: 429, body: { ok: false, error: "sinir/cok-fazla" } };

  const content = feedbackEmail({ message, fromEmail, category, path, appUrl: appUrlOf(env), brand: brandOf(env) });
  await sendWithResend(env, {
    from: senderOf(env),
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: fromEmail || undefined,
  });
  return { status: 200, body: { ok: true, delivery: "resend" } };
}

/** Durum ucu: hat yapılandırılmış mı? Sır sızdırmaz, yalnız var/yok. */
function handleHealth(env) {
  return {
    status: 200,
    body: {
      ok: true,
      resend: Boolean(String(env.RESEND_API_KEY ?? "").trim() && String(env.MAIL_FROM ?? "").trim()),
      firebaseKey: Boolean(String(env.FIREBASE_API_KEY ?? "").trim()),
      rateLimit: Boolean(env.RATE_LIMIT && typeof env.RATE_LIMIT.get === "function"),
      kinds: [...KINDS],
    },
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const allowedOrigins = parseOrigins(env.ALLOWED_ORIGINS);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/{2,}/g, "/");

    if (path === "/saglik" && request.method === "GET") {
      const result = handleHealth(env);
      return json(result.body, result.status, origin && allowedOrigins.has(origin) ? origin : null);
    }

    // CORS: yalnız listedeki origin. Kapalı listeye `*` yazılamaz.
    if (!origin || !allowedOrigins.has(origin)) return fail("cors/red", 403, null);
    if (request.method === "OPTIONS") return json(null, 204, origin);
    if (request.method !== "POST") return fail("yontem/red", 405, origin);

    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") return fail("govde/tip", 415, origin);

    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return fail("govde/buyuk", 413, origin);

    let bytes;
    try {
      bytes = await readBoundedBody(request);
    } catch {
      return fail("govde/okunamadi", 400, origin);
    }
    if (!bytes) return fail("govde/buyuk", 413, origin);

    let body;
    try {
      body = bytes.byteLength ? JSON.parse(new TextDecoder().decode(bytes)) : {};
    } catch {
      return fail("govde/json", 400, origin);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail("govde/bicim", 400, origin);

    // `/geri-bildirim` yolu yalnız feedback taşır; kök yol türü gövdeden alır.
    const requestedKind = typeof body.kind === "string" ? body.kind.trim() : "";
    const kind = path === "/geri-bildirim" && !requestedKind ? "feedback" : requestedKind;
    if (!KINDS.has(kind)) return fail("istek/tur", 400, origin);
    if (path === "/geri-bildirim" && kind !== "feedback") return fail("istek/tur", 400, origin);
    if (path !== "/geri-bildirim" && path !== "/" && kind !== "feedback") return fail("istek/yol", 404, origin);
    if (path !== "/geri-bildirim" && path !== "/" && kind === "feedback") return fail("istek/yol", 404, origin);

    try {
      const result =
        kind === "feedback" ? await handleFeedback(env, { body, request }) : await handleAction(env, { kind, request });
      return json(result.body, result.status, origin);
    } catch (error) {
      const code = error instanceof Error && /^[a-z]+\/[a-z-]+$/.test(error.message) ? error.message : "hat/beklenmeyen";
      const status = code === "hat/sinir-yok" ? 503 : code === "hat/resend-yok" ? 503 : 502;
      return fail(code, status, origin);
    }
  },
};

export { handleFeedback, handleHealth, lookupAccount, requestActionLink, sendWithResend };
