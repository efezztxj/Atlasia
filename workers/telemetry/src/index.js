const MAX_BODY_BYTES = 16 * 1024;
const MAX_BATCH = 20;
const SESSION_ID = /^[a-f0-9]{8}-[a-f0-9]{8}$/i;
const BASE_ORIGIN = "https://atlasia.invalid";

const ENUMS = {
  account: new Set(["anonymous", "cloud", "device"]),
  action: new Set(["delete", "download"]),
  category: new Set(["beaches", "camp", "cities", "community", "food", "history", "issues", "nature", "photo", "routes"]),
  channel: new Set(["clipboard", "link", "native"]),
  choice: new Set(["leave", "nearby", "route", "skip"]),
  errorType: new Set(["Error", "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError", "Unknown"]),
  kind: new Set(["post", "story"]),
  method: new Set(["apple", "device", "email", "google", "phone"]),
  placement: new Set(["footer", "header", "hero", "how_it_works"]),
  screen: new Set(["browser", "standalone"]),
  source: new Set(["manual", "unhandledrejection", "window.error"]),
  target: new Set(["place", "post", "route", "story", "user"]),
  targetType: new Set(["place", "post", "story", "user"]),
  visibility: new Set(["private", "public"]),
};

const EVENT_FIELDS = {
  app_open: ["standalone", "screen"],
  session_start: ["account"],
  cta_click: ["placement", "signedIn"],
  map_open: ["guest"],
  onboarding_choice: ["choice", "guest"],
  signup_start: [],
  signup_complete: ["method", "account"],
  sign_in: ["method", "account"],
  place_created: ["account", "category", "hasPhoto"],
  route_published: ["account", "visibility", "stops"],
  first_route_created: ["account", "stops"],
  audio_guide_start: ["source"],
  post_created: ["hasPhoto", "kind"],
  share: ["channel", "target", "ok"],
  offline_pack: ["action", "ok"],
  report_created: ["targetType"],
  consent_choice: ["analytics"],
  error: ["source", "line", "errorType"],
};

const BOOL_FIELDS = new Set(["analytics", "guest", "hasPhoto", "ok", "signedIn", "standalone"]);
const NUMBER_FIELDS = new Set(["line", "stops"]);

function response(body, status, origin) {
  const headers = new Headers({ "cache-control": "no-store" });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type");
    headers.set("access-control-max-age", "600");
    headers.set("vary", "Origin");
  }
  return new Response(body, { status, headers });
}

function parseOrigins(value) {
  return new Set((value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

async function readBoundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function normalizePath(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return null;
  try {
    const url = new URL(path, BASE_ORIGIN);
    if (url.origin !== BASE_ORIGIN) return null;
    return url.pathname.replace(/\/{2,}/g, "/").slice(0, 120) || "/";
  } catch {
    return null;
  }
}

function sanitizeProps(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const accepted = {};
  for (const key of EVENT_FIELDS[name]) {
    const raw = value[key];
    if (BOOL_FIELDS.has(key)) {
      if (typeof raw === "boolean") accepted[key] = raw;
      continue;
    }
    if (NUMBER_FIELDS.has(key)) {
      if (Number.isSafeInteger(raw) && raw >= 0 && raw <= (key === "line" ? 10_000_000 : 500)) accepted[key] = raw;
      continue;
    }
    const values = ENUMS[key];
    if (values?.has(raw)) accepted[key] = raw;
  }
  // `errorDetail`, arbitrary props, ids, and all free text are intentionally discarded.
  return accepted;
}

function toDataPoint(record) {
  const props = sanitizeProps(record.name, record.props);
  const target = props.target ?? props.targetType ?? "";
  const text = (key) => props[key] ?? "";
  const number = (key) => (Number.isSafeInteger(props[key]) ? props[key] : -1);
  const flag = (key) => (typeof props[key] === "boolean" ? Number(props[key]) : -1);

  return {
    // Stable column order; see workers/telemetry/README.md.
    blobs: [
      record.name,
      normalizePath(record.path),
      record.sessionId,
      text("placement"),
      text("account"),
      text("method"),
      text("category"),
      text("choice"),
      text("visibility"),
      text("action"),
      text("channel"),
      target,
      text("kind"),
      text("source"),
      text("screen"),
      text("errorType"),
    ],
    // -1 means “not applicable”; booleans are 0/1. `at` is epoch milliseconds.
    doubles: [
      record.at,
      number("stops"),
      flag("guest"),
      flag("signedIn"),
      flag("hasPhoto"),
      flag("ok"),
      flag("analytics"),
      flag("standalone"),
      number("line"),
    ],
    indexes: [record.name],
  };
}

function isValidRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  if (!Object.hasOwn(EVENT_FIELDS, record.name)) return false;
  if (record.level !== (record.name === "error" ? "error" : "event")) return false;
  if (record.v !== 1 || !Number.isSafeInteger(record.at) || record.at < 0) return false;
  if (typeof record.sessionId !== "string" || !SESSION_ID.test(record.sessionId)) return false;
  return normalizePath(record.path) !== null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const allowedOrigins = parseOrigins(env.ALLOWED_ORIGINS);
    if (!origin || !allowedOrigins.has(origin)) return response("origin", 403);

    if (request.method === "OPTIONS") return response(null, 204, origin);
    if (request.method !== "POST") return response("method", 405, origin);

    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") return response("content type", 415, origin);

    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return response("too large", 413, origin);

    let bytes;
    try {
      bytes = await readBoundedBody(request);
    } catch {
      return response("body", 400, origin);
    }
    if (!bytes) return response("too large", 413, origin);

    let records;
    try {
      records = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return response("json", 400, origin);
    }
    if (!Array.isArray(records)) return response("shape", 400, origin);
    if (records.length > MAX_BATCH) return response("too many", 413, origin);

    const valid = records.filter(isValidRecord);
    if (!valid.length) return response(null, 204, origin);
    if (!env.EVENTS || typeof env.EVENTS.writeDataPoint !== "function") return response("unavailable", 503, origin);

    try {
      for (const record of valid) await env.EVENTS.writeDataPoint(toDataPoint(record));
    } catch {
      // Never log payloads: they can contain fields the schema intentionally drops.
      return response("unavailable", 503, origin);
    }
    return response(null, 204, origin);
  },
};

export { MAX_BATCH, MAX_BODY_BYTES, toDataPoint };
