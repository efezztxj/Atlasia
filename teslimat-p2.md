# P2 · Rota Motoru (Faz B) — teslimat

- **Repo:** `efezztxj/Atlasia`
- **Branch:** `arena/9e4e5884-atlasia` (main'e commit yok; PR açılmadı, merge edilmedi)
- **Başlangıç commit'i:** `ab290183921a688bb6d8c6a64e2c28395f052ef3`
- **Uygulama teslim HEAD'i:** `e244c39` (`feat: rota kesif akisi ve kayitlar`)
- **Tarih:** 2026-10-19 UTC
- **Push:** başarılı; aynı Arena dalına push edildi.

## Adım/commit eşlemesi (adım başına tek commit)

1. Adım 3 — `72001ac feat: rota ve iz nesnelerini hesaba bagla`
2. Adım 4 — `471f9f7 feat: yuruyus kaydi ve durak tespiti`
3. Adım 5 — `5a6b666 feat: rotayi duzenle yayinla ve paylas`
4. Adım 6 — `e244c39 feat: rota kesif akisi ve kayitlar`

## Değişiklik özeti

- `AtlasRoute` ve `AtlasTrack` tipleri; Firestore route/track/saved-record veri işlemleri `src/lib/routeData.ts` içinde.
- `users/{uid}/savedPlaces` ve `users/{uid}/savedRoutes` canlı senkronu; Firebase hazırken kayıtlar localStorage'dan okunup yazılmaz.
- `routes/{routeId}`; `authorUid`, `visibility`, `route`, `saveCount`, `createdAt`, `updatedAt`. `tracks/{trackId}` sadece sahibi okuyup yazabilir/silebilir.
- Görünürlük: `private` varsayılanı; `unlisted` yalnız doğrudan bağlantıyla okunabilir; `public` keşif sorgularında listelenir. Yayın eylemi kullanıcı tarafından başlatılır.
- `useTrackRecorder` kendi `navigator.geolocation.watchPosition` akışını kullanır; `useGeolocation` çağrısı yoktur. Noktalar kayıt süresince bellekte tam çözünürlükte tutulur; dwell her callback'te işlenir; harita önizlemesi saniyede bir güncellenir.
- Douglas–Peucker 7 m tolerans, ölçüm mesafesi sadeleştirilmiş polyline'dan; dwell eşiği en az 3 dakika ve doğruluk ölçekli 40–100 m yarıçap.
- Kayıt bitiminde özel `tracks` dokümanı ve dürüst metinli taslak rota oluşturulur. Fotoğraf Firestore JPEG data URL olarak kalır; istemcide 180.000 karaktere kadar sıkıştırılır. Storage/Blaze/Functions eklenmedi.
- Rota düzenleyici: isim, açıklama, bölge ve data URL kapak fotoğrafı; açık görünürlük seçimi; kalıcı `/?route={id}` bağlantısı. Link uygulama açılışında Firestore'dan yüklenir.
- RecordsDock: kayıtlı yer/rota, açık rota keşfi (bölge/süre/tema ve kayıt sayısı), özel iz listeleme; rota/iz silme eylemleri.
- `firestore.rules` sıkı alan beyaz listeleri, görünürlük denetimleri ve aynı işlemde route kayıt referansı ile sayacı atomik eşleştiren sınırlar içerir.
- `MapView.tsx` değiştirilmedi. `src/App.tsx`, yalnız mevcut `drawRoute(coords, preview)` API'sini çağırır.

## Otonom kararlar

- **(b) Fotoğraf:** JPEG data URL olarak kalır. `compressImageWithinLimit` ile istemcide sıkıştırılır; Firestore kuralı 180.000 karakteri aşanı reddeder. Nesne depolama veya ücretli plan yok.
- **(c) Senkron:** kaydedilen yerler/rotalar `users/{uid}` alt koleksiyonlarında tutulur. Kaydedilmiş rota dokümanı yalnız `routeId` referansıdır; silinen/yetkisiz rota için yetki kuralları korunur.
- **Gizlilik:** ham/sadeleştirilmiş iz yalnız sahibine açık; yeni rota `private`; `unlisted`/`public` yalnız editörün açık yayın eyleminde seçilir. İz dokümanı paylaşım rotasına otomatik çevrilip yayımlanmaz.
- **Silme:** özel iz tek eylemle silinir. Kendi rotası sahibi tarafından silinebilir; başkasının rotası kitaplıktan kaldırılınca yalnız kullanıcının referansı silinir. Kaydetme sayacı sadece ilgili UID'nin savedRoutes create/delete işlemiyle aynı atomik işlemde değişebilir.
- **Örnekleme/mesafe:** `watchPosition` callback'lerinin hiçbiri bilerek atılmaz; yalnız React önizleme state'i saniyede bir yayınlanır. Dwell kayıt anında değerlendirilir; sadeleştirilmiş rota mesafesi raporlanır. Ekranın açık tutulması ve pil kullanımı kullanıcıya bildirilir.
- Bölge alanı rotayı yayımlayan kişinin girdiği, filtrelenebilir metindir; konumdan sessizce/otomatik bir bölge çıkarılmaz.

## Kanıtlar ve açık durum

- Typecheck, lint, unit test, production build ve `audit:check` başarılı. Test: **26 dosya, 138 test geçti**.
- Üretim build'inde mevcut büyük JS chunk uyarısı var; build başarısız değil.
- Track geometri/dwell algoritmalarına 4 unit test eklendi. Gerçek cihazda 1 km yürüyüş, ±%15 mesafe ve GPS dwell doğrulaması yapılamadı; burada fiziksel cihaz/konum izni yok.
- İki gerçek hesap/cihaz arasında aynı rotanın açılması ve ikinci hesapta kaydedilmesi saha kanıtı alınamadı. Uygulama ve kurallar bunu destekleyecek şekilde yazıldı; gerçek hesaplarla doğrulanmadı.
- `firebase deploy --only firestore:rules` çalıştırıldı ama `firebase` CLI kurulu değil. Aynı deploy `npx --yes firebase-tools deploy --only firestore:rules` ile denendi; Firebase CLI kimlik doğrulaması yok (`Failed to authenticate, have you run firebase login?`). Dolayısıyla rules'in Firebase Console'da yayımlandığı **iddia edilmiyor**.
- Kurallar Emulator testi çalıştırılamadı: ortamda Java yok (script Java 21+ istiyor) ve sabit SHA'lı `cloud-firestore-emulator-v1.22.0.jar` dosyası mevcut değil. Ön kontrol: dosya yok, SHA pin doğrulanamadı; indirme başlatılmadı. Script Java kontrolünde durdu; rules testi yeşil sayılmıyor.
- `npm ci` çıktısında 1 düşük önem dereceli açık uyarısı var; repo `audit:check` üretim bağımlılıklarında bilinen açık bulmadı.
- `saveCount` güvenli atomik güncelleme ve public discovery uygulanmış olsa da Firestore Emulator doğrulaması bu ortam engeli nedeniyle eksik.

## MapView onayı gereken kısım

`MapView.tsx` değişmedi. İz canlı önizleme/son çizimi mevcut `drawRoute` public handle'ı üzerinden yapılıyor. Mevcut handle kapsamı dışında çizgi kaldırma veya yeni layer davranışı gerekirse MapView değişikliği ayrıca onay gerektirir; bu görevde eklenmedi.

## Kilitli dosyalar ve bağımsız inceleme

- `src/components/MapView.tsx` git diff'i boştur; yasaklı dosya değiştirilmedi.
- Başka bir ajanın kilitli dosyası listelenmedi; yalnız görev kapsamındaki route/track/data/rules/UI dosyaları düzenlendi.
- Ayrı bir bağımsız reviewer çalıştırılmadı. Kod ve testler görev ajanı tarafından öz-denetlendi; kurallar için emulator testi eksik.

## Tam komut çıktıları

Aşağıdaki bloklarda stdout ve stderr birleştirilmiş biçimde, komutların tam çıktısı ve exit code verilir. Rules deploy ve Emulator blokları özellikle başarısız/engelli sonuçları saklamaz.

### Kurulum

```text
$ npm ci

added 326 packages, and audited 327 packages in 7s

60 packages are looking for funding
  run `npm fund` for details

1 low severity vulnerability

To address all issues, run:
  npm audit fix

Run `npm audit` for details.

[exit code: 0]
```

### TypeScript

```text
$ npm run typecheck

> atlasia-web@0.1.0 typecheck
> tsc --noEmit


[exit code: 0]
```

### Lint

```text
$ npm run lint

> atlasia-web@0.1.0 lint
> eslint . --max-warnings=0


[exit code: 0]
```

### Unit ve sözleşme testleri

```text
$ npm run test:run

> atlasia-web@0.1.0 test:run
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.11 [39m[90m/home/user/Atlasia[39m

 [32m✓[39m src/hooks/useFirestoreAtlasData.likes.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m src/utils/mapLinks.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/lib/firestoreData.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/config/mapLabelCalibration.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/config/cloudflareHeaders.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/config/socialMetadata.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/utils/routePlanner.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/lib/passwordSecurity.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 39[2mms[22m[39m
 [32m✓[39m src/config/darkMapSource.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/content/legal.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/lib/contentIntegrity.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/utils/track.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/components/AccountAccess.security.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/config/dependencySecurity.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/utils/mapLinkStatus.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/lib/authErrorMessage.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/config/firestoreConfig.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/config/lazyLoading.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/config/githubActions.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/config/repositoryHygiene.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/components/LegalNotice.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/utils/geo.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/config/allowedHosts.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/utils/polyline.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/config/lintConfig.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/lib/feedMetrics.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m26 passed[39m[22m[90m (26)[39m
[2m      Tests [22m [1m[32m138 passed[39m[22m[90m (138)[39m
[2m   Start at [22m 22:51:09
[2m   Duration [22m 4.11s[2m (transform 437ms, setup 0ms, import 1.10s, tests 241ms, environment 2ms)[22m


[exit code: 0]
```

### Firestore Emulator kuralları

```text
$ npm run test:rules:emulator

> atlasia-web@0.1.0 test:rules:emulator
> node scripts/run-firestore-rules-tests.mjs

file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65
    throw new Error("Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.");
          ^

Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
    at requireJava21 (file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65:11)
    at file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:161:1
    at ModuleJob.run (node:internal/modules/esm/module_job:343:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:681:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)

Node.js v22.22.3

[exit code: 1]
```

### Production build

```text
$ npm run build

> atlasia-web@0.1.0 build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 2017 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                               3.50 kB │ gzip:   1.02 kB
dist/assets/maplibre-gl-worker-B8OLt8TZ.js  468.84 kB
dist/assets/map-vendor-JR8eJ17e.css          83.02 kB │ gzip:  10.52 kB
dist/assets/index-DSo7fAQk.css              113.98 kB │ gzip:  20.06 kB
dist/assets/icons-vendor-BftcPHZO.js         26.49 kB │ gzip:   9.12 kB
dist/assets/MapView-D0yQYy4V.js              34.97 kB │ gzip:   7.75 kB
dist/assets/firebase-auth-CoufcZyB.js       128.94 kB │ gzip:  36.60 kB
dist/assets/react-vendor-C9ZQbJ0Z.js        192.46 kB │ gzip:  60.33 kB
dist/assets/index-CqRePm8i.js               422.44 kB │ gzip: 141.70 kB
dist/assets/firebase-vendor-4E1RJtqJ.js     495.28 kB │ gzip: 148.49 kB
dist/assets/map-vendor-Dx4V7X3z.js          946.56 kB │ gzip: 248.69 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 8.35s

[exit code: 0]
```

### Üretim bağımlılık denetimi

```text
$ npm run audit:check

> atlasia-web@0.1.0 audit:check
> node scripts/audit-baseline.mjs

Üretim bağımlılıklarında bilinen açık bulunmadı.

[exit code: 0]
```

### Literal Firebase deploy komutu

```text
$ firebase deploy --only firestore:rules
/bin/bash: line 2: firebase: command not found

[exit code: 127]
```

### Npx üzerinden Firebase rules deploy denemesi

```text
$ npx --yes firebase-tools deploy --only firestore:rules

Error: Failed to authenticate, have you run firebase login?

[exit code: 1]
```

### Firestore Emulator/JAR ön kontrolü

```text
$ java -version 2>&1; jar="$HOME/.cache/atlasia/firebase-emulators/cloud-firestore-emulator-v1.22.0.jar"; if test -f "$jar"; then sha256sum "$jar"; else printf "JAR_MISSING %s\n" "$jar"; fi; cat .firebaserc
/bin/bash: line 1: java: command not found
JAR_MISSING /home/user/.cache/atlasia/firebase-emulators/cloud-firestore-emulator-v1.22.0.jar
{
  "projects": {
    "default": "atlasia-dev"
  }
}
```

### useGeolocation antipattern kontrolü

```text
$ if rg -n "useGeolocation" src/hooks/useTrackRecorder.ts src/components/TrackRecorderPanel.tsx src/utils/track.ts; then exit 1; else echo "No useGeolocation reference in track-recording implementation."; fi
No useGeolocation reference in track-recording implementation.
[exit code: 0]
```

### MapView kilit kontrolü

```text
$ git diff ab290183921a688bb6d8c6a64e2c28395f052ef3..HEAD -- src/components/MapView.tsx
[exit code: 0]
```

### Branch durumu ve dört adım commitleri

```text
$ git status --short --branch; git log -4 --oneline
## arena/9e4e5884-atlasia
e244c39 feat: rota kesif akisi ve kayitlar
5a6b666 feat: rotayi duzenle yayinla ve paylas
471f9f7 feat: yuruyus kaydi ve durak tespiti
72001ac feat: rota ve iz nesnelerini hesaba bagla
```

### Push

```text
$ git push origin arena/9e4e5884-atlasia
remote:
remote: Create a pull request for 'arena/9e4e5884-atlasia' on GitHub by visiting:
remote:      https://github.com/efezztxj/Atlasia/pull/new/arena/9e4e5884-atlasia
remote:
To https://github.com/efezztxj/Atlasia.git
 * [new branch]      arena/9e4e5884-atlasia -> arena/9e4e5884-atlasia
[exit code: 0]
```
