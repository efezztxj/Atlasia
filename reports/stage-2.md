# Aşama 2 — `displayNameLower` (arama tavanını kaldırma)

Tarih: 2026-10-22 · Dal: `arena/8df7f158-atlasia` · Kod commit'i: `63a8037`

## Ne yapıldı

- `src/lib/userProfiles.ts:34` — `UserProfile.displayNameLower` eklendi.
- `src/lib/userProfiles.ts:59` — `normalizeUserProfile` alan yoksa
  `displayName.toLocaleLowerCase("tr")` ile türetir (okuma geçişi).
- `src/lib/userProfiles.ts:96` — `syncUserProfile` payload'ına
  `displayNameLower = displayName.toLocaleLowerCase("tr")` eklendi.
- `src/lib/userProfiles.ts:107` — alan yoksa belge **bir kez** silinip yeniden
  yazılır (yazma geçişi); aksi hâlde eski belge kural dışı kalırdı.
- `src/lib/userProfiles.ts:126` — `profilePrefixes` tek, küçük harfli önek
  döndürür; patch 7'deki "ilk harfi Türkçe büyüt" hack'i kaldırıldı.
- `src/lib/userProfiles.ts:133` — `searchUserProfiles` tek aralık sorgusu
  (`orderBy/where displayNameLower`, `prefix .. prefix+\uf8ff`).
- `src/lib/userProfiles.ts:152` — `subscribeUserProfiles` aynı alan/aralık.
- `firestore.rules:413` — `validUserProfile`: `displayNameLower` zorunlu,
  2–40 karakter, `[a-z0-9 ığüşöçâîû-]+` biçimi. **Sunucuda `lower()` yok.**
- `src/components/FriendsTab.tsx:53` — zorunlu alan için iki fallback güncellendi
  (`FriendsPanel.tsx` bu depoda yok; arama yüzeyi `FriendsTab`).

## Neden

Eski arama `displayName` üzerinde iki ayrı önek sorgusu açıyordu (küçük yazım +
Türkçe büyük harf). Bu, harf duyarlılığını kapatmak için kırılgan bir hack'ti ve
aynı harfle başlayan 20+ profilde sonuç kümesi iki sorguya bölünüyordu.
Normalize alan tek aralık sorgusu sağlar; Türkçe İ/I davranışı istemci
`toLocaleLowerCase("tr")` ile tek yerde tanımlanır.

## Emülatör kanıtı — Türkçe İ varyantları

Yerelde emülatör koşamıyor (Java 21 yok, JAR adresi erişilemez). Ayrıca
**kod öncesi ölçüm anlamsız olurdu**: eski `validUserProfile` `hasOnly` listesi
`displayNameLower`'a izin vermediği için iki varyant da reddedilirdi.

Bu yüzden ayırt edici ölçüm, yeni kuralın kalıcı testi olarak CI'da koşuyor
(`tests/firestore.rules.test.ts:1599`):

| `displayName` | `displayNameLower` | Beklenen | Gerekçe |
|---|---|---|---|
| `İrem` | `irem` | **SUCCEED** | `"İrem".toLocaleLowerCase("tr") === "irem"` — istemcinin ürettiği değer |
| `İrem` | `İrem` | **FAIL** | Büyük harf biçim denetimine takılır (kural lower() yapmaz) |
| `İrem` | `i̇rem` (i + U+0307) | **FAIL** | Dilsiz `toLowerCase` çıktısı; birleşik nokta sınıfta yok |

CI adımı `Firestore security rules tests` **success** → üç beklenti de emülatörde
doğrulandı. Kazanan varyant `irem`; istemci de bunu üretiyor.

## Değişen dosyalar

```text
$ git diff --stat 6c51064 63a8037
 firestore.rules                 |  8 +++--
 src/components/FriendsTab.tsx   |  4 +--
 src/lib/userProfiles.io.test.ts | 71 +++++++++++++++++++++++++++------------
 src/lib/userProfiles.test.ts    | 20 ++++++++++--
 src/lib/userProfiles.ts         | 58 +++++++++++++++++++++-----------
 tests/firestore.rules.test.ts   | 56 ++++++++++++++++++++++++++++++++
 6 files changed, 166 insertions(+), 51 deletions(-)
```

## Kapılar

### `npm ci`

```text
found 0 vulnerabilities
```

### `npx tsc --noEmit`

