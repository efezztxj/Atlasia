# Teslimat — Resend e-posta hattı (taslak, alan adı bekliyor)

> **Dal:** `arena/143deb6a-atlasia` · **Taban:** `main` @ `1d876dc`
> **Durum:** kod ve dokümantasyon hazır; **canlıya alma için alan adı + Resend
> hesabı + Worker deploy gerekir.** Bunlar operatör işidir (`AGENTS.md` deploy yasağı).

## Neden

`AUTH_SETUP.md` §Doğrulama e-postaları iki kısıtı kaydediyordu:

1. Firebase bu projede şablonu güncellemiyor (`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`).
2. Gönderen adresi `*.firebaseapp.com`; markalı gönderen için Resend hattı gerekli.

Bu teslimat, Firebase Auth'u değiştirmeden **opsiyonel** bir markalı gönderim
hattı ekler. Bayrak kapalıyken davranış birebir eskisidir.

## Değişen dosyalar

| Dosya | Ne |
| --- | --- |
| `workers/eposta/src/index.js` | **yeni** — Cloudflare Worker: ID token doğrulama, Firebase `sendOobCode` ile bağlantı üretimi, Resend gönderimi, KV hız sınırı, sabit hata kodları |
| `workers/eposta/src/sablonlar.js` | **yeni** — Türkçe HTML/metin şablonlar (doğrulama, şifre yenileme, geri bildirim); tüm kullanıcı metni kaçıştan geçer |
| `workers/eposta/worker.node-test.mjs` | **yeni** — 16 test, `fetch` sahtelenir, ağa çıkılmaz |
| `workers/eposta/wrangler.toml`, `README.md` | **yeni** — deploy yapılandırması ve sözleşme |
| `scripts/resend-dns-denetimi.mjs` (+ test) | **yeni** — alan adı DNS kayıtlarını yayından doğrular; 17 test |
| `src/lib/mailRelay.ts` (+ test) | **yeni** — istemci sözleşmesi; `resolveMailConfig` saf, `postRelay` alıcı adresi göndermez |
| `src/lib/auth.ts` | Hat varsa önce Worker, olmazsa Firebase'e düşer; `VITE_APP_ORIGIN` bağlantı dönüş adresi |
| `docs/resend-eposta-hatti.md` | **yeni** — kurulum, doğrulama, sınırlar, geri alma, maliyet |
| `.env.example`, `AUTH_SETUP.md`, `package.json`, `vitest.config.ts`, `.gitignore` | Bayraklar, işaretçi, script'ler, test env, `.dev.vars` |

## Güvenlik kararları

- **Alıcı istemciden alınmaz.** Worker, ID token'ı Firebase'e doğrulatır ve yalnız
  token sahibinin adresine gönderir → uç nokta spam rölesi olamaz.
- **KV sayacı yoksa gönderim yok** (`503 hat/sinir-yok`). Sınırsız anonim gönderim yok.
- **Oturumsuz "şifremi unuttum"** bilinçli olarak Firebase'de kalır (enumeration).
- Resend anahtarı, Firebase servis anahtarı `VITE_` değildir; repo'ya yazılmaz.
- Sağlayıcı hata gövdesi yanıta/log'a taşınmaz (alıcı adresi içerebilir).

## Koşulan kapılar

| Komut | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ kendi dosyalarımda hata yok (mevcut 9 `src/data/places.ts` hatası tabanda da var) |
| `npm run lint` | ✅ temiz |
| `npm run test:run` | ✅ yeni testler geçti; kalan 12 kırmızı tabanda da kırmızı (`places`/`placeAdvice`/`socialProofT20`) |
| `npm run test:scripts` | ✅ (dahil: `test:eposta-worker` 16, `test:resend-dns` 17) |
| `npm run build` | ⚠️ `verify:sw-shell` tabanda da düşüyor (`efes/kalkidikum-tour.json` eksik) — bu teslimatla ilgisiz |

## Bilinen riskler / sonraki adım

1. **`returnOobLink` bazı projelerde kapalı** (`OPERATION_NOT_ALLOWED`): Worker
   `hat/link-desteklenmiyor` döner, istemci Firebase'e düşer. Markalı şablon şartsa
   kod yolu B (kendi `oobCode` üretimi) gerekir.
2. **Geri bildirim ucu hazır ama istemciye bağlı değil** (`FeedbackDialog` hâlâ
   Firestore'a yazıyor) — ayrı görev ve onay.
3. Markalı **şifre sıfırlama** için App Check'li ayrı uç nokta gerekir (§5).
4. Resend Free: 3.000/ay, **100/gün**; Pro $20/ay.
5. Bu turda `main`'deki `typecheck`/`build` kırmızıları kapatılmadı (kapsam dışı).
