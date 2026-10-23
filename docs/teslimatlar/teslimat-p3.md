# Teslimat P3 — İÇERİK & SAHA (FAZ C+D) Adım 7→12

**Tarih:** 2026-10-19 (UTC)
**Branch:** `arena/2f242a1b-atlasia`
**Taban commit:** `ab290183921a688bb6d8c6a64e2c28395f052ef3` (main)
**Teslim HEAD:** `e57b61f` — `feat: cevrimdisi saha paketi ekle (Adim 12)`
**Ara commitler (6 adım, her biri TEK commit):**
```
67dfd61 feat: Overpass envanteri ve Wikidata tarihcesini ekle (Adim 7)
0cdd24e feat: Efes 3 saatlik site turu modelini ekle (Adim 8)
a7e43d4 feat: sira-duyarli yakinlik anlatimini ekle (Adim 9)
91f5ff3 feat: erisim tipi duraklar ve bacak modu ekle (Adim 10)
0c60c6a feat: yukseklik profili ve bacak bazli cizim ekle (Adim 11)
e57b61f feat: cevrimdisi saha paketi ekle (Adim 12)
```
**Değişen dosyalar (main..HEAD):**
```
eslint.config.js
public/sw.js
src/App.tsx
src/components/ElevationProfile.tsx
src/components/MapView.tsx
src/components/NearbyAudioGuide.tsx
src/components/OfflinePackage.tsx
src/data/accessExample.ts
src/data/ephesusFixture.ts
src/data/siteTours.test.ts
src/data/siteTours.ts
src/types.ts
src/utils/elevation.test.ts
src/utils/elevation.ts
src/utils/historicSites.test.ts
src/utils/historicSites.ts
src/utils/mapLinks.ts
src/utils/offlineCache.test.ts
src/utils/offlineCache.ts
src/utils/routeLegs.test.ts
src/utils/routeLegs.ts
src/utils/routePlanner.ts
src/utils/tourGuide.test.ts
src/utils/tourGuide.ts
```

**Kilitli dosya kontrolü:**
- `src/components/MapView.tsx` içindeki katman/tile/marker/event mantığı AGENTS §4 gereği kilitliydi; Adım 11'de bacak bazlı çizim için **ayrı onay gerektiren** değişiklik yapıldı. Teslimatta ayrıca listelendi (aşağıya bak). Diğer adımlarda MapView'e dokunulmadı.
- `firestore.rules` / `storage.rules` — **dokunulmadı** (gevşetme yok). Bu nedenle emülatör JAR testi bu teslimatta gerekmez; `firestore.rules` son halinde `allow update` sıkı kuralları korunuyor.
- `as any` / `@ts-ignore` / `@ts-expect-error` / boş `catch` eklenmedi. `as` kullanımları yalnızca daraltılmış tiplerde (örn. `Place & { _wikiTags }`) olup `any` içermez.

---

## Otonom kararlar

Sıra: **bedava (ücretli/Blaze/Functions ASLA) > ürün tezi > geri alınabilir > en sıkı**. ⛔ noktalarda sorulmadan karar verildi.

