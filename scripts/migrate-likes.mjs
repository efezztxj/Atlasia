#!/usr/bin/env node
/**
 * F2-1 göçü (adım 3a): `posts.likedBy` → `posts/{id}/likes/{uid}` belgeleri.
 *
 * NEDEN: Yeni modelde beğeni kişi başı belgedir ve gönderide sayaç yoktur.
 * Eski kayıtlar `likedBy` dizisinde durur; taşınmazsa kullanıcı eski beğenisini
 * "beğenmedim" olarak görür.
 *
 * GÜVENLİK: Varsayılan **dry-run**'dır (hiç yazmaz). Yazmak için `--apply`.
 * `--max-writes` aşılırsa betik hiçbir şey yazmadan durur (kısmi göç olmaz).
 * Her koşu deterministik bir SHA-256 manifest üretir; iki koşu aynı planı
 * üretiyorsa manifest de aynıdır (idempotentlik kontrolü).
 *
 * GEREKSİNİM: REST çağrıları için erişim jetonu (`FIREBASE_ACCESS_TOKEN` env
 * ya da `--token`). CI'da bu betik ağa çıkmaz; testler `fetchImpl` enjekte eder.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const DEFAULT_MAX_WRITES = 500;
const PAGE_SIZE = 100;

export function parseMigrateArgs(argv) {
  const opts = {
    project: process.env.VITE_FIREBASE_PROJECT_ID ?? "",
    token: process.env.FIREBASE_ACCESS_TOKEN ?? "",
    dryRun: true,
    maxWrites: DEFAULT_MAX_WRITES,
    manifest: "likes-migration-manifest.json",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project") opts.project = argv[++i] ?? "";
    else if (arg === "--token") opts.token = argv[++i] ?? "";
    else if (arg === "--max-writes") opts.maxWrites = Number(argv[++i] ?? "");
    else if (arg === "--manifest") opts.manifest = argv[++i] ?? opts.manifest;
    else if (arg === "--apply") opts.dryRun = false;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`Bilinmeyen argüman: ${arg}`);
  }
  return opts;
}

export function validateMigrateOptions(opts) {
  if (!opts.project) throw new Error("--project ya da VITE_FIREBASE_PROJECT_ID gerekli.");
  if (!Number.isInteger(opts.maxWrites) || opts.maxWrites <= 0) {
    throw new Error("--max-writes pozitif tam sayı olmalı.");
  }
  if (!opts.dryRun && !opts.token) {
    throw new Error("Yazma modu için jeton gerekli (FIREBASE_ACCESS_TOKEN ya da --token).");
  }
}

/** Firestore REST belgesinden `likedBy` dizisini güvenle çıkarır. */
export function likedByOf(fields) {
  const values = fields?.likedBy?.arrayValue?.values;
  if (!Array.isArray(values)) return [];
  const uids = [];
  for (const value of values) {
    const uid = value?.stringValue;
    if (typeof uid === "string" && uid.trim() && !uids.includes(uid.trim())) uids.push(uid.trim());
  }
  return uids;
}

/** Saf plan: hangi beğeni belgesi yazılacak? Sıra deterministik. */
export function planLikeMigrations(posts) {
  const ops = [];
  for (const post of posts) {
    const postId = String(post?.id ?? "").trim();
    if (!postId) continue;
    for (const uid of likedByOf(post?.fields)) {
      ops.push({ path: `posts/${postId}/likes/${uid}`, postId, uid });
    }
  }
  ops.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return ops;
}

export function manifestOf(ops) {
  const hash = createHash("sha256");
  for (const op of ops) hash.update(`${op.path}\n`);
  return { count: ops.length, sha256: hash.digest("hex") };
}

async function listPosts({ project, token, fetchImpl, log }) {
  const posts = [];
  let pageToken = "";
  for (let page = 0; page < 50; page += 1) {
    const url =
      `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/posts` +
      `?pageSize=${PAGE_SIZE}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}` +
      `&mask.fieldPaths=likedBy`;
    const res = await fetchImpl(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(`posts listesi alınamadı: HTTP ${res.status}`);
    const body = await res.json();
    for (const doc of body.documents ?? []) {
      const id = String(doc.name ?? "").split("/").pop() ?? "";
      posts.push({ id, fields: doc.fields ?? {} });
    }
    pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : "";
    if (!pageToken) break;
    log?.(`[migrate-likes] sayfa ${page + 1}: ${posts.length} gönderi`);
  }
  return posts;
}

export async function runMigrate(
  opts,
  { env = process.env, fetchImpl = fetch, log = console.log, writeFile = writeFileSync } = {},
) {
  void env;
  validateMigrateOptions(opts);
  log(
    `[migrate-likes] project=${opts.project} mode=${opts.dryRun ? "dry-run" : "apply"} ` +
      `maxWrites=${opts.maxWrites}`,
  );
  const posts = await listPosts({ project: opts.project, token: opts.token, fetchImpl, log });
  const ops = planLikeMigrations(posts);
  const manifest = manifestOf(ops);
  log(`[migrate-likes] gönderi=${posts.length} beğeni=${ops.length} sha256=${manifest.sha256.slice(0, 12)}`);

  if (ops.length > opts.maxWrites) {
    throw new Error(
      `Plan ${ops.length} yazım içeriyor; --max-writes=${opts.maxWrites} sınırını aşıyor. Hiçbir şey yazılmadı.`,
    );
  }
  if (!opts.dryRun) {
    for (const op of ops) {
      const url = `https://firestore.googleapis.com/v1/projects/${opts.project}/databases/(default)/documents/${op.path}`;
      const res = await fetchImpl(url, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { uid: { stringValue: op.uid } } }),
      });
      if (!res.ok) throw new Error(`Yazma başarısız (${op.path}): HTTP ${res.status}`);
    }
    log(`[migrate-likes] ${ops.length} beğeni belgesi yazıldı.`);
  } else {
    log("[migrate-likes] dry-run: hiçbir şey yazılmadı (yazmak için --apply).");
  }

  const record = { project: opts.project, dryRun: opts.dryRun, ...manifest };
  writeFile(opts.manifest, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseMigrateArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Kullanım: node scripts/migrate-likes.mjs --project <id> [--dry-run|--apply]
  --max-writes <n>   Yazım üst sınırı (varsayılan ${DEFAULT_MAX_WRITES})
  --manifest <path>  Manifest dosyası (varsayılan likes-migration-manifest.json)`);
  } else {
    runMigrate(opts).catch((error) => {
      console.error(`[migrate-likes] ${error.message}`);
      process.exitCode = 1;
    });
  }
}
