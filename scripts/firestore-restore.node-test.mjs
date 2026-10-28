import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { sha256Text } from "./firestore-backup.mjs";
import { parseRestoreArgs, runRestore } from "./firestore-restore.mjs";

function createSampleBackup(sourceProject = "atlasia-prod-123") {
  const root = mkdtempSync(join(tmpdir(), "atlasia-restore-test-"));
  const collectionsDir = join(root, "collections");
  mkdirSync(collectionsDir, { recursive: true });

  const placesContent = `${[
    JSON.stringify({
      relativePath: "places/efes-1",
      name: `projects/${sourceProject}/databases/(default)/documents/places/efes-1`,
      fields: { title: { stringValue: "Efes" } },
    }),
    JSON.stringify({
      relativePath: "places/priene-2",
      name: `projects/${sourceProject}/databases/(default)/documents/places/priene-2`,
      fields: { title: { stringValue: "Priene" } },
    }),
  ].join("\n")}\n`;

  const routesContent = `${JSON.stringify({
    relativePath: "routes/ege-rotasi",
    name: `projects/${sourceProject}/databases/(default)/documents/routes/ege-rotasi`,
    fields: { title: { stringValue: "Ege Rotası" } },
  })}\n`;

  writeFileSync(join(collectionsDir, "places.ndjson"), placesContent, "utf8");
  writeFileSync(join(collectionsDir, "routes.ndjson"), routesContent, "utf8");

  const manifestPath = join(root, "manifest.json");
  const manifest = {
    schemaVersion: 1,
    createdAt: "2026-10-29T00:00:00.000Z",
    projectId: sourceProject,
    dryRun: false,
    totalDocuments: 3,
    totalBytes: Buffer.byteLength(placesContent) + Buffer.byteLength(routesContent),
    collections: [
      {
        key: "places",
        file: "collections/places.ndjson",
        documentCount: 2,
        bytes: Buffer.byteLength(placesContent),
        sha256: sha256Text(placesContent),
      },
      {
        key: "routes",
        file: "collections/routes.ndjson",
        documentCount: 1,
        bytes: Buffer.byteLength(routesContent),
        sha256: sha256Text(routesContent),
      },
    ],
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { root, manifestPath };
}

test("varsayılan --dry-run modunda SHA-256 doğrular ama tek bir ağ yazması yapmaz", async () => {
  const { root, manifestPath } = createSampleBackup();
  try {
    let networkCalls = 0;
    const opts = parseRestoreArgs([
      "--manifest",
      manifestPath,
      "--target-project",
      "atlasia-staging",
    ]);

    const summary = await runRestore(opts, {
      env: {},
      log: () => {},
      fetchImpl: async () => {
        networkCalls += 1;
        throw new Error("dry-run ağa çıkmamalı");
      },
    });

    assert.equal(summary.applied, false);
    assert.equal(summary.documentsPlanned, 3);
    assert.equal(summary.documentsWritten, 0);
    assert.equal(networkCalls, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kaynak projeyle aynı hedefe --allow-overwrite-source olmadan yazmayı reddeder", async () => {
  const { root, manifestPath } = createSampleBackup("atlasia-prod-123");
  try {
    const opts = parseRestoreArgs([
      "--manifest",
      manifestPath,
      "--target-project",
      "atlasia-prod-123",
      "--confirm-project",
      "atlasia-prod-123",
      "--apply",
    ]);

    await assert.rejects(
      () =>
        runRestore(opts, {
          env: { FIREBASE_ACCESS_TOKEN: "test-token" },
          log: () => {},
        }),
      /Üretim ezme kilidi/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bozuk NDJSON SHA-256 uyuşmazlığında yazmadan önce durur", async () => {
  const { root, manifestPath } = createSampleBackup();
  try {
    writeFileSync(join(root, "collections", "places.ndjson"), "{\"bozuk\":true}\n", "utf8");
    const opts = parseRestoreArgs([
      "--manifest",
      manifestPath,
      "--target-project",
      "atlasia-staging",
      "--confirm-project",
      "atlasia-staging",
      "--apply",
    ]);

    await assert.rejects(
      () =>
        runRestore(opts, {
          env: { FIREBASE_ACCESS_TOKEN: "test-token" },
          log: () => {},
        }),
      /SHA-256 uyuşmazlığı/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--max-writes tavanı aşılırsa tek bir belge yazmadan durur; geçerli kurtarmada parti commit atar", async () => {
  const { root, manifestPath } = createSampleBackup();
  try {
    const overCap = parseRestoreArgs([
      "--manifest",
      manifestPath,
      "--target-project",
      "atlasia-staging",
      "--confirm-project",
      "atlasia-staging",
      "--max-writes",
      "2",
      "--apply",
    ]);

    await assert.rejects(
      () =>
        runRestore(overCap, {
          env: { FIREBASE_ACCESS_TOKEN: "test-token" },
          log: () => {},
        }),
      /Kota tavanı aşıldı/,
    );

    const commits = [];
    const valid = parseRestoreArgs([
      "--manifest",
      manifestPath,
      "--target-project",
      "atlasia-staging",
      "--confirm-project",
      "atlasia-staging",
      "--collections",
      "places",
      "--batch-size",
      "1",
      "--apply",
    ]);

    const result = await runRestore(valid, {
      env: { FIREBASE_ACCESS_TOKEN: "short-lived-token" },
      log: () => {},
      fetchImpl: async (url, init) => {
        commits.push({ url, body: JSON.parse(init.body) });
        return {
          ok: true,
          status: 200,
          json: async () => ({ writeResults: [{}] }),
        };
      },
    });

    assert.equal(result.applied, true);
    assert.equal(result.documentsWritten, 2);
    assert.equal(commits.length, 2);
    assert.match(commits[0].url, /projects\/atlasia-staging\/databases\/\(default\)\/documents:commit$/);
    assert.equal(
      commits[0].body.writes[0].update.name,
      "projects/atlasia-staging/databases/(default)/documents/places/efes-1",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
