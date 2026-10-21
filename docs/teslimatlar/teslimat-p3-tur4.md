# P3 Tur 4 — sayfalama IO + hava katmanı + P10 + P14

## Taban / kurtarma

- Çalışma dalı: `arena/422cfa59-atlasia`; ana PR tabanı #38'in dalıdır ve #38 açık bırakılacaktır.
- Fetch edilen ilk `origin/main` güncel çıktı: `b6922d1 Merge pull request #39 from efezztxj/arena/638febfd-atlasia` (öncüller `7350881`, `0ad774f`). Bu sığ checkout `git merge origin/main` sırasında `unrelated histories` hatası verdi. `git fetch --unshallow origin` ile ortak geçmiş alındı; ardından `git merge --no-edit origin/main` başarılı oldu (`ROADMAP.md`, `docs/gorevler/p-serisi-uzun-vadeli.md` güncellemeleri).
- Eski P3 dosyaları için `git log --all --oneline -- <dosya>` kontrolü: istenen 9 dosyanın hiçbirinde commit bulunmadı; `git branch -a` uzak P3 kurtarma dalı göstermedi. **Kayıp dosya bulunamadı, kurtarıldı diye sunulmadı.**

## Görev durumu

| Görev | Dosyalar / test | Durum |
|---|---|---|
| Pagination IO / UZUN-07 | `src/lib/firestoreData.pagination.io.test.ts` | 4 sahte-Firestore IO testi: 51'lik cursor sınırı ve eşit timestamp/document id; gerçek silme ardından sayfa kaymasının ayrımı; bekleyen eski tail sorgusunun yeni ilk snapshot ile geçersizleşmesi. `firestoreData.ts` değişmedi. |
| Hava katmanı | `src/utils/weatherLayer.ts`, `.test.ts`; `src/components/MapControls.tsx`, `MapView.tsx` | Hava aç/kapa düğmesi; görünür bbox için 3×3 Open-Meteo istek ızgarası; aynı istek birleştirme, 10 dakika cache, 450 ms hareket debounce; istek hatasında “Hava verisi yok” işaretçisi ve düğmenin otomatik kapanması. Anahtar/ücretli servis yok. CSP'de api.open-meteo.com zaten izinli; allowlist/sw değişmedi. |
| P10 spin | `src/utils/mapLifecycle.ts`, `.test.ts`; `MapView.tsx` | Idle dönüş en fazla 15 FPS; kullanıcı etkileşimi, gizli sekme, hareket, zoom tavanı ve `prefers-reduced-motion` durumlarında dönüş yok. Testte frame aralığı ölçüldü; **gerçek cihaz performans ölçümü yapılmadı**. |
| Yakınlık rehberi | `src/utils/tourGuide.ts`, `.test.ts` | 40 m giriş / 60 m çıkış histerezisi, >25 m doğruluk değerinde tetiklememe, sıradaki durağa öncelik. 20 m aralıklı iki anıt fixture testi eklendi. |
| P14 aday içerik çekici | `scripts/content/harvest.mjs`, `.node-test.mjs`, `.live.test.mjs` | Bbox'ten Overpass + Wikidata SPARQL ve (varsa, en çok 20) Wikipedia özeti çekerek `unverified` JSON üretir. Kaynak/lisans/atıf/tarih var; `history` ile `userNote` ayrı; ürüne otomatik yazım yok. Fixture testleri sahte yanıt kullanır; live testi varsayılan skip. Pilot bölge veya içerik dataset'i üretilmedi. |
| P15 lisans notu | `docs/denetim/p15-lisans.md` | Esri/CARTO/font/OpenFreeMap/DEM kullanım, kota ve atıf açıklamaları; resmi kaynak bağlantıları. Doğrulanmayan Esri public tile export hakkı ve AWS DEM koşulları açıkça “doğrulanmadı”. |

## Varsayılan kararlar

- **Varsayılan karar:** Hava servisi başarısızsa katman otomatik kapanır ve “Hava verisi yok” gösterir. / **gerekçe:** Haritadaki stale/yanlış tahmini canlı veri gibi göstermemek.
- **Varsayılan karar:** GPS doğruluğu 25 m'den kötüyse yakınlık anıtı tetiklenmez; giriş 40 m, çıkış 60 m. / **gerekçe:** 20–40 m aralıktaki yanlış anıt tetiklerini ve GPS jitter'ını azaltmak.
- **Varsayılan karar:** Eşit zaman damgalarında Firestore document ID ikincil cursor sıralama anahtarı olarak kalır. / **gerekçe:** Sınırda kayıt atlama/tekrarını önlemek; üretim kodu bu turda testle kapsandı, değiştirilmedi.
- **Varsayılan karar:** İçerik yalnız doğrulanmamış aday JSON'dur; Wikipedia metni varsa CC BY-SA 4.0 atfı eklenir, kullanıcı notu alanı ayrı tutulur. / **gerekçe:** Otomatik yayın ve lisanssız içerik birleşmesini önlemek.
- **Varsayılan karar:** Esri/CARTO offline'a dahil edilmez; AWS DEM için offline izin doğrulanmadı. / **gerekçe:** İzin ve item-level şartları kanıtlanmadan bulk download yapmamak.
- **Varsayılan karar:** PR #38 açık tutulur; yeni Tur 4 kapsamı aynı `arena/422cfa59-atlasia` branch/PR üzerinde genişletilir. / **gerekçe:** Branch sahipliği sabit; aynı head branch'ten ikinci eşzamanlı PR açılamaz. Başlık istenen Tur 4 formatına güncellenecek, #38 kapatılmayacak.

