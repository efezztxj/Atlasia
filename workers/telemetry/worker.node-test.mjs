import assert from "node:assert/strict";
import { test } from "node:test";
import worker, { MAX_BATCH, MAX_BODY_BYTES } from "./src/index.js";

const origin = "https://atlasia.pages.dev";
const endpoint = "https://atlasia-telemetry.example.workers.dev/";

function environment(overrides = {}) {
  const points = [];
  return {
    points,
    env: {
      ALLOWED_ORIGINS: origin,
      EVENTS: { writeDataPoint: async (point) => { points.push(point); } },
      ...overrides,
    },
  };
}

function record(overrides = {}) {
  return {
    name: "cta_click",
    level: "event",
    at: 1_793_107_200_000,
    sessionId: "a1b2c3d4-e5f6a7b8",
    path: "/",
    props: { placement: "hero", signedIn: false },
    v: 1,
    ...overrides,
  };
}

function post(body, options = {}) {
  return new Request(endpoint, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...options.headers },
    body,
    ...options.request,
  });
}

test("CORS only echoes an explicitly allowed origin and handles preflight", async () => {
  const { env } = environment();
  const preflight = await worker.fetch(new Request(endpoint, { method: "OPTIONS", headers: { origin } }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.equal(preflight.headers.get("access-control-allow-methods"), "POST, OPTIONS");

  const denied = await worker.fetch(new Request(endpoint, { method: "OPTIONS", headers: { origin: "https://attacker.invalid" } }), env);
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});

test("only POST JSON requests are accepted", async () => {
  const { env } = environment();
  const get = await worker.fetch(new Request(endpoint, { headers: { origin } }), env);
  assert.equal(get.status, 405);
  const text = await worker.fetch(post("[]", { headers: { "content-type": "text/plain" } }), env);
  assert.equal(text.status, 415);
});

test("rejects malformed, oversized, non-array, and over-batch bodies", async () => {
  const { env } = environment();
  assert.equal((await worker.fetch(post("{"), env)).status, 400);
  assert.equal((await worker.fetch(post(JSON.stringify({ name: "cta_click" })), env)).status, 400);
  assert.equal((await worker.fetch(post(JSON.stringify(Array.from({ length: MAX_BATCH + 1 }, () => record()))), env)).status, 413);
  assert.equal((await worker.fetch(post("x".repeat(MAX_BODY_BYTES + 1)), env)).status, 413);
});

test("maps the client `at` timestamp and whitelisted CTA fields into stable columns", async () => {
  const { env, points } = environment();
  const event = record({ props: { placement: "hero", signedIn: false, email: "secret@example.com", customText: "free text" } });
  const response = await worker.fetch(post(JSON.stringify([event])), env);
  assert.equal(response.status, 204);
  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[0], "cta_click");
  assert.equal(points[0].blobs[1], "/");
  assert.equal(points[0].blobs[2], event.sessionId);
  assert.equal(points[0].blobs[3], "hero");
  assert.deepEqual(points[0].doubles.slice(0, 4), [event.at, -1, -1, 0]);
  assert.deepEqual(points[0].indexes, ["cta_click"]);
  assert.equal(JSON.stringify(points[0]).includes("secret@example.com"), false);
  assert.equal(JSON.stringify(points[0]).includes("free text"), false);
});

test("stores guest funnel fields and refuses arbitrary categories", async () => {
  const { env, points } = environment();
  const valid = record({ name: "map_open", props: { guest: true } });
  const unknownCategory = record({ name: "place_created", props: { account: "cloud", category: "my free text", hasPhoto: true } });
  await worker.fetch(post(JSON.stringify([valid, unknownCategory])), env);

  assert.equal(points.length, 2);
  assert.equal(points[0].blobs[0], "map_open");
  assert.equal(points[0].doubles[2], 1);
  assert.equal(points[1].blobs[4], "cloud");
  assert.equal(points[1].blobs[6], "");
  assert.equal(points[1].doubles[4], 1);
});

test("drops error details and rejects malformed event identity", async () => {
  const { env, points } = environment();
  const error = record({
    name: "error",
    level: "error",
    props: { source: "window.error", line: 12, errorType: "TypeError", errorDetail: "secret@example.com" },
  });
  const invalid = record({ sessionId: "not-a-random-session-id", path: "/?invite=private" });
  await worker.fetch(post(JSON.stringify([error, invalid])), env);

  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[0], "error");
  assert.equal(points[0].blobs[13], "window.error");
  assert.equal(points[0].blobs[15], "TypeError");
  assert.equal(points[0].doubles[8], 12);
  assert.equal(JSON.stringify(points[0]).includes("secret@example.com"), false);
});

test("stores the allowlisted moderation target and strips URL query/hash from paths", async () => {
  const { env, points } = environment();
  const report = record({
    name: "report_created",
    path: "/?invite=private#token",
    props: { targetType: "user", targetId: "must-not-be-stored" },
  });
  await worker.fetch(post(JSON.stringify([report])), env);

  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[1], "/");
  assert.equal(points[0].blobs[11], "user");
  assert.equal(JSON.stringify(points[0]).includes("private"), false);
  assert.equal(JSON.stringify(points[0]).includes("must-not-be-stored"), false);
});

test("silently ignores unsupported records, while reporting a missing binding", async () => {
  const empty = environment();
  const unsupported = record({ name: "unknown_event" });
  assert.equal((await worker.fetch(post(JSON.stringify([unsupported])), empty.env)).status, 204);
  assert.equal(empty.points.length, 0);

  const unavailable = environment({ EVENTS: undefined });
  assert.equal((await worker.fetch(post(JSON.stringify([record()])), unavailable.env)).status, 503);
});
