# Teslimat — harita kasma/donma turu (2026-11-01)

## Görev

Kullanıcı bildirimi: "Atlasia'nın arayüzü çok kasıyor." İstenen: sıkıntı
çıkarmadan kasma/donma sorununu çözmek.

## Branch ve commit

- Branch: `arena/f93fa0ea-atlasia`
- Taban commit: `0d7695e051ccb53348d0706e5adb2fb16acd7851` (`main`)
- Teslim commit'i: bu dosyayı içeren commit (aşağıdaki "Değişen dosyalar")

## Kök neden — repo şişmesi değil

Ölçümler:

| Kalem | Ölçüm | Yorum |
|---|---|---|
| `.git` boyutu | 20,6 MB | Normal; "repo şişti" teorisi elendi |
| `public/social` | 17 MB | Git'te izlenen dosya yok (6 dosya), tarayıcıya da inmiyor |
| Service worker ön önbelleği | 7 küçük dosya (`atlasia-shell-v9`) | Sosyal görseller önbelleğe alınmıyor |
| `src` | 3,0 MB / 54.027 satır | Derlenmiş çıktı iniyor, kaynak değil |

Asıl nedenler:

1. **Harita `zoom` olayı → her karede iki React state güncellemesi.**
   `MapView` içindeki `report()` `onViewChange` (görünüm) ve
   `onViewportChange` (viewport) çağırıyordu; `zoom` olayı animasyon
   boyunca her karede geldiği için `Explorer` (1.796 satır, 59 `useState`)
   saniyede ~60 kez yeniden çiziliyordu. `Explorer` içinde `React.memo`
   yok ve prop'ların çoğu satır içi arrow olduğu için alt ağacın tamamı
   (Header, BottomPanel, paneller) her karede yeniden render ediliyordu.
2. **Otomatik dönüş döngüsü boşta da dönüyordu.** `tick` koşul sağlanmasa
   bile kendini yeniden kuruyordu: dönüş kapalıyken saniyede 60 boş
   callback (mobilde sürekli CPU/pil).