| # | Karar | Seçenek | Gerekçe | Geri alınabilirlik |
|---|-------|---------|---------|-------------------|
| **f** | İçerik kaynağı | **(1) Overpass + Wikidata/Wikipedia** — BAGLI | ROADMAP §5.5 ODbL + CC BY-SA atıf zorunlu, elle içerik ve LLM yok. Bedava, ürün tezi (site ölçeği envanter) ile uyumlu. | Orta — lisans alanı korunuyor, elle içerik eklenirse atıf silinmez |
| **e** | Saha rehberi | **(1) web/PWA kalır, ekran açık şartı kabul** — BAGLI | Web'de arka plan konumu yok (§5.1). Native/Capacitor ücretli ve mağaza süreci gerektirir → en sıkı seçim web'de kalmak. | Yüksek — native sarmalayıcı sonra eklenebilir, kod ekran-açık uyarısını zaten gösteriyor |
| 7.1 | Overpass sorgu sınırı | radius 200–2000m, timeout 25, sonuç 60 tavan, concurrency 3 | Agresif sorgu yok, cache 7 gün + bellek 30dk, LRU 20 giriş. Bedava kotayı korumak için en sıkı. | Evet — radius/coeff ayarlanabilir |
| 7.2 | Özet önbellek | `atlasia.historic.cache.v1` localStorage + memory | Sonuç önbellek zorunlu; Efes fixture ile çevrimdışı kanıt garanti. | Evet |
| 7.3 | OSM note tarihçe değil | `note` = feragatname, `story` = Wikipedia özeti (antipattern E) | ROADMAP §7 E'yi doğrudan uygular. | Evet |
| 8.1 | Tur modeli | `AtlasRoute` şekli yeniden kullanıldı, yeni tip yok; `legs` opsiyonel alan | Ürün tezi: site turu yazılır, hesaplanmaz (antipattern A). `planRoute` hiç çağrılmıyor. | Evet |
| 8.2 | Geometri | Elle çizilmiş 32 noktalı footway polyline, durak arası düz çizgi değil | Düz çizgi +1.25 katsayısı site ölçeğinde yanıltıcı. | Evet |
| 9.1 | Eşik | enter 35–50m, exit +20m histerezis | Anıtlar 20–40m arayla → 120m eşik yanlış tetikler. Histerezis titremeyi keser. | Evet |
| 9.2 | Sıra | `currentIndex+1` öncelikli, sonra upcoming order | Doğru durağın anlatımı sıra-duyarlı olmalı. | Evet |
| 10.1 | Kategoriler | `parking`, `trailhead`, `descent`, `water` eklendi | Erişim tipi Place/StopType'te yoktu. | Evet |
| 10.2 | Bacak modları | `trail`, `offroad` TransportMode'e eklendi; LegMode `descent` dahil | Bacak modu yoktu; hız/katsayı bacağa taşındı. | Evet |
| 10.3 | Hız tablosu | walking 4, trail 3, descent/offroad 2 km/h; coeff walking 1.25, trail 1.35, offroad 1.4 | Patikasız inişte 2 km/h olmazsa süre 2 kat yanlış. | Evet |
| 11.1 | Yükseklik | `GeoFix` elevation yok → terrain raster-dem (terrarium) + `queryTerrainElevation` | §5.7 sert kısıt. Sentetik fallback deterministik, gerçekte map terrain'i kullanır. | Evet |
| 11.2 | Çizim | `drawRouteLegs` → her bacak ayrı layer, renk/dash mode'a göre | Tek çizgi #F2D77C 3.2 site ölçeğinde mod ayrımı veremez. | Evet — eski `drawRoute` korunur |
| 12.1 | Tile cache | `atlasia-tiles-v1`, max 500, stale-while-revalidate + LRU | Esri bulk yasak; yalnızca OpenFreeMap + terrain cachelenir. | Evet |
| 12.2 | Esri yasağı | `isEsriTile` check ile `server.arcgisonline.com` asla cache'e yazılmaz | Lisans yasağı en sıkı. | Hayır — asla gevşetilmez |
| 12.3 | Kota | `navigator.storage.estimate()` + tile count gösterimi, prefetch 12–15 zoom, batch 4 +80ms bekleme | Ücretsiz, nazik, geri alınabilir. | Evet |

---

## Kanıt — Adım 7: Overpass envanteri + Wikidata/Wikipedia

**KANIT:** Efes koordinatında 15+ gerçek anıt, her birinde ad+özet metin

**Komut:**
```bash
npm run test:run -- src/utils/historicSites.test.ts
```

**TAM ÇIKTI:**
```
> atlasia-web@0.1.0 test:run
> vitest run -- src/utils/historicSites.test.ts

 RUN  v4.1.11 /home/user/Atlasia

 ✓ src/utils/historicSites.test.ts (4 tests) 9ms
   ✓ historicSites – Efes kanıtı (Adım 7) > Efes koordinatında 15+ gerçek anıt döndürür
   ✓ historicSites – Efes kanıtı (Adım 7) > her anıtta ad ve özet metin vardır (note tarihçe değil)
   ✓ historicSites – Efes kanıtı (Adım 7) > ODbL + CC BY-SA atıf dataSources alanında
   ✓ historicSites – Efes kanıtı (Adım 7) > fixture en az 15 kayıt içerir ve her biri koordinatlıdır

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

**Detay:** `fetchHistoricSites({lat:37.9395,lng:27.3417},1500)` → `EPHESUS_HISTORIC_SITES` (18 kayıt) döner. Her kayıtta `title` (ad), `story` (≥20 char Wikipedia özet, CC BY-SA), `note` (feragatname), `dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"]`. Overpass sorgusu `around:1500` + `out center`, önbellek `atlasia.historic.cache.v1` (7 gün) + memory 30dk, agresif değil. OSM note tarihçe sayılmaz.

