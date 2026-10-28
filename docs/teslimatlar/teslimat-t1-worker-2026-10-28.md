# T1 telemetry Worker teslim notu — 2026-10-28

## Sonuç

Cloudflare Workers tabanlı T1 collector uygulandı ve çevrimdışı sözleşme
kontrollerinden geçti. Worker, istemci `TelemetryRecord[]` sözleşmesini kabul
eder; `at`, `sessionId`, `path`, `props`, `v` alanlarını doğrular; bilinen olay
ve özellikleri allowlist ile Analytics Engine'e yazar. Serbest metin, hata
ayrıntıları, URL query/hash değerleri ve bilinmeyen alanlar kaydedilmez.

**Dağıtım yapılmadı.** Bu ortamda Cloudflare API oturumu/kimliği yoktur. Pages
`VITE_TELEMETRY_ENDPOINT` ayarı da bilerek boş bırakılmıştır; gerçek ölçüm,
operatör Worker'ı deploy edip endpoint'i Pages Production/Preview ortamlarına
ekledikten ve Pages'i yeniden deploy ettikten sonra başlar.

## Repo / branch / commit

- Repo: `efezztxj/Atlasia`
- Branch: `arena/10cae612-atlasia`
- Taban: `26f50a1` (main)
- Uygulama commit'i: `b6ffe1d` (`Add tested Cloudflare telemetry Worker for T1`)

## Değişiklikler

- `workers/telemetry/src/index.js` — POST/JSON, gövde boyutu ve olay doğrulaması,
  origin allowlist'i, sabit Analytics Engine kolonlarına alan eşleme.
- `workers/telemetry/wrangler.toml` — Worker adı, Analytics Engine binding'i ve
  düzenlenebilir `ALLOWED_ORIGINS`.
- `workers/telemetry/worker.node-test.mjs` — CORS, gövde sınırları, alan
  allowlist'i, timestamp eşleme, hassas alan atımı ve hatalı kayıt testleri.
- `workers/telemetry/README.md` — deploy, Pages endpoint, veri düzeni ve gizlilik
  notları.
- `docs/gorevler/t1-toplayici-kurulum.md` — eski kopyala-yapıştır örneği yerine
  gerçek Worker adımlarını ve `at` şemasını açıklar.
- `docs/olcum-ve-hata-izleme.md` — collector'ın artık depoda kaynak kodu olarak
  bulunduğu, fakat henüz deploy edilmediği durumunu yansıtır.
- `package.json` — `test:telemetry-worker` ve `test:scripts` entegrasyonu.

## Doğrulama

Başarılı:

- `npm run test:telemetry-worker` — 8/8 test.
- `npm run typecheck` ve `npm run lint`.
- `npm run test:run` — 160 dosya, 1.284 test.
- `npm run build`, `npm run test:scripts`, `npm run audit:check`,
  `git diff --check`.
- `npx --yes wrangler@4.154.0 deploy --dry-run --config workers/telemetry/wrangler.toml`
  — bundle ve `EVENTS` / `ALLOWED_ORIGINS` binding'leri doğrulandı; top-level
  ortam config'i kullanıldığı için çoklu ortam uyarısı yok.

Gerçek deploy veya Analytics Engine'e yazma denenmedi. Bu nedenle T3/T10 gerçek
ölçüm değerleri henüz üretilemez; mevcut eşikler hedef niteliğindedir.

## Operatörün kalan adımları

1. `workers/telemetry/wrangler.toml` içindeki `ALLOWED_ORIGINS` değerini gerçek
   Pages domain(ler)iyle güncelle.
2. Yetkili Cloudflare hesabında README'deki sabitlenmiş Wrangler komutuyla Worker'ı
   deploy et.
3. Dönen `workers.dev` URL'sini Pages `atlasia` Production (ve istenirse Preview)
   ortamında `VITE_TELEMETRY_ENDPOINT` olarak tanımla; Pages'i yeniden deploy et.
4. README'deki rıza, Network ve Analytics Engine kontrol adımlarını çalıştır.

CORS origin kontrolü kötüye kullanımı engelleyen kimlik doğrulama değildir.
Endpoint herkese açıktır; trafik ve Analytics Engine kotası izlenmeli, gerekirse
Cloudflare hesap seviyesinde rate limit eklenmelidir. Cloudflare token'ı repo ya
da sohbete eklenmemelidir.
