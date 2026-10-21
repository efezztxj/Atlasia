# P3 — tazelik aboneliği ve doğrulama normalizasyonu

- Dal: `arena/422cfa59-atlasia`
- Taban: `origin/main` — `0ad774f Merge pull request #36 from efezztxj/arena/523be6c2-atlasia` (fetch sonrası `git log --oneline -3 origin/main`; depoda görünen log tek kayıttı).
- Kurtarma: `arena/9e4e5884-atlasia` ref'i `30809ff4e2a7b2c51e5aa8101c6429a985e35941` olarak bulundu ve fetch edildi. `git show --stat`/`git ls-tree` ile kontrol edildi; ref P2 teslimatı `30809ff docs: p2 teslimat kanitlarini ekle` ile bitiyor ve istenen P3 dosyalarını içermiyor. **Kurtarma yok.** Dosya içeriklerini `git show <ref>:<dosya>` ile elde edilemedi.

## Kapsam durumu

| Madde | Dosya / test | Durum |
|---|---|---|
| Kurtarma varlıklarını sınıflandırma | Eski P3 ref'i | Ref içeriğinde hedef P3 dosyaları bulunmadı; kurtarma yok. |
| P10 dönüş animasyonu / yaşam döngüsü | MapView / mapLifecycle | Bu teslimatta yapılmadı; main'de dönüş davranışının 15 FPS olduğu iddiası doğrulanmadı. |
| Pagination IO regresyonu | `firestoreData.pagination.io.test.ts` | Bu teslimatta eklenmedi. `firestoreData.ts` değiştirilmedi. |
| P14 dalı | PR envanteri | Açık PR listesinde P14 bulunmadı; main de güncel `origin/main`. |
| P15 offline saha paketi | Offline bileşen/tiles | Bu teslimatta yapılmadı. |
| ElevationProfile bağlantısı | MapView / SiteTourPanel | Bu teslimatta yapılmadı. |
| Yakınlık anlatımı histerezisi | nearbyGuide | Bu teslimatta yapılmadı. |
| Tazelik: uid yokken abonelik | `src/hooks/useFreshness.ts`, `useFreshness.test.ts` | Uid yokken snapshot aboneliği açılmaz; kimlik değişiminde eski dinleyici kapatılır. Test yeşil. |
| Bilinmeyen verification status | `src/lib/verifications.ts`, `verifications.io.test.ts` | Bilinmeyen değer `still_open` güvenli varsayılanına normalize edilir; bilinen status korunur. Test yeşil. |
| Harita etiket matrisi | `src/config/mapLabelVisibility.test.ts` | Main'de mevcut test street/topographic rasterlarının kendi etiketleriyle kalmasını, ek KKTC/OpenFreeMap etiket görünürlüğünü kilitliyor; yeni değişiklik gerekmedi. |

## Kararlar

- **KARAR:** `uid` yokken tazelik dinleyicisi açılmasın. | **GEREKÇE:** Girişsiz anonim Firestore okuması gereksiz kota tüketir ve özel kullanıcı bağlamının kapsamını belirsizleştirir. | **ALTERNATİF:** Herkese açık doğrulamaları uid'den bağımsız dinlemek; ancak Firestore kurallarıyla ürün amacı ve okuma maliyeti ayrıca doğrulanmalıdır. | **GERİ ALMA:** Hook efektindeki erken dönüşü kaldırıp regresyon beklentisini güncellemek.
- **KARAR:** Bilinmeyen/gelecekte eklenmiş status değerini `still_open` olarak normalize et. | **GEREKÇE:** Mevcut tüketiciler tipli status bekliyor; bozuk değer doğrudan etiket aramasında belirsiz UI üretmesin. | **ALTERNATİF:** Belgeyi tamamen reddedip yok saymak (telemetri/operasyonel kayıp riski). | **GERİ ALMA:** Normalize fonksiyonunu eski cast/default davranışına döndürüp testi kaldırmak.

## Kalite kapısı

| Komut | Sonuç |
|---|---|
| `npm ci` | geçti |
| `npm run typecheck` | geçti |
| `npm run lint` | geçti |
| `npm run test:run` | geçti — 75 dosya, 442 test |
| `npm run test:scripts` | geçti — 19 Node testi |
| `npm run build` | geçti; bundle bütçesi içinde. Mevcut büyük chunk uyarıları var. |
| `npm run audit:check` | geçti — üretim bağımlılıklarındaki bilinen açık yok |
| `npm run test:rules:emulator` | yerelde çalıştırılamadı: Java 21+ gerekli; bu ortamda Java koşulu sağlanmıyor |
| `node --check public/sw.js` | çalıştırılmadı; `public/sw.js` değişmedi |
| `git diff --check` | teslim öncesi çalıştırılacak |

## Regresyon kanıtı

Eski kodda (1) `useFreshness(undefined)` yine `subscribeRecentVerifications` çağırıyordu; (2) bilinmeyen status cast edilerek UI'ya geçiyordu. Yeni `useFreshness` testi uid yokken sıfır aboneliği doğrular; IO testi bilinmeyen status'un `still_open`'a düşmesini ve bilinen `closed` durumunun korunmasını doğrular.

## Açık noktalar / dosya talebi

Bu istek 11 geniş özelliği kapsıyor; bu commit yalnız tazelik regresyonlarını kapatıyor. Kalan kalemler uygulanmış sayılmamalıdır. Özellikle `src/lib/firestoreData.pagination.io.test.ts` P3 sahipliğinde test eklenerek tamamlanmalı; MapView/OfflinePackage/SiteTourPanel alanlarının kalan işleri yine P3'e aittir. Başka sahibin dosyasına değişiklik yapılmadı. P1'e ROADMAP/CHANGELOG önerisi: P10, P14 ve P15 maddelerini ayrı tamamlanma kanıtlarıyla açık tut; bu teslimat kapsam dışıdır.

- Gerçek cihazda uçak modu doğrulaması: yapılmadı; offline paket özelliği bu PR'da yok.
- Kullanıcının elle yapacakları: Rules emulator'ı Java 21+ ortamında/CI'da doğrulatmak; P15 tamamlandığında gerçek cihazda uçak modu checklist'ini uygulamak.
- PR / CI: henüz açılmadı; bu kayıt yazılırken değişiklikler doğrulanıyor.