```text
TSC=0
```

### `npx eslint . --max-warnings=0`

```text
ESLINT=0
```

### `npx vitest run`

```text
 Test Files  104 passed (104)
      Tests  725 passed (725)
```

### `npm run build`

```text
assets/userProfiles-BIPcV60h.js | lazyChunk | 2.802 B | 1.225 B | hayır
Bundle bütçesi içinde.
```

### `npm run test:rules:emulator` — yerelde KOŞMADI

```text
Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
    at requireJava21 (file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65:11)
```

### CI (HAM)

```text
$ gh run view 39808938389   (push)
Atlasia CI: success
  ... Typecheck=success, Lint=success, Unit tests=success,
      Firestore security rules tests=success,
      Production build and bundle budget=success

$ gh run view 39808949320   (pull_request)
Atlasia CI: success  (aynı adım listesi)

$ gh run view 39808949303   (Windows, tr-TR)
Firestore rules tests on Windows (tr-TR): success
  ... Assert the JVM default locale is Turkish=success,
      Firestore security rules tests=success
```

## Kurallarda değişiklik

| Eskiden | Şimdi |
|---|---|
| `hasAll(['uid','displayName','createdAt','updatedAt'])` | `... 'displayNameLower' ...` |
| `hasOnly([... 'photoURL' ...])` | `hasOnly([... 'displayNameLower', 'photoURL' ...])` |
| — | `stringBetween(data.displayNameLower, 2, 40)` |
| — | `data.displayNameLower.matches('[a-z0-9 ığüşöçâîû-]+')` |

### Gevşeme olmadığının kanıtı

- Yalnız `validUserProfile` **daha katı** hâle geldi; hiçbir `allow` satırı
  değişmedi, hiçbir alan `hasOnly`'den çıkarılmadı.
- `allow ...: if true` sayısı **4** (places/posts/stories/verifications) —
  Aşama 1 ile aynı.
- `git diff 6c51064 63a8037 -- firestore.rules` yalnız ekleme içeriyor.

## Testler

| | Önce | Sonra |
|---|---|---|
| Rules `it(` | 49 | **51** |
| Vitest dosya | 104 | 104 |
| Vitest test | 721 | **725** |

Eklenen rules vakaları:

- `displayNameLower zorunlu; biçim denetimi Türkçe İ'yi istemcinin ürettiği gibi kabul eder`
- `geçiş: displayNameLower'sız eski belge okunur, güncellenemez, yeniden yazılır`

Değişen rules vakası: `C4 userProfiles ...` — geçerli payload'a `displayNameLower`
eklendi (alan artık zorunlu); fazladan-alan ve başkası-adına yazma vakaları
kendi nedenleriyle FAIL vermeye devam etsin diye diğer payload'lara da alan
eklendi.

Unit testler: `userProfiles.io.test.ts` 6 → 8, `userProfiles.test.ts` 4 → 6
(+4 test; geçiş, tek sorgu, `İrem → irem`).

## Bilinen sınırlar

- **20 sonuç tavanı korunuyor.** Kural `userProfiles` listesini
  `boundedList(20)` ile sınırlıyor; tavanı yükseltmek kuralı gevşetmek olurdu.
  Bu aşama harf duyarlılığı kaynaklı kaçırmayı kaldırdı, sayfa tavanını değil.
  Daha fazlası sayfalama (ek okuma kotası) gerektirir; kapsam dışı.
- Biçim regex'i yalnız `[a-z0-9 ığüşöçâîû-]` kabul eder: nokta, kesme işareti,
  emoji veya `é/ß` içeren görünen adlar `displayNameLower` üretirken kurala
  takılır ve profil dizini yazılamaz. Ürün kararı gerektirir (adet: mevcut
  `validateDisplayName` yalnız uzunluk denetliyor).
- Geçiş yalnız kullanıcı bir sonraki oturumda `syncUserProfile` çağırdığında
  tamamlanır; eski belgeler o zamana kadar `hasAll` nedeniyle güncellenemez
  (zaten update kuralı kapalı) ama okunabilir.

## Patch

```text
$ sha256sum patches/main/main-patch11-displaynamelower.patch
15c3b9826b51afb0d2b7ed3028a14ce792691722bb0d26f6a410cf40d1e24870
```

Kaynak: `git diff --binary --full-index 6c51064 63a8037`
