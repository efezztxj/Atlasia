import test from "node:test";
import assert from "node:assert/strict";
import { USER_AGENT, harvestCandidates } from "./harvest.mjs";

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
  const agents = [];
  const fetcher = async (url, init) => { calls.push(String(url)); agents.push(init?.headers?.["User-Agent"]); return new Response(JSON.stringify(bodies.shift()), { status: 200 }); };
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
  // Wikimedia politikası: her istekte tanımlayıcı User-Agent.
  assert.ok(agents.every((agent) => agent === USER_AGENT));
  // Yalnız tarihî/kültürel yerler; Türkçe etiket ve madde önceliği.
  const sparql = decodeURIComponent(calls[1]);
  assert.match(sparql, /P1435/);
  assert.match(sparql, /tr\.wikipedia\.org/);
  assert.match(sparql, /"tr,en"/);
});

test("Türkçe Wikipedia maddesi varsa İngilizceden önce kullanılır", async () => {
  const bodies = [
    { elements: [] },
    { results: { bindings: [
      { item: { value: "http://www.wikidata.org/entity/Q9" }, itemLabel: { value: "Efes" }, lat: { value: "37.94" }, lon: { value: "27.34" },
        trArticle: { value: "https://tr.wikipedia.org/wiki/Efes" }, enArticle: { value: "https://en.wikipedia.org/wiki/Ephesus" } },
    ] } },
    { query: { pages: { 1: { extract: "Türkçe özet" } } } },
  ];
  const calls = [];
  const fetcher = async (url) => { calls.push(String(url)); return new Response(JSON.stringify(bodies.shift()), { status: 200 }); };
  const result = await harvestCandidates({ bbox, fetcher, capturedAt: "2026-10-22T00:00:00.000Z" });
  assert.match(calls[2], /^https:\/\/tr\.wikipedia\.org\//);
  assert.equal(result.candidates[0].wikipediaLang, "tr");
  assert.equal(result.candidates[0].wikipediaSource.url, "https://tr.wikipedia.org/wiki/Efes");
});

test("rejects malformed bbox and upstream failures without returning partial data", async () => {
  await assert.rejects(harvestCandidates({ bbox: [1, 2, 1, 3] }), /bbox/);
  await assert.rejects(harvestCandidates({ bbox, fetcher: async () => new Response("failure", { status: 503 }) }), /İçerik kaynağı/);
});
