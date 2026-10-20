import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureOwnerPlacesIndex, run } from "./ensure-owner-places-index.mjs";

const ownerIndex = {
  collectionGroup: "places",
  queryScope: "COLLECTION",
  fields: [
    { fieldPath: "authorUid", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ],
};

function manifest(indexes = []) {
  return { indexes, fieldOverrides: [] };
}

describe("ensure-owner-places-index (local-only)", () => {
  it("adds the required owner index when missing", () => {
    const result = ensureOwnerPlacesIndex(manifest());
    assert.equal(result.changed, true);
    assert.deepEqual(result.config.indexes, [ownerIndex]);
  });

  it("is idempotent when the required index already exists", () => {
    const original = manifest([ownerIndex]);
    const result = ensureOwnerPlacesIndex(original);
    assert.equal(result.changed, false);
    assert.equal(result.config, original);
    assert.equal(result.config.indexes.length, 1);
  });

  it("preserves unrelated index entries and top-level manifest fields", () => {
    const otherIndex = { collectionGroup: "stories", queryScope: "COLLECTION", fields: [] };
    const original = { ...manifest([otherIndex]), metadata: "kept" };
    const result = ensureOwnerPlacesIndex(original);
    assert.deepEqual(result.config.indexes, [otherIndex, ownerIndex]);
    assert.equal(result.config.metadata, "kept");
    assert.equal(result.config.fieldOverrides, original.fieldOverrides);
  });

  it("rejects an invalid manifest shape instead of silently repairing it", () => {
    assert.throws(() => ensureOwnerPlacesIndex({ fieldOverrides: [] }), {
      name: "TypeError",
      message: "Firestore index manifest must contain an indexes array.",
    });
  });

  it("fake run writes only the updated manifest and returns without Firebase access", () => {
    const writes = [];
    const messages = [];
    const result = run({
      path: "/virtual/firestore.indexes.json",
      read: (path, encoding) => {
        assert.equal(path, "/virtual/firestore.indexes.json");
        assert.equal(encoding, "utf8");
        return JSON.stringify(manifest());
      },
      write: (...args) => writes.push(args),
      log: (message) => messages.push(message),
    });
    assert.equal(result.changed, true);
    assert.equal(writes.length, 1);
    assert.equal(writes[0][0], "/virtual/firestore.indexes.json");
    assert.deepEqual(JSON.parse(writes[0][1]).indexes, [ownerIndex]);
    assert.match(messages[0], /Added the owner places composite index/);
  });

  it("fake run does not write when the manifest is already correct", () => {
    let writeCount = 0;
    const messages = [];
    const result = run({
      read: () => JSON.stringify(manifest([ownerIndex])),
      write: () => { writeCount += 1; },
      log: (message) => messages.push(message),
    });
    assert.equal(result.changed, false);
    assert.equal(writeCount, 0);
    assert.match(messages[0], /already present/);
  });

  it("surfaces malformed JSON from the injected reader without side effects", () => {
    let writeCount = 0;
    assert.throws(() => run({
      read: () => "{broken",
      write: () => { writeCount += 1; },
      log: () => {},
    }), SyntaxError);
    assert.equal(writeCount, 0);
  });
});
