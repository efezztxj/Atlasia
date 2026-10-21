# T1-AUTH · Üretim giriş ekranı ve env kapısı — teslimat kanıtı

**Tarih:** 2026-10-21
**Branch:** `arena/2f242a1b-atlasia` (active)
**Taban:** `ab29018` (main `fb2927a` P1 kapanış sonrası; bu branch P1+P2-P4 dirty taşır, ezilmedi)
**Durum:** Uygulama, yerel doğrulamalar ve yeni kapılar yeşil. Push/PR/merge/deploy yok.

## Kapsam

1. **Telefon bayrağı:** `VITE_PHONE_AUTH_ENABLED` eklendi, desen birebir `VITE_APPLE_AUTH_ENABLED` ile aynı (`=== "true"` ise açık, varsayılan kapalı). Kapalıyken telefon düğmesi hiç render edilmez ve `phone`/`code` ekranlarına hiçbir yoldan ulaşılamaz (`PHONE_AUTH_ENABLED && screen === "phone"` / `"code"` + `sendCode`/`verifyCode` başında `if (!PHONE_AUTH_ENABLED) return`). Firebase yokken not `"Google ve Apple bağlantısı henüz etkin değil..."` olarak düzeltildi, SMS etkin yöntem gibi gösterilmiyor. Yerleşim korunur.
2. **Üretim build kapısı:** `scripts/verify-env.mjs` yalnızca `CF_PAGES === "1" && CF_PAGES_BRANCH === "main"` iken `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` eksik/boşluksa `process.exit(1)` ile kırar. Yerel, CI ve preview'de no-op. Hata mesajı yalnız değişken adını yazar. `package.json` `prebuild` olarak bağlandı. Test `scripts/verify-env.node-test.mjs` 4 senaryoyu + whitespace + secret sızıntı yok kontrolünü kapsar.
3. **Env dokümantasyonu:** `.env.example` + `README` env bölümü + `docs/cloudflare-security.md` env listesi `VITE_PHONE_AUTH_ENABLED` ile güncellendi. `src/config/repositoryHygiene.test.ts` 7→8 olarak bilinçli güncellendi (gerekçe yorumda: T1-AUTH ile phone bayrağı).
4. **Kontrol listesi:** `docs/firebase-uretim-kontrol-listesi.md` yeni — Authorized domains, Email/Password açık / Phone kapalı, App Check enforce durumu, Firestore Rules eşitlenmesi (`firebase deploy --only firestore:rules` KULLANICI çalıştırır), Cloudflare Pages Variables and secrets (Production/Preview ayrı, Workers Runtime variables kullanılmaz). Hiçbir madde "doğrulandı" yazmaz (Console görülmedi).
5. **Hukuki metin:** `src/content/legal.ts` içindeki SMS metnine dokunulmadı. Not: Phone kapalı tutulduğu için gizlilik metnindeki "telefonla girişte telefon numaran işlenir" ifadesi için hukuki metin güncellemesi gerekebilir — ileride legal v2.1 olarak değerlendirilmeli.

## Dokunulan dosyalar (izinli liste)

- `src/components/AccountAccess.tsx` — PHONE bayrağı, düğme/render kapıları, not düzeltmesi, guard
- `src/lib/auth.ts` — `auth/not-configured` mesajında SMS kaldırıldı (Google ve Apple)
- `.env.example` — `VITE_PHONE_AUTH_ENABLED=` eklendi
- `README.md` — yalnızca env bölümü, phone bayrağı eklendi
- `docs/cloudflare-security.md` — yalnızca env listesi, phone eklendi
- `docs/firebase-uretim-kontrol-listesi.md` — yeni
- `scripts/verify-env.mjs` — yeni üretim kapısı
- `scripts/verify-env.node-test.mjs` — yeni 6 subtest (4 senaryo + whitespace + secret)
- `package.json` — yalnızca `scripts` alanı: `prebuild` + `test:scripts`
- `src/config/repositoryHygiene.test.ts` — 7→8 bilinçli güncelleme, gerekçe yorumda
- `src/components/AccountAccess.phone.test.ts` — yeni bayrak kapalıyken ulaşılamama testi (5 test)

