#!/usr/bin/env node
/**
 * Atlasia — Instagram Graph API yayın betiği.
 *
 * Meta'nın "container" akışını uygular:
 *   1) POST /{ig-user-id}/media          -> container id
 *   2) GET  /{container-id}?fields=status_code  (FINISHED olana kadar)
 *   3) POST /{ig-user-id}/media_publish  -> yayınlanan medya id
 *
 * Kimlik bilgisi YOKSA hiçbir ağ çağrısı yapılmaz; --dry-run her zaman çalışır.
 *
 * Kullanım:
 *   node scripts/publish-instagram.mjs --due
 *   node scripts/publish-instagram.mjs --post-id 2026-10-27-kyoto
 *   node scripts/publish-instagram.mjs --due --dry-run
 *
 * Ortam değişkenleri:
 *   IG_ACCESS_TOKEN   (zorunlu, gerçek yayında)
 *   IG_USER_ID        (zorunlu, gerçek yayında)
 *   IG_LOGIN_TYPE     facebook | instagram   (varsayılan: facebook)
 *   IG_API_VERSION    varsayılan: v26.0
 */
import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const DEFAULT_API_VERSION = "v26.0";
export const DEFAULT_QUEUE_DIR = "social/queue";
export const DEFAULT_DONE_DIR = "social/published";

export const API_HOSTS = {
  facebook: "https://graph.facebook.com",
  instagram: "https://graph.instagram.com",
};

export const CAPTION_MAX = 2200;
export const HASHTAG_MAX = 30;

/** Meta hata kodlarını Türkçe, eyleme dönük ipuçlarına çevirir. */
const ERROR_HINTS = {
  190: "Erişim jetonu geçersiz veya süresi dolmuş. Uzun ömürlü jetonu yenile ve IG_ACCESS_TOKEN secret'ını güncelle.",
  4: "Uygulama seviyesinde hız sınırı. Bir süre sonra tekrar dene.",
  17: "Kullanıcı seviyesinde hız sınırı. Aynı anda çok yayın yapılıyor olabilir.",
  32: "Sayfa seviyesinde hız sınırı. Bekleyip tekrar dene.",
  613: "Çağrı sayısı sınırı aşıldı. Bekleyip tekrar dene.",
  100: "Geçersiz parametre. video_url, caption veya media_type alanlarından biri Meta tarafından reddedildi.",
  9: "Medya indirilemedi. video_url herkese açık ve HTTPS olmalı; giriş duvarı, yönlendirme zinciri veya imzalı bağlantı süresi buna engel olabilir.",
  9004: "Medya indirilemedi (alt kod 2207026 benzeri format hatası). MP4/H.264 + AAC olduğundan emin ol.",
  368: "Hesap geçici olarak kısıtlanmış.",
  80001: "video_url adresine erişilemedi. Bağlantıyı tarayıcıda gizli sekmede açıp test et.",
  2207026: "Desteklenmeyen video formatı. MP4 (H.264) + AAC, 9:16, 5-90 saniye olmalı.",
  2207009: "Medya işleme başarısız. Videoyu yeniden kodlayıp tekrar dene.",
  2207042: "24 saatte 100 API yayın sınırı aşıldı.",
};

export function errorHint(code, subcode) {
  const direct = ERROR_HINTS[code] ?? ERROR_HINTS[subcode];
  if (direct) return direct;
  if (subcode) return `Meta hata kodu ${code} (alt kod ${subcode}). Ayrıntı için yanıttaki error.message alanına bak.`;
  return `Meta hata kodu ${code}. Ayrıntı için yanıttaki error.message alanına bak.`;
}

// ---------------------------------------------------------------- argümanlar

export function parseArgs(argv) {
  const out = {
    due: false,
    postId: null,
    dryRun: false,
    queueDir: DEFAULT_QUEUE_DIR,
    doneDir: DEFAULT_DONE_DIR,
    apiVersion: process.env.IG_API_VERSION || DEFAULT_API_VERSION,
    loginType: process.env.IG_LOGIN_TYPE || "facebook",
    pollIntervalMs: 5000,
    maxWaitMs: 600_000,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--due") out.due = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--post-id") out.postId = argv[(i += 1)];
    else if (a === "--queue-dir") out.queueDir = argv[(i += 1)];
    else if (a === "--done-dir") out.doneDir = argv[(i += 1)];
    else if (a === "--api-version") out.apiVersion = argv[(i += 1)];
    else if (a === "--login-type") out.loginType = argv[(i += 1)];
    else if (a === "--poll-interval-ms") out.pollIntervalMs = Number(argv[(i += 1)]);
    else if (a === "--max-wait-ms") out.maxWaitMs = Number(argv[(i += 1)]);
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`Bilinmeyen argüman: ${a}`);
  }
  return out;
}

