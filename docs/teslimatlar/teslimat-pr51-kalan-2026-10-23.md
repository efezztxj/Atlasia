# Teslimat — #51'in kalan parçaları (2026-10-23)

## Amaç

#51 (`arena/7c4edeb5-atlasia`, taban `84d2425` = PR #54) `main`'e göre
`CONFLICTING` durumdaydı. Bu not, #51'in hangi parçalarının `main`'de zaten
bulunduğunu ve hangilerinin bu teslimatta alındığını kaydeder.

## Zaten `main`'de olanlar (yeniden alınmadı)

| #51 parçası | `main`'deki durum | Kanıt |
| --- | --- | --- |
| `firestore.rules` sertleştirmeleri (5 kök neden) | **Tamamı var** | `storyLive` (24s), `memberUids.hasOnly([uid])` (rızasız üye yok), `updatedAt == request.time`, silinmiş grup için `exists()` guard'ı, grup indeksinde gerçek üyelik + rol kanıtı. Yorumlarda "PR #51 kusur #N" atfı duruyor |
| `src/lib/mapResume.ts` + `mapResume.test.ts` | Var, üstelik daha yeni imza | `MapView.tsx:655` → `attachMapResume({ map })` |
| `kktc-label` font düzeltmesi (`Open Sans Semibold` → `Noto Sans Regular`) | Var | `grep` → `Open Sans Semibold` eşleşmesi yok |
| Emülatör testleri (`kusur #1`, `#3`, `#5`) | **Var** | `tests/firestore.rules.test.ts:1916,1929,1941` |
| `src/config/firestoreRulesStructure.test.ts` | `main`'de daha yeni sürüm (12 kilit) | #51'in 22 testlik sürümü bu 12 testin **hiçbirini** içermiyor (`comm -23` ile doğrulandı) → alınırsa regresyon kilidi silinirdi |

## Bu teslimatta alınanlar

1. **`src/config/firestoreLimits.test.ts`** (15 test, 562 satır) — istemci
   `limit()` değerleri ile kural `boundedList(n)` sınırlarını Java/emülatör
   gerektirmeden karşılaştıran statik bekçi. `main`'in kurallarına karşı
   çalıştırıldı: **15/15 geçti**.
2. **CI annotation adımı** (`.github/workflows/ci.yml`) — kural testi
   başarısız olduğunda emülatör logunu check-run annotation'larına ve iş
   özetine taşır; hata API üzerinden okunabilir olur. `rules-emulator.log`
   `.gitignore`'a eklendi.

## Alınmayanlar (gerekçeli)

| Parça | Gerekçe |
| --- | --- |
| `firestore.rules` farkı | #51'in tabanı eski; dosyayı olduğu gibi almak `validFollow`'u ve `validUserProfileCreate/Update` ayrımını **silerdi** (geri). `main` zaten #51'in sertleştirmelerini içeriyor |
| `firebase.ts` `appId` düzeltmesi (`…fd0d8d09…`) | #51 "konsoldaki değerle birebir olmalı" diyor ancak bu ortamda Firebase Console'a erişim yok; **doğrulanamadı**. Yanlış appId App Check/Installations kimliğini bozar → ayrı doğrulama gerektirir |
| `firestoreRulesStructure.test.ts` (22 test) | `main`'in 12 regresyon kilidini siler (yukarıdaki kanıt) |
| `hata-avcisi-f12-rehberi.md`, `teslimat-p5-hata-duzeltme.md` | Eski tabanın durumunu anlatıyor; güncel gerçeği yansıtmıyor |

## Kapılar (bu dalda)

| Kapı | Sonuç |
| --- | --- |
| `npx tsc --noEmit` | 0 hata |
| `npx eslint . --max-warnings=0` | 0 hata / 0 uyarı |
| `npx vitest run` | **118 dosya / 898 test geçti** (önceki 883 + 15) |
| `npm run build` | bütçe içinde — entry 171.071 B; SW kabuğu 25/25 |
| `.github/workflows/ci.yml` | YAML ayrıştırıldı (`yaml.parse`) |

## Dokunulmayanlar

- `firestore.rules`: **değişmedi** (yalnız test eklendi).
- **Deploy yapılmadı.**
- `firebase.ts` appId: doğrulanmadığı için değiştirilmedi.