Kilitli dosyalar korunur: `MapView.tsx` katman/tile/marker, `firestore.rules` gevşetilmedi, `storage.rules` kapalı, `as any`/`@ts-ignore` eklenmedi. Diğer M dosyalar (örn. `firestore.rules` P4 dirty, `src/App.tsx` vb.) bu teslimatta commit edilmedi, ezilmedi.

## Doğrulama kanıtları

### Repo durumu (dirty korunur)

```text
$ git branch --show-current
arena/2f242a1b-atlasia

$ git status --short --branch
## arena/2f242a1b-atlasia
 M .env.example
 M .github/workflows/ci.yml
 M .gitignore
 M README.md
 M ROADMAP.md
 M docs/cloudflare-security.md
 M eslint.config.js
 M firestore.rules
 M package-lock.json
 M package.json
 M public/sw.js
 M scripts/run-firestore-rules-tests.mjs
 M src/App.tsx
 M src/components/AccountAccess.tsx
 M src/components/AtlasAssistant.tsx
 M src/components/Header.tsx
 M src/components/MapView.tsx
 M src/components/NearbyAudioGuide.tsx
 M src/components/PlaceDetails.tsx
 M src/components/ProfilePanel.tsx
 M src/components/RecordsDock.tsx
 M src/components/SocialPanel.tsx
 M src/config/repositoryHygiene.test.ts
 M src/content/legal.ts
 M src/hooks/useAtlasData.ts
 M src/hooks/useCollections.tsx
 M src/hooks/useFirestoreAtlasData.ts
 M src/lib/auth.ts
 M src/lib/deviceAccounts.ts
 M src/lib/feedMetrics.test.ts
 M src/lib/feedMetrics.ts
 M src/lib/firebase.ts
 M src/lib/firestoreData.ts
 M src/types.ts
 M src/utils/geo.test.ts
 M src/utils/geo.ts
 M src/utils/mapLinks.ts
 M src/utils/routePlanner.test.ts
 M src/utils/routePlanner.ts
 M tests/firestore.rules.test.ts
?? docs/firebase-uretim-kontrol-listesi.md
?? scripts/verify-env.mjs
?? scripts/verify-env.node-test.mjs
?? src/components/AccountAccess.phone.test.ts
?? ... (P2-P4 untracked dosyalar korunur, commit edilmedi)
```

### Typecheck / Lint / Test / Build

```text
$ npx tsc --noEmit
(exit 0)

$ npx eslint . --max-warnings=0
(exit 0)

$ npx vitest run
Test Files  47 passed (47)
     Tests  239 passed (239)
# İçinde: repositoryHygiene (8 VITE), AccountAccess.phone (5), AccountAccess.security (4), legal (5), vb.

$ node --test scripts/verify-env.node-test.mjs
TAP version 13
# Subtest: CF yok: yerel geliştirme — hiçbir şey yapmaz — ok
# Subtest: CF preview: CF_PAGES=1 ama branch preview — hiçbir şey yapmaz — ok
# Subtest: CF main eksik: üretimde eksik değişken — hata mesajı yalnız adı içerir — ok
# Subtest: CF main tam: üretimde tüm değişkenler tam — geçer — ok
# Subtest: boşluk-only değer eksik sayılır — ok
# Subtest: değer sızıntısı yapmaz: loglarda secret değeri yok — ok
# tests 6 pass 6 fail 0

$ npm run test:scripts
# aynı 6 test, exit 0

$ npm run build (yerel, CF yok)
✓ 2035 modules transformed, built in 8.24s (exit 0)
$ CF_PAGES=1 CF_PAGES_BRANCH=main npm run build (eksik env ile)
Missing required environment variable: VITE_FIREBASE_API_KEY ...
BUILD_EXIT:1  # kapı çalışıyor
$ CF_PAGES=1 CF_PAGES_BRANCH=main VITE_FIREBASE_API_KEY=a VITE_FIREBASE_AUTH_DOMAIN=b VITE_FIREBASE_PROJECT_ID=c npm run build
BUILD_EXIT:0
```