// ---------------------------------------------------------------- doğrulama

export function isValidHttpsUrl(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:";
}

export function countHashtags(caption) {
  return (caption.match(/#[^\s#]+/gu) ?? []).length;
}

/**
 * Bir kuyruk kaydını doğrular. Dönen dizi boşsa kayıt yayına uygundur.
 * Kasten ağ erişimi yoktur: birim testleri kimlik bilgisi olmadan çalışır.
 */
export function validatePost(post) {
  const problems = [];
  if (!post || typeof post !== "object") return ["Kayıt bir nesne değil."];
  if (!post.id || typeof post.id !== "string") problems.push("`id` zorunlu ve metin olmalı.");
  if (!isValidHttpsUrl(post.mediaUrl)) problems.push("`mediaUrl` herkese açık bir HTTPS adresi olmalı.");
  if (typeof post.caption !== "string" || post.caption.trim().length === 0) {
    problems.push("`caption` boş olamaz.");
  } else if (post.caption.length > CAPTION_MAX) {
    problems.push(`\`caption\` ${CAPTION_MAX} karakterden uzun (${post.caption.length}).`);
  } else if (countHashtags(post.caption) > HASHTAG_MAX) {
    problems.push(`\`caption\` en fazla ${HASHTAG_MAX} hashtag içerebilir (${countHashtags(post.caption)}).`);
  }
  const type = post.mediaType ?? "REELS";
  if (!["REELS", "IMAGE", "STORIES"].includes(type)) {
    problems.push("`mediaType` REELS, IMAGE veya STORIES olmalı.");
  }
  if (type === "IMAGE" && !isValidHttpsUrl(post.mediaUrl)) {
    problems.push("IMAGE türünde `mediaUrl` bir görsel adresi olmalı.");
  }
  if (post.coverUrl != null && !isValidHttpsUrl(post.coverUrl)) {
    problems.push("`coverUrl` verildiyse HTTPS olmalı.");
  }
  if (post.scheduledFor != null && Number.isNaN(Date.parse(post.scheduledFor))) {
    problems.push("`scheduledFor` geçerli bir ISO-8601 tarihi olmalı.");
  }
  return problems;
}

/** scheduledFor yoksa hemen, varsa zamanı geldiyse yayına hazırdır. */
export function isDue(post, now = new Date()) {
  if (!post?.scheduledFor) return true;
  const when = Date.parse(post.scheduledFor);
  if (Number.isNaN(when)) return false;
  return when <= now.getTime();
}

export function buildContainerBody(post) {
  const type = post.mediaType ?? "REELS";
  const body = new URLSearchParams();
  body.set("media_type", type);
  body.set(type === "IMAGE" ? "image_url" : "video_url", post.mediaUrl);
  body.set("caption", post.caption);
  if (type === "REELS") {
    body.set("share_to_feed", post.shareToFeed === false ? "false" : "true");
    if (post.coverUrl) body.set("cover_url", post.coverUrl);
    if (Number.isFinite(post.thumbOffsetMs)) body.set("thumb_offset", String(post.thumbOffsetMs));
  }
  return body;
}

// ---------------------------------------------------------------- Graph API

function graphUrl({ host, apiVersion, path: p, query }) {
  const url = new URL(`${host}/${apiVersion}/${p}`);
  if (query) for (const [k, v] of query) url.searchParams.set(k, v);
  return url.toString();
}

async function readGraphError(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* gövde JSON değilse aşağıda genel mesaj üretilir */
  }
  const err = payload?.error ?? {};
  const code = err.code ?? response.status;
  const subcode = err.error_subcode;
  return new Error(
    `${errorHint(code, subcode)} (HTTP ${response.status}) ${err.message ? `— ${err.message}` : ""}`.trim(),
  );
}

export async function createContainer({ host, apiVersion, igUserId, accessToken, post, fetchImpl = fetch }) {
  const url = graphUrl({
    host,
    apiVersion,
    path: `${igUserId}/media`,
    query: [["access_token", accessToken]],
  });
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: buildContainerBody(post).toString(),
  });
  if (!response.ok) throw await readGraphError(response);
  const data = await response.json();
  if (!data?.id) throw new Error("Container kimliği dönmedi. Meta yanıtı beklenen biçimde değil.");
  return String(data.id);
}

