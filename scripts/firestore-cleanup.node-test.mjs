import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateDocumentRetention,
  parseCleanupArgs,
  runCleanup,
  validateCleanupOptions,
} from "./firestore-cleanup.mjs";

const NOW = Date.parse("2026-10-26T12:00:00Z");

function isoAgo({ hours = 0, days = 0 }) {
  return new Date(NOW - hours * 3_600_000 - days * 86_400_000).toISOString();
}

describe("firestore-cleanup (Madde 4 — süresi dolan veri ve yetim temizliği)", () => {
  it("varsayılan mod dry-run ve 24 saattir; atlasia-dev ve <24s hikâye eşiği reddedilir", () => {
    const defaults = parseCleanupArgs(["--project", "atlasia-prod"]);
    assert.equal(defaults.apply, false);
    assert.equal(defaults.policy.storiesHours, 24);

    assert.throws(
      () =>
        validateCleanupOptions(parseCleanupArgs(["--project", "atlasia-dev"]), {
          FIREBASE_ACCESS_TOKEN: "tok",
        }),
      /atlasia-dev/,
    );

    assert.throws(
      () =>
        validateCleanupOptions(
          parseCleanupArgs(["--project", "atlasia-prod", "--stories-hours", "23"]),
          { FIREBASE_ACCESS_TOKEN: "tok" },
        ),
      /Canlı hikâye kilidi/,
    );
  });

  it("saklama kuralları canlı veriyi korur, yalnız süresi dolanı işaretler", () => {
    // 12 saatlik canlı hikâye -> KORUNUR
    assert.equal(
      evaluateDocumentRetention(
        "stories",
        { fields: { createdAt: { timestampValue: isoAgo({ hours: 12 }) } } },
        { nowMs: NOW },
      ).expired,
      false,
    );

    // 25 saatlik süresi dolmuş hikâye -> SİLİNİR (24 saat geçti)
    assert.equal(
      evaluateDocumentRetention(
        "stories",
        { fields: { createdAt: { timestampValue: isoAgo({ hours: 25 }) } } },
        { nowMs: NOW },
      ).expired,
      true,
    );

    // Okunmamış 45 günlük bildirim -> KORUNUR (90 gün eşiği); okunmuş 45 günlük -> SİLİNİR (30 gün eşiği)
    assert.equal(
      evaluateDocumentRetention(
        "users__notifications",
        {
          fields: {
            read: { booleanValue: false },
            createdAt: { timestampValue: isoAgo({ days: 45 }) },
          },
        },
        { nowMs: NOW },
      ).expired,
      false,
    );
    assert.equal(
      evaluateDocumentRetention(
        "users__notifications",
        {
          fields: {
            read: { booleanValue: true },
            createdAt: { timestampValue: isoAgo({ days: 45 }) },
          },
        },
        { nowMs: NOW },
      ).expired,
      true,
    );

    // Zaman damgası bozuk/eksik belge fail-safe olarak KORUNUR
    assert.equal(
      evaluateDocumentRetention("stories", { fields: {} }, { nowMs: NOW }).expired,
      false,
    );

    // Korunan koleksiyonlar (places, posts vb.) her koşulda KORUNUR
    assert.equal(
      evaluateDocumentRetention(
        "places",
        { fields: { createdAt: { timestampValue: isoAgo({ days: 999 }) } } },
        { nowMs: NOW },
      ).expired,
      false,
    );
  });

  it("dry-run modda commit çağrısı yapmaz; --apply ile yalnız süresi dolan ve yetim kayıtları siler", async () => {
    const docRoot = "projects/atlasia-prod/databases/(default)/documents";
    const base = `https://firestore.googleapis.com/v1/${docRoot}`;
    const commits = [];
    const secretToken = "ya29.cleanup-secret-token";

    const routes = {
      [`GET ${base}/stories?pageSize=250`]: {
        documents: [
          {
            name: `${docRoot}/stories/live_story`,
            createTime: isoAgo({ hours: 3 }),
            fields: { createdAt: { timestampValue: isoAgo({ hours: 3 }) } },
          },
          {
            name: `${docRoot}/stories/expired_story`,
            createTime: isoAgo({ hours: 72 }),
            fields: { createdAt: { timestampValue: isoAgo({ hours: 72 }) } },
          },
        ],
      },
      [`GET ${base}/friendDeclines?pageSize=250`]: {
        documents: [
          {
            name: `${docRoot}/friendDeclines/u1_u2`,
            createTime: isoAgo({ days: 10 }),
            fields: { createdAt: { timestampValue: isoAgo({ days: 10 }) } },
          },
        ],
      },
      [`GET ${base}/feedback?pageSize=250`]: { documents: [] },
      [`GET ${base}/groups?pageSize=250&showMissing=true`]: {
        documents: [
          // Silinmiş (phantom) grup: yalnız altında eski davet kalmış
          { name: `${docRoot}/groups/dead_group` },
        ],
      },
      [`GET ${base}/groups/dead_group/joinAttempts?pageSize=250`]: { documents: [] },
      [`GET ${base}/groups/dead_group/invites?pageSize=250`]: {
        documents: [
          {
            name: `${docRoot}/groups/dead_group/invites/u9`,
            createTime: isoAgo({ days: 2 }),
            fields: { createdAt: { timestampValue: isoAgo({ days: 2 }) } },
          },
        ],
      },
      [`GET ${base}/users?pageSize=250&showMissing=true`]: { documents: [] },
      [`GET ${base}/posts?pageSize=250&showMissing=true`]: {
        documents: [
          // Silinmiş gönderinin altında kalan yetim yanıt
          { name: `${docRoot}/posts/deleted_post` },
        ],
      },
      [`GET ${base}/posts/deleted_post/replies?pageSize=250`]: {
        documents: [
          {
            name: `${docRoot}/posts/deleted_post/replies/orphan_reply`,
            createTime: isoAgo({ days: 5 }),
            fields: { createdAt: { timestampValue: isoAgo({ days: 5 }) } },
          },
        ],
      },
      [`POST ${base}:commit`]: (init) => {
        commits.push(JSON.parse(init.body));
        return { writeResults: [] };
      },
    };

    const fakeFetch = async (url, init = {}) => {
      const key = `${init.method ?? "GET"} ${url}`;
      const handler = routes[key];
      if (!handler) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      const data = typeof handler === "function" ? handler(init) : handler;
      return { ok: true, status: 200, json: async () => data };
    };

    // 1) Dry-run: hiçbir silme isteği gönderilmemeli
    const dryLogs = [];
    const dryResult = await runCleanup(
      parseCleanupArgs(["--project", "atlasia-prod", "--include-orphans"]),
      {
        env: { FIREBASE_ACCESS_TOKEN: secretToken },
        fetchImpl: fakeFetch,
        nowMs: NOW,
        log: (m) => dryLogs.push(m),
      },
    );
    assert.equal(dryResult.applied, false);
    assert.equal(dryResult.candidateCount, 4);
    assert.equal(dryResult.deletedCount, 0);
    assert.equal(commits.length, 0);
    assert.ok(dryLogs.every((m) => !m.includes(secretToken)), "token loglara sızmamalı");

    // 2) Apply: tam olarak 4 süresi dolmuş/yetim belge silinmeli, canlı hikâye korunmalı
    const applyResult = await runCleanup(
      parseCleanupArgs(["--project", "atlasia-prod", "--include-orphans", "--apply"]),
      {
        env: { FIREBASE_ACCESS_TOKEN: secretToken },
        fetchImpl: fakeFetch,
        nowMs: NOW,
        log: () => {},
      },
    );
    assert.equal(applyResult.applied, true);
    assert.equal(applyResult.deletedCount, 4);
    assert.equal(commits.length, 1);
    const deletedPaths = commits[0].writes.map((w) => w.delete);
    assert.ok(!deletedPaths.some((p) => p.endsWith("/live_story")), "canlı hikâye silinmemeli");
    assert.deepEqual(deletedPaths, [
      `${docRoot}/stories/expired_story`,
      `${docRoot}/friendDeclines/u1_u2`,
      `${docRoot}/groups/dead_group/invites/u9`,
      `${docRoot}/posts/deleted_post/replies/orphan_reply`,
    ]);
  });
});
