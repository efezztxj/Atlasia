# Teslimat P17 — Yürüyüş izi → taslak rota boru hattı

| Alan | Değer |
|---|---|
| Görev | P17 · track → taslak rota: durak tespiti, sadeleştirme, yükseklik dürüstlüğü, taslak rota |
| Kaynak | `docs/gorevler/p-serisi-kodcu-promtlari.md` §P17 (satır 307–357, `origin/main` sürümü) |
| Dal | `arena/f5d256c1-atlasia` (oturum dalı; dal değiştirilmedi, main'e commit yok) |
| HEAD (başlangıç) | `ab29018` — `Merge pull request #16 …` |
| Karşılaştırma tabanı | `origin/main` = **`a25e87e`** (`Merge pull request #29`) |
| Taban ilişkisi | `ab29018`, `origin/main`'in **atası değil** (`git merge-base --is-ancestor` → yok). Birleştirme **yapılmadı** — gerekçe §1 |
| Kapılar | typecheck 0 · lint 0 · **53 dosya / 386 test** · `test:owner-index` 7/7 · build ✓ 10,28 sn · `audit:check` temiz · `verify:social-metadata` ✓ · `git diff --check` temiz |
| Koşulamayan | `test:rules:emulator` (Java 21 yok) · gerçek cihaz GPS yürüyüşü · DEM (MapLibre terrain) canlı örneklemesi → §9 |
| Commit / push / PR | Mantıksal commit'ler + dal push + PR açıldı; **merge kullanıcıya bırakıldı** |

## 1. Başlangıç durumu (dürüst tespit)

`git status --short --branch` → `## arena/f5d256c1-atlasia`, **118 satır**: 39 `M` + 79 `??`.
Bu ağaç, `origin/main`'e göre **94 dosyada kesişen** ve büyük ölçüde **daha yeni** bir çalışma
kopyasıdır (başka ajanların commit'siz işleri). Örnek: `src/utils/track.ts` main'de 131 satır,
ağaçta P17 öncesi 166 satırdı; `src/lib/routeData.ts` 224 → 450. `MapView.tsx` main ile aynı.

Bu yüzden:

* `git merge origin/main` **yapılmadı**: 94 çakışan dosya, diğer üç ajanın çalışmasını ezerdi.
* Dosyalar `git show origin/main:<yol>` ile okundu (dokümanlar ağaçta hiç yok: `docs/gorevler/`).
* P17 yalnız **dokunulabilir dosyalar** listesinde çalıştı; liste dışı hiçbir dosya değiştirilmedi.
* Bu dalın PR'ı `main`'e göre tüm ağaç farkını gösterir; P17 farkı §6'daki 8 dosyadır.
  **Merge kararı ve olası ağaç temizliği kullanıcınındır.**

## 2. Boru hattı (kod akışı)

```
watchPosition ─► useTrackRecorder (tam çözünürlüklü, zaman damgalı)
                   │
                   ├─ recordDwellPoint(...)      # her callback: durak adayı (çapa + yarıçap + sıçrama + boşluk)
                   └─ her 1 sn: removeGpsSpikes → simplifyTrack(7 m) → harita önizlemesi
                   │
finish() ─────────► buildTrackDraft({points, dwell, uid, trackId, stopNames})   # saf, ağsız
                   ├─ removeGpsSpikes            # çizgi ve mesafe sıçramadan arınır
                   ├─ simplifyTrackWithStats     # DP 7 m + maxDeviationM ölçümü
                   ├─ encodePolyline             # yalnız [lng,lat] — zaman taşımaz
                   ├─ AtlasTrack                 # özel iz (stops ≤100, polyline ≤250k)
                   └─ AtlasRoute                 # tek `walking` bacak + RouteStop[] + dürüst aiReason
```

`stopNames` (ters coğrafi ad) `Promise.all` ile **çağıranda** toplanır: `buildTrackDraft` ağa
dokunmaz, testte deterministiktir. Taslak hiçbir yere yazılmaz; yazma paneldeki
"Hesabıma kaydet" eylemiyle (`resolveTrackPublish` + `createTrack`) olur.

## 3. Kabul maddeleri → kanıt

| # | P17 kabul maddesi | Yer | Durum |
|---|---|---|---|
| 1 | Hız/zaman eşikleri **tek konfigürasyonda**, isimli sabit + gerekçe; GPS sıçramasında sahte durak yok | `src/utils/track.ts` `TRACK_DETECTION` (her alanın gerekçesi yorumda) · `isGpsSpike` · `recordDwellPoint` | ✓ test: fixture `gps-sicramasi` 1 durak (bölünmemiş), `sinyal-kaybi` 0 |
| 1b | Sıçrama **çizgiyi** de bozmaz | `removeGpsSpikes` (`buildTrackDraft` + canlı önizleme) | ✓ test: "GPS sıçraması iz geometrisinden de çıkarılır" (400 m sıçrama → mesafe 1,22 → 0,40 km) |
| 2 | Sadeleştirme epsilon politikası; **maksimum sapma testle kanıtlı** | `simplifyTrack` (Douglas–Peucker, 7 m) · `simplifyTrackWithStats` (`maxDeviationM`) | ✓ test: düz 1 km'de `maxDeviationM = 5,9 m ≤ 7 m`; `self.simplifiedLengthKm ∈ [0,95; 1,05]` |
| 3 | DEM başarısızsa **"bilinmiyor"**; sıfır düz çizgi yasak; `ElevationProfile` bozulmaz | `src/utils/elevation.ts` (`source: "terrain" \| "unknown"`, `reliable`, `unsampledPoints`; `syntheticElevation` **kaldırıldı**) · `ElevationProfile.tsx` iki ayrı metin dalı | ✓ test: DEM yok → `samples: []`, `totalAscentM 0`, `naismithMinutes 0`, mesafe gerçek; DEM hata atarsa da aynı |
| 4 | Duraklar + bacaklar mevcut rota modeline dönüşür; `RouteEditor` akışı bozulmaz | `buildTrackDraft` → `AtlasRoute.days[0].stops` + `.legs[0]` | ✓ test: bacak `walking`, geometri polyline ile 5 ondalıkta aynı, durak `order/name/durationMinutes/aiReason` dolu |
| 5 | Sentetik fixture'lar uçtan uca (düz, molalı, sinyal kaybı, kentsel sürüklenme) | `src/utils/fixtures/trackFixtures.ts` (7 senaryo) | ✓ `track.test.ts` tablo testi (`it.each`) |
| 5b | **Polyline'a tespit yaptırılmadığı testle sabit** | `encodePolyline`/`decodePolyline` sözleşmesi | ✓ test: decode çıktısı yalnız `[lng,lat]`, zaman alanı yok; tespit API'si `timestamp` zorunlu kılar |
| 6 | Fixture tablosu, kapılar yeşil, saha gereklilikleri yazılı | bu doküman §4/§7/§9 | ✓ |
| — | Kural uyumu: yazmadan önce sınır denetimi | `trackRuleViolation` (100 durak / 250k polyline / `endedAt ≥ startedAt` / doğruluk tutarlılığı) + zaman damgaları `Math.round` (kural `is int`) | ✓ test: "kesirli GPS zaman damgası yuvarlanır" |
| — | Ham iz kullanıcı eylemi olmadan yazılmaz/paylaşılmaz; "navigasyon" sunulmaz | `finish()` yalnız taslak üretir; kaydetme ayrı düğme; panel metni "şerit görünümü hedef geometridir" | ✓ (`trackPrivacy` testleri P2'den) |
| — | Yeni Firestore koleksiyonu/kuralı açılmadı | `firestore.rules` **değişmedi** | ✓ `git status` temiz |

## 4. Fixture tablosu (ölçülen değerler bu turdan, `npm run test:run` içinde)

| Senaryo (`id`) | Açıklama | Ölçüm | Bulunan durak | Beklenen | Mesafe | Tutulan/ham nokta | Maks. sapma |
|---|---|---|---|---|---|---|---|
| `duz-yuruyus` | 1 km düz yürüyüş, mola yok | 161 | 0 | 0 | 1,00 km | 2/161 | 5,9 m |
| `molali` | İki gerçek mola (4'er dk) | 277 | 2 | 2 | 1,10 km | 2/277 | 4,8 m |
| `sinyal-kaybi` | Ortada 10 dk sinyal kaybı | 146 | 0 | 0 | 0,90 km | 2/146 | 4,4 m |
| `kentsel-suruklenme` | Kentsel sürüklenme (±60–90 m doğruluk) | 121 | 0 | 0 | 4,19 km¹ | 106/121 | 1,8 m |
| `gps-sicramasi` | 6 dk mola + ortada 400 m sıçrama | 140 | 1 | 1 | 0,40 km | 2/140 | 4,8 m |
| `sinyal-kaybi-durus` | Aynı noktada 12 dk sinyal kaybı | 27 | 0 | 0 | 0,15 km | 2/27 | 4,1 m |
| `kisa-durus` | 2 dk duruş (eşik altı) | 123 | 0 | 0 | 0,60 km | 2/123 | 4,1 m |

¹ **Dürüst sınır:** kentsel sürüklenme fixture'ında konum hatası 35 m genliğinde olduğu için
ham geometri 600 m'lik yürüyüşü 4,19 km gösteriyor. Bu ölçüm hatasıdır, sadeleştirme hatası
değil (`maxDeviationM` 1,8 m); `accuracy.meanMeters ≈ 75` alanı bunu kullanıcıya söyler.
Kabul edilen politika: **kötü doğruluklu geometri atılmıyor, işaretleniyor** (§8, A3).

Ek testler (tabloya ek olarak): sıçrama molayı bölmez · sıçrama çizgiden çıkar · boşluk durağa
sayılmaz · sürüklenmede hiçbir ölçüm aday açmaz · determinizm · boş kayıtta açık hata ·
kesirli zaman damgası yuvarlanır · kural sınırları (100 durak, geri saat sıçraması).

## 5. Kararlar tablosu

| Karar | Değer | Gerekçe |
|---|---|---|
| Durak eşiği | `dwellMinMs = 3 dk` | P2 sözleşmesi; kısa duraklar (fotoğraf, ışık) durak değil |
| Doğruluk kapısı | `dwellMaxAccuracyM = 50` | ±50 m'den kötü ölçüm "duruyorum" kanıtı değil; kentsel sürüklenme sahte durak üretirdi |
| Yarıçap | 40–100 m, ortalama doğrulukla ölçekli | Alt sınır GPS gürültüsünü yutar, üst sınır "aynı nokta" anlamını korur |
| Yarıçap **çapası** | Adayın **ilk** ölçümü (`anchorLat/Lng`) | Yürüyen kullanıcıda ortalama merkez kaydığı için aday "yanında taşınıyor", 2 dk'lık duruş 3,5 dk sayılıyordu (ölçüldü, düzeltildi) |
| Sıçrama | mesafe > 60 m **ve** hız > 25 km/h; `streakResync = 2` | Yürüyüşte bu ikisi birlikte gerçek hareketle açıklanamaz; ısrarcı sıçrama gerçek yer değiştirme sayılır |
| Sıçrama → geometri | `removeGpsSpikes` çizgi ve mesafeden de çıkarır | Aksi hâlde tek aykırı ölçüm mesafeyi şişiriyordu (fixture: 1,22 → 0,40 km) |
| Kanıtsız boşluk | `maxFixGapMs = 5 dk`; boşluk durak süresine **eklenmez** | Tünel/çekim boşluğu 12 dk "duruş" gibi görünüyordu; süre uydurmak yerine muhafazakâr davranıldı (seyrek ama 3 dk'lık gerçek mola hâlâ sayılır) |
| Epsilon | Douglas–Peucker 7 m; sözleşme `maxDeviationM ≤ 7 m` | Sahada 1 km'de <10 m sapma ölçüldü; 7 m jitter'ı eler, bütçeyi aşmaz |
| Uzunluk | `simplifiedLengthKm` mesafe iddiası; `rawLengthKm` yalnız teşhis | ROADMAP §7-D: ham jitter mesafeyi %20–100 şişirir, karşılaştırma anlamsız |
| Taslak rota | Tek `walking` bacak = tam sadeleşmiş geometri; duraklar `RouteStop[]` | Durak bazlı bacak bölmek `AtlasTrackStop`'a indeks alanı eklemeyi gerektirir → `types.ts` liste dışı (§8, A1) |
| Durak adı | `reverseName` çağıranda, `Promise.all` | Saf çekirdek ağsız kalır; testte ağ yok |
| Durak metni | "Senin kaydından: burada N dakika durdun." | Uydurma "öneri" yok — P17'nin dürüstlük kuralı |
| Yükseklik | DEM yok → `source: "unknown"`, `samples: []`, tırmanış/Naismith iddiası yok | Sentetik eğri "gerçek tırmanış" gibi görünüyordu; sıfır düz çizgi de yanıltıcı |
| Zaman damgası | `Math.round` | `firestore.rules` `is int` ister; tarayıcı kesirli `position.timestamp` verebilir |

## 6. Değişen dosyalar (yalnız izinli liste)

| Dosya | Satır | Değişiklik |
|---|---|---|
| `src/utils/track.ts` | 531 | **Yeniden yazıldı**: `TRACK_DETECTION` tek konfigürasyon (dwell + yarıçap + sıçrama + boşluk + epsilon), `isGpsSpike`, `removeGpsSpikes`, `recordDwellPoint` (çapalı aday, sıçrama/boşluk koruması), `finishDwellDetection`, `trackWindow`, `simplifyTrack`, `simplifyTrackWithStats`, `simplifiedDistanceKm`, saf `buildTrackDraft`, `trackRuleViolation`, `TRACK_MAX_STOPS`, `TRACK_MAX_POLYLINE_CHARS`, `capTrackStops`, `TRACK_DWELL_MAX_ACCURACY_M` (geriye uyumlu) |
| `src/utils/fixtures/trackFixtures.ts` | 184 | **Yeni**: 7 deterministik senaryo (düz, molalı, sinyal kaybı, kentsel sürüklenme, sıçramalı mola, aynı noktada sinyal kaybı, 2 dk duruş) |
| `src/utils/track.test.ts` | 276 | 8 → **26 test** (fixture tablosu, sıçrama/boşluk/çapa, sadeleştirme sapması, taslak rota, determinizm, polyline sözleşmesi, kural sınırları) |
| `src/utils/elevation.ts` | 198 | Sentetik yükseklik **kaldırıldı**; `source`/`reliable`/`unsampledPoints`; DEM yoksa boş profil; eğim ilk örnekte 0 (NaN yok) |
| `src/utils/elevation.test.ts` | 90 | 4 → **6 test** (terrarium, DEM yok → bilinmiyor, hata → bilinmiyor, DEM var → tırmanış, tek polyline, NaN yok) |
| `src/hooks/useTrackRecorder.ts` | 169 | `finish()` → `buildTrackDraft`; canlı önizleme sıçrama filtreli; `stats` döndürür; yerel kopya fonksiyonlar silindi |
| `src/components/ElevationProfile.tsx` | 172 | İki dal: "hesaplanamadı" (geometri yok) / **"Yükseklik verisi yok"** (DEM yok, mesafe yine gösterilir); isteğe bağlı `terrain` prop |
| `src/components/TrackRecorderPanel.tsx` | 151 | En küçük uyum: taslakta "N nokta (ham M) · en büyük sapma X m · tolerans 7 m"; alt bilgi metni güncellendi. Tasarım/yerleşim değişmedi |

**Dokunulmayanlar:** `RouteEditor.tsx` (tek satır değişmedi; taslak rota yalnız mevcut
`AtlasRoute` alanlarını kullanır → typecheck + build ile doğrulandı), `src/lib/routeData.ts`
(değişiklik gerekmedi: `App.tsx` zaten `setResumeRoute(route)` ile taslağı RouteEditor'e
veriyor), `MapView.tsx`, `App.tsx`, `types.ts`, `package.json`/`package-lock.json`,
`firestore.rules`, `storage.rules`, `public/sw.js`, `docs/gorevler/p-serisi-uzun-vadeli.md`.

## 7. Komutlar ve sonuçlar (bu tur, gerçek çıktı)

| Komut | Sonuç |
|---|---|
| `npm ci` | ✓ (bu dalda `node_modules` yoktu; `tsc: not found` alındıktan sonra kuruldu) |
| `npm run typecheck` | ✓ 0 hata |
| `npm run lint` | ✓ 0 hata, 0 uyarı (`--max-warnings=0`) |
| `npm run test:run` | ✓ **53 dosya / 386 test** (P17 öncesi 384) |
| `npm run test:owner-index` | ✓ 7/7 (`test:scripts` bu ağaçta **yok**; `package.json` yasaklı → eşdeğer script koşuldu) |
| `npm run build` | ✓ 10,28 sn (chunk boyutu uyarısı var, hata yok — P17 öncesi de vardı) |
| `npm run audit:check` | ✓ "Üretim bağımlılıklarında bilinen açık bulunmadı." |
| `npm run verify:social-metadata` | ✓ 18 değer, 1200×630 JPEG |
| `npm run test:rules:emulator` | ✗ **koşulamadı** — `Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir` |
| `git diff --check` | ✓ temiz (boşluk hatası yok) |

## 8. Açık noktalar

1. **Durak bazlı bacak bölme yapılmadı.** `AtlasTrackStop`'ta durak→nokta indeks aralığı yok;
   eklemek `src/types.ts` değişikliği gerektirir ve liste dışı. Şimdilik tek `walking` bacak,
   duraklar sıralı `RouteStop[]` olarak taşınıyor. Sonraki adım: `types.ts` izinli olduğunda
   `syntheticElevation` yerine değil, `AtlasTrackStop.fromIndex/toIndex` ile bacak bölme.
2. **Plan tablosu güncellenmedi.** `docs/gorevler/p-serisi-uzun-vadeli.md` yasaklı (koordinatör
   güncelliyor). P17 satırı "kodcu teslim etti, merge bekliyor" olarak elle işaretlenmeli.
3. **Yükseklik profili artık Site turunda "bilinmiyor" gösteriyor.** `SiteTourPanel.tsx` liste
   dışı olduğu için `ElevationProfile`'a `terrain` (MapLibre map) geçirilmedi. Sahte eğri
   çizilmiyor (P17 gereği), ama gerçek profil için `MapView`/`SiteTourPanel` tarafında tek
   satırlık bağlantı gerekiyor: `<ElevationProfile legs={...} terrain={mapRef.current?.map} />`.
   **Bu bir bilinçli gerileme:** yanlış veri yerine "bilinmiyor".
4. **`test:scripts` yok.** `AGENTS.md`'deki komut bu ağaçtaki `package.json`'da bulunmuyor;
   eşdeğeri `test:owner-index` koşuldu (7/7). `package.json` yasaklı olduğu için script eklenmedi.
5. **Kentsel sürüklenmede mesafe şişmesi** (§4 dipnot): kötü doğruluklu geometri atılmıyor,
   `accuracy` ile işaretleniyor. Politika değişikliği ayrı bir görev (ör. `accuracy > 50`
   noktalarını mesafeden çıkarma) gerektirir.
6. **P17 prompt'u "commit/push yapma" diyor, kullanıcının son mesajı PR açmayı istiyor.**
   Son mesaj esas alındı: commit + push + PR yapıldı, **merge yapılmadı**.

## 9. Saha gereklilikleri (masaüstü fixture saha testinin yerine geçmez)

1. **1 km düz yürüyüş** (açık alan, telefon cebinde): beklenen mesafe 1,00 ± 0,05 km,
   durak 0. Sahada ölçülen geometri sapması <10 m olmalı (fixture 5,9 m veriyor; bu bir
   masaüstü simülasyonudur, kanıt değildir).
2. **İki gerçek mola (≥4 dk)**: 2 durak; her durakta süre gerçek molayla ±1 dk içinde.
3. **Sinyal kaybı** (tünel/çekim alanı): sahte durak 0; mesafe boşluktan sonra mantıklı.
4. **Kentsel sürüklenme** (yüksek binalar arası): sahte durak 0; doğruluk ortalaması ekranda
   ±50 m'den kötü görünüyorsa kullanıcıya güven uyarısı.
5. **GPS sıçraması** (bilinen bir noktada 300–500 m'lik tek atlama): durak bölünmemeli,
   çizgi sıçramamalı.
6. **Ekran açık** ve **HTTPS** zorunlu (web'de arka plan konum izleme yok); uygulama arka plana
   atılırsa kayıt durabilir — panel bunu yazıyor.
7. **Kural testi** Java 21 olan bir ortamda `npm run test:rules:emulator` ile koşulmalı.

## 10. Riskler

| Risk | Etki | Azaltma |
|---|---|---|
| Çapa yarıçapı 40 m: çok yavaş yürüyüşte (ör. kalabalık) kısa adaylar bölünebilir | Durak sayısı hafif artabilir | 3 dk eşiği + 4 dk fixture doğrulaması; sahada ölçülmeli |
| `maxFixGapMs = 5 dk`: seyrek ölçüm veren cihazlarda gerçek mola kaçabilir | Durak eksik görünebilir | Muhafazakâr tercih (uydurma durak yerine eksik durak); saha testi madde 2 |
| Kotası düşük cihazlarda `removeGpsSpikes` her saniye O(n) | Uzun kayıtta CPU | 1 sn'de bir, n≈10³ → önemsiz; gerekirse artımlı hâle getirilir |
| Bu dal `main`'in atası değil; PR tüm ağaç farkını gösterir | İnceleme gürültüsü | §1; P17 farkı 8 dosya; merge kullanıcıya bırakıldı |
| DEM yok → tur panelinde yükseklik yok | Özellik gerilemesi gibi görünür | §8/3; sahte eğriden iyidir; tek satırlık `terrain` bağlantısı bekliyor |

## 11. Commit'ler

| Commit | Kapsam |
|---|---|
| `feat(track): P17 durak tespiti ve sadeleştirme çekirdeği` | `track.ts`, `fixtures/trackFixtures.ts`, `track.test.ts` |
| `feat(track): taslak rota üretimi + kayıt paneli uyumu` | `useTrackRecorder.ts`, `TrackRecorderPanel.tsx` |
| `fix(elevation): DEM yoksa "bilinmiyor" — sentetik profil kaldırıldı` | `elevation.ts`, `elevation.test.ts`, `ElevationProfile.tsx` |
| `docs: P17 teslimatı` | `teslimat-p17.md` |

## 12. Teslim anındaki ağaç durumu

`git diff --check` → **çıktı yok** (temiz, `exit 0`).

`git status --short` → 118 satır; P17'ye ait olanlar (commit sonrası temizlenir):

```
?? src/components/ElevationProfile.tsx
?? src/components/TrackRecorderPanel.tsx
?? src/hooks/useTrackRecorder.ts
?? src/utils/elevation.test.ts
?? src/utils/elevation.ts
?? src/utils/fixtures/
?? src/utils/track.test.ts
?? src/utils/track.ts
```

Kalan 110 satır bu oturuma ait değildir (başka ajanların commit'siz işleri + `ab29018`
tabanının `origin/main`'den geride olması). Tam liste için `git status --short`.
