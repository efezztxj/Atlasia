import test from "node:test";
import assert from "node:assert/strict";
import { harvestCandidates } from "./harvest.mjs";

const raw = process.env.ATLASIA_CONTENT_BBOX;
const enabled = process.env.ATLASIA_CONTENT_LIVE === "1" && typeof raw === "string";

test("live Overpass/Wikidata smoke test (manual opt-in; no region fixture committed)", {
  skip: !enabled && "Set ATLASIA_CONTENT_LIVE=1 and ATLASIA_CONTENT_BBOX=west,south,east,north to opt in",
}, async () => {
  const bbox = raw.split(",").map(Number);
  const result = await harvestCandidates({ bbox });
  assert.equal(result.appliedToApp, false);
  assert.ok(Array.isArray(result.candidates));
});