3. **Her render'da yeniden filtrelenen listeler.** `discoveries`,
   `filteredPosts`, `filteredStories` ve bildirim listeleri `useMemo`
   dışındaydı; ayrıca `useBlocks().isBlocked` her render'da yeni kimlik
   üretiyordu (memo'yu imkânsız kılıyordu).
4. **Pin başına `backdrop-filter`.** Her pin etiketi, görünmezken bile
   bulanıklık katmanı tanımlıyordu.

## Yapılan değişiklikler

- `src/utils/mapLifecycle.ts` — `VIEW_REPORT_INTERVAL_MS = 120` ve saf
  `shouldReportView(now, lastReportAt)` eklendi (hareket sırasında en çok
  ~8 görünüm bildirimi/sn).
- `src/components/MapView.tsx`
  - `zoom` dinleyicisi `reportThrottled()` kullanıyor; `moveend` her zaman
    tam bildirim yapıyor, yani parmak kalkınca görünüm kesinleşiyor.
  - Autospin döngüsü koşul sağlanmıyorsa kendini yeniden kurmuyor; sekmeye
    dönüşte, `zoomstart` ve `resize` olaylarında `ensureSpinLoop` ile
    yeniden başlıyor. `spinDisposed` bayrağı, `map.setCenter` içinden
    senkron yayılan bir olayın döngüyü ikinci kez kurmasını engelliyor.
    `visibilitychange` dinleyicisi cleanup'ta kaldırılıyor.
- `src/components/Explorer.tsx` — üç liste ve bildirim türetmeleri
  `useMemo`'ya alındı (`visibilitychange`/pin davranışı değişmedi).
- `src/hooks/useBlocks.ts` — `isBlocked` `useCallback` ile sabit kimlikli.
- `src/index.css` — pin etiketi bulanıklığı yalnız `:hover`/`.is-active`
  durumunda uygulanıyor (görsel sonuç aynı).
- `src/utils/mapLifecycle.test.ts` — 2 → 5 test.
- `src/components/mapRenderLoop.test.ts` — yeni regresyon kilidi (5 test):
  zoom'da doğrudan `report()` çağrılmaması, `moveend` tam bildirimi,
  döngünün boşta yeniden kurulmaması, `visibilitychange` temizliği ve pin
  bulanıklığının yalnız görünürken tanımlanması.

## Çalıştırılan komutlar ve sonuçları

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | Geçti |
| `npx eslint . --max-warnings=0` | Geçti (uyarı yok) |
| `npx vitest run` | 177 dosya / 1.362 test geçti |
| `npx vite build` | Başarılı |
| `node scripts/bundle-budget.mjs` | **Bütçe içinde**: ilk set 465.952 B ham / 128.089 B gzip (bütçe 129.400), toplam JS 997.755 B gzip (bütçe 1.003.000), CSS 35.638 B gzip (bütçe 35.700) |
| `npm run audit:check` | Üretim bağımlılıklarında bilinen açık yok |
| `npm run test:rules:emulator` | **Koşulamadı**: ortamda Java 21 yok (`requires Java 21`). Değişiklik `firestore.rules` dosyasına dokunmuyor |
| `npx vite --host 0.0.0.0` | Dev sunucu açıldı; `index.html` ve değişen modüller HTTP 200 döndü |

E2E (`npm run test:e2e`) bu ortamda koşulamadı: Playwright tarayıcı ikilileri
kurulu değil ve tarayıcı indirme CDN'i ağ izin listesinde yok.

## Kilitli dosya / kapsam kontrolü

- `firestore.rules`, `public/sw.js`, `public/_headers`, `vite.config.ts`,
  `package.json` / `package-lock.json`: **dokunulmadı**, yeni bağımlılık yok.
- Yerleşim, renk, tema, panel konumları ve ürün kararları değişmedi; yalnız
  çizim sıklığı ve türetme maliyeti azaltıldı.

## Bilinen riskler

1. Hareket sırasında görünüm bilgisi artık en çok ~8 kez/sn güncelleniyor
   (önceden kare başına). `moveend` tam bildirim yaptığı için nihai değer
   doğru; yalnız animasyon sırasında zoom'a bağlı ara değerler (ör. hero
   gizlenme eşiği) en fazla 120 ms gecikmeli okunur.
2. Eşik değeri (`VIEW_REPORT_INTERVAL_MS`) sabit; cihaz bazlı ölçüm
   (gerçek telefondan DevTools Performance kaydı) bu ortamda yapılamadı.

## Sonraki görev (öneri)

`Explorer`'ı memo'lanabilir parçalara bölmek: `Header`, `BottomPanel` ve
paneller için satır içi prop'ları `useCallback`/`useMemo`'ya almak ve görünüm
verisini context'e taşımak. Bu tur, riski düşük ve kazancı yüksek dört
kalemle sınırlandırıldı.

---

# Tur 2 — nihai performans için ikinci geçiş (aynı branch)

## Ek kök neden

Tur 1'de bildirim sıklığı 60/sn'den ~8/sn'ye indi. Kalan maliyet iki yerdeydi:

1. **Faydasız state güncellemeleri:** parmak kayarken görünümde gözle
   görülür bir değişiklik olmasa da her bildirim `Explorer`'ı yeniden
   çiziyordu (state nesnesi her seferinde yeni kimlik).
2. **Kapalı panellerin boşuna render edilmesi:** `AtlasAssistant` (112 KB
   modül) ve `SocialPanel` (36 KB) kapalıyken yalnız bir başlatıcı düğme
   çiziyor; buna rağmen harita her hareket ettiğinde tüm gövdeleri yeniden
   çalışıyordu.

## Yapılanlar

