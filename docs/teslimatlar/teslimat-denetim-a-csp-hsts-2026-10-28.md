# Teslimat — Denetim A grubu: CSP, HSTS, source map, CRLF (A1–A7)

**Tarih:** 2026-10-28 · **Dal:** `arena/66dd9474-atlasia` · **Kaynak:** canlı site denetimi (best practices 75)

## 1. Yapılanlar

| # | Durum | Ne değişti | Dosya |
|---|---|---|---|
| **A1** | ✅ | Satır içi tema betiği `/theme-boot.js`'e taşındı. CSP `script-src 'self'` altında satır içi betik **engelleniyordu**: tema ilk karede uygulanmıyor, konsolda ihlal birikiyordu. Dosya senkron ve `main.tsx`'ten önce yükleniyor. | `public/theme-boot.js` (yeni), `index.html`, `public/_headers` |
| **A2** | ✅ | `https://apis.google.com` → `script-src`, `connect-src`, `frame-src`. Firebase Google popup'ı bu origin'i kullanıyor. | `public/_headers` |
| **A3** | ✅ | `Explorer.tsx` + `TrackRecorderPanel.tsx` artık SDK'sız kapıyı (`lib/firebaseConfig`) okuyor. `lib/firebase` SDK'yı modül yüklenirken başlatır. | 2 bileşen + 1 test mock'u |
| **A4** | ✅ (metin) | Gizlilik metni gerçeğe uyduruldu: `_GRECAPTCHA` **yalnız bulut özelliklerinde ve ölçüm tercihinden bağımsız** yazılabilir; reklam/izleme için kullanılmaz. Landing'de artık Firebase/reCAPTCHA isteği yok (A3). | `src/content/legal.ts` |
| **A5** | ✅ | HSTS: `max-age=31536000; includeSubDomains`. **`preload` bilinçli olarak yok** — apex başvurusu gerekir, kök alan Cloudflare'in. Gerekçe dosya başında yazılı. | `public/_headers`, `docs/cloudflare-security.md` |
| **A6** | ✅ | `build.sourcemap: "hidden"` + `scripts/collect-sourcemaps.mjs` haritaları `dist` **dışına** taşır → yayında URL yok. CI bunları artifact olarak saklar (SHA pinli action). | `vite.config.ts`, `scripts/collect-sourcemaps.mjs` (yeni), `package.json` `postbuild`, `.github/workflows/ci.yml`, `.gitignore` |
| **A7** | ✅ | `firestore.rules` / `firebase.json` / `rules` için `.gitattributes eol=lf` + ayrıştırıcıda `split(/\r?\n/)` (kural envanteri, yedek sayımı). | `.gitattributes`, `scripts/rules-inventory.mjs`, `scripts/firestore-backup.mjs` |

## 2. Neden böyle

- **A1 neden ayrı dosya, neden `'unsafe-inline'` değil:** `'unsafe-inline'` eklemek tüm CSP'yi zayıflatır (XSS yüzeyi). Ayrı dosya aynı işi `script-src 'self'` altında yapar. `defer`/`async` eklenemez: tema ilk boyamadan önce uygulanmalı.
- **A6 neden taşıma:** `sourcemap: "hidden"` referans yorumu yazmaz ama `.map` dosyaları `dist/assets` altında kalırsa Cloudflare onları **yine de yayınlar**. Taşıma, "hata ayıklanabilir ama herkese açık değil" hedefini gerçekten sağlar. `verify:sw-shell` artık `.map` dosyalarını kabuk künyesine katmaz.
- **A7 neden iki katman:** `.gitattributes` sorunun kaynağını (CRLF'e dönüşme) keser; `\r?\n` ayrıştırma ise dosya dışarıdan CRLF gelirse de doğru çalışır. Tek başına hiçbiri yeterli değil.

## 3. Kanıt

| Kapı | Sonuç |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint . --max-warnings=0` | PASS |
| `npm run test:run` | **158 dosya / 1275 test** PASS |
| `npm run test:scripts` | 8/8 (fail 0) |
| `npm run build` | PASS · SW 44/44 · haritalar 42 dosya `sourcemaps/`'e taşındı, `dist`'te `.map` **0** |
| `npm run test:bundle-budget` | 14/14 |

**Bütçe:** tanıtım 126.961 / 129.400 · uygulama kabuğu 587.154 / 603.400 · ilk boya JS
100.324 / 102.200 · ilk boya CSS 25.075 / 25.200 · toplam JS 1.000.431 / 1.001.500 (eşik yükseltilmedi).

## 4. Yeni testler

- `src/config/securityPosture.test.ts` (10 test) — A1 (satır içi betik yok, palet `useTheme` ile aynı), A2 (`apis.google.com` üç direktifte), A5 (HSTS `includeSubDomains`, `preload` yok + gerekçe yazılı), A6 (`hidden` + taşıma + artifact + `.gitignore`), A7 (`.gitattributes` + `\r?\n`).
- `scripts/rules-inventory.node-test.mjs` — CRLF metni LF ile **aynı** blokları üretir.
- `src/config/cloudflareHeaders.test.ts` — HSTS beklentisi güncellendi, `apis.google.com` eklendi.
- `src/config/uiSurface.test.ts` — tema betiği artık dosyadan; "main.tsx'ten önce ve `defer`'sız" kilitlendi.
- `src/config/githubActions.test.ts` — yeni pin (`upload-artifact` v7.0.2) izinli kümeye eklendi.

## 5. Canlıda doğrulanacaklar (deploy sonrası)

1. Konsolda **satır içi script CSP ihlali yok**; `midnight` seçiliyken ilk kare doğru tema.
2. Google ile giriş popup'ı açılıyor, CSP ihlali yok.
3. Landing'de `firebase-vendor` ve `google.com/recaptcha` isteği yok.
4. `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
5. `https://atlasia.pages.dev/assets/*.js.map` → **404**.
