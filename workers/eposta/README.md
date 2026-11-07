# Atlasia e-posta Worker'ı (Resend)

Doğrulama/şifre yenileme e-postalarını Atlasia'nın Türkçe şablonuyla Resend
üzerinden gönderir. Kurulum ve geri alma adımları:
[`docs/resend-eposta-hatti.md`](../../docs/resend-eposta-hatti.md).

## Sözleşme

`POST /` — `content-type: application/json`, `authorization: Bearer <Firebase ID token>`

```json
{ "kind": "verification" }   // veya "reset"
```

Yanıt: `200 {"ok":true,"delivery":"resend"}`

| Kod | `error` | Anlamı |
| --- | --- | --- |
| 400 | `istek/tur` | `kind` eksik/bilinmeyen |
| 401 | `yetki/yok` | Authorization başlığı yok/bozuk |
| 403 | `yetki/dogrulanmamis` | Firebase token'ı geçersiz |
| 409 | `durum/zaten-dogrulanmis` | Hesap zaten doğrulanmış (yalnız `verification`) |
| 413 / 415 | `govde/buyuk`, `govde/tip` | 8 KB üstü gövde, JSON dışı içerik |
| 429 | `sinir/cok-fazla` | Saatlik 5 istek sınırı aşıldı |
| 502 | `hat/resend-hata`, `hat/link-uretilemedi` | Sağlayıcı hatası |
| 503 | `hat/sinir-yok` | KV sayacı bağlı değil → **gönderim yok** |

`POST /geri-bildirim` — `{"kind":"feedback","message":"…","category":"…","path":"/…"}`;
`FEEDBACK_TO` tanımlı değilse `503`.

`GET /saglik` — sır sızdırmayan yapılandırma durumu (CORS başlığı yalnız izinli
origin için eklenir).

## Neden alıcı istemciden alınmıyor?

İstekte `to` alanı **yok**. Alıcı, Worker'ın Firebase'e doğrulattığı ID token'ın
sahibinin kendi adresidir. Böylece uç nokta bir spam rölesine dönüşemez.
İstemci tarafı sözleşmesi `src/lib/mailRelay.ts` içinde.

## Gizli değerler

`RESEND_API_KEY`, `FIREBASE_API_KEY`, `MAIL_FROM`, `FEEDBACK_TO`, `REPLY_TO`
yalnız `wrangler secret put` ile tanımlanır. `wrangler.toml` içine yazılmaz,
repoya commit edilmez, `VITE_` değişkeni yapılmaz.

## Yerel testler

```bash
npm run test:eposta-worker
```

Ağa çıkmaz; `fetch` sahtelenir, KV ve Resend çağrıları doğrulanır.

## Yerel çalıştırma (isteğe bağlı)

```bash
npx --yes wrangler@4.154.0 dev --config workers/eposta/wrangler.toml
```

`dev` modunda secret'lar `.dev.vars` dosyasından okunur; **bu dosyayı commit
etme** (`.gitignore`'da `.env*` ve `.dev.vars` kontrol edilmeli).