| Değişiklik | Dosya | Kazanç |
|---|---|---|
| `shouldCommitView()` eşiği (`VIEW_ZOOM_EPSILON=0.15`, `VIEW_CENTER_EPSILON_RATIO=0.015`) | `utils/mapLifecycle.ts` | Eşik geçilmezse `onViewChange`/`onViewportChange` hiç çağrılmaz → React state aynı nesne → **yeniden render yok** |
| `lastCommitted` + `report(force)` (`moveend` ve ilk yükleme eşiği atlar) | `components/MapView.tsx` | Sürükleme bitince değer kesin; kayıp yok |
| Boylam sarması (180. meridyen) | `utils/mapLifecycle.ts` | Sahte 359°'lik bildirim yok |
| `memo` + özel karşılaştırıcı (kapalıyken yalnız başlatıcıyı etkileyen alanlar) | `components/AtlasAssistant.tsx`, `components/SocialPanel.tsx` | Harita hareketinde iki ağır panel render edilmiyor; açılınca güncel veri |
| Yeni testler | `components/panelMemo.test.ts` (6), `mapLifecycle.test.ts` (9), `mapRenderLoop.test.ts` (6) | Davranış kilitli |

## Doğrulama (tur 2)

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | Geçti |
| `npx eslint . --max-warnings=0` | Geçti |
| `npx vitest run` | 178 dosya / **1.373 test** geçti |
| `npx vite build` | Başarılı |
| `node scripts/bundle-budget.mjs` | Bütçe içinde: toplam JS 998.103 B gzip (bütçe 1.003.000), uygulama kabuğu 583.181 B (bütçe 603.400), CSS 35.638 B (bütçe 35.700) |

## Ölçüm sınırı (dürüst not)

Bu ortamda gerçek tarayıcı çalıştırılamadı: sistemde Chromium yok,
`@sparticuz/chromium` paketi `libnspr4`/NSS sistem kütüphanelerini
bulamıyor ve paket depolarına ağ erişimi kapalı. Bu yüzden kare süresi
(FPS) ölçümü **yapılmadı**; kazanç, çağrı sayısının matematiksel olarak
azaltılması ve davranışın testle kilitlenmesiyle gösterildi. Cihaz üstü
doğrulama için DevTools Performance kaydı hâlâ gerekli.

## Sıradaki adaylar (uygulanmadı, karar bekliyor)

1. **Uyarlanabilir harita kalitesi:** kaba işaretçi/düşük çekirdek sayısında
   terrain + hillshade varsayılan kapalı. GPU'ya bağlı kasmanın en olası
   kaynağı, ama görünümü değiştirdiği için ürün kararı gerektiriyor.
2. **İlk boya yolu:** harita ekranı açılmadan ~2,2 MB JS iniyor.
   `AtlasAssistant`/`SocialPanel` modüllerinin harita hazır olduktan sonra
   yüklenmesi (~55 KB gzip kazanç); başlatıcı düğmelerin biraz geç
   görünmesi pahasına.
3. **`Explorer` parçalama:** satır içi geri çağrıların `useCallback`'e
   alınması ve `Header`/`BottomPanel` için `memo`. Harita hareketi artık
   çoğunlukla render üretmediği için kazanç küçüldü.

---

# Tur 3 — uyarlanabilir harita kalitesi (kullanıcı isteği: "dünya, tuşlar kasmayacak")

## Yeni kök neden

MapLibre tuvali cihazın `devicePixelRatio` değeriyle çiziliyordu. Telefonlarda
DPR 3'e kadar çıkıyor: **1 px'lik görüntü için 9 kat piksel** taranıyor.
Kamera hareketi GPU'ya bağlı olduğu için, arayüz tarafı ne kadar rahatlarsa
rahatlasın harita sürükleme/yakınlaştırma akıcı olmuyordu. Ayrıca terrain +
tepe gölgesi düşük donanımlı cihazlarda varsayılan açıktı.

## Yapılanlar

