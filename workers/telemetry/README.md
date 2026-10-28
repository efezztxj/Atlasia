# Atlasia telemetry Worker

This Worker is the tested implementation for `docs/gorevler/t1-toplayici-kurulum.md`.
It accepts the Atlasia `TelemetryRecord[]` contract, projects only allowlisted
fields, and writes to the Cloudflare Analytics Engine dataset `atlasia_events`.

## Deploy (operator action)

From the repository root, after authenticating Wrangler with the correct
Cloudflare account:

```bash
npx --yes wrangler@4.154.0 whoami
npx --yes wrangler@4.154.0 deploy --config workers/telemetry/wrangler.toml
```

Copy the `workers.dev` URL printed by Wrangler into Cloudflare Pages → `atlasia`
→ Settings → Environment variables for Production (and Preview only if wanted):

```text
VITE_TELEMETRY_ENDPOINT=https://atlasia-telemetry.<account-subdomain>.workers.dev
```

Pages values are embedded at build time, so redeploy Pages after changing the
variable. Do not put a Cloudflare token in the repository or chat. The Worker
URL is public; this is an ingestion endpoint, not an authenticated API.

Before deploying, edit `ALLOWED_ORIGINS` in `wrangler.toml` to the exact Pages
origins that will send events. CORS origin checks are a browser boundary, **not
an anti-abuse control**; the endpoint must not be described as protected from
scripts that forge `Origin`. Watch Analytics Engine usage and apply an
account-level rate limit if traffic or quotas require it.

## Data layout

`blobs` positions are stable: event, normalized path, random tab session ID,
placement, account, method, category, onboarding choice, visibility, action,
share channel, target type, content kind, source, screen, error type.

`doubles` positions: client event time in epoch milliseconds, stop count,
`guest`, `signedIn`, `hasPhoto`, `ok`, `analytics`, `standalone`, and error line.
For boolean columns, `1` = true, `0` = false, and `-1` = not applicable.

Unrecognized events and properties are discarded. Free text, error details,
query strings, hashes, arbitrary identifiers, and unknown fields are never
written or logged. `sessionId` is retained only as the client's random
per-tab identifier so anonymous funnel steps can be grouped; it is not joined
to an account.

## Local contract tests

```bash
npm run test:telemetry-worker
```

The tests use Node's built-in runner and a fake Analytics Engine binding; they
do not require Cloudflare credentials or make network requests.