## Commitler

| Commit | İçerik |
|---|---|
| `edd5738` | Önceki turdaki tazelik değişikliklerini çalışma ağacından koruma commit'i |
| `3504604` | PR #38 work korunarak uzak PR dalının alınması |
| `09fea5f` | `b6922d1` güncel ana dal güncellemelerinin merge'i |
| `72d40d6` | Pagination IO, hava overlay, P10 spin, yakınlık eşikleri ve testler |
| `54dcbd9` | P14 aday içerik hattı, sahte/live testler, P15 lisans notu |

## Kapılar / kanıt

- `npm ci`: geçti, 374 paket kuruldu. npm audit raporunda toplam 3 bulgu (1 low, 2 moderate) var; production baseline kontrolü ayrı geçti.
- `npm run typecheck`: geçti (`tsc --noEmit`, exit 0).
- `npm run lint`: geçti (`eslint . --max-warnings=0`, exit 0).
- `npm run test:run`: geçti — 78 test dosyası, 454 test.
- `npm run test:scripts`: geçti — üç script suite (7 + 6 + 6 test).
- P14 mock/live test: `node --test scripts/content/harvest.node-test.mjs scripts/content/harvest.live.test.mjs` — 2 passed, 1 skipped; live network test varsayılan olarak atlandı.
- `npm run build`: geçti; Vite build ve bundle budget geçti (ilk set 399,793 B gzip / bütçe 439,000 B). Mevcut büyük chunk/dynamic import uyarısı var.
- `npm run audit:check`: geçti — production bağımlılıklarında bilinen açık yok.
- `npm run test:rules:emulator`: yerelde çalıştırılamadı; Java 21+ gerekli. PR CI Java 21 ile doğrulanacak.
- `node --check public/sw.js`, `node --check scripts/content/harvest.mjs`: geçti.
- `git diff --check`: geçti (exit 0); son `git status --short` kontrolünde çalışma ağacı temizdi.
- `gh pr checks 38`: Cloudflare Pages `pass`; Security, typecheck, lint, test and build `pass` (53 s), Actions run `39688171879`, job `119527764626`.
- PR #38 aynı PR açık tutuldu; istenen Tur 4 başlığına güncellendi. #38 kapatılmadı, merge/deploy yapılmadı. CI run `39688171879` kod ve teslimat commit'i `c4fec6a` için yeşil; bu rapor güncellemesi dokümantasyon-only commit olacak.

## Dosya talebi / açık kalanlar

- **DOSYA TALEBİ:** `package.json` (P1 sahibi) ve/veya P1'in script test runner dosyası | `scripts/content/harvest.node-test.mjs` P14 fixture testinin `npm run test:scripts` ve CI içine alınması | P1, test komutuna `node --test scripts/content/harvest.node-test.mjs` eklesin. Bu tur sahiplik nedeniyle bu dosyaya dokunulmadı; P14 node testini ayrıca çalıştıracağız.
- Eski dosyalardan yeniden yazılmayanlar: `OfflineMapPackPanel.tsx`, `offlineTiles.ts`, `offlineTileWorker.test.ts`, `terrainProfile.ts`, `nearbyGuide.ts`, `siteRoutes.ts`, `historicSites.live.test.ts`. Bu turdaki kabul işlerinde gerekmeyen içeriklerdir; `mapLifecycle.ts` işlevi ise yalnız P10 için yeniden kuruldu. `firestoreData.pagination.io.test.ts` sıfırdan yazıldı.
- Hava servisi cihaz/preview üzerinde görsel saha testi yapılmadı; gerçek cihaz doğrulaması ve hava isteğinin ülke/sağlayıcı kullanılabilirliği açık.
- Offline paketinin halen kullandığı bbox/zoom tile toplamını OpenFreeMap'in 3,000 tile/50 MB koşullarına göre sınırladığı ayrıca doğrulanmalı; bu tur P15 maddesi “kod yok” olduğundan implementasyon değiştirilmedi.
- PR #38: `https://github.com/efezztxj/Atlasia/pull/38`; yeni PR oluşturulmadı çünkü aynı head branch'ten yeni açık PR açılamaz. #38 kapatılmadı.
