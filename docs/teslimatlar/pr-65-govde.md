## Durum: kapsam daraldı, çakışan iş main'de

Bu dal main ile birleştirildi (`cc8ce5e`). **İŞ 2 / 4 / 5 içeriği #70 ile main'e taşındı** (site turları, PWA güncelleme bildirimi, arayüz inceltmesi) — bu PR onları tekrar etmiyor. Aynı şekilde main'in sosyal katmanı (doğrulama kimliği, takip, önek arama, koleksiyon izolasyonu, `notificationProof`) başka PR'larla main'de; bu PR o dosyalarda değişiklik yapmıyor, **üstüne yalnız eksik parçaları ekliyor**.

## Ne ekliyor? (main'e göre 11 dosya)

| Değişiklik | Dosya | Kanıt |
|---|---|---|
| Yazarken arama: 350 ms debounce, son aramalar şeridi (son 5, "Temizle") | `src/components/FriendsTab.tsx` | elle arama yolu korunur; gecikme dolunca tek sorgu |
| Debounce kancası | `src/hooks/useDebouncedValue.ts` | 350 ms, zamanlayıcı iptali + sökümde temizlik — 5 test |
| Son aramalar: kişi başına, cihazda, Türkçe küçültmeyle tekilleştirme | `src/lib/searchHistory.ts` | 5 kayıt sınırı, bozuk JSON'a dayanıklı — 8 test |
| Hesap değişiminde koleksiyon izolasyonu testleri | `src/hooks/useCollections.isolation.test.ts` | 2 test: ikinci kullanıcı birincinin listesini görmez, onun anahtarına yazılmaz |
| Sosyal kural sözleşmesi (statik, Java gerekmez) | `src/config/socialRulesContract.test.ts` | 8 test: `allow … if true` = 2, doğrulama kimliği, sahip-güncelleme sınırı, takip şeması, takipçi yolu yok |
| Rozet önkoşulu: yer başına doğrulama sayısı | `src/lib/verifications.ts` → `countPlaceVerifications` | `count()` + `where(placeId)` + `limit(50)` (kural `boundedList(50)` istiyor) — 1 test |
| Adsız/"Gezgin" sınırı testi | `src/lib/userProfiles.test.ts` | tam "Gezgin" gizlenir, "Gezgin Can" kalır |

## main'de zaten çözülmüş olanlar (bu PR'da bırakıldı)

| İŞ 1 bulgusu | Bugünkü durum | Kanıt |
|---|---|---|
| `allow … if true` sayısı | #55 öncesi 4 → **2** (yalnız `places` get, `posts` get) | `socialRulesContract.test.ts` kilidi |
| Doğrulama kimliği | `{placeId}_{uid}` zorunlu; **güncelleme sahibine açık**, yer/sahip değişemez | `firestore.rules` + emülatör testleri |
| Takip modeli | `users/{uid}/following/{targetUid}` = `{followerUid, targetUid, createdAt}`; kendini takip yok, güncelleme kapalı, liste 100 | `tests/firestore.rules.test.ts` |
| Takipçi listesi | **Bilinçli olarak yok** (birinin kimi takip ettiği yalnız kendisine açık) — collection-group takipçi sayımı önerim düşürüldü, ilgili indeks geri alındı | kural + sözleşme testi |
| `notificationProof` | Var (tip başına ilişki kanıtı + `friendDeclineProof`) | `firestore.rules` |
| Önek arama / adsız gizleme | Var (`displayNameLower` aralığı + `rankProfiles`) | `userProfiles.ts`, 9 test |
| Koleksiyon izolasyonu | Var (`dataUid` damgası) | `useCollections.tsx` + bu PR'ın 2 testi |

## Varsayımlar
1. Son aramalar **cihazda** tutulur (Firestore'a yazılmaz): gizlilik + kota.
2. Debounce 350 ms; elle "Ara" düğmesi her zaman anında çalışır.
3. `countPlaceVerifications` kural gevşetmez: `list` izni zaten `signedIn()` + 50 sınırı; sorgu aynı sınırı taşır.
4. Takipçi sayımı bu PR'ın kapsamı dışında (main'in kararı korunuyor).

## Doğrulama (yerel, bu dal)
```
npm run typecheck   ✅ 0 hata
npm run lint        ✅ 0 uyarı (--max-warnings=0)
npx vitest run      ✅ 121 dosya / 896 test
npm run build       ✅ bundle bütçesi içinde
npm run test:scripts ✅
npm run audit:check  ✅ üretim bağımlılıklarında bilinen açık yok
```
Emülatör kural testleri bu ortamda koşmaz (Java 21 yok); CI'da koşar.

## Rules yayını gerekir mi?
**Bu PR için GEREKMEZ** — `firestore.rules` ve `firestore.indexes.json` main'e göre değişmiyor. Main'de biriken kural değişikliklerinin yayınlanıp yayınlanmadığı ayrı bir karar (Console → `firebase deploy --only firestore:rules`), kullanıcıda.
