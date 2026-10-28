# T1 — Toplayıcı ve panel kurulumu (operatör adımları)

> Bu belge **kod değişikliği gerektirmeyen** tek insan adımını tarif eder:
> Cloudflare Pages ortamına `VITE_TELEMETRY_ENDPOINT` yazmak. Ondan önce hiçbir
> olay ağa çıkmaz (bilinçli; `src/lib/telemetry.ts` rıza kapısı).
> Olay sözleşmesi: `docs/olcum-ve-hata-izleme.md` §4b · Huni hedefleri: `docs/baseline.md`.

## 0. Ön koşullar

- Cloudflare hesabı (mevcut Pages projesi: `atlasia`).
- **Yeni ücretli servis açılmaz:** Analytics Engine ücretsiz katmanı bu hacim
  için yeterli (günlük 100 B satır / 1M yazma). Kota aşılırsa toplayıcı 204
  döner, istemci hiçbir şey kaybetmez (olaylar zaten "best effort").

## 1. Toplayıcı Worker (yaklaşık 40 satır)

`wrangler.toml`:

```toml
name = "atlasia-telemetry"
main = "src/index.js"
compatibility_date = "2026-10-01"

[[analytics_engine_datasets]]
binding = "EVENTS"
dataset = "atlasia_events"
```

`src/index.js` — yalnız şemayı doğrular, kişisel veri kabul etmez:

```js
const ALLOWED = new Set([
  "app_open", "session_start", "cta_click", "map_open", "onboarding_choice",
  "signup_start", "signup_complete", "sign_in", "place_created", "route_published",
  "first_route_created", "audio_guide_start", "post_created", "share",
  "offline_pack", "report_created", "consent_choice",
]);
const MAX_BODY = 4096;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
    if (request.method !== "POST") return new Response("method", { status: 405 });
    const body = await request.text();
    if (body.length > MAX_BODY) return new Response("too large", { status: 413 });
    let records;
    try { records = JSON.parse(body); } catch { return new Response("json", { status: 400 }); }
    if (!Array.isArray(records)) return new Response("shape", { status: 400 });
    for (const r of records) {
      if (!r || typeof r.name !== "string" || !ALLOWED.has(r.name)) continue;
      env.EVENTS.writeDataPoint({
        blobs: [r.name, String(r.path ?? "/").slice(0, 120)],
        doubles: [Number(r.ts) || Date.now()],
        indexes: [r.name], // huni sorgularında filtre
      });
    }
    return new Response(null, { status: 204, headers: cors() });
  },
};

function cors() {
  return {
    "access-control-allow-origin": "https://atlasia.pages.dev",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  };
}
```

Yayına alma:

```bash
npx wrangler deploy            # https://atlasia-telemetry.<hesap>.workers.dev
```

## 2. Pages ortam değişkeni

Cloudflare → Pages → `atlasia` → Settings → Environment variables (Production
**ve** Preview) → ekle:

```
VITE_TELEMETRY_ENDPOINT = https://atlasia-telemetry.<hesap>.workers.dev
```

Yerelde `.env.local` (commit edilmez):

```
VITE_TELEMETRY_ENDPOINT=http://localhost:8787
```

Sonra **yeniden deploy** gerekir: Vite değişkeni derleme zamanında gömer.

## 3. Doğrulama (5 dakika)

```bash
npm run dev
# 1) Konsolda "[telemetry:event] app_open {…}" görünmeli (uç nokta tanımlıysa
#    ağa da gider; DevTools → Network → atlasia-telemetry isteği)
# 2) Çerez bandında "Yalnız zorunlularla" → derinlemesine yenile → istek YOK
# 3) "Anonim ölçümü açarak devam et" → istek VAR; gövdede e-posta/uid/konum YOK
npm run build && curl -s https://<deploy>/assets/*.js | grep -c atlasia-telemetry
#    → >0: uç nokta pakete gömülmüş
```

KVKK kontrolü (elle, 1 dakika): gönderilen gövdede yalnız `name`, `path`, `ts`,
`sessionId` (sekmeye bağlı, hesapla eşlenmez) ve olay alanları bulunur —
`docs/olcum-ve-hata-izleme.md` §1 listesi.

## 4. Huni sorguları (Analytics Engine → SQL)

```sql
-- Landing → harita açılışı (hedef %40)
SELECT blob1 AS event, count() AS n
FROM atlasia_events
WHERE timestamp > NOW() - INTERVAL '7' DAY
  AND blob1 IN ('cta_click', 'map_open', 'onboarding_choice', 'signup_start', 'signup_complete')
GROUP BY event ORDER BY n DESC;

-- Misafir mi üye mi harita açtı
SELECT blob1 AS event, count() AS n
FROM atlasia_events
WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 = 'map_open'
GROUP BY event;
```

Not: `map_open` yük alanı (`guest`) bugün Analytics Engine'e yazılmıyor; alan
eklemek istersen `blobs` dizisine üçüncü eleman olarak koy — istemci tarafında
değişiklik **gerekmez** (`TelemetryRecord` zaten `props` taşıyor).

## 5. Durum

| Adım | Durum |
|---|---|
| İstemci kodu (tipli olaylar, rıza kapısı, gövde şeması) | ✅ bu depoda |
| Toplayıcı Worker | ⛔ operatörde (yukarıdaki 40 satır) |
| Pages `VITE_TELEMETRY_ENDPOINT` | ⛔ operatörde |
| Panel/huni görünümü | ⛔ operatörde (§4 SQL veya Plausible köprüsü) |

Bu üç adım tamamlanana kadar **huni oranları ölçülemez**; T2/T4/T5/T8
teslimatlarındaki oran iddiaları bu yüzden "hedef" olarak yazılıyor, "sonuç"
olarak değil.