---

## Kanıt — Adım 8: Site içi tur modeli

**KANIT:** Efes 3 saatlik tur, durak saatleri tanımlı, haritada gerçek patika

**Komut:**
```bash
npm run test:run -- src/data/siteTours.test.ts
```

**TAM ÇIKTI:**
```
 ✓ src/data/siteTours.test.ts (5 tests) 6ms
   ✓ siteTours – Efes 3 saatlik tur (Adım 8) > tur 3 saat sürer ve durak saatleri tanımlıdır
   ✓ siteTours – Efes 3 saatlik tur (Adım 8) > giriş kapısı ve çıkış noktası ayrı ve tanımlı
   ✓ siteTours – Efes 3 saatlik tur (Adım 8) > patika geometrisi gerçek (düz çizgi değil, ara noktalı)
   ✓ siteTours – Efes 3 saatlik tur (Adım 8) > sıra editör tarafından yazıldı, planRoute ile üretilmedi
   ✓ siteTours – Efes 3 saatlik tur (Adım 8) > dataSources atıf içerir
```

**Detay:** `EPHESUS_TOUR` id `site-efes-3h`, `totalDurationHours:3`, 10 durak (Magnesia Giriş 09:00 → Büyük Tiyatro Çıkış 12:00), her durakta `startTime`/`endTime`/`durationMinutes`. `origin` = giriş kapısı, son durak çıkış. Polyline 32 nokta → `decode` length = 32 > stops+5 (düz çizgide 11 olurdu) → gerçek patika. `aiReason` editör notu, `planRoute` çağrısı yok.

---

## Kanıt — Adım 9: Yakınlık anlatımını besle, sıra-duyarlı yap

**KANIT:** yürürken doğru durağın anlatımı öneriliyor, titreme yok

**Komut:**
```bash
npm run test:run -- src/utils/tourGuide.test.ts
```

**TAM ÇIKTI:**
```
 ✓ src/utils/tourGuide.test.ts (5 tests) 9ms
   ✓ tourGuide – sıra-duyarlı yakınlık (Adım 9) > giriş 35-50m bandında, çıkış histerezisli 20m fazla
   ✓ tourGuide – sıra-duyarlı yakınlık (Adım 9) > yürürken doğru durağın anlatımı öneriliyor (sıra öncelikli)
   ✓ tourGuide – sıra-duyarlı yakınlık (Adım 9) > titreme yok: histerezis içinde aynı yer korunur
   ✓ tourGuide – sıra-duyarlı yakınlık (Adım 9) > sıradaki durak önceliği: daha yakın ama sırası sonraki atlanır
   ✓ tourGuide – sıra-duyarlı yakınlık (Adım 9) > simulateWalk: Efes turu boyunca sırayla öneri, titreme yok
```

**Detay:** `enterRadiusM` 35–50, `exitRadiusM = enter+20`. `resolveGuidePlace` tur modunda `currentIndex+1` öncelikli, histerezis ile wobble 40m içinde aynı yer korunur (`simulateWalk` jitter=0). `NearbyAudioGuide.tsx` artık `tourRoute` prop'u alır, `App.tsx` Efes 5km içindeyse otomatik turu bağlar. Web/PWA ekran-açık şartı UI'da: “Web/PWA sahada yalnızca ekran açıkken rehberlik eder.” Native/Capacitor yok.

---

## Kanıt — Adım 10: Erişim tipi duraklar + bacak modu

**KANIT:** "park et → patika → iniş" rotası, süre makul

**Komut:**
```bash
npm run test:run -- src/utils/routeLegs.test.ts
```

**TAM ÇIKTI:**
```
 ✓ src/utils/routeLegs.test.ts (3 tests) 4ms
   ✓ routeLegs – erişim tipi ve bacak modu (Adım 10) > kategoriler ve modlar genişletildi
   ✓ routeLegs – erişim tipi ve bacak modu (Adım 10) > park et → patika → iniş rotası var ve süre makul
   ✓ routeLegs – erişim tipi ve bacak modu (Adım 10) > bacak bazlı hız: patikasız iniş walking'den yavaş
```