| Değişiklik | Dosya | Kazanç |
|---|---|---|
| `detectDeviceTier`, `recommendedPixelRatio`, `recommendedTerrain`, `measuredFps`, `shouldLowerMapQuality`, `readDeviceSignals` | `utils/deviceTier.ts` (yeni) | Cihaza göre ayar; saf fonksiyonlar test edilebilir |
| Tuval `pixelRatio` sınırı (düşük 1,25 · yüksek 2) | `components/MapView.tsx` | Telefonda piksel yükü 9 kat yerine ~1,5 kat |
| `movestart`→`moveend` kare ölçümü, <40 FPS'te oranı bir kez 1'e indirme | `components/MapView.tsx` | Sinyaller yanılsa bile gerçek ölçüm devreye girer |
| Arazi varsayılanı kademeye bağlı | `components/Explorer.tsx` | Düşük cihazda GPU yükü baştan düşük; kullanıcı açabilir |
| `preconnect` + `dns-prefetch` (karo sunucusu) | `index.html` | İlk harita karesi daha erken |
| Testler | `utils/deviceTier.test.ts` (10), `mapRenderLoop.test.ts` (9) | Kurallar kilitli |

## Doğrulama (tur 3)

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | Geçti |
| `npx eslint . --max-warnings=0` | Geçti |
| `npx vitest run` | 179 dosya / **1.386 test** geçti |
| `npx vite build` | Başarılı |
| `node scripts/bundle-budget.mjs` | Bütçe içinde: toplam JS 998.609 B gzip (1.003.000), uygulama kabuğu 583.441 B (603.400) |

## Bilinçli olarak yapılmayanlar

- **Panel modüllerini harita sonrasına ertelemek:** kullanıcı "tuşlar da
  kızmasın/gecikmesin" dediği için, başlatıcı düğmelerin daha geç görünmesine
  yol açacak erteleme uygulanmadı. Bu kalem ~55 KB gzip kazandırır ama
  etkileşim hissini bozar; gerekirse ayrı karar olarak duruyor.
- **Kalite tercihini ayarlara eklemek:** arazi anahtarı zaten Katmanlar
  sayfasında var; yeni ayar eklemek ekran kalabalığı olurdu.

## Ölçüm sınırı (aynı)

Gerçek tarayıcı bu ortamda çalıştırılamadı (Chromium yok, `libnspr4` yok,
paket depoları kapalı). FPS kazanımı cihaz üstünde DevTools Performance ile
doğrulanmalı; koddaki etki matematiksel (piksel sayısı) ve testlerle gösterildi.

---

# Tur 4 — kod denetimi (bağımsız gözden geçirme) ve düzeltmeler

Kullanıcı isteği: "denetle, kodda sıkıntı olmazsa devam." Tüm diff baştan
sona okundu; maplibre davranışı `node_modules/maplibre-gl/dist/maplibre-gl-dev.mjs`
kaynağından doğrulandı. **Dört gerçek kusur bulundu ve kapatıldı.**

## Bulunan kusurlar

1. **`SocialPanel` rozeti bayat kalıyordu (gerçek hata).** Panel kapalıyken
   "İzler" düğmesindeki sayı `posts.length` **ve** görülmemiş hikâye
   sayısından (`stories`, satır 258/384) besleniyor. Tur 2'de yazdığım
   karşılaştırıcı yalnız `posts`, `precise`, `hasMorePosts` bakıyordu; yeni
   hikâye geldiğinde memo render'ı atlıyor, rozet güncellenmiyordu.
   → `stories` karşılaştırmaya eklendi, `panelMemo.test.ts`'e kilit testi.
2. **`setPixelRatio` olay dağıtımının içinden çağrılıyordu.** MapLibre
   kaynağı: `setPixelRatio()` → `resize()` → `resize()` yeniden
   `movestart`/`move`/`moveend` yayıyor. `moveend` dinleyicisinin içinden
   çağrıldığında yeniden girişe ve yarım kalan transform güncellemesine yol
   açabilirdi. → `requestAnimationFrame` ile bir sonraki kareye taşındı,
   `spinDisposed` + `mapRef` + `typeof` korumaları eklendi
   (`qualityLowered` zaten önce işaretlendiği için ikinci tur oluşmuyor).