export async function waitForContainer({
  host,
  apiVersion,
  containerId,
  accessToken,
  fetchImpl = fetch,
  pollIntervalMs = 5000,
  maxWaitMs = 600_000,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  onPoll = () => {},
}) {
  const startedAt = Date.now();
  let attempt = 0;
  for (;;) {
    attempt += 1;
    const url = graphUrl({
      host,
      apiVersion,
      path: containerId,
      query: [
        ["fields", "status_code,status"],
        ["access_token", accessToken],
      ],
    });
    const response = await fetchImpl(url);
    if (!response.ok) throw await readGraphError(response);
    const data = await response.json();
    const status = data?.status_code;
    onPoll({ attempt, status, detail: data?.status });
    if (status === "FINISHED" || status === "PUBLISHED") return status;
    if (status === "ERROR") throw new Error(`Medya işleme başarısız (status_code=ERROR). ${data?.status ?? ""}`.trim());
    if (status === "EXPIRED") throw new Error("Container süresi doldu; yayın 24 saat içinde yapılmalıydı.");
    if (Date.now() - startedAt > maxWaitMs) {
      throw new Error(
        `Medya ${Math.round(maxWaitMs / 1000)} saniye içinde hazır olmadı (son durum: ${status ?? "bilinmiyor"}).`,
      );
    }
    await sleep(pollIntervalMs);
  }
}

export async function publishContainer({ host, apiVersion, igUserId, accessToken, containerId, fetchImpl = fetch }) {
  const url = graphUrl({
    host,
    apiVersion,
    path: `${igUserId}/media_publish`,
    query: [["access_token", accessToken]],
  });
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: containerId }).toString(),
  });
  if (!response.ok) throw await readGraphError(response);
  const data = await response.json();
  if (!data?.id) throw new Error("Yayın kimliği dönmedi. Meta yanıtı beklenen biçimde değil.");
  return String(data.id);
}

/** Tek bir kaydı uçtan uca yayınlar. */
export async function publishPost({ host, apiVersion, igUserId, accessToken, post, ...rest }) {
  const containerId = await createContainer({ host, apiVersion, igUserId, accessToken, post });
  await waitForContainer({ host, apiVersion, containerId, accessToken, ...rest });
  const mediaId = await publishContainer({ host, apiVersion, igUserId, accessToken, containerId });
  return { containerId, mediaId };
}

// ---------------------------------------------------------------- kuyruk

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function loadQueue(queueDir) {
  const entries = [];
  const bad = [];
  if (!(await pathExists(queueDir))) return { entries, bad };
  // `*.example.json` yalnızca şablon amaçlıdır; asla yayınlanmaz.
  const files = (await readdir(queueDir))
    .filter((f) => f.endsWith(".json") && !f.endsWith(".example.json"))
    .sort();
  for (const file of files) {
    const full = path.join(queueDir, file);
    let parsed;
    try {
      parsed = JSON.parse(await readFile(full, "utf8"));
    } catch (error) {
      bad.push({ file, problems: [`JSON okunamadı: ${error.message}`] });
      continue;
    }
    const problems = validatePost(parsed);
    if (problems.length > 0) bad.push({ file, problems });
    else entries.push({ ...parsed, __file: full, __name: file });
  }
  return { entries, bad };
}