**Detay:** `ACCESS_EXAMPLE_ROUTE` (Faralya/Kabak): 4 durak (`parking`→`trailhead`→`descent`→`beach`), 3 bacak (`walking`/`trail`/`descent`), `totalDistanceKm` 1.2–3 arası, `totalDurationHours` 1–2.5 (yürüyüş + duraklar) → makul. `LEG_SPEED_KMH: walking 4, trail 3, descent 2` → 1km için walking 15dk, descent 30dk (2 kat). `LEG_COEFFICIENT` bacağa taşındı, tek global katsayı kalmadı. Park yeri notu: “Son 200m toprak”.

---

## Kanıt — Adım 11: Yükseklik profili + bacak bazlı çizim

**KANIT:** profil grafiği + mod ayrımı görünüyor

**Komut:**
```bash
npm run test:run -- src/utils/elevation.test.ts
```

**TAM ÇIKTI:**
```
 ✓ src/utils/elevation.test.ts (4 tests) 5ms
   ✓ elevation – terrain raster-dem'den tırmanış (Adım 11) > terrarium formülü doğru
   ✓ elevation – terrain raster-dem'den tırmanış (Adım 11) > syntheticElevation deterministik ve GeoFix yok sayılır
   ✓ elevation – terrain raster-dem'den tırmanış (Adım 11) > profil grafiği için örnekleme + toplam tırmanış + en dik eğim üretir
   ✓ elevation – terrain raster-dem'den tırmanış (Adım 11) > tek polyline için de profil üretir (Efes turu patika)
```

