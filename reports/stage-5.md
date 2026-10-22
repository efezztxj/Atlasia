# Aşama 5 — Rules test dosyasındaki 5 tip hatası

Tarih: 2026-10-22 · Dal: `arena/8df7f158-atlasia` · Kod commit'i: `b6a05d1`

## Ne yapıldı

- `tests/firestore.rules.test.ts:47` — tek noktadan tip köprüsü:
  ```ts
  type RulesDb = ReturnType<ReturnType<RulesTestEnvironment["authenticatedContext"]>["firestore"]>;
  const asFirestore = (db: RulesDb) => db as unknown as Firestore;
  ```
- `tests/firestore.rules.test.ts:29` — `type Firestore` importu.
- 5 çağrı `asFirestore(...)` ile sarıldı:
  - `:308` `removePostInFirestore` (1)
  - `:327`–`:328` `togglePostLikeInFirestore` (2)
  - `:335`–`:336` `addReplyInFirestore` (2)

`as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable` **kullanılmadı**.

## Neden

`testEnv.authenticatedContext(...).firestore()` → `firebase.default.firestore.Firestore`
döndürüyor; `src/lib/firestoreData.ts` fonksiyonları `firebase/firestore`un
`Firestore` tipini bekliyor. `type`/`toJSON` eksik olduğu için atama reddediliyor.

### Önce (HAM, taban `4d32cf4`, geçici tsconfig ile)

```text
tests/firestore.rules.test.ts(299,33): error TS2345: Argument of type 'firebase.default.firestore.Firestore' is not assignable to parameter of type 'import(".../@firebase/firestore/dist/index").Firestore'.
  Type 'Firestore' is missing the following properties from type 'Firestore': type, toJSON
tests/firestore.rules.test.ts(318,33): error TS2345: ...
tests/firestore.rules.test.ts(319,33): error TS2345: ...
tests/firestore.rules.test.ts(326,27): error TS2345: ...
tests/firestore.rules.test.ts(327,27): error TS2345: ...
```

### Sonra (HAM)

```text
$ cat tsconfig.check.json
{ "extends": "./tsconfig.json", "include": ["src", "tests", "vite.config.ts", "vitest.rules.config.ts"] }
$ npx tsc --noEmit -p tsconfig.check.json
CHECK_TSC=0
$ rm -f tsconfig.check.json      # geçici dosya commit edilmedi
```

## Değişen dosyalar

```text
$ git diff --stat b6a05d1^ b6a05d1
 tests/firestore.rules.test.ts | 19 ++++++++++++++-----
 1 file changed, 14 insertions(+), 5 deletions(-)
```

## Kapılar

```text
$ npx tsc --noEmit                 → TSC=0
$ npx eslint . --max-warnings=0    → ESLINT=0
$ npx vitest run
 Test Files  105 passed (105)
      Tests  732 passed (732)
$ npm run build
 Bundle bütçesi içinde.
$ grep -rn "as any" src tests | wc -l
0
```

### CI (HAM)

```text
$ gh run view 39811029845   (push)
Atlasia CI: success
  ... Typecheck=success, Lint=success, Unit tests=success,
      Firestore security rules tests=success,
      Production build and bundle budget=success

$ gh run view 39811019966   (pull_request)
Atlasia CI: success  (aynı adım listesi)

$ gh run view 39811029804   (Windows, tr-TR)
Firestore rules tests on Windows (tr-TR): success
  ... Assert the JVM default locale is Turkish=success,
      Firestore security rules tests=success
```

## Kurallarda değişiklik

**Yok.** `firestore.rules` bu commit'te değişmedi; `allow ...: if true` sayısı 3
(places, posts, stories).

## Testler

| | Önce | Sonra |
|---|---|---|
| Rules `it(` | 52 | 52 |
| Vitest dosya | 105 | 105 |
| Vitest test | 732 | 732 |

Test gövdesi değişmedi; yalnız 5 çağrıya tip köprüsü eklendi. Hiçbir test
silinmedi/atlanmadı.

## Bilinen sınırlar

- `tsconfig.check.json` bilinçli olarak **commit edilmedi** (talimat gereği).
  Bu yüzden `npm run typecheck` hâlâ yalnız `src` + `vite.config.ts` denetler;
  tests dizininin tip denetimi tekrarlanabilir bir komut değil, geçici
  yapılandırma gerektiriyor.
- Köprü `db as unknown as Firestore`: iki kütüphane sürümü arasındaki compat
  farkını tek noktada kabul eder; çalışma zamanı davranışı değişmez.

## Patch

```text
$ sha256sum patches/main/main-patch14-rules-test-tipleri.patch
54c2c911626889397dfd2e538f78dbc66fa0c0eb8000a32bb0b164b8caeed10e
```

Kaynak: `git diff --binary --full-index b6a05d1^ b6a05d1`
