import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  likedByOf,
  manifestOf,
  parseMigrateArgs,
  planLikeMigrations,
  runMigrate,
  validateMigrateOptions,
} from "./migrate-likes.mjs";

function fakeFetch({ documents = [], writeStatus = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? "GET" });
    if ((init.method ?? "GET") === "GET") {
      return { ok: true, status: 200, json: async () => ({ documents }) };
    }
    return { ok: writeStatus < 400, status: writeStatus, json: async () => ({}) };
  };
  return { fetchImpl, calls };
}

const post = (id, uids) => ({
  name: `projects/demo/databases/(default)/documents/posts/${id}`,
  fields: {
    likedBy: {
      arrayValue: {
        values: uids.map((uid) => ({ stringValue: uid })),
      },
    },
  },
});

const baseOpts = {
  project: "demo",
  token: "t",
  dryRun: true,
  maxWrites: 500,
  manifest: "m.json",
};

describe("migrate-likes — plan ve güvenlik sınırları", () => {
  it("likedBy dizisi güvenle okunur, bozuklar yok sayılır", () => {
    assert.deepEqual(likedByOf(undefined), []);
    assert.deepEqual(
      likedByOf({
        likedBy: {
          arrayValue: {
            values: [{ stringValue: "a" }, { integerValue: "5" }, { stringValue: "a" }, { stringValue: " b " }],
          },
        },
      }),
      ["a", "b"],
    );
  });

  it("plan deterministik ve yol biçimi doğru", () => {
    const ops = planLikeMigrations([{ id: "p2", fields: post("p2", ["u1"]).fields }, { id: "p1", fields: post("p1", ["u2"]).fields }]);
    assert.deepEqual(
      ops.map((op) => op.path),
      ["posts/p1/likes/u2", "posts/p2/likes/u1"],
    );
    assert.equal(manifestOf(ops).sha256, manifestOf([...ops]).sha256);
    assert.equal(manifestOf(ops).count, 2);
  });

  it("varsayılan dry-run: hiç yazma çağrısı yok, manifest yazılır", async () => {
    const { fetchImpl, calls } = fakeFetch({ documents: [post("p1", ["u1", "u2"])] });
    const written = [];
    const record = await runMigrate(
      { ...baseOpts },
      { fetchImpl, log: () => {}, writeFile: (path, body) => written.push({ path, body }) },
    );
    assert.equal(record.dryRun, true);
    assert.equal(record.count, 2);
    assert.equal(calls.filter((c) => c.method === "PATCH").length, 0);
    assert.equal(written.length, 1);
    assert.match(written[0].body, /"count": 2/);
  });

  it("--max-writes aşılırsa hiçbir şey yazılmaz ve hata verir", async () => {
    const { fetchImpl, calls } = fakeFetch({ documents: [post("p1", ["u1", "u2", "u3"])] });
    await assert.rejects(
      runMigrate({ ...baseOpts, dryRun: false, maxWrites: 2 }, { fetchImpl, log: () => {}, writeFile: () => {} }),
      /--max-writes=2/,
    );
    assert.equal(calls.filter((c) => c.method === "PATCH").length, 0);
  });

  it("apply modunda her beğeni tek PATCH ile yazılır", async () => {
    const { fetchImpl, calls } = fakeFetch({ documents: [post("p1", ["u1", "u2"])] });
    await runMigrate({ ...baseOpts, dryRun: false }, { fetchImpl, log: () => {}, writeFile: () => {} });
    const patches = calls.filter((c) => c.method === "PATCH");
    assert.equal(patches.length, 2);
    assert.ok(patches.every((c) => c.url.endsWith("/posts/p1/likes/u1") || c.url.endsWith("/posts/p1/likes/u2")));
  });

  it("argüman ayrıştırma: --apply dry-run'ı kapatır, jeton zorunlu olur", () => {
    const opts = parseMigrateArgs(["--project", "demo", "--apply"]);
    assert.equal(opts.dryRun, false);
    assert.equal(opts.maxWrites, 500);
    assert.throws(() => validateMigrateOptions(opts), /jeton/);
    assert.throws(() => parseMigrateArgs(["--yok"]), /Bilinmeyen argüman/);
  });
});
