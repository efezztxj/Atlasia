import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  collectionKeyFromDocPath,
  parseBackupArgs,
  runBackup,
  validateBackupOptions,
  verifyBackupManifest,
} from "./firestore-backup.mjs";

function createFakeFirestoreFetch(routes) {
  return async (url, init = {}) => {
    const key = `${init.method ?? "GET"} ${url}`;
    const handler = routes[key];
    if (!handler) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: "not found" }),
      };
    }
    const payload = typeof handler === "function" ? handler(init) : handler;
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    };
  };
}

describe("firestore-backup (Spark $0 yerel yedekleme ve kota kilidi)", () => {
  it("--project eksikse ve atlasia-dev verilirse güvenlik kilidi devreye girer", () => {
    assert.throws(
      () => validateBackupOptions(parseBackupArgs([]), { FIREBASE_ACCESS_TOKEN: "tok" }),
      /--project/,
    );

    assert.throws(
      () =>
        validateBackupOptions(parseBackupArgs(["--project", "atlasia-dev"]), {
          FIREBASE_ACCESS_TOKEN: "tok",
        }),
      /atlasia-dev/,
    );

    assert.doesNotThrow(() =>
      validateBackupOptions(parseBackupArgs(["--project", "atlasia-dev", "--allow-dev"]), {
        FIREBASE_ACCESS_TOKEN: "tok",
      }),
    );
  });

  it("Spark günlük kotasının yarısını aşan --max-reads değerini override olmadan reddeder", () => {
    assert.throws(
      () =>
        validateBackupOptions(
          parseBackupArgs(["--project", "atlasia-prod", "--max-reads", "30000"]),
          { FIREBASE_ACCESS_TOKEN: "tok" },
        ),
      /Kota kilidi/,
    );
  });

  it("koleksiyon anahtarını iç içe belge yolundan doğru üretir", () => {
    assert.equal(collectionKeyFromDocPath("places/efes"), "places");
    assert.equal(
      collectionKeyFromDocPath("users/u1/savedPlaces/efes"),
      "users__savedPlaces",
    );
    assert.equal(
      collectionKeyFromDocPath("groups/g1/messages/m9"),
      "groups__messages",
    );
  });

  it("hayalet (phantom) users/{uid} ebeveynleri dahil alt koleksiyonları yedekler, doğrular ve token sızdırmaz", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "atlasia-backup-test-"));
    const outDir = join(tempRoot, "snap");
    const secretToken = "ya29.super-secret-oauth-token";
    const base = "https://firestore.googleapis.com/v1/projects/atlasia-prod/databases/(default)/documents";

    const fakeFetch = createFakeFirestoreFetch({
      [`POST ${base}:listCollectionIds`]: { collectionIds: ["places", "users"] },
      [`GET ${base}/places?pageSize=250&showMissing=true`]: {
        documents: [
          {
            name: "projects/atlasia-prod/databases/(default)/documents/places/efes",
            createTime: "2026-10-20T10:00:00Z",
            updateTime: "2026-10-21T10:00:00Z",
            fields: { title: { stringValue: "Efes" } },
          },
        ],
      },
      [`GET ${base}/users?pageSize=250&showMissing=true`]: {
        documents: [
          {
            // Phantom parent document: createTime/fields yok, yalnız alt koleksiyonu var
            name: "projects/atlasia-prod/databases/(default)/documents/users/uid_1",
          },
        ],
      },
      [`POST ${base}/users/uid_1:listCollectionIds`]: {
        collectionIds: ["savedPlaces"],
      },
      [`GET ${base}/users/uid_1/savedPlaces?pageSize=250&showMissing=true`]: {
        documents: [
          {
            name: "projects/atlasia-prod/databases/(default)/documents/users/uid_1/savedPlaces/efes",
            createTime: "2026-10-22T12:00:00Z",
            updateTime: "2026-10-22T12:00:00Z",
            fields: { placeId: { stringValue: "efes" } },
          },
        ],
      },
    });

    const logs = [];
    try {
      const opts = parseBackupArgs(["--project", "atlasia-prod", "--out", outDir]);
      const { manifest } = await runBackup(opts, {
        env: { FIREBASE_ACCESS_TOKEN: secretToken },
        fetchImpl: fakeFetch,
        log: (m) => logs.push(m),
      });

      assert.equal(manifest.totalDocuments, 2);
      assert.equal(manifest.phantomParentsVisited, 1);
      assert.equal(manifest.estimatedReads, 3);
      assert.deepEqual(
        manifest.collections.map((c) => c.key),
        ["places", "users__savedPlaces"],
      );
      assert.ok(logs.every((m) => !m.includes(secretToken)), "OAuth token loglara sızmamalı");
      assert.ok(!JSON.stringify(manifest).includes(secretToken), "OAuth token manifeste sızmamalı");

      const verified = verifyBackupManifest(join(outDir, "manifest.json"), {
        log: (m) => logs.push(m),
      });
      assert.equal(verified.ok, true);
      assert.equal(verified.totalDocuments, 2);

      // Bozulmuş dosya yakalanmalı
      writeFileSync(join(outDir, "collections", "places.ndjson"), "{\"bozuk\":true}\n", "utf8");
      assert.throws(
        () => verifyBackupManifest(join(outDir, "manifest.json"), { log: () => {} }),
        /SHA-256 uyuşmazlığı/,
      );
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("--max-reads aşıldığında kotayı korumak için işlemi durdurur", async () => {
    const base = "https://firestore.googleapis.com/v1/projects/atlasia-prod/databases/(default)/documents";
    const fakeFetch = createFakeFirestoreFetch({
      [`POST ${base}:listCollectionIds`]: { collectionIds: ["places"] },
      [`GET ${base}/places?pageSize=250&showMissing=true`]: {
        documents: [
          {
            name: "projects/atlasia-prod/databases/(default)/documents/places/1",
            createTime: "2026-10-20T00:00:00Z",
            fields: {},
          },
          {
            name: "projects/atlasia-prod/databases/(default)/documents/places/2",
            createTime: "2026-10-20T00:00:00Z",
            fields: {},
          },
        ],
      },
    });

    const opts = parseBackupArgs([
      "--project",
      "atlasia-prod",
      "--max-reads",
      "1",
      "--dry-run",
    ]);

    await assert.rejects(
      () =>
        runBackup(opts, {
          env: { FIREBASE_ACCESS_TOKEN: "tok" },
          fetchImpl: fakeFetch,
          log: () => {},
        }),
      /Kota tavanı aşıldı/,
    );
  });
});