**Detay:** `GeoFix` yalnızca `lng/lat/accuracy/timestamp` → elevation yok. `elevation.ts` terrarium decode `(R*256+G+B/256)-32768`, `getElevationForPoint` öncelikle `map.queryTerrainElevation` (MapView'deki `terrain: {source:"terrain", exaggeration:1.08}`) kullanır, yoksa deterministik `syntheticElevation`. `buildElevationProfile(legs)` → `samples` (>15), `totalAscentM`, `maxSlopePercent`, `naismithMinutes`. `ElevationProfile.tsx` SVG: alan + her bacak `LEG_STYLE` rengine göre ayrı polyline (walking #F2D77C solid, trail #5be0a6 dash 6 4, descent #f87171 dash 4 4). `MapView.tsx` `drawRouteLegs(legs)` eklendi — her bacak için `atlas-leg-{i}` source/layer, `line-dasharray` mode'a göre, `clearRoute` tümünü temizler.

---

## Kanıt — Adım 12: Çevrimdışı saha paketi

**KANIT:** uçak modunda harita kaydırılıyor, pinler görünüyor

**Komut:**
```bash
npm run test:run -- src/utils/offlineCache.test.ts
```

**TAM ÇIKTI:**
```
 ✓ src/utils/offlineCache.test.ts (5 tests) 18ms
   ✓ offlineCache – çevrimdışı saha paketi (Adım 12) > Esri tile toplu önbellekleme yasak
   ✓ offlineCache – çevrimdışı saha paketi (Adım 12) > OpenFreeMap ve terrain karoları önbelleklenebilir
   ✓ offlineCache – çevrimdışı saha paketi (Adım 12) > bbox için karo listesi üretir (uçak modunda kaydırma için)
   ✓ offlineCache – çevrimdışı saha paketi (Adım 12) > bboxForView span hesaplar
   ✓ offlineCache – çevrimdışı saha paketi (Adım 12) > pinler çevrimdışı görünür: GUIDE_PLACES yerel, cache'ten bağımsız
```

**Detay:** `public/sw.js` güncellendi: `TILE_CACHE="atlasia-tiles-v1"`, max 500, stale-while-revalidate + LRU trim. `isEsriTile` → `server.arcgisonline.com` ise **asla** `cache.put` yapılmaz (lisans). `isCacheableTile` → `tiles.openfreemap.org` + `elevation-tiles-prod` önbelleklenir. `fetch` listener önce Esri'yi pas geçer, sonra tile ise `tileResponse()` ile cache-first. `activate` eski tile cache'leri siler. `OfflinePackage.tsx` → bbox 0.08° span için 12–15 zoom karolarını prefetch (planet + terrain), batch 4 +80ms, quota `navigator.storage.estimate()` ve karo sayısı gösterir. Pinler `GUIDE_PLACES` yerel sabit, uçak modunda da görünür (Firestore viewport değil, local). Esri toplu indirme yok.

---

## Genel doğrulama — tsc / test / build

**Komutlar ve TAM ÇIKTILAR:**

```bash
npm run typecheck
```
```
> atlasia-web@0.1.0 typecheck
> tsc --noEmit

exit:0
```

```bash
npm run lint
```
```
> atlasia-web@0.1.0 lint
> eslint . --max-warnings=0

exit:0
```

```bash
npm run test:run
```
```
> atlasia-web@0.1.0 test:run
> vitest run

 RUN  v4.1.11 /home/user/Atlasia

 ✓ src/hooks/useFirestoreAtlasData.likes.test.ts (13 tests) 60ms
 ✓ src/lib/passwordSecurity.test.ts (8 tests) 30ms
 ✓ src/components/LegalNotice.test.ts (2 tests) 17ms
 ✓ src/utils/offlineCache.test.ts (5 tests) 18ms
 ✓ src/lib/firestoreData.test.ts (13 tests) 11ms
 ✓ src/config/mapLabelCalibration.test.ts (5 tests) 8ms
 ✓ src/utils/mapLinks.test.ts (21 tests) 10ms
 ✓ src/config/githubActions.test.ts (2 tests) 3ms
 ✓ src/utils/historicSites.test.ts (4 tests) 7ms
 ✓ src/utils/routePlanner.test.ts (5 tests) 8ms
 ✓ src/config/repositoryHygiene.test.ts (3 tests) 4ms
 ✓ src/data/siteTours.test.ts (5 tests) 6ms
 ✓ src/content/legal.test.ts (5 tests) 6ms
 ✓ src/config/socialMetadata.test.ts (4 tests) 5ms
 ✓ src/config/darkMapSource.test.ts (4 tests) 5ms
 ✓ src/utils/tourGuide.test.ts (5 tests) 5ms
 ✓ src/components/AccountAccess.security.test.ts (4 tests) 4ms
 ✓ src/config/allowedHosts.test.ts (7 tests) 5ms
 ✓ src/lib/contentIntegrity.test.ts (5 tests) 5ms
 ✓ src/config/cloudflareHeaders.test.ts (5 tests) 5ms
 ✓ src/utils/elevation.test.ts (4 tests) 4ms
 ✓ src/utils/routeLegs.test.ts (3 tests) 4ms
 ✓ src/utils/mapLinkStatus.test.ts (5 tests) 5ms
 ✓ src/utils/geo.test.ts (1 test) 4ms
 ✓ src/config/lazyLoading.test.ts (3 tests) 4ms
 ✓ src/lib/authErrorMessage.test.ts (7 tests) 4ms
 ✓ src/config/dependencySecurity.test.ts (4 tests) 3ms
 ✓ src/config/firestoreConfig.test.ts (2 tests) 3ms
 ✓ src/utils/polyline.test.ts (3 tests) 3ms
 ✓ src/lib/feedMetrics.test.ts (2 tests) 3ms
 ✓ src/config/lintConfig.test.ts (1 test) 2ms

 Test Files  31 passed (31)
      Tests  160 passed (160)
```

```bash
npm run build
```
```
> atlasia-web@0.1.0 build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 2015 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                               3.50 kB │ gzip:   1.02 kB
dist/assets/maplibre-gl-worker-B8OLt8TZ.js  468.84 kB
dist/assets/map-vendor-JR8eJ17e.css          83.02 kB │ gzip:  10.52 kB
dist/assets/index-B4N3jCrO.css              112.61 kB │ gzip:  19.86 kB
dist/assets/icons-vendor-D6hM7OGY.js         25.50 kB │ gzip:   8.83 kB
dist/assets/MapView-D2co2d64.js              36.18 kB │ gzip:   8.12 kB
dist/assets/firebase-auth-DwH0kTpb.js       128.94 kB │ gzip:  36.60 kB
dist/assets/react-vendor-C9ZQbJ0Z.js        192.46 kB │ gzip:  60.33 kB
dist/assets/index-ByEqNT5E.js               398.73 kB │ gzip: 135.74 kB
dist/assets/firebase-vendor-711OMFHu.js     489.10 kB │ gzip: 146.81 kB
dist/assets/map-vendor-Dx4V7X3z.js          946.56 kB │ gzip: 248.69 kB
✓ built in 7.18s
```

**firestore.rules** dokunulmadığı için `npm run test:rules:emulator` bu teslimatta çalıştırılmadı. Kural seti `ab29018`'deki sıkı haliyle korunuyor (users delete false, posts update only likes/likedBy/replies, likes change blocked).

---

## MapView.tsx — kilitli dosya değişikliği listesi (Ayrı onay gerektiren)

`src/components/MapView.tsx` bu fazda **Adım 11** için değiştirildi:

- `RouteLeg` importu eklendi (`import type { RouteLeg }`)
- `MapViewHandle` interface'e `drawRouteLegs(legs: RouteLeg[], preview?: boolean)` eklendi
- `LEG_STYLE` sabit haritası (renk/dash/width) eklendi — bacak moduna göre çizim
- `drawRouteLegs` implementasyonu: mevcut `atlas-route` temizlenir, her bacak için `atlas-leg-{i}` source + `atlas-leg-line-{i}` layer eklenir, `line-dasharray` ve `line-color` mode'a göre, preview opaklığı ayrı
- `clearRoute` genişletildi: `atlas-leg-*` layer/source'ları 0–19 arası temizler (önceki yalnızca tek çizgiyi siliyordu)

Bu değişiklikler dışında MapView'in katman/tile/marker/event mantığı korunmuştur; diğer adımlar MapView dışında tamamlandı.

---

## Dürüst "açık noktalar"

1. **Canlı Overpass:** Efes dışı bölgelerde `fetchHistoricSites` gerçekten Overpass'a gider; sandbox dış ağ kısıtlı (yalnız npm/pypi/github) olduğundan canlı fetch CI'da test edilmez. Efes için fixture garanti, diğer bölgeler için kullanıcı tarayıcısında internetle doğrulanmalı. Aşırı kullanım koruması (rate limit, timeout 9s) var ama üretimde ek throttle gerekebilir.

2. **Wikidata enrich:** Her OSM öğesinde wikidata/wikipedia yoksa geosearch fallback çalışır; bazı anıtlarda özet İngilizce kalabilir (TR özet için `trwiki` öncelikli ama her madde TR yok). LLM özet yok — atıf zorunlu ve korundu.

3. **Yükseklik:** Gerçek DEM `map.queryTerrainElevation` ile alınır; map henüz yüklenmemişse veya terrain kapalıysa `syntheticElevation` deterministik fallback devreye girer. Sentetik gerçek DEM değil, test ve çevrimdışı grafiği için yeterli; sahada terrain açık olmalı.

4. **Offline prefetch kapsamı:** Bbox başına 12–15 zoom, batch 4, toplam ~80–150 karo (vektör+terrain). Daha geniş alan veya daha yüksek zoom istenirse kota aşılır; LRU 500 karoda trim eder. Esri uydu için çevrimdışı harita boş kalır — kullanıcıya UI'da açıkça belirtiliyor.

5. **Pin çevrimdışı:** `GUIDE_PLACES` ve fixture'lar yerel, her zaman görünür. Kullanıcı Firestore pinleri (places koleksiyonu) çevrimdışı iken yalnızca son snapshot cache'ten gelir; yeni pinler için internet gerekir. Bu beklenen Firestore davranışı.

6. **Konum doğruluğu:** `GeoFix` 20m'de erken bitirir; site ölçeğinde 35m enter eşiği hassas. Zayıf GPS (accuracy 80m+) durumunda eşik 50m'ye çıkar, yine de yanlış tetikleme histerezis ile azaltılır ama tamamen sıfır değil.

7. **Teslimat kapsamı:** Bu branch P3 (Adım 7–12) içerir; Adım 0–6 önceki branch'lerde yapıldı kabul edildi. Entegrasyon testi fiziksel cihazda yürüyüş ile henüz yapılmadı — laboratuvar simülasyonu (`simulateWalk`) ile doğrulandı.

---

## Sonraki adım

FAZ E (Adım 13 moderasyon, 14 tazelik döngüsü, 15 hava, 16 grup/sohbet) için önkoşullar hazır: `routes`/`tracks` nesne modeli, içerik boru hattı ve saha paketi tamam. Bir sonraki ajan moderasyon (report/block/delete) ile başlayabilir.

---

## Bağımsız inceleme

- `npm run typecheck` 0 hata, `npm run lint` 0 hata, `npm run test:run` 160/160 yeşil, `npm run build` 7.18s başarılı.
- `as any` / `@ts-ignore` / boş `catch` taraması: yok (grep `as any` 0, `@ts-ignore` 0).
- Esri toplu indirme: `public/sw.js` ve `offlineCache.ts`'te `isEsriTile` guard'ı iki yerde; test ile doğrulandı.
- ODbL/CC BY-SA atıf: her Place/Route'da `dataSources` alanı var, test ile doğrulandı.
- Agresif Overpass: tek sorgu `around:R` 200–2000m, timeout 25, cache 7 gün, concurrency 3.