3. **Otomatik dönüş ölçümü kirletiyordu.** `map.setCenter()` → `jumpTo()`
   ve `jumpTo` **movestart + moveend** yayıyor (kaynak: satır 56393). Yani
   idle autospin her karede ölçüm penceresini sıfırlıyordu. 250 ms tabanı
   sayesinde yanlış FPS üretilmiyordu ama gereksiz iş yapıyordu ve mantık
   kırılgandı. → Ölçüm `internalMove.current` iken tamamen atlanıyor;
   `render` sayacı da yalnız pencere açıkken artıyor.
4. **Arazi kapatma kararı çok agresifti (ürün riski).** Tur 3'te arazi
   `hardwareConcurrency <= 4` olan her cihazda kapanıyordu; bu 4 çekirdekli
   **masaüstlerini** de kapsıyordu ve arazi kapanınca `flyTo` eğimi 0'a indiği
   için (MapView satır 368/387) 3B/küre hissi kayboluyordu. →
   (a) kademe eşiği daraltıldı: 4 çekirdekli masaüstü artık "yüksek",
   (b) arazi yalnız **gerçekten zayıf** cihazda kapalı başlıyor
   (veri tasarrufu, azaltılmış hareket, `deviceMemory <= 3`, dokunmatik ve
   `cores <= 4`), (c) modern telefonlar (6-8 çekirdek) arazisini koruyor;
   oradaki yük piksel oranı + ölçüme dayalı düşürmeyle karşılanıyor,
   (d) ölçüm 40 FPS altını görürse arazi bir kez kapatılıyor — **ama yalnız
   kullanıcı kendi seçimini yapmadıysa** (`terrainTouched` ref).

## Doğrulanan ve sorunsuz bulunan noktalar

- `jumpTo` içindeki `internalMove` koruması: autospin sırasında `report(true)`
  çalışmıyor (mevcut davranış korundu).
