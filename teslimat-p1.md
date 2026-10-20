# P1 · TEMEL & KAPANIŞ — teslimat kanıtı

**Tarih:** 2026-10-20 (Europe/Istanbul)
**Depo:** `efezztxj/Atlasia`
**Branch:** `arena/b9e95263-atlasia`
**Başlangıç SHA:** `d8872d01256f4fac250b21743e00e2d46eebebc2`
**Durum:** Uygulama, yerel doğrulamalar ve GitHub Actions gate'i tamamlandı. Pull request açılmadı; merge/deploy yapılmadı.

## Özet

- Repo arşiv ignore kuralı eklendi; package adı `atlasia` yapıldı; `.env.example` altı boş `VITE_` değişkeni içeriyor; README kurulum, env, veri modeli, test ve dağıtım sınırlarını ve gerçek `AUTH_SETUP.md` / `CHANGELOG.md` dosyalarını bağlıyor.
- Beğeni sayısı seed/base + benzersiz `likedBy`; Firestore toggle yalnız atomik array transform kullanıyor. Yanıtlar `posts/{postId}/replies/{replyId}` altında. Story `seen` Firestore şemasından çıkarıldı. Feed/story sayfaları 50, reply sayfaları 100 kayıtla sınırlı.
- Photon arama dönüşümü `toSearchResult` olarak ayrıldı; extent sırasını koruyan bbox regresyon testi, yaklaşık 351 km mesafe testi ve likes/time/polyline/routePlanner/sun test alanları mevcut.
- GitHub Actions Node 22 gate'i credential-free owner-index testini ve Firestore Rules emulator testini de çalıştırıyor.
- `ensure-owner-places-index` için `node --test` ile yedi sahte-IO testi; App Check yapılandırması için Vitest birim testi eklendi.

## Commit dizisi