export async function loadPublishedIds(doneDir) {
  if (!(await pathExists(doneDir))) return new Set();
  const ids = new Set();
  for (const file of await readdir(doneDir)) {
    if (!file.endsWith(".json")) continue;
    // dosya adı: <id>-<zaman damgası>.json
    const match = file.match(/^(.*)-\d{4}-\d{2}-\d{2}T/u);
    ids.add(match ? match[1] : file.replace(/\.json$/u, ""));
  }
  return ids;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

export async function retirePost(post, doneDir, extra = {}) {
  await mkdir(doneDir, { recursive: true });
  const target = path.join(doneDir, `${post.id}-${stamp()}.json`);
  const payload = { ...post, ...extra, publishedAt: new Date().toISOString() };
  delete payload.__file;
  delete payload.__name;
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await unlink(post.__file);
  return target;
}

// ---------------------------------------------------------------- main

export function usage() {
  return [
    "Kullanım:",
    "  node scripts/publish-instagram.mjs --due [--dry-run]",
    "  node scripts/publish-instagram.mjs --post-id <id> [--dry-run]",
    "",
    "Seçenekler:",
    "  --due                 Zamanı gelmiş tüm kayıtları yayınlar",
    "  --post-id <id>        Tek bir kaydı (zamanı gelmese de) yayınlar",
    "  --dry-run             Hiçbir ağ çağrısı yapmaz, yalnızca doğrular",
    "  --queue-dir <yol>     Varsayılan: social/queue",
    "  --done-dir <yol>      Varsayılan: social/published",
    "  --api-version <v>     Varsayılan: v26.0",
    "  --login-type <t>      facebook | instagram (varsayılan: facebook)",
    "  --json                Sonucu JSON olarak yazar",
  ].join("\n");
}

export async function run(argv = process.argv.slice(2), env = process.env, log = console.log) {
  const args = parseArgs(argv);
  if (args.help) {
    log(usage());
    return { ok: true, exitCode: 0, results: [] };
  }
  if (!args.due && !args.postId) {
    log(usage());
    return { ok: false, exitCode: 2, results: [], error: "--due veya --post-id gerekli." };
  }

  const host = API_HOSTS[args.loginType];
  if (!host) {
    return { ok: false, exitCode: 2, results: [], error: `Bilinmeyen --login-type: ${args.loginType}` };
  }

  const { entries, bad } = await loadQueue(args.queueDir);
  for (const b of bad) log(`✗ ${b.file}: ${b.problems.join(" ")}`);
  if (entries.length === 0 && bad.length === 0) log(`Kuyruk boş (${args.queueDir}).`);

  const alreadyPublished = await loadPublishedIds(args.doneDir);
  const pool = entries.filter((e) => {
    if (!alreadyPublished.has(e.id)) return true;
    log(`↷ ${e.id} daha önce yayınlanmış, atlanıyor.`);
    return false;
  });

  const targets = args.postId
    ? pool.filter((e) => e.id === args.postId)
    : pool.filter((e) => isDue(e));

  if (targets.length === 0) {
    log(`Yayına hazır kayıt yok. (kuyruk: ${entries.length}, hatalı: ${bad.length})`);
    return { ok: bad.length === 0, exitCode: bad.length === 0 ? 0 : 1, results: [] };
  }

  const accessToken = env.IG_ACCESS_TOKEN;
  const igUserId = env.IG_USER_ID;
  if (!args.dryRun && (!accessToken || !igUserId)) {
    return {
      ok: false,
      exitCode: 2,
      results: [],
      error: "IG_ACCESS_TOKEN ve IG_USER_ID tanımlı değil. GitHub'da Settings → Secrets and variables → Actions altına ekle.",
    };
  }

  const results = [];
  for (const post of targets) {
    const label = `${post.id} (${post.mediaType ?? "REELS"})`;
    if (args.dryRun) {
      log(`○ ${label} — doğrulama geçti, yayın atlandı (dry-run).`);
      results.push({ id: post.id, status: "validated" });
      continue;
    }
    try {
      log(`→ ${label} yayınlanıyor…`);
      const { mediaId } = await publishPost({
        host,
        apiVersion: args.apiVersion,
        igUserId,
        accessToken,
        post,
        pollIntervalMs: args.pollIntervalMs,
        maxWaitMs: args.maxWaitMs,
        onPoll: ({ attempt, status }) => log(`   işleme ${attempt}: ${status}`),
      });
      const moved = await retirePost(post, args.doneDir, { instagramMediaId: mediaId });
      results.push({ id: post.id, status: "published", mediaId, archivedTo: moved });
      log(`✓ ${label} yayınlandı: ${mediaId}`);
    } catch (error) {
      results.push({ id: post.id, status: "failed", error: error.message });
      log(`✗ ${label} başarısız: ${error.message}`);
    }
  }

  const ok = results.every((r) => r.status !== "failed");
  return { ok, exitCode: ok ? 0 : 1, results };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  run(args)
    .then((result) => {
      if (result.error) console.error(`\n${result.error}`);
      if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.exitCode;
    })
    .catch((error) => {
      console.error(`Beklenmeyen hata: ${error.message}`);
      process.exitCode = 1;
    });
}