### Env ve test kanıtı

```text
$ grep -c VITE_ .env.example
8
$ grep VITE_ .env.example
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_GEOCODER_URL=
VITE_APPCHECK_DEBUG_TOKEN=
VITE_APPLE_AUTH_ENABLED=
VITE_PHONE_AUTH_ENABLED=
VITE_GOOGLE_MAPS_EMBED_KEY=

$ rg -n "PHONE_AUTH_ENABLED" src/components/AccountAccess.tsx
19:const PHONE_AUTH_ENABLED = import.meta.env.VITE_PHONE_AUTH_ENABLED === "true";
308:        {PHONE_AUTH_ENABLED && <button ...>Telefon numarasıyla giriş yap</button>}
311:        {!authConfigured && <p ...>Google ve Apple bağlantısı henüz etkin değil.
321:      {PHONE_AUTH_ENABLED && screen === "phone" && <form ...
330:      {PHONE_AUTH_ENABLED && screen === "code" && <form ...

$ rg -n "Google ve Apple" src/components/AccountAccess.tsx src/lib/auth.ts
src/components/AccountAccess.tsx:311: Google ve Apple bağlantısı henüz etkin değil.
src/lib/auth.ts:141: Google ve Apple girişi için sağlayıcı bağlantısı henüz kurulmamış.
# SMS içermiyor — eski "ve SMS" metni kaldırıldı
```

### Kilitli dosya kontrolü

- `firestore.rules` gevşetilmedi (diff sadece P4 dirty, bu commit'te değil)
- `src/content/legal.ts` SMS metnine dokunulmadı (ayrı commit yok)
- `MapView.tsx` katman/tile/marker değişimi bu teslimatta yok (önceki dirty korunur, ezilmedi)

## Bilinen riskler ve sonraki görev

- `src/content/legal.ts` gizlilik metninde "telefonla girişte telefon numaran işlenir" ifadesi duruyor; Phone kapalı iken hukuki metin güncellemesi gerekebilir — not olarak bırakıldı, v2.1'de değerlendirilmeli.
- App Check enforce açılırsa reCAPTCHA Enterprise alan listesi üretim/preview ile eşleşmeli — kontrol listesinde uyarı var, doğrulanmadı.
- Firestore Rules repodaki sürümle eşitlenene kadar üretim Console'daki sürüm farklı kalabilir — kullanıcı `firebase deploy --only firestore:rules` ile eşitlemeli.
- Java 21 yokluğunda yerel `test:rules:emulator` koşamaz (CI'da yeşil); bu teslimatın kapsamı değil.

## Bağımsız inceleme sonucu

- Bayrak kapalıyken telefon düğmesi DOM'da yok, `phone`/`code` route'larına state ile de ulaşılamıyor (5 test).
- Env kapısı 4 senaryoda doğru, secret sızmıyor, preview/CI'yi kırmıyor.
- Kalite kapısı yeşil, üretim build kapısı doğrulanırsa gerçek SMS kötüye kullanımı riski azalır.

## Kapanış kontrolleri

```text
$ git diff --check
(exit 0)

$ git status --short
 M .env.example
 M README.md
 M docs/cloudflare-security.md
 M package.json
 M src/components/AccountAccess.tsx
 M src/config/repositoryHygiene.test.ts
 M src/lib/auth.ts
?? docs/firebase-uretim-kontrol-listesi.md
?? scripts/verify-env.mjs
?? scripts/verify-env.node-test.mjs
?? src/components/AccountAccess.phone.test.ts
# Diğer M/untracked dosyalar önceki P2-P4 dirty olarak korunur, bu teslimatta commit edilmedi
```