| Commit | Kapsam |
|---|---|
| `8bb85a2` | Step 0: archive ignore |
| `6d65ec7` | Step 0 düzeltmesi: npm package adı `atlasia` |
| `eede957` | Step 1: Firestore sosyal veri kontratları |
| `f17d1b7` | Step 2: geo/time/sun testleri ve CI |
| `6721bb6` | Kapanış: credential-free owner-index script ve 7 Node testi |
| `5b11183` | Kapanış: App Check config ve birim testi |
| `fa03095` | Kapanış: README, env ve roadmap kanıtları |
| `9c79726` | Kapanış: başarılı Arena CI sonucunu kaydetme |
| (bu raporun commit'i) | P1 teslimat kanıtı |

## Step 0 — depo ve kurulum

### Doğrulama çıktıları

```text
$ git branch --show-current
arena/b9e95263-atlasia

$ git ls-files | wc -l
149

$ grep -c VITE_ .env.example
6

$ awk -F= '/^VITE_/ && NF == 2 && $2 == "" { count++ } END { print count+0 }' .env.example
6

$ node -p "require('./package.json').name"
atlasia

$ if [ -d 'satellite-map-web-application (1)' ]; then diff -rq 'satellite-map-web-application (1)' .; else echo 'satellite-map-web-application (1): absent; no diff tree to remove'; fi
satellite-map-web-application (1): absent; no diff tree to remove

$ git ls-files '*.zip'
(no output)
```

`149` tracked-file çıktısı bu rapor dosyası eklenmeden öncedir; rapor commit'iyle beklenen son sayı `150` olur. ROADMAP'teki eski yaklaşık `82` sayısı bu checkout'un gerçek başlangıç sayısıyla örtüşmedi. Adı geçen kopya ağaç ve ZIP mevcut/tracked olmadığı için başka dosyalar tahminle silinmedi; arşiv ignore kuralı eklendi. Kalan sayı farkı, kopya ağacın varlığına kanıt değildir.

### README ve çevre değişkenleri

Repo hijyeni testi `.env.example` dosyasında tam altı ve değersiz `VITE_` satırını, `README.md` içinde gerçek `AUTH_SETUP.md` ve `CHANGELOG.md` bağlantılarını doğrular. `VITE_APPLE_AUTH_ENABLED` boş tutuldu; App Check için yedinci bir env değişkeni eklenmedi. Paket kimliği `package.json` ve lockfile'da `atlasia`.

## Step 1 — veri kontratları

- `totalLikes` negatif/geçersiz seed tabanını sıfırlar ve `likedBy` UID tekrarlarını tek sayar. UI `src/utils/likes.ts` yardımcı fonksiyonunu kullanır.
- Beğeni yazımı `likedBy` üzerinde `arrayUnion` / `arrayRemove`; `likes` tabanını istemci güncellemez.
- Yeni reply belgeleri yazar UID'si ve şekli Rules ile doğrulanır, değiştirilemez. Parent silme helper'ı child reply'leri en fazla 100'lük batch'lerle siler. Eski gömülü reply'ler mevcut belgeler için okuma uyumluluğunda normalize edilir.
- Story `seen` yazımı/tipi/Rules alanı kaldırıldı; cihaz bazlı UI durumu korunuyor.
- README veri modeli güncellendi. Mevcut checkout'ta `awardXp` / `followUser` ailesi hook/component katmanında yoktu; olmayan yardımcılar silinmedi veya yeniden oluşturulmadı.

### İstenen arama kanıtları

```text
$ rg -n 'likes:.*\?\?' src
no matches

$ rg -n 'awardXp|followUser' src/hooks src/components
no matches

$ git diff --name-only d8872d01256f4fac250b21743e00e2d46eebebc2..HEAD | grep -E '(^|/)MapView\.tsx$'
no MapView.tsx changes
```

### Typecheck, lint ve yerel unit testi

```text
$ npm run typecheck
> atlasia@0.1.0 typecheck
> tsc --noEmit
(exit 0; TypeScript hata çıktısı yok)

$ npm run lint
> atlasia@0.1.0 lint
> eslint . --max-warnings=0
(exit 0; lint hata çıktısı yok)

$ npm test
> atlasia@0.1.0 test
> vitest

✓ src/hooks/useFirestoreAtlasData.likes.test.ts (13 tests)
✓ src/utils/mapLinks.test.ts (21 tests)
✓ src/lib/firestoreData.test.ts (13 tests)
✓ src/config/mapLabelCalibration.test.ts (5 tests)
✓ src/config/cloudflareHeaders.test.ts (6 tests)
✓ src/config/socialMetadata.test.ts (4 tests)
✓ src/utils/routePlanner.test.ts (5 tests)
✓ src/lib/passwordSecurity.test.ts (8 tests)
✓ src/config/darkMapSource.test.ts (4 tests)
✓ src/content/legal.test.ts (5 tests)
✓ src/lib/contentIntegrity.test.ts (4 tests)
✓ src/components/AccountAccess.security.test.ts (4 tests)
✓ src/config/dependencySecurity.test.ts (4 tests)
✓ src/utils/mapLinkStatus.test.ts (5 tests)
✓ src/lib/authErrorMessage.test.ts (7 tests)
✓ src/config/repositoryHygiene.test.ts (4 tests)
✓ src/config/firestoreConfig.test.ts (2 tests)
✓ src/utils/geo.test.ts (3 tests)
✓ src/config/lazyLoading.test.ts (3 tests)
✓ src/config/githubActions.test.ts (2 tests)
✓ src/components/LegalNotice.test.ts (2 tests)
✓ src/utils/sun.test.ts (2 tests)
✓ src/config/allowedHosts.test.ts (7 tests)
✓ src/utils/polyline.test.ts (3 tests)
✓ src/lib/appCheckConfig.test.ts (3 tests)
✓ src/utils/time.test.ts (2 tests)
✓ src/lib/feedMetrics.test.ts (3 tests)
✓ src/utils/likes.test.ts (2 tests)
✓ src/config/lintConfig.test.ts (1 test)

Test Files  29 passed (29)
     Tests  147 passed (147)
   Start at 22:10:54
   Duration 4.64s (transform 484ms, setup 0ms, import 1.16s, tests 282ms, environment 2ms)
(exit 0)
```

### Rules emulator — yerel sınır ve remote kanıt

Yerel sandbox'ta `java` yüklü değil. İstenen komut gerçek çıktısıyla:

```text
$ npm run test:rules:emulator
> atlasia@0.1.0 test:rules:emulator
> node scripts/run-firestore-rules-tests.mjs

Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
    at requireJava21 (file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65:11)
    at file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:146:1
Node.js v22.22.3
(exit 1: local runtime eksikliği; Rules test hatası olarak yorumlanmamalı)
```

Aynı Rules emulator suite'i Java 21 kurulu GitHub Actions ortamında çalıştı ve geçti; run JSON'u:

```json
{"conclusion":"success","createdAt":"2026-10-19T22:13:32Z","headSha":"9c79726372f7d7dcc915f32729af1eb22c22649c","status":"completed","updatedAt":"2026-10-19T22:14:14Z","url":"https://github.com/efezztxj/Atlasia/actions/runs/39333404281","workflowName":"Atlasia CI"}
```

## Step 2 — test + CI

Yedi P1 unit-test alanı/dosyası: `src/utils/geo.test.ts` (extent/bbox + Haversine), `src/utils/likes.test.ts`, `src/utils/time.test.ts`, `src/utils/polyline.test.ts`, `src/utils/routePlanner.test.ts`, `src/utils/sun.test.ts`, `src/lib/feedMetrics.test.ts`. Mevcut Firestore data, auth/security ve config testleri de suite içinde kaldı. Haversine sonucu `349.35573928625206 km`; 351 km hedefinden fark `<2 km`.

### `npm ci` çıktısı

```text
$ npm ci
added 326 packages, and audited 327 packages in 7s
60 packages are looking for funding
  run `npm fund` for details

1 low severity vulnerability

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
(exit 0)
```

### Credential-free owner-index testi

```text
$ npm run test:owner-index
> atlasia@0.1.0 test:owner-index
> node --test scripts/ensure-owner-places-index.node-test.mjs

# Subtest: adds the required owner index when missing — ok
# Subtest: is idempotent when the required index already exists — ok
# Subtest: preserves unrelated index entries and top-level manifest fields — ok
# Subtest: rejects an invalid manifest shape instead of silently repairing it — ok
# Subtest: fake run writes only the updated manifest and returns without Firebase access — ok
# Subtest: fake run does not write when the manifest is already correct — ok
# Subtest: surfaces malformed JSON from the injected reader without side effects — ok
# tests 7
# pass 7
# fail 0
(exit 0)

$ npm run ensure:owner-places-index
> atlasia@0.1.0 ensure:owner-places-index
> node scripts/ensure-owner-places-index.mjs
Owner places composite index is already present.
(exit 0; yalnız yerel firestore.indexes.json, Firebase bağlantısı/credential yok)
```

### Production build ve diğer yerel gate'ler

```text
$ npm run build
> atlasia@0.1.0 build
> vite build
vite v7.3.7 building client environment for production...
✓ 2013 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                               3.50 kB │ gzip:   1.02 kB
dist/assets/maplibre-gl-worker-B8OLt8TZ.js  468.84 kB
dist/assets/map-vendor-JR8eJ17e.css          83.02 kB │ gzip:  10.52 kB
dist/assets/index-DGD4mI-9.css              112.23 kB │ gzip:  19.81 kB
dist/assets/icons-vendor-D6hM7OGY.js         25.50 kB │ gzip:   8.83 kB
dist/assets/MapView-wGu3aPvJ.js              34.97 kB │ gzip:   7.75 kB
dist/assets/firebase-auth--BDhu0BS.js       128.94 kB │ gzip:  36.60 kB
dist/assets/react-vendor-C9ZQbJ0Z.js        192.46 kB │ gzip:  60.33 kB
dist/assets/index-Ba2zn9z3.js               394.01 kB │ gzip: 133.74 kB
dist/assets/firebase-vendor-CGAQeBR0.js     490.46 kB │ gzip: 147.15 kB
dist/assets/map-vendor-Dx4V7X3z.js          946.56 kB │ gzip: 248.69 kB
✓ built in 8.15s
(exit 0)

stderr warning (non-fatal): Some chunks are larger than 500 kB after minification.
```

```text
$ npm run verify:social-metadata
Sosyal metadata doğrulandı: 18 değer, 1200×630 JPEG, 132654 bayt, progressive.
(exit 0)

$ npm run audit:check
> atlasia@0.1.0 audit:check
> node scripts/audit-baseline.mjs
Üretim bağımlılıklarında bilinen açık bulunmadı.
(exit 0)

$ npm audit --omit=dev
found 0 vulnerabilities
(exit 0)
```

`npm ci` tam kilitli 326 paketi kurdu. npm'in tüm dependency tree özeti bir düşük seviyeli advisory bildirdi; üretim kapsamı `npm audit --omit=dev` ve repo `audit:check` temiz. Advisory için `npm audit fix` veya herhangi bir audit bypass uygulanmadı.

## GitHub Actions

Workflow: Node 22, `npm ci`, production audit baseline, typecheck, lint, Vitest, yedi owner-index Node testi, Java 21 Firestore Rules emulator testi ve production build. Push kapsamı `main` + `arena/**`; PR kapsamı korunuyor.

- Son doğrulanan CI run: [39333404281](https://github.com/efezztxj/Atlasia/actions/runs/39333404281)
- Head SHA: `9c79726372f7d7dcc915f32729af1eb22c22649c`
- Sonuç: `success`; tüm adımlar, özellikle Rules emulator, geçti.
- Runner annotations: pinned Actions sürümleri Node 20 deprecation uyarısı veriyor; `setup-java@v4` için migration uyarısı ve `ubuntu-latest` → Ubuntu 26 değişikliği duyurusu var. Gate başarısını etkilemedi; bakım işi olarak açık.

## Otonom kararlar

1. Reply modeli: kullanıcı kararı (a) ile uyumlu `posts/{id}/replies/{replyId}` seçildi; ücretli servis/Cloud Functions eklenmedi.
2. Kopya dosya arşivi: kontrol edilen duplicate tree/ZIP yoktu; bilinmeyen dosyalar silinmedi, ignore kuralı eklendi.
3. Geo bbox: mevcut checkout zaten Photon `[west,south,east,north]` extenti doğrudan taşıyordu. Üretim mapping'i test edilebilir `toSearchResult` dikişine alındı; `MapView.tsx` değiştirilmedi.
4. App Check: mevcut public site key korunup config saf modüle taşındı. Altıncı env değişkeni dışına çıkılmadı.
5. Eski sosyal XP/takip yardımcıları bu checkout'ta bulunmadığı için hayali API eklenmedi; `src/hooks` / `src/components` grep'i boş.
6. Owner-index aracı yalnız yerel JSON manifestini idempotent olarak düzenler; remote Firebase deploy etmez ve credential kullanmaz.

## Açık noktalar

- ROADMAP'in beklediği yaklaşık 82 tracked file bu checkout'ta yoktu: başlangıçta 141, bu teslimat dosyalarıyla 150. İsimlendirilmiş kopya klasör/ZIP yok; rastgele silme yapılmadı.
- Yerel sandbox'ta Java 21 bulunmadığından yerel Rules emulator komutu başlayamadı. Aynı test suite'i GitHub CI'da Java 21 ile geçti.
- Eski gömülü reply belgeleri otomatik prod migration/deploy görmedi; okuma uyumluluğu var, yeni yazımlar alt koleksiyona gider.
- GitHub Actions deprecation notları (Node 20 runtime geçişi, setup-java v4 ve ubuntu-latest değişimi) temizlik işi olarak açık.
- Build başarılı olsa da vendor chunk >500 kB uyarısı sürüyor.
- Bağımsız aynı-candidate audit bekliyor. Üretim deploy'u, audit bypass'ı, PR açma veya merge yapılmadı.
