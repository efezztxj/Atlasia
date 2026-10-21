import test from "node:test";
import assert from "node:assert/strict";
import { harvestCandidates } from "./harvest.mjs";

const bbox = [26, 37, 29, 40];

test("mock Overpass, Wikidata and Wikipedia responses become attributed unverified candidates", async () => {
  const calls = [];
  const bodies = [
    { elements: [
      { type: "node", id: 42, lat: 38, lon: 27, tags: { name: "Mock ruin", historic: "ruins", description: "History text" } },
      { type: "node", id: 43, lat: 38, lon: 27, tags: { historic: "ruins" } },
    ] },
    { results: { bindings: [
      { item: { value: "http://www.wikidata.org/entity/Q123" }, itemLabel: { value: "Mock museum" }, itemDescription: { value: "Fixture" }, lat: { value: "38.1" }, lon: { value: "27.1" }, article: { value: "https://en.wikipedia.org/wiki/Mock_museum" } },
    ] } },
    { query: { pages: { 1: { extract: "Wikipedia fixture excerpt" } } } },
  ];
  const fetcher = async (url) => { calls.push(String(url)); return new Response(JSON.stringify(bodies.shift()), { status: 200 }); };
  const result = await harvestCandidates({ bbox, fetcher, capturedAt: "2026-10-22T00:00:00.000Z" });
  assert.equal(result.appliedToApp, false);
  assert.equal(result.candidates.length, 2);
  assert.deepEqual({
    title: result.candidates[0].title, history: result.candidates[0].history,
    userNote: result.candidates[0].userNote, status: result.candidates[0].status,
    license: result.candidates[0].source.license,
    attribution: result.candidates[0].source.attribution,
    capturedAt: result.candidates[0].capturedAt,
  }, {
    title: "Mock ruin", history: "History text", userNote: "", status: "unverified",
    license: "ODbL 1.0", attribution: "© OpenStreetMap contributors",
    capturedAt: "2026-10-22T00:00:00.000Z",
  });
  assert.equal(result.candidates[1].id, "Q123");
  assert.equal(result.candidates[1].wikipediaExcerpt, "Wikipedia fixture excerpt");
  assert.equal(result.candidates[1].wikipediaSource.license, "CC BY-SA 4.0");
  assert.match(calls[1], /FILTER/);
  assert.match(calls[2], /wikipedia\.org/);
});

test("rejects malformed bbox and upstream failures without returning partial data", async () => {
  await assert.rejects(harvestCandidates({ bbox: [1, 2, 1, 3] }), /bbox/);
  await assert.rejects(harvestCandidates({ bbox, fetcher: async () => new Response("failure", { status: 503 }) }), /İçerik kaynağı/);
});