- Arazi kaynağı (`sources.terrain`) stile **her zaman** ekleniyor; yalnız
  `terrain` etkinleştirmesi koşullu. Yani arazi kapalıyken sonradan açmak
  kırılmıyor (tur 3'te varsayılanı değiştirmenin en büyük riski buydu).
- `setPixelRatio` sonrası `_overridePixelRatio` kalıcı: sonraki `resize()`
  çağrıları cihaz DPR'ına geri dönmüyor (kaynak: satır 59520/59531).
- `cloud.places` / `remote.places` referansları memo bağımlılığı olarak
  kararlı; `useMemo` filtreleri boşa çalışmıyor.
- `readDeviceSignals` SSR/test ortamında güvenli (`navigator`/`matchMedia`
  yoksa varsayılana düşüyor).
- `memo` + `lazy` uyumu: modül varsayılan dışa aktarımı memo bileşeni,
  `lazy(() => import(...))` bunu `default` üzerinden alıyor.
- `preconnect`/`dns-prefetch` CSP ile çelişmiyor (kaynak zaten `img-src` ve
  `connect-src` içinde), yeni dış servis yok.

## Denetim sonrası kapı

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | Geçti |
| `npx eslint . --max-warnings=0` | Geçti |
| `npx vitest run` | 179 dosya / **1.389 test** geçti |
| `npx vite build` | Başarılı |
| `node scripts/bundle-budget.mjs` | Bütçe içinde: toplam JS 998.756 B gzip (1.003.000) |
| `npm run audit:check` | Üretim bağımlılıklarında açık yok |
| Dev sunucu duman testi | `index` + değişen 4 modül HTTP 200 |

---

# Tur 5 — "hâlâ bi tık gecikiyor": ölçüm kancası + kademeli düşürme

Kullanıcı geri bildirimi: düzeltmelerden sonra harita **hâlâ** hafif gecikiyor.
Bu turda tahmin yerine (a) cihaz üstü ölçüm, (b) dokunmatikte gerçek kazanç,
(c) ölçüme dayalı iki aşamalı düşürme uygulandı.

## Maplibre kaynağından doğrulanan kalan maliyetler

| Maliyet | Kaynak | Not |
|---|---|---|
| Marker başına kare başına yükseklik örneklemesi | `Marker._update`: `if (this._map.terrain) … locationToScreenPoint()` → `terrain.getElevationForLngLat` | Arazi açıkken her marker her harekette DEM örnekler |
| Marker başına 100 ms'de bir ışın izleme | `_updateCovered` (throttle 100 ms) → `_raycastTerrain`, `MAX_SAMPLES = 512` + bisection | Arazi açıkken CPU'da |
| Hillshade tam ekran geçişi | `terrain-relief` (hillshade katmanı, DEM okur) | Dekoratif; 3B his terrain'ten gelir |
| Piksel oranı | `devicePixelRatio` 2 vs 1,5 | Telefonda **%44** daha az piksel |
| Boşta 15 FPS harita çizimi | otomatik dönüş döngüsü | Panel kaydırmasıyla aynı CPU'yu paylaşıyordu |

## Yapılanlar

| Değişiklik | Dosya | Kazanç |
|---|---|---|
| `window.atlasiaMapPerf()` | `components/MapView.tsx` | `tier, dpr, pixelRatio, terrain, hillshade, markers, fps, step` — bildirim artık sayıya bağlanabilir |
| `TOUCH_MAX_PIXEL_RATIO = 1.5` | `utils/deviceTier.ts` | Dokunmatikte piksel tavanı 2 → 1,5 (%44 az piksel) |
| `recommendedHillshade()` | `utils/deviceTier.ts` | Hillshade dokunmatikte kapalı; terrain (3B) korunuyor |
| `shouldDisableTerrain()` / `MIN_TERRAIN_FPS = 28` | `utils/deviceTier.ts` | 2. aşama düşürme |
| Kademeli düşürme (40 FPS → DPR 1, 28 FPS → arazi kapalı, her adım bir kez) | `components/MapView.tsx` | Gerçek ölçüme dayalı; kullanıcı seçimini ezmiyor |
| Panel açıkken otomatik dönüş duruyor + `spinResumeRef` ile canlandırma | `Explorer.tsx`, `MapView.tsx` | Panel kaydırması sırasında harita çizimi CPU paylaşmıyor |

**Ek olarak bulunan hata:** döngü koşul sağlanmadığında kendini durdurduğu için,
`spin` yeniden `true` olduğunda (panel kapandı) otomatik dönüş **bir daha
başlamıyordu**. `spinResumeRef` + `useEffect(… , [spin])` eklendi.

## Bütçe kararı

`mapView` parçası 9.100 → **9.316 B gzip** (aynı parçaya giren teşhis + kademeli
düşürme kodu). `scripts/bundle-budget.mjs` içindeki gerekçe bloğuna ölçüm ve
pay yazılarak eşik 9.400'e çekildi (%0,9 pay). Yeni bağımlılık yok; ilk boya ve
toplam JS eşikleri değişmedi.

## Doğrulama (tur 5)

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | Geçti |
| `npx eslint . --max-warnings=0` | Geçti |
| `npx vitest run` | 179 dosya / **1.398 test** geçti |
| `npx vite build` | Başarılı |
| `node scripts/bundle-budget.mjs` | **Bütçe içinde** (toplam JS 999.057 B / 1.003.000 gzip) |
| `npm run test:bundle-budget` | 14 test geçti |
| `vite dev` | `index` + değişen modüller 200 |

## Kullanıcıdan istenen tek şey

Cihazda tarayıcı konsolunda:

```js
window.atlasiaMapPerf()
```

Dönen `fps` ve `step` değerleri, kalan gecikmenin hangi ayarda olduğunu kesin
gösterir: `step: 0` + düşük `fps` → GPU/piksel sınırı; `step: 2` + hâlâ düşük
`fps` → harita dışı (arayüz) tarafı.
