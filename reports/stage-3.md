# Aşama 3 — `verifications.note` gizliliği (Seçenek A: giriş şartı)

Tarih: 2026-10-22 · Dal: `arena/8df7f158-atlasia` · Kod commit'i: `a75f362`

## Karar

Kullanıcı "anonim yok" dedi → **A (giriş şartı)** olarak yorumlandı.
Uygulama zaten anonim hesabı desteklemiyor (`src/lib/auth.ts:34`
`!user || user.isAnonymous → false`), yani anonim okuyucu gerçek bir kullanıcı
kitlesi değil; yalnız kural yüzeyi açıktı.

## Ne yapıldı

- `firestore.rules:653` — `verifications`:
  - `allow get: if true` → `allow get: if signedIn()`
  - `allow list: if boundedList(50)` → `allow list: if signedIn() && boundedList(50)`
- `src/components/PlaceDetails.tsx:215` — oturum yoksa tazelik durumu yerine
  "Giriş yapınca tazelik bilgisi görünür." metni (`text-mint/70`,
  `data-testid="freshness-signin-hint"`).
- `src/components/PlaceDetails.tsx:224` — son doğrulama satırı ve doğrulama
  düğmeleri yalnız oturumluda render edilir (`user && ...`).
- `tests/firestore.rules.test.ts:815` — mevcut tazelik testi yeni beklentiye
  uyarlandı: anonim get/list **FAIL**, oturumlu get/list **SUCCEED**.
- `tests/firestore.rules.test.ts:828` — yeni vaka: anonim okuma reddi +
  oturumlu sınırlı okuma.

`useFreshness` zaten `uid` yokken abone olmuyordu (`src/hooks/useFreshness.ts:31`);
bu yüzden istemcide anonimken `permission-denied` denemesi oluşmuyor.

## Neden

`note` 280 karaktere kadar serbest metin taşıyor ve `allow get: if true` ile
anonim okunabiliyordu. Seçenek A, veri modelini değiştirmeden erişimi
daraltıyor ve geri alınabilir.

## Değişen dosyalar

```text
$ git diff --stat a75f362^ a75f362
 firestore.rules                 |  7 ++++---
 src/components/PlaceDetails.tsx | 16 +++++++++++-----
 tests/firestore.rules.test.ts   | 32 ++++++++++++++++++++++++++++----
 3 files changed, 43 insertions(+), 12 deletions(-)
```

## Kapılar

### `npm ci` / `tsc` / `eslint`

```text
$ npm ci
found 0 vulnerabilities
$ npx tsc --noEmit
TSC=0
$ npx eslint . --max-warnings=0
ESLINT=0
```

### `npx vitest run`

```text
 Test Files  104 passed (104)
      Tests  725 passed (725)
```

### `npm run build`

```text
assets/userProfiles-BpgJdsEc.js | lazyChunk | 2.802 B | 1.226 B | hayır
Bundle bütçesi içinde.
```

### `npm run test:rules:emulator` — yerelde KOŞMADI

```text
Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
    at requireJava21 (file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65:11)
```

### CI (HAM)

```text
$ gh run view 39809582859   (push)
Atlasia CI: success
  ... Firestore security rules tests=success, Production build and bundle budget=success

$ gh run view 39809591445   (pull_request)
Atlasia CI: success  (aynı adım listesi)

$ gh run view 39809591509   (Windows, tr-TR)
Firestore rules tests on Windows (tr-TR): success
  ... Assert the JVM default locale is Turkish=success,
      Firestore security rules tests=success
```

## Kurallarda değişiklik

| Yer | Eskiden | Şimdi |
|---|---|---|
| `verifications` get | `if true` | `if signedIn()` |
| `verifications` list | `if boundedList(50)` | `if signedIn() && boundedList(50)` |
| create / update / delete | değişmedi | değişmedi |

### Gevşeme olmadığının kanıtı

```text
$ grep -n "allow .*: if true" firestore.rules
482: allow get: if true;   (places)
501: allow get: if true;   (posts)
533: allow get: if true;   (stories)
```

**4 → 3.** `verifications` `true` kuralı kaldırıldı; yerine daha dar
`signedIn()` geldi. Başka hiçbir `allow` genişletilmedi, yeni `true` eklenmedi.
`git diff a75f362^..a75f362 -- firestore.rules` yalnız bu iki satırı ve yorumu
değiştiriyor.

## Testler

| | Önce | Sonra |
|---|---|---|
| Rules `it(` | 51 | **52** |
| Vitest dosya | 104 | 104 |
| Vitest test | 725 | 725 |

**Beklenti değişikliği (gerekçeli):** `tazelik doğrulamasını yalnız kendi adına
yazar, herkes sınırlı sayfada okur` → `...; okuma giriş şartına bağlıdır`.
Anonim `getDoc`/`limit(50)` beklentileri `assertFails`'e çevrildi, oturumlu
`otherDb` ile `getDoc`/`limit(50)` `assertSucceeds` olarak eklendi. Test
zayıflatılmadı; kural bilinçli olarak sıkılaştığı için beklenti kanıta uyarlandı.

Yeni vaka: `anonim tazelik okuması reddedilir; giriş yapınca get ve sınırlı list açılır`.

## Bilinen sınırlar

- Anonim ziyaretçi artık tazelik bilgisini göremez (ürün kararı: A).
- `note` hâlâ `verifications` belgesinde; seçenek B (ayrı koleksiyon) uygulanmadı.
- Eski istemci sürümleri anonimken `verifications` okumaya çalışırsa
  `permission-denied` alır; `useFreshness` uid olmadan abone olmadığı için
  mevcut sürümde bu yol yok. Dağıtım sırası `reports/stage-6` provasında ele alınır.
- `docs/denetim/gorunurluk-matrisi.md` gibi belgeler bu değişikliği henüz
  yansıtmıyor (kapsam dışı; yalnız kod/kural).

## Patch

```text
$ sha256sum patches/main/main-patch12-verifications-gizlilik.patch
04da60bb0767003815fee5d0f473f0639d26b8d7cecc7b8353b19f801921ae06
```

Kaynak: `git diff --binary --full-index a75f362^ a75f362`
