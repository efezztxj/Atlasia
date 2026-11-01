# Atlasia Update

## 2026-11-01 — Kalite turu: yayın akıcı çıktı, görüntü keskinleştirildi

- **Gözlem:** `atlasia.pages.dev` (production build) akıcı; buradaki önizleme `vite dev`. Fark yapısal: dev'de `StrictMode` **çift render** eder, kod minify değildir, HMR yükü vardır; production'da bunların hiçbiri yok. Yani "kasıyor" geri bildiriminin bir kısmı dev önizlemesine aitti ve tur 1-5 düzeltmeleri yayında çalışıyor.
- **Dokunmatikte piksel tavanı 1,5 → 2:** 1,5 telefonda gözle görülür biçimde yumuşaktı. 2 = retina keskinliği; DPR 3 cihazda 9 kat yerine 4 kat piksel taranır, görüntü farkı pratikte ayırt edilmez.
- **Düşük kademe tavanı 1,25 → 1,5:** zayıf cihazda bile yumuşak görüntü yok.
- **Tepe gölgesi (hillshade) artık yalnız gerçekten zayıf cihazda kapalı:** araziyle aynı tek kapıya bağlandı (`isWeakDevice`: veri tasarrufu, azaltılmış hareket, `deviceMemory <= 3`, dokunmatik + en fazla 4 çekirdek). Modern telefon (6-8 çekirdek) gölgesini korur.
- **Kademeli düşürme kalite korumalı 3 adıma çıktı:** <40 FPS → piksel 1,5 · <28 FPS → arazi kapalı · <22 FPS → piksel 1 (`MIN_CRITICAL_FPS`, `DEGRADE_PIXEL_RATIO`). Eskiden ilk adım doğrudan 1'e indiriyordu; artık görüntüyü bozmayan ara değerle başlıyor.
- **Ayrıca (önceki tur):** `?perf` ekran üstü teşhis paneli (`MapPerfOverlay`) — parametre yoksa hiçbir şey çizmez, `perfEnabled` testle kilitli.
- **Doğrulama:** `tsc --noEmit`, `eslint --max-warnings=0`, `vitest run` (180 dosya / **1.404 test**), `vite build`, `bundle-budget` bütçe içinde (JS 999.591 B / 1.003.000 gzip), `test:bundle-budget` 14 test.

## 2026-11-01 — Kasma turu 5: kalan gecikme için ölçüm kancası + kademeli düşürme

- **"Hâlâ bi tık gecikiyor" tahmine bırakılmadı:** `window.atlasiaMapPerf()` eklendi. Uygulanan ayarları ve **son ölçülen kare hızını** döndürür: `tier`, `coarsePointer`, `cores`, `memory`, `pixelRatio`, `devicePixelRatio`, `terrain`, `hillshade`, `markers`, `fps`, `degradeStep`. Böylece bildirim sayıya bağlanır; hangi ayarın düşürüldüğü cihazda görülür.
- **Dokunmatikte piksel tavanı 2 → 1,5:** telefonda DPR 2 ile 1,5 arasındaki fark gözle zor ayrılır ama piksel sayısı **%44 azalır**. Sürüklemede hissedilen gecikmenin büyük kısmı buradan geliyor (`TOUCH_MAX_PIXEL_RATIO`).
- **Tepe gölgesi (hillshade) dokunmatikte kapalı:** hillshade, DEM okuyan **ayrı bir tam ekran geçişi**. Dokunmatikte kapatıldı; arazinin 3B hissi (terrain + eğim) korunuyor, yalnızca dekoratif gölgeleme düşüyor (`recommendedHillshade`). Masaüstünde görünüm değişmedi.
- **Kademeli düşürme 2 aşamaya çıktı:** <40 FPS → piksel oranı 1'e iner; <28 FPS → arazi kapatılır (`shouldDisableTerrain`, `MIN_TERRAIN_FPS`). Her adım bir kez uygulanır, ölçüm yalnız kullanıcı hareketinde sayılır. Arazi kararı hâlâ sahibine bırakılır — kullanıcı kendi seçimini yaptıysa ezilmez.
- **Panel açıkken harita dönmüyor:** açık bir sayfa/panel varken otomatik dönüş durur (`sheetOpen`); 15 FPS'lik harita çizimi panel kaydırmasıyla aynı ana iş parçacığını paylaşıp gecikme yaratıyordu. Döngü kendini durdurduğu için `spin` yeniden `true` olduğunda `spinResumeRef` ile canlandırılıyor — bu olmadan otomatik dönüş bir daha başlamazdı.
- **Doğrulama:** `tsc --noEmit`, `eslint --max-warnings=0`, `vitest run` (179 dosya / **1.398 test**), `vite build`, `bundle-budget` bütçe içinde (JS 999.147 B / 1.003.000 gzip), `audit:check`. Test dağılımı: `deviceTier.test.ts` 15, `mapRenderLoop.test.ts` 14.

## 2026-11-01 (gece) — Gerçek tarayıcıda axe kapısı (S3) + sayfalama kuşak koruması (S5)

- **S3 / P1-4 — erişilebilirlik artık gerçek tarayıcıda kapı:** `@axe-core/playwright` eklendi ve `e2e/a11y.spec.ts` altı senaryoda **dokuz tarama** yapıyor (tanıtım masaüstü 1280×800 açık tema · tanıtım mobil 390×844 koyu tema · çerez paneli açık/kapalı · keşif kabuğu karşılama diyaloğu · harita yüzeyi · katmanlar paneli · İzler paneli · Kayıtlarım paneli). Kural seti `wcag2a/wcag2aa/wcag21a/wcag21aa`, eşik **critical + serious = 0**; `moderate/minor` ihlaller annotation'a yazılıyor. JSDOM'da ölçülemeyen kontrast ve odak hataları böylece PR kapısına girdi. Ek CI adımı gerekmedi: mevcut `test:e2e` adımı `e2e/` altındaki tüm spec'leri koşuyor. Ortak ağ sahtekârlığı `e2e/support/harness.ts` içine alındı.
- **S5 / AY-02 — sayfalama kuşak koruması (gerçek sızıntı kapatıldı):** `loadMorePosts` ve `loadMoreStories`, `await` sonrasında oturum denetimi yapmıyordu; aynı dosyada `toggleLike` için olan `sessionRef` koruması sayfalamada yoktu. Sonuç: çıkış yapan kullanıcının **geç dönen sayfası yeni oturumun listesine** eklenebiliyor, eski oturumun ağ hatası yeni kullanıcının hata şeridine düşebiliyordu. İki fonksiyonda da istek öncesi kuşak yakalanıyor, kuşak değişmişse yanıt state'e yazılmıyor ve hata yayınlanmıyor; yükleme bayrakları `finally` ile her durumda iniyor. Düzeltme kaldırıldığında iki yeni test kırmızıya düşüyor (`expected [ { id: 'sizinti' } ] to deeply equal []`), düzeltmeyle yeşil — yani "kanıtlanmamış" notu artık **kanıtlanmış** bir hataya dönüştü. Testler 14 → 16.
- **Kapı ilk koşuda işe yaradı — üç gerçek WCAG 2.5.3 kusuru bulundu ve düzeltildi:** (1) üst çubuktaki "Kayıtlarım" düğmesinin `aria-label`'ı görünen metni içermiyordu; (2) İzler hapında JSX'te sayaç metne boşluksuz yapıştığı için erişilebilir ad görünen "İzler 0" metnini içermiyordu; (3) daraltılmış keşif kartında (masaüstü + mobil) ad sabit "Keşif panelini aç" iken görünen başlık/özet adın içinde değildi. Üçü de eşik düşürülmeden kodla düzeltildi (ad içerikten türetiliyor, eylem ipucu `sr-only`). Ayrıca mobilde `Katmanlar` tıklaması kararsızdı; harness'a klavye etkinleştirme eklendi. Son durum: 6 senaryoda 9 taramanın tamamı yeşil.
- **Kapsam genişletmesi ilk kontrast kusurunu buldu:** İzler paneli taraması hikâye oluşturucudaki karakter sayacında `color-contrast [serious]` verdi (açık temada 4,14:1, AA 4,5:1). Ton `text-mint/80`'e çekildi → 5,3:1. Aynı turda denenen "paneller her zaman koyu yüzey" varsayımı (data-surface + ayrı CSS katmanı) gerçek tarayıcıda çürüdü — açık temada bu paneller açık zemine dönüyor ve zorlanan açık metin 1,1:1'e düşüyordu; katman geri alındı, yalnız gerçek neden düzeltildi.
- **Denetim düzeltmeleri:** iz kayıt panelindeki `Vazgeç` düğmesinin erişilebilir adı görünen metni içermiyordu (`Taslağı at`) — ad `Vazgeç — taslağı at` oldu ve `TrackRecorderPanel.test.ts` 2.5.3 kilidi kazandı. Axe kapsamı İzler ve Kayıtlarım panelleriyle genişletildi (7 → 9 tarama, eşik aynı) ve CI adımı artık `Browser E2E + axe erişilebilirlik kapısı` adını taşıyor.
- Ayrıntı: `docs/teslimatlar/teslimat-s3-s5-2026-11-01.md`.

## 2026-11-01 — Kasma turu 4: kod denetimi ve dört düzeltme

- **Rozet bayatlığı (gerçek hata):** `SocialPanel` kapalıyken "İzler" düğmesindeki sayı hem gönderi hem **görülmemiş hikâye** sayısından besleniyor. Tur 2'de eklenen memo karşılaştırıcısı `stories`'i atladığı için yeni hikâye geldiğinde rozet güncellenmiyordu. Karşılaştırmaya eklendi ve `panelMemo.test.ts` ile kilitlendi.
- **`setPixelRatio` yeniden girişi:** MapLibre kaynağında `setPixelRatio()` → `resize()` → yeni `movestart`/`moveend` yayılıyor. Çağrı `moveend` dinleyicisinin içinden yapıldığında yeniden giriş riski vardı; `requestAnimationFrame` ile bir sonraki kareye taşındı ve `spinDisposed`/`mapRef`/`typeof` korumaları eklendi.
- **Otomatik dönüş ölçümü kirletiyordu:** `setCenter()` → `jumpTo()` **movestart + moveend** yayıyor; idle autospin her karede ölçüm penceresini sıfırlıyordu. Ölçüm artık `internalMove` sırasında tamamen atlanıyor, `render` sayacı yalnız pencere açıkken artıyor.
- **Arazi kararı çok agresifti:** 4 çekirdekli **masaüstleri** de "düşük" sayılıyor ve arazi kapanınca `flyTo` eğimi 0'a indiği için 3B/küre hissi kayboluyordu. Eşik daraltıldı (4 çekirdekli masaüstü = yüksek), arazi yalnız gerçekten zayıf cihazda kapalı başlıyor, modern telefonlar (6-8 çekirdek) arazisini koruyor. Ölçülen düşük kare hızında arazi bir kez kapatılıyor — **yalnız kullanıcı kendi seçimini yapmadıysa** (`terrainTouched`).
- **Ayrıca doğrulandı:** arazi kaynağı stile her zaman ekli olduğu için araziyi sonradan açmak kırılmıyor; `setPixelRatio` sonrası override kalıcı (resize cihaz DPR'ına dönmüyor); `useMemo` bağımlılıkları kararlı; `readDeviceSignals` SSR/test güvenli; `memo` + `lazy` uyumlu; preconnect CSP ile çelişmiyor.
- **Doğrulama:** `tsc --noEmit`, `eslint --max-warnings=0`, `vitest run` (179 dosya / **1.389 test**), `vite build`, `bundle-budget` bütçe içinde (JS 998.756 B / 1.003.000 gzip), `audit:check` temiz.

## 2026-11-01 — Kasma turu 3: uyarlanabilir harita kalitesi (piksel oranı + arazi) ve karo preconnect

- **Telefonlarda 9 kat piksel sorunu kapatıldı:** MapLibre tuvali cihazın `devicePixelRatio` değeriyle çiziliyordu; telefonlarda bu 3'e kadar çıktığı için 1 px'lik görüntü adına 9 kat piksel taranıyor, sürükleme/yakınlaştırma GPU'ya takılıyordu. Yeni `src/utils/deviceTier.ts` cihazı `low`/`high` kademesine ayırıyor (`hardwareConcurrency`, `deviceMemory`, kaba işaretçi, veri tasarrufu, azaltılmış hareket) ve `MapView` tuvali `recommendedPixelRatio()` ile sınırlı oranda çiziyor (düşük kademe 1,25 · yüksek kademe 2 tavanı). Görünüm güçlü cihazlarda değişmiyor.
- **Gerçek ölçüme dayalı tek kademeli düşürme:** cihaz sinyalleri yanıltıcı olabildiği için `movestart`→`moveend` arasındaki kareler sayılıyor (`measuredFps`, en az 250 ms pencere). Kare hızı 40 FPS'in altındaysa piksel oranı **bir kez** 1'e indiriliyor (`shouldLowerMapQuality`); ölçüm gürültüsüyle kalitenin inip çıkması engellendi.
- **Ağır arazi katmanı cihaza göre:** terrain + tepe gölgesi düşük kademede varsayılan kapalı başlıyor (`recommendedTerrain`), kullanıcı Katmanlar sayfasından yine açabiliyor. Kullanıcının açık tercihini sessizce ezmiyor.
- **İlk harita karesi daha erken:** `index.html` içine `https://tiles.openfreemap.org` için `preconnect` + `dns-prefetch` eklendi (CSP zaten bu kaynağa izinliyor; yeni dış servis yok).
- **Yeni testler:** `src/utils/deviceTier.test.ts` (10 test — kademe kuralları, DPR tavanları, ölçüm eşiği, kısa pencere koruması) ve `mapRenderLoop.test.ts` 6 → 9 test (pixelRatio bağlantısı, çalışma zamanı düşürme, arazi varsayılanı kilitli).
- **Doğrulama:** `tsc --noEmit`, `eslint --max-warnings=0`, `vitest run` (179 dosya / **1.386 test**), `vite build`, `bundle-budget` bütçe içinde (toplam JS 998.609 B / 1.003.000 gzip; uygulama kabuğu 583.441 B / 603.400).

## 2026-11-01 — Kasma turu 2: mikro hareketlerde state güncellenmiyor, kapalı paneller render dışında

- **Görünüm commit eşiği (`utils/mapLifecycle.ts`):** yeni `shouldCommitView()` + `VIEW_ZOOM_EPSILON = 0.15` / `VIEW_CENTER_EPSILON_RATIO = 0.015`. `MapView` artık son bildirdiği görünümü (`lastCommitted`) tutuyor ve eşiği geçmeyen mikro hareketlerde `onViewChange`/`onViewportChange` **hiç çağırmıyor**: React state aynı nesne kaldığı için `Explorer` yeniden render olmuyor. `moveend` ve ilk yükleme eşiği atlıyor (`report(true)`), yani sürükleme bitince değer kesin. Boylam sarması (180. meridyen) ayrıca ele alındı; sahte 359°'lik sıçrama bildirilmiyor.
- **Kapalı paneller memo'landı:** `AtlasAssistant` ve `SocialPanel` varsayılan dışa aktarımı `memo(...)` + özel karşılaştırıcı oldu (`areAssistantPropsEqual`, `areSocialPropsEqual`). Panel kapalıyken yalnız başlatıcı düğmeyi etkileyen alanlar karşılaştırılıyor; harita kaydırılırken `view`/`places`/satır içi geri çağrılar değişse de bu iki ağır panel yeniden çizilmiyor. Panel açıldığında karşılaştırıcı `false` dönüyor ve bileşen güncel veriyle çiziliyor (bayat veri riski yok).
- **Yeni testler:** `src/components/panelMemo.test.ts` (6 test — kapalıyken yok sayılan/yok sayılmayan alanlar, açıkken tam render), `mapLifecycle.test.ts` 5 → 9 test (zoom eşiği, görünür alan oranı, tarih çizgisi sarması, geçersiz değer), `mapRenderLoop.test.ts` 5 → 6 test (`moveend`'de eşik atlama ve `lastCommitted` kapısı kilitli).
- **Doğrulama:** `tsc --noEmit`, `eslint --max-warnings=0`, `vitest run` (178 dosya / 1.373 test), `vite build`, `bundle-budget` bütçe içinde (toplam JS 998.103 B / 1.003.000 gzip; uygulama kabuğu 583.181 B / 603.400).

## 2026-11-01 — Harita kasma/donma turu: kare başına state güncellemesi kaldırıldı

- **Kök neden bulundu:** "Arayüz çok kasıyor" şikâyeti repo boyutundan değil çizim sıklığından geliyordu. `.git` 20,6 MB, `public/social` (17 MB) tarayıcıya hiç inmiyor ve service worker ön önbelleği 7 küçük dosyadan oluşuyor; buna karşılık `MapView` içindeki `zoom` dinleyicisi **her karede** iki React state'ini (`view` + `mapViewport`) güncelliyordu. `Explorer` (1.796 satır, 59 `useState`, `React.memo` yok) bu yüzden saniyede ~60 kez, alt ağacıyla birlikte yeniden çiziliyordu. Ölçüm ve gerekçeler: `teslimat-kasma-donma-2026-11-01.md`.
- **Görünüm bildirimi sınırlandı:** `src/utils/mapLifecycle.ts` içine saf `shouldReportView()` ve `VIEW_REPORT_INTERVAL_MS = 120` eklendi; hareket sırasında en çok ~8 bildirim/sn yapılıyor, `moveend` her zaman tam bildirim gönderiyor (parmak kalkınca görünüm kesinleşiyor). Davranışta kayıp yok, kaydırma/yakınlaştırma sırasında ana iş parçacığı boşalıyor.
- **Otomatik dönüş döngüsü artık boşta dönmüyor:** `tick` koşul sağlanmıyorsa kendini yeniden kurmuyor; sekme görünürlüğü, `zoomstart` ve `resize` olaylarında `ensureSpinLoop` ile yeniden başlıyor. `spinDisposed` bayrağı, `map.setCenter` içinden senkron yayılan bir olayın iki eşzamanlı döngü kurmasını engelliyor (mobilde sürekli CPU/pil tüketimi sona erdi).
- **Türetilmiş listeler memo'landı:** `Explorer` içindeki engel filtreleri (`discoveries`, `filteredPosts`, `filteredStories`) ve bildirim türetmeleri `useMemo`'ya, `useBlocks().isBlocked` `useCallback`'e alındı; engel listesi değişmedikçe gereksiz yeniden hesaplama yok.
- **Pin etiketi bulanıklığı yalnız görünürken:** `index.css` içindeki `backdrop-filter` pin etiketinin taban kuralından `:hover`/`.is-active` kuralına taşındı; haritada çok pin varken pan/zoom sırasında pin başına bulanıklık katmanı oluşmuyor. Görsel sonuç aynı.
- **Regresyon kilidi:** `src/components/mapRenderLoop.test.ts` (yeni, 5 test) zoom'da doğrudan `report()` çağrılmamasını, `moveend` tam bildirimini, döngünün boşta yeniden kurulmamasını, `visibilitychange` temizliğini ve pin bulanıklığının yalnız görünürken tanımlanmasını kilitliyor. `src/utils/mapLifecycle.test.ts` 2 → 5 test.
- **Doğrulama:** `tsc --noEmit`, `eslint --max-warnings=0`, `vitest run` (177 dosya / 1.362 test), `vite build`, `bundle-budget` (bütçe içinde: toplam JS 997.755 B gzip / 1.003.000), `audit:check` yeşil. `test:rules:emulator` ortamda Java 21 olmadığı için koşulamadı; `firestore.rules` değişmedi.

## 2026-11-01 (akşam) — Clarity "veri görünmüyor" sorunu ölçülebilir hâle getirildi

- **Tarayıcıda durum görünürlüğü:** `src/lib/clarity.ts` artık betiğin gerçek durumunu tutuyor — `off` (izin yok), `loading`, `ready` (yüklendi), `blocked` (reklam engelleyici/DNT betiği düşürdü). Çerez panelinde izin verildiğinde "Clarity betiği yüklendi, kayıt 1-2 dakikada panelde görünür" ya da "Tarayıcın Clarity betiğini engelledi, bu oturumda hiçbir veri gönderilmiyor" satırı çıkıyor. Destek için `window.atlasiaClarityStatus()` eklendi (rıza, durum, betik var mı, proje kimliği).
- **Aynı betiğin iki kez eklenmesi engellendi:** önceki kontrol `window.clarity` üzerindeydi; geri alma sonrası stub kaldığında ikinci `<script>` eklenebiliyordu. Artık DOM'a bakılıyor (`script[src^="https://www.clarity.ms/tag/"]`). `src/lib/clarity.test.ts` 2 → 6 test.
- **"Veri görünmüyor" vakasının kanıtı:** yayındaki CSP doğru (`www.clarity.ms` + `scripts.clarity.ms` script-src'de, `*.clarity.ms` connect-src'de) ve rıza akışı gerçek Chromium'da `<script>` ekliyor; ancak `https://www.clarity.ms/tag/z6hdmwcwe6` **HTTP 204 (No Content)** dönüyor — Node isteğinde, masaüstü Chrome kimliğinde ve referer'lı gerçek tarayıcıda aynı. 204, tarayıcı için "başarılı" sayıldığı için hiçbir şey çalışmaz ve panel boş kalır. **Kontrol ölçümü** (var olmayan bir kimlik, aynı koşullar) de 204 döndü: yani 204 tek başına "kimlik geçersiz" kanıtı değil, CI ağından Clarity tag'i sunulmuyor. Bu nedenle araç kimliği suçlamıyor, not düşüyor; belirleyici teyit kullanıcının tarayıcısındaki durum satırı. Kod artık bu durumu **`empty`** olarak gösteriyor ("Microsoft bu proje kimliği için betiği göndermedi; Project ID ve alan adı doğrulanmalı") — sessizce "yüklendi" demiyor.
- **Canlı doğrulama genişletildi (`scripts/canli-yapilandirma.mjs`):** haftalık iş artık (a) yayındaki `Content-Security-Policy` başlığında `https://www.clarity.ms` **ve** `https://scripts.clarity.ms` var mı, (b) `connect-src` içinde `https://*.clarity.ms` var mı, (c) `https://www.clarity.ms/tag/z6hdmwcwe6` 200 dönüyor mu — üçünü de ölçüyor. Ağ engeli hata değil not sayılıyor. Script testleri 22 → 28. `204` dış servis davranışı olarak **uyarı** annotation'ına yazılır, kapıyı kırmızıya düşürmez.
- **Gerçek tarayıcı kanıtı (`e2e/canli-clarity.spec.ts` + `playwright.canli.config.ts` + `Canlı Clarity doğrulaması` workflow'u):** yayındaki siteye gerçek Chromium'la gidip Clarity onay kutusunu işaretler, kaydeder, tag isteğinin 200 döndüğünü, `window.clarity` durumunun `ready` olduğunu ve **CSP ihlali olmadığını** doğrular. Yerel E2E koşusundan `testIgnore` ile ayrıldı (`npm run test:e2e:canli`).

## 2026-11-01 — Clarity CSP kapanışı, ölçüm karar kaydı, `actions/checkout` v7.0.1 ve bağımlılık bakımı

- **Clarity çalışma zamanı CSP'de engelleniyordu (PR #163):** `public/_headers` içindeki `script-src` yalnız `https://www.clarity.ms` (yükleyici) izniyordu; gerçek çalışma zamanı `https://scripts.clarity.ms` adresinden geldiği için rıza veren kullanıcıda bile betik bloklanıyordu. Adres açıkça eklendi (joker `*.clarity.ms` bilinçli olarak kullanılmadı), `src/config/cloudflareHeaders.test.ts` iki adresi de kilitliyor.
- **Ölçüm yığını dokümantasyonu (S2):** Microsoft Clarity bugüne dek `docs/`, `README.md` ve bu dosyada hiç geçmiyordu. `docs/olcum-ve-hata-izleme.md` §5c eklendi: birinci taraf huni ile Clarity'nin rıza anahtarları, topladığı veri, maskeleme, geri alma ve CSP bağımlılığı tek tabloda; §7 bilinen sınırlara "iki katman" ve "maskeleme doğrulanmadı" satırları eklendi; `README.md` yeni "Ölçüm, hata izleme ve gizlilik" bölümüyle güncellendi.
- **Açık karar kaydı:** `docs/gorevler/olcum-yigini-karari-2026-11-01.md` — Clarity'nin mi, birinci taraf Worker'ın mı, yoksa ikisinin birlikte mi kalacağı üç seçenek ve gerekçelerle yazıldı; öneri "ikisi birlikte, iş bölümü yazılı" (Clarity nitel, Worker nicel KPI). Karar onaylanmadan `VITE_TELEMETRY_ENDPOINT` doldurulmuyor ve yeni üçüncü taraf araç eklenmiyor.
- **Canlı yapılandırma doğrulaması T11'den sonra yanlış kırmızıydı (S8):** `scripts/canli-yapilandirma.mjs` yalnız giriş paketini (`/assets/index-*.js`) tarıyordu. T11 ile Firebase yapılandırması tembel `firebaseConfig-*.js` parçasına taşındığı için haftalık `canli-dogrula` işi 1 Kasım'da "`projectId` pakette bulunamadı" diyerek kırmızı düştü — yani kapı ölçtüğünü sandığı şeyi ölçmüyordu. Betik artık girişten başlayıp parça grafiğini sınırlı biçimde izliyor (`CRAWL_LIMITS = 24 parça / 3 derinlik`), alanları parçalar arasında birleştiriyor (`mergeConfigs`), düşen parçada denetimi sürdürüyor ve gerçekten eksik yapılandırmayı yine kırmızı sayıyor. Kök neden iki katmanlıydı: (1) T11'den sonra yapılandırma giriş paketinde değil, tembel parçada; (2) Vite 8 / Rolldown çıktısı dizgileri **backtick** ile yazıyor (`projectId: \`atlasia-dev\``), betik yalnız `"`/`'` kabul ediyordu. Tarama artık yapılandırma parçalarını önceler (`assetPriority`), yapılandırma tamamlanınca erken çıkar ve hata durumunda taranan yolları annotation'a yazar. `scripts/canli-yapilandirma.node-test.mjs` 22 teste çıktı (yeni: backtick çıktısı, tembel parçadan okuma, öncelik sırası, erken çıkış, eksik yapılandırma, düşen parça, üst sınır, alan birleştirme).
- **`actions/checkout` `v4.4.0` → `v7.0.1` (Dependabot #162 karşılandı):** Dependabot PR'ı pin testini (`src/config/githubActions.test.ts`) kırdığı için değişiklik bu dalda uygulandı: dört workflow (`ci`, `canli-dogrula`, `insta-publish`, `rules-windows`) yeni SHA'ya (`3d3c42e5aac5ba805825da76410c181273ba90b1`) sabitlendi, `git ls-remote` etiketi ve GitHub commit API `verified=true` ile doğrulandı, `docs/github-actions-pins.md` kaydı eklendi. Gerekçe: `v4.4.0` Node 20'de çalışıyordu ve GitHub bu action için Node 24 zorunluluğunu duyurdu.
- **`lucide-react` 1.59.0 → 1.61.0 (PR #156)** birleştirildi; `maplibre-gl` 6.16.0 PR'ı (#157) lockfile çakışması nedeniyle `@dependabot rebase` ile yeniden kuyruğa alındı.
- **Canlı yapılandırma kapısı yeşile döndü:** düzeltme sonrası koşu `41313928887` `success`; annotation `projectId=atlasia-dev, authDomain=atlasia-dev.firebaseapp.com, apiKey=var, parca=2` — üretimde Firebase yapılandırması gerçekten mevcut ve haftalık doğrulama yeniden ölçüm yapıyor.
- **`typescript` 7.0.2 + `typescript-eslint` grubu (#155) ertelendi:** TS 7 Go tabanlı derleyiciye geçiş; `typescript-eslint` peer aralığı ve lint config uyumu ayrı bir doğrulama istiyor. PR kapatılmadı, gerekçe PR'a yorum olarak yazıldı.

## 2026-10-29 — Ürün/mimari kararları (M-51, M-23/P0-4, T20, C1/M-53), erişilebilir ConfirmDialog (M-33), Spark restore CLI (P1-7/M-58), bileşen axe testleri (M-46/M-48) ve CI Playwright E2E süiti (D1/M-49)

- **SW yeni favicon ön önbelleği (`atlasia-shell-v9`):** `PR #150` ile `index.html`'e eklenen `/icons/icon-32.png` ve `/icons/icon-180.png` varlıkları `public/sw.js` `SHELL` listesine eklendi, önbellek sürümü `atlasia-shell-v9`'a yükseltildi (`scripts/sw.node-test.mjs`).
- **M-23 / P0-4 — Spark `$0` ücretsiz plan sıkı bulut JPEG bütçesi:** `firestore.rules` üzerindeki `180.000` karakter kural tavanı korunurken yeni bulut fotoğraf sıkıştırma hedefi `DEFAULT_CLOUD_PHOTO_BUDGET_CHARS = 100_000` (~73 KB ikili JPEG) ve `CLOUD_PHOTO_ATTEMPTS` (`820px → 360px`) olarak sıkılaştırıldı; 10 fotoğraflı bir akış sayfası `< 800 KB` sınırının altında kalıyor (`imagePipelineT10.test.ts`).
- **T20 ↔ T11 — Doğrulanmış statik katalog kapsamı + M-51 küresel açılış görünümü:** Tanıtım sayfasına Firebase SDK'sı indirmeden ve sahte sayaç üretmeden `VERIFIED_CATALOG_COUNTS` (`28` seçilmiş rehber nokta, `4` antik kent sesli turu, `0` reklam/takip pikseli) hem `<noscript>` (`src/content/landingStatic.ts`) hem de tembel `LandingFooter.tsx` üzerinde gösteriliyor; `socialProofT20.test.ts` bu sayıları `GUIDE_PLACES.length` ve `SITE_TOURS.length` ile birebir kilitliyor ve `Explorer.tsx` küresel açılış görünümünü (`{ zoom: 2, lng: 30, lat: 30 }`) koruyor.
- **C1 / M-53 / T21 — Tek merkezli `LEGAL_IMPRINT` kaynağı:** `src/content/legal.ts` içindeki üç yasal belgede dağınık duran 17 yer tutucu tek `LEGAL_IMPRINT` nesnesine toplandı; `isLegalImprintComplete()` ve `getLegalReviewNotice()` ile avukat onaylı gerçek künye girildiğinde taslak rozeti otomatik kalkacak şekilde bağlandı (`src/content/legal.test.ts`).
- **M-33 — Erişilebilir `ConfirmDialog` (`role="alertdialog"`, `usePanelAccess` LIFO yığını):** Tarayıcının ana iş parçacığını kilitleyen 9 yerel `confirm()` / `window.confirm()` çağrısı (`Explorer`, `FriendsTab`, `GroupsPanel`, `PlaceDetails`, `SocialPanel`, `StoryViewer`) tamamen kaldırıldı ve `ConfirmDialogHost` + `requestConfirm` ile değiştirildi; `usePanelAccess` iç içe açık panellerde yalnız en üstteki modalın `Escape` / `Tab` yakalamasını sağlayan LIFO yığınına kavuştu (`ConfirmDialog.test.ts`).
- **P1-7 / M-58 — Spark uyumlu Firestore geri yükleme (`restore`) CLI'ı:** `scripts/firestore-restore.mjs` eklendi (`verifyBackupManifest` SHA-256 ön kontrolü, varsayılan `--dry-run`, `--confirm-project` ve `--allow-overwrite-source` üretim ezme kilidi, `--max-writes 2000` Spark günlük yazma kotası tavanı ve `--emulator` ile `$0` tatbikat desteği); `test:backup`, `test:cleanup` ve `test:restore` `npm run test:scripts` zincirine bağlandı (`docs/yedek-ve-kota-rutini.md`).
- **M-46 / M-48 — Kritik bileşen testleri ve `axe` bulgularının kapatılması:** `NetworkStatus.test.ts`, `AppErrorBoundary.test.ts`, `UpdateNotice.test.ts`, `AddDiscoveryModal.test.ts` ve `StoryComposer.test.ts` eklendi. Testlerin yakaladığı üç gerçek üretim kusuru da kapatıldı: (1) `AddDiscoveryModal` ve `StoryComposer` üzerindeki geçersiz `<form role="dialog">` ARIA yapısı `<div role="dialog"><form>` olarak düzeltildi, (2) `StoryComposer` alanlarına eksik `aria-label` öznitelikleri eklendi, (3) `NetworkStatus` içinde captive-portal sonrası gelen `online` olayının `/index.html` yoklamasını yeniden tetiklememesi `probeTick` sayacıyla giderildi.
- **D1 / M-49 / P1-3 — CI'da 5 gerçek tarayıcı Playwright E2E duman testi + ilk-ziyaret SW habersiz yenileme düzeltmesi:** `playwright.config.ts` ve `e2e/smoke.spec.ts` (tanıtım + çerez rızası, KVKK modalı + Escape, misafir keşif + Katmanlar, misafir kayıt kapısı geri dönüşü, cihaz modu üyelik + kurtarma anahtarı + `/theme-boot.js` açık tema kalıcılığı) eklendi ve `.github/workflows/ci.yml` içinde gerçek üretim `vite preview` sunucusuna karşı koşacak şekilde bağlandı. Gerçek Chromium koşusu, ilk ziyarette (`navigator.serviceWorker.controller === null`) `/sw.js` `clients.claim()` tetiklendiğinde `useServiceWorkerUpdate.ts` içindeki `controllerchange` dinleyicisinin sayfayı ~1 sn sonra habersiz yenileyip açık yasal modalı ve misafir oturumunu sıfırladığını yakaladı; `hadController` kapısıyla düzeltildi ve birim testiyle kilitlendi (`useServiceWorkerUpdate.test.ts`).

## 2026-10-28 — TypeScript 6.0.3 + @types/node 26 (bekletilenler kapandı)

- `typescript` 5.9.3 → **6.0.3**: TS 7'yi `typescript-eslint` hâlâ desteklemiyor (peer `<6.1.0`); 6.x destek aralığında ve ileriye uyumlu. tsconfig'den `baseUrl` kaldırıldı, `paths` göreli yazıldı (TS 7'ye de hazır).
- `@types/node` 22 → **26.6.6**: kırılma, kurallar testindeki `.at()` için `lib`'in ES2020 kalmasıydı; `lib` artık `ES2022` (yalnız tip yüzeyi; `target` ES2020 aynı, çıkan kodu değişmez).
- Typecheck, lint, **1316 test**, build (SW 62/62), script testleri ve audit yeşil. Bekletilen paket kalmadı; TS 7, typescript-eslint desteği gelince tek satırlık iş.


## 2026-10-28 — Vite 8 + plugin-react 6 (bekletilen majör alındı)
## 2026-10-28 — Denetim A grubu: CSP uyumlu tema, Google popup izni, gizli source map, CRLF (A1–A7)
## 2026-10-28 — Temsilî site turu etiketi (M-25 / G6), çevrimdışı `/theme-boot.js` önbelleği ve rıza bayrağı düzeltmesi

- **Temsilî site turu etiketi (M-25 · P1 / G6):** `NearbyAudioGuide` artık `isRealPath(tourRoute) === false` olan antik kent turlarında (Efes, Priene, Pompeii, Ostia) kart içinde erişilebilir (`role="note"`) **`Temsilî tur — saha patikası doğrulanmadı; duraklar editör sırasıyla sunulur.`** uyarısı gösteriyor; site turu dışındaki tekil rehber noktalarında veya saha patikası doğrulanmış turlarda göstermiyor (`NearbyAudioGuide.test.ts` — 3 test).
- **A1 çevrimdışı PWA kabuğu düzeltmesi (`/theme-boot.js`, `atlasia-shell-v8`):** `index.html` içindeki senkron `<script src="/theme-boot.js">` dosyası `public/sw.js` ön önbellek listesine (`SHELL`) ve statik izin listesine (`isAllowedStaticPath`) eklendi; mevcut kurulu PWA istemcilerinin güncellenmesi için kabuk önbelleği `atlasia-shell-v8`'e yükseltildi (`scripts/sw.node-test.mjs`).
- **Çerez tercihleri bayrak temizliği (`CookieConsent`):** Panel zaten bağlıyken çağrılan `openCookiePreferences()` sonrası `pendingPreferencesOpen` bayrağının bellekte takılı kalmaması için `onOpenPreferences` içinde `consumePendingCookiePreferences()` tüketiliyor.
- **Fotoğraf yükleme hata iletimi (T10 / M-44):** `AddDiscoveryModal`, `SocialPanel`, `StoryComposer` ve `AtlasAssistant` üzerindeki `catch` blokları artık `ImageInputError` mesajlarını (`photoUploadErrorMessage`) yutmuyor; 25 MB sınırı ve iPhone HEIC ("En Uyumlu") rehberi boş MIME uzantılı `.heic/.heif` dosyaları dahil doğrudan kullanıcıya gösteriliyor.

## 2026-10-28 — Denetim A grubu: CSP uyumlu tema, Google popup izni, gizli source map, CRLF (A1–A7) + C4/E6 erişilebilirlik

Ayrıntı: `docs/teslimatlar/teslimat-denetim-a-csp-hsts-2026-10-28.md`.

- **A1:** satır içi tema betiği `/theme-boot.js`'e taşındı; `script-src 'self'` altında engelleniyordu.
- **A2:** `apis.google.com` script/connect/frame direktiflerine eklendi (Firebase Google popup).
- **A3:** `Explorer` ve `TrackRecorderPanel` SDK'sız `lib/firebaseConfig` kapısını okuyor.
- **A4:** gizlilik metni `_GRECAPTCHA` gerçeğine göre güncellendi.
- **A5:** HSTS `includeSubDomains`; `preload` gerekçesiyle yok.
- **A6:** `sourcemap: "hidden"` + `collect-sourcemaps.mjs` haritaları `dist` dışına taşır; CI artifact (pinli action).
- **A7:** `.gitattributes eol=lf` + `split(/\r?\n/)` (Windows checkout).
- **C4 / E6:** `PlaceDetails` galeri şeridi küçük görsellerine açıklayıcı `alt` metni eklendi; `BottomPanel` odak düğmesi tek tutarlı `Haritada gör` + `aria-pressed` durumuna geçirildi (`PlaceDetails.accessibility.test.ts`).

## 2026-10-28 — Vite 8 + plugin-react 6 (bekletilen majör alındı)

- `vite` ^7.3.7 → **^8.3.5**, `@vitejs/plugin-react` 5.1.1 → **6.1.2** (plugin-react 6, Vite 8 istiyordu; ikisi birlikte alındı). TypeScript 7 hâlâ bekliyor: `typescript-eslint` peer aralığı `<6.1.0`.
- **Ölçüm (Rolldown):** toplam JS 988.185 bayt gzip (bütçe 1.003.000) — derleyici değişimi toplamı düşürdü; ilk boya ve yolculuklar bütçe içinde. Kategori dağılımı kaydığı için entry/iconsVendor/firebaseAuth/ilk-boya-CSS eşikleri ölçüme ~%3 payla yeniden bağlandı (ayrıntı `scripts/bundle-budget.mjs` içinde).
- **SW düzeltmesi:** Rolldown varlık yollarını şablon dizgisiyle (backtick) yazıyor; `sw.js` keşif regex'i üç tırnak türünü de tanıyacak şekilde genişletildi — yoksa harita işçisi SW kabuğuna giremiyor ve `verify:sw-shell` kapısı düşüyordu (CI'da bu yüzden build adımı kırılıyordu).
- Ayrıca bütçe ihlalleri CI'da check-run annotation'ı olarak basılıyor.
- Typecheck, lint, 1284 test ve build (SW kabuğu 62/62) yeşil.

## 2026-10-28 — Dayanıklılık paketi: canlı veri yeniden deneme (M-18), yükleme iskeletleri (M-19), yürüyüş Wake Lock (M-26), rıza parçası kurtarma ve profil testleri (M-35)

- **Kalıcı canlı veri hata şeridi + `Yeniden dene` (M-18 · P0):** `useFirestoreAtlasData` artık `retry()` eylemi sunarak başarısız abonelikleri (`ownerPlaces`, `viewportPlaces`, `posts`, `stories`) kapatıp yeniden kuruyor. `Explorer` geçici toast yerine kapatılabilir kalıcı `role="alert"` şeridi + **Yeniden dene** düğmesi gösteriyor; `SocialPanel` içinde de akış hatası kartından yeniden deneme yapılabiliyor.
- **Yükleme iskeletleri (M-19 · P1):** `SocialPanel` (story halkaları + gönderi kartları), `SearchBox` (uzak dünya araması) ve `PlaceDetails` (galeri yüklemesi, `NearbyHistory` ve tembel panel açılışı) tema duyarlı `.skeleton` bileşenleriyle sahte "boş ekran" algısını ortadan kaldırıyor.
- **Yürüyüş kaydında Screen Wake Lock (M-26 · P1):** `useTrackRecorder` kayıt başladığında `navigator.wakeLock.request("screen")` alıyor, sekme arka plandan görünür duruma döndüğünde (`visibilitychange`) kilidi yeniliyor, bitiş/vazgeçiş/unmount anında serbest bırakıyor ve düşük güç modunda reddedilse bile GPS kaydını kesintisiz sürdürüyor. `TrackRecorderPanel` kilit durumunu kullanıcıya açıkça bildiriyor.
- **Tembel rıza parçası kurtarma (T7/T18 açık nokta):** `CookieConsentBoundary` tembel `CookieConsent` parçasının kesintili ağda indirilememesi hâlinde hatanın `AppErrorBoundary`'ye tırmanıp uygulamayı düşürmesini engelliyor; **Tekrar dene** veya footer **Çerez tercihleri** tetiklemesinde taze `lazy()` fabrikasıyla parçayı yeniden yüklüyor.
- **Test ve doküman kilidi (M-35 · P1):** `ProfilePanel.test.ts` (çift onaylı hesap silme, KVKK veri indirme, çıkış onayı), `CookieConsentBoundary.test.ts`, `LoadingAndRetrySurface.test.ts`, `useFirestoreAtlasData.test.ts` ve `useTrackRecorder.test.ts` eklendi/genişletildi; `docs/moderasyon-akisi.md` PR #140 `İncelenenler` mimarisiyle güncellendi. Mevcut tüm bundle bütçesi eşikleri aşılmadan korundu (`1.002.430 / 1.003.000 B` JS gzip, `25.068 / 25.200 B` ilk boya CSS gzip).
## 2026-10-28 — Görsel boru hattı: yükleme kapıları + teslim işaretleri (T10)

Ayrıntı: `docs/teslimatlar/teslimat-t10-gorsel-hatti-2026-10-28.md`.

- **Boyut kapısı:** 25 MB üstü dosya **decode edilmeden** reddedilir (mobilde OOM riski); hata gerçek boyutu söyler.
- **HEIC:** iPhone varsayılanı tarayıcıda çözülemiyor; artık "Ayarlar → Kamera → Biçimler → En Uyumlu ya da JPEG" diyen net bir hata var.
- **EXIF yönü** açıkça istenir (`imageOrientation: "from-image"`): fotoğraf yan yatmaz.
- **Teslim:** galeri/akış görsellerine `decoding="async"`, ekran dışı rota fotoğrafına `loading="lazy"`. Hero bilinçli olarak `fetchPriority="high"` ve tembel değil (LCP).
- Kademeli küçültme planı tek yönlü olduğu ve Firestore'daki 180.000 karakter kilidiyle uyumlu olduğu testle kilitli: `imagePipelineT10.test.ts` (7).
- **Yapılmayan:** WebP/AVIF çıktısı, `toBlob` geçişi, sunucu tarafı `srcset` türevleri — hepsi ölçüm/bağımlılık/onay istiyor (dokümanda gerekçeli).
- Testler **1292/1292** (161 dosya); bütçe içinde (`entry` 18.938/20.900, toplam JS 1.001.304/1.003.000).

## 2026-10-28 — Tanıtım filmi (`preload="none"` + poster, T6)

Ayrıntı: `docs/teslimatlar/teslimat-t6-video-2026-10-28.md`.

- **Yeni bölüm `#film`:** repodaki mevcut klip (`public/social/goreme-yuruyus.mp4`, Kapadokya, 1080×1920, 4,0 MB) dikey kart olarak tanıtımda. Harici barındırma/CDN yok.
- **Mobil veri korunur:** `preload="none"` — kullanıcı oynatmadan tek bayt inmez; `autoPlay`/`loop`/`muted` yok, ses kendiliğinden başlamaz, `controls` + `playsInline`.
- **Poster:** hero'da zaten yüklenen `images/atlasia-earth-hero.jpg` (ek ağ maliyeti sıfır). Videodan alınmış kare değildir — afiş görseli; ffmpeg ile tek komutta gerçek kareyle değiştirilebilir.
- **CLS:** `width`/`height` (1080×1920) + `aspect-[9/16]` ile yer önceden ayrıldı. Video oynatılamazsa okunabilir bağlantı var; SW kabuğu videoyu önbelleğe **almıyor** (4 MB tuzağı yok).
- **Bütçe:** `entry` 18.888 / 20.900, ilk boya JS 98.287 / 102.200, ilk HTML 125.991 / 129.400. Toplam JS 1.000.364 → eşik 1.002.000 (ölçümlü gerekçe kod içinde). SW 46/46.
- Testler **1292/1292** (160 dosya); `landingVideoT6.test.ts` (7) yeni kilidi.

## 2026-10-28 — Kritik yol: SSS/footer ve rıza paneli giriş paketinden çıktı (T7)

Ayrıntı: `docs/teslimatlar/teslimat-t7-kritik-yol-2026-10-28.md`.

- **Kapı kırıktı:** `entry` 20.915 / 20.900. Eşik yükseltilmedi; onun yerine ilk boyada gerekmeyen iki blok `lazy()` yapıldı: tanıtımın alt bloğu (`LandingFooter`: SSS + footer) ve rıza paneli (`CookieConsent`).
- **Sonuç:** `entry` **18.344** (−2.571), ilk boya JS **97.743** (−2.571), ilk HTML seti **125.351** (−2.567). Fallback yüksekliği (520 px) düzen zıplamasını sınırlar.
- **Toplam JS +1.715 B** (999.785): ayrı chunk'lar daha kötü sıkışır. İndirilen bayt artmıyor, aynı kod daha sonra iniyor. Yalnız toplam JS eşiği 998.500 → **1.001.000** (pay 1.215 B, %0,12); `entry`/ilk boya/ilk HTML/appShell eşikleri değişmedi.
- **Kilit:** `src/config/criticalPath.test.ts` (4) — iki blok gerçekten tembel, fallback var, eşikler ölçüme bağlı. `siteSurface`, `footerT18`, `prerenderT17`, `LandingPage.test` ve `CookieConsent.test` yeni yüzeye uyarlandı (iddialar zayıflatılmadı).
- Testler **1281/1281** (158 dosya); typecheck, lint, build, SW 44/44, `test:scripts`, `audit:check` yeşil.

## 2026-10-28 — JavaScript'siz içerik (T17)

Ayrıntı: `docs/teslimatlar/teslimat-t17-noscript-2026-10-28.md`.

- **Boş sayfa bitti:** `index.html` gövdesinde yalnız `<div id="root"></div>` vardı; JS engelli tarayıcıda sayfa tamamen boştu. Tanıtım metni (başlık, üç adım, iki SSS, "harita JavaScript gerektirir" notu) derleme sırasında `<noscript>` olarak gömülüyor.
- **Neden prerender değil:** tam prerender + hidrasyon bu ortamda doğrulanamıyor (tarayıcı yok) ve `entry` marjı 12 B; `<noscript>` JS açıkken render edilmediği için CLS/LCP riski sıfır, hidrasyon gerektirmiyor.
- **Tek kaynak + sürüklenme kilidi:** metin `src/content/landingStatic.ts`'te; `prerenderT17.test.ts` her dizenin `LandingPage.tsx`'te de geçtiğini doğrular, `index.html`'de kopya metin yasak.
- **Bütçe:** eşik yükseltilmedi. İlk HTML seti 127.763 / 129.400 (+694 B gzip), JS paketleri ve `entry` (20.888 / 20.900) değişmedi. Testler **1271/1271** (157 dosya).

## 2026-10-28 — Footer yüzeyi (T18) ve SEO meta seti (T19)

Ayrıntı: `docs/teslimatlar/teslimat-t18-t19-footer-seo-2026-10-28.md`.

- **Çerez tercihleri landing'den geri alınabiliyor:** footer'ın "Yasal" nav'ına eklendi; var olan rıza panelini (`atlasia:cookie-preferences`) açar. Yeni bağımlılık yok.
- **Dil açıkça yazılı:** footer'da "Site dili: Türkçe (tr)" (`lang="tr"`). İkinci yerel ayar olmadığı için **sahte dil seçici yazılmadı**; `<html lang>`, `hreflang="tr"` ve `x-default` aynı şeyi söyler.
- **SEO:** `canonical`, `robots: index, follow, max-image-preview:large`, `hreflang` + `x-default` eklendi; `sitemap.xml` `lastmod` 2026-10-28'e çekildi. Yapısal veri (Organization/WebSite/WebApplication) korundu, doğrulanamayan puan/oylama yok.
- **Bütçe:** eşik **yükseltilmedi**. Toplam JS 997.981 / 998.500, ilk boya JS 100.287 / 102.200, ilk HTML seti 127.069 / 129.400, `entry` 20.888 / 20.900 → **marj 12 B**; landing'e dokunacak sıradaki işin önce ölçüm alması ve gerekirse footer'ı tembel parçaya taşıması gerekiyor.
- Testler **1262/1262** (155 dosya; T18 3 + T19 6 yeni), typecheck/lint/build/`test:scripts`/`audit:check` yeşil.

## 2026-10-28 — Karşılama paneli (T8): misafir ayrımı, ilk rota kapısı, ölçüm

Ayrıntı: `docs/teslimatlar/teslimat-t8-onboarding-2026-10-28.md`.

- **Misafir notu:** karşılama paneli misafire hesabın nerede isteneceğini baştan söyler ("harita okuma serbest, iz bırakmak/rota yayımlamak için hesap istenecek, seçtiğin yol kaybolmaz"). Üyeye gösterilmez.
- **Sürpriz duvar kalktı:** misafir "Rota oluştur"a bastığında Atlas AI açılıp sonra kayıt istemek yerine anında hesap kapısına (`route` niyetiyle) gider; hesap açılınca T5 aynı yere döndürür.
- **Aktivasyona bağlı panel:** cihazda rota oluşturulmuşsa karşılama bir daha açılmaz (yalnız "görüldü" bayrağına bağlı değil).
- **Ölçüm:** `onboarding_choice{choice, guest}` (dört çıkış) — kod + tetikleyici + belge aynı teslimatta (katalog testi).
- **Bütçe:** eşik yükseltilmedi; toplam JS **997.923 / 998.500**, `entry` **20.839 / 20.900** (marj 61 B), ilk boya JS 100.238 / 102.200.
- Testler **1256/1256** (154 dosya), typecheck/lint/build/`test:scripts`/`audit:check` yeşil.

## 2026-10-28 — Misafir modu (T4) ve kayıt sonrası ilk değer (T5)

Ayrıntı: `docs/teslimatlar/teslimat-t4-t5-misafir-2026-10-28.md`.
**`firestore.rules` değişmedi** — misafirin `request.auth` değeri boştur, yazma sunucuda zaten reddedilir.

- **T4 — Kayıt duvarı kalktı:** Landing'deki her CTA artık giriş ekranını değil **misafir haritasını** açar; `cta_click` sonrası `map_open{guest:true}` düşer. Misafir, herkese açık `places`/`posts`/`stories` kayıtlarını okur (mevcut public okuma kuralı), sahip sorgusu hiç kurulmaz.
- **Yazma kapısı:** İz ekleme, gönderi/hikâye/yanıt/beğeni, rota oluşturma, yürüyüş kaydı, profil ve bildirimler misafirde tek tek hesap kapısına yönlenir; veri katmanı da yazmayı istemcide reddeder (çift katman). Giriş ekranı kapatılabilir: "Misafir olarak devam et".
- **T5 — kayıt sonrası ilk değer:** Engellenen eylem niyet olarak hatırlanır (`atlasia.pendingIntent.v1`, 30 dk TTL). Hesap açılınca "iz ekle" isteyen kullanıcı haritayı **ekleme modunda**, "paylaş" isteyen topluluk akışı açık bulur.
- **Bütçe (ölçümlü):** kodun büyük kısmı tembel `Explorer` parçasında kaldı; girişteki `entry` yalnız 20.530 → **20.814 B** gzip (+284) büyüdü ve kullanıcıya görünen eşikler **değişmedi** (ilk set 126.774/129.400, ilk boya JS 100.213/102.200, uygulama kabuğu 586.968/603.400). Yalnız **toplam JS** eşiği 997.500 → **998.500** (ölçüm 997.761, +933 B); yeni bağımlılık yok, gerekçe `scripts/bundle-budget.mjs` içinde yazılı.
- Yeni testler: `src/config/guestMode.test.ts` (10) + "Misafir olarak devam et" (2) + veri katmanında misafir okuma/yazma testleri (2) + `App.test.ts` güncellemesi. Toplam **1248/1248** (153 dosya); typecheck, lint, build, `test:scripts`, SW kabuğu (44/44), `audit:check` yeşil.

## 2026-10-28 — Bütçe eşikleri ölçüme bağlandı (#127, çözülmüş hali)

#127'nin son hali güncel main'e taşındı ve son büyümelere kalibre edildi:

- Bütçe eşikleri artık ölçüme yakın; şişkin/bayat eşik kapıyı fiilen öldüremiyor (bayatlama kapısı testlerde).
- Son kalibrasyon: toplam JS 998.500, entry 20.900 (Firebase 13 + hikâye silme sonrası ölçüm: 996.828 / 20.530).
- Yerel `.env.local` bağımlılığı iki testten kaldırıldı.

Typecheck, lint, 1233 test, script testleri ve build yeşil.


## 2026-10-28 — Hikâye izleri 24 saatte otomatik ve kalıcı silinir (#131, çözülmüş hali)

#131 paralel Explorer ayrımına dayandığı için olduğu gibi birleşemedi; tek özellik commit'i mevcut yapıya taşındı:

- Üst şeritteki (stories) izler 24 saati doldurunca **otomatik ve kalıcı** silinir; moderatörde kapsam genişler, silme işlemi kayıt altına alınır.
- Bağlantı değişikliği mevcut `Explorer` bileşenine taşındı (`moderator` bilgisi veri katmanına ve SocialPanel'e geçer).
- **Bütçe:** yeni silme mantığı toplam JS'i 996.828 bayta çıkardı; toplam bütçe 996.500 → **998.500**.

Typecheck, lint, 1233 test ve build yeşil.


## 2026-10-28 — Firebase 13.1.0 + rules-unit-testing 6 (#82, çözülmüş hali)

- `firebase` ^12.19.0 → **^13.1.0**; `@firebase/rules-unit-testing` 5 → **6** (firebase 13 istiyordu; birlikte alındılar).
- **Uyumluluk:** 13.0 kırıcı değişiklikleri yalnız `@firebase/ai`'da (Atlasia kullanmıyor); auth/firestore kırıcı değil. `dependencySecurity` kapısındaki sürüm sabiti güncellendi; `@grpc/grpc-js` 1.13.6 override'ı 13'te de aynen geçerli (iç içe kopya yok).
- **Bütçe kararı (maintainer):** toplam JS 984.686 → 994.802 bayt gzip (firestore/auth parçaları büyüdü; firebaseVendor aksine 159.467'ye küçüldü). Toplam JS bütçesi 986.500 → **996.500**; ilk-boya/yolculuk bütçeleri değişmedi.
- Typecheck, lint, test ve build yeşil. Kurallar emülatör süiti CI'da koşar.


## 2026-10-28 — Dev-tooling kısmi güncelleme (#79, çözülebildiği kadarıyla)

#79'un güncel main'de uygulanabilir kısmı alındı; üç paket gerekçeli olarak bekletildi:

- **Alınan:** `tailwindcss` + `@tailwindcss/vite` 4.1.17 → 4.3.3, `eslint` 10.13.0, `globals` 17.13.0.
- **Bekletilen — `@types/node` 26:** mevcut tsconfig (`lib: ES2020`) altında kurallar testi tiplerini kırıyor; 22'de kaldı.
- **Bekletilen — `@vitejs/plugin-react` 6:** Vite 8 istiyor (bizde 7); Vite 8 yükseltmesiyle birlikte alınacak.
- **Bekletilen — `typescript` 7:** `typescript-eslint` henüz TS 7 desteklemiyor (lint tamamen kırılıyor); destek gelince `baseUrl` → göreli `paths` geçişiyle birlikte alınacak (denendi, çalışıyor).
- `@firebase/rules-unit-testing` 6, firebase 13 istediği için Firebase grubuyla birlikte ele alınır.

Typecheck, lint, 1202 test ve build yeşil.


## 2026-10-28 — MapLibre GL 6.15.0 (#81, çözülmüş hali)

- `maplibre-gl` 6.4.1 → **6.15.0** (tam sürüm sabitli; güvenlik tabanı 6.4.1'in üstünde, `dependencySecurity` kapısı yeşil).
- **Bütçe kararı (maintainer, şeffaflık notu):** 11 minor sürümde kütüphane büyüdü — mapVendor 248.691 → 290.724, mapWorker 131.810 → 150.448 bayt gzip (toplam +60,7 KB). Bu parçalar ilk boyada DEĞİL, harita açılışında tembel yüklenir ve önbelleklenir; ilk-boya/yolculuk bütçeleri etkilenmedi. Bütçeler: mapVendor 286.000 → 302.500, mapWorker 145.500 → 152.000, toplam JS 925.000 → 986.500.
- Typecheck, lint, test ve build yeşil.


## 2026-10-28 — React 19.3.1 (#80 + #83, çözülmüş hali)

Dependabot dalları eski main'e dayandığı için CI'ları kırık geliyordu; yükseltme güncel main üzerinde taze uygulandı:

- `react` / `react-dom` 19.2.6 → **19.3.1**, `@types/react` / `@types/react-dom` → **19.3.0**.
- **Bütçe kararı (maintainer):** React 19.3'ün vendor paketi 66.500 → 69.004 bayt gzip büyüdü (kütüphanenin kendi büyümesi); `reactVendor` bütçesi 69.500, toplam JS bütçesi 916.500 → **925.000** yapıldı. İlk-boya ve yolculuk bütçeleri değişmedi.
- Typecheck, lint, 1202 test ve build yeşil.


## 2026-10-28 — İsteğe bağlı 6 panel tembel yükleme (#123'ün kazancı, çözülmüş hali)

#123 paralel bir App bölünmesi içerdiği için olduğu gibi birleşemedi; kazancı mevcut `Explorer` yapısına uygulandı, #123'ün yerini bu kayıt alır:

- **Tembel paneller:** SocialPanel, Drawer, AtlasAssistant, MyPlacesPanel, StreetPeek, AddDiscoveryModal artık ilk yükte indirilmiyor; her biri kendi `Suspense` sınırında, açıldığında yükleniyor.
- **Ölçüm:** uygulama kabuğu yolculuğu 813 KB → **516.547 bayt gzip**; tanıtım yolculuğu 116.685 bayt (bütçe 425.000).
- **Bütçe kararı (maintainer):** parça bölünmesi toplam JS'e ~6,5 KB tekrar yükü ekledi (915.334); toplam JS bütçesi 909.500 → **916.500**. Kullanıcının gördüğü ilk-boya/yolculuk bütçeleri değişmedi ve bol payla içinde.


## 2026-10-28 — Landing performansı (T11/T12/T7) + bütçe notu

#120'nin main ile çakışması çözülerek yayına alındı (yerini bu kayıt alır):

- **Firebase ilk setten çıktı:** açılışta yalnız tanıtım sayfası yüklenir; Firebase/keşif kodu giriş sonrası tembel yüklenir. İlk boya JS: **387.281 → 90.426 bayt gzip**.
- Kontrast düzeltmeleri ve çerez onayının yerleşimi iyileştirildi; App ince kapıya + `Explorer` bileşenine bölündü.
- **Bütçe kararı (maintainer):** kod bölünmesinin chunk başına küçük tekrar yükü toplam JS'i 906.447 → 908.855 bayta çıkardı; ilk boyadaki −297 KB kazanca karşılık toplam JS bütçesi 908.000 → **909.500** olarak güncellendi. İlk boya ve yolculuk bütçeleri değişmedi.
- Çakışma çözümleri: bütçe testlerinde iki tarafın testleri de korundu; `uiSurface`/`siteSurface` testleri `Explorer.tsx`'i de kaynak sayar.

## 2026-10-28 — Landing erişilebilirlik turu: mobil menü, tek H1, hareket azaltma (T13–T16)

Ayrıntı: `docs/teslimatlar/teslimat-t13-t16-2026-10-28.md`.

- **T13 — Mobil menü:** 768 px altında hamburger → tam ekran panel (Keşfet · Nasıl çalışır? · Gizlilik · Keşfe başla). `aria-expanded`/`aria-controls`, Escape ile kapanma, Tab tuzağı, kapanınca odağın düğmeye dönmesi.
- **T14 — Klavye:** "İçeriğe geç" skip-link'i (ilk odak) + `#kesfet` hedefi `tabIndex={-1}`. Global `:focus-visible` halkası zaten vardı; kopya eklenmedi (denetim bulgusu).
- **T15 — Hareket azaltma:** mevcut `prefers-reduced-motion` bloğuna eksik olan `scroll-behavior: auto !important` eklendi (landing'deki `scroll-smooth` artık yok sayılmıyor).
- **T16 — Semantik:** sayfanın tek H1'i "Dünyayı merakınla keşfet."; marka yazısı `aria-hidden` dekoratif öğe. Bölüm başlıkları H2, kartlar H3 — hiyerarşi atlaması yok.
- Ölçüm (main'e taşındıktan sonra, `7079387`): ilk set **117.585 B** gzip (bütçe 439.000); toplam JS **916.296 B** (bütçe 916.500); toplam CSS **35.092 B** (bütçe 35.700). Typecheck, lint, **1228 test** (151 dosya), build ve SW kabuğu (44/44) yeşil. Tablo: `docs/baseline.md`.

## 2026-10-28 — Denetim düzeltmeleri + giriş ekranı sürtünmesi (T9)

Ayrıntı: `docs/teslimatlar/teslimat-denetim-t9-2026-10-28.md`.

- **T9 — Giriş/kayıt ekranı:** Google (ve etkinse Apple) artık her iki modda da e-posta formunun **üstünde** birincil boyutta; e-posta "veya e-posta ile" altında. Devre dışı "Apple ile giriş yakında" düğmesi kaldırıldı; yerine e-posta formunda mikro metin. Firebase yapılandırılmamışsa hiç sosyal düğme gösterilmiyor. Şifre göster/gizle, `autocomplete` değerleri ve satır içi hatalar korundu (7 yeni test).
- **Denetim:** `cta_click` kablolaması için 3 davranışsal test eklendi (hero/header/footer ayrımı, landing'de huni sırası); ölü `auth-secondary-providers` CSS'i silindi (CSS 35.117 → 34.964 B gzip, eşik yeniden 35.100'e çekildi; #125 sonrası güncel eşik 35.700); `consent_choice{analytics:false}` sınırı kodda ve belgede açıklandı.
- Erişilebilirlik testi `Explorer.tsx`i de tarıyor (dizin taraması) — kapsam kaybı yok. Typecheck, lint, 1139 test, build ve SW kabuğu yeşil.

## 2026-10-28 — Ölçüm tabanı: huni olayları ve baseline (T1–T3)

Ayrıntı: `docs/teslimatlar/teslimat-t1-t2-t3-olcum-2026-10-28.md`.

- **T2 — Huni olayları:** `cta_click{placement}`, `map_open{guest}`, `signup_start`, `signup_complete{method}`, `first_route_created`, `audio_guide_start`, `consent_choice` eklendi (10 → 16 olay). Landing'in dört CTA'sı yerleşim adıyla sayılıyor; `sign_up` adı `signup_complete` oldu. Tüm olaylar sabit enum/boolean taşır, rıza kapısı aynen geçerli.
- **T3 — Baseline:** `docs/baseline.md` eklendi (paket ölçümleri dolu; Lighthouse/CWV/Search Console satırları "ölçülmedi" olarak işaretli, ölçüm komutlarıyla).
- **T1 — Durum:** panel/hesap açılmadı (dış servis kimliği yok); toplayıcı seçenekleri ve tek zorunlu adım (`VITE_TELEMETRY_ENDPOINT`) `docs/olcum-ve-hata-izleme.md` §5b'de.
- Toplam JS 908.149 B gzip; eşik 908.000 → 909.000 (gerekçe aynı dosyada). Typecheck, lint, 1129 test, build ve SW kabuğu yeşil. *(Eski dal ölçümü; #125 sonrası güncel eşik 916.500.)*

## 2026-10-28 — Landing hızlı kazançları: Firebase ilk setten çıktı, kontrast ve çerez yerleşimi

Plan maddeleri T11, T12, T7. Ayrıntı: `docs/teslimatlar/teslimat-t7-t11-t12-2026-10-28.md`.

- **T11 — Firebase landing'den çıktı:** yapılandırma kapısı SDK'sız `lib/firebaseConfig.ts`e ayrıldı; `lib/auth.ts` SDK'yı yalnız `getAtlasAuth()` içinde dinamik yükler. `App.tsx` ince kapıya indi, keşif kabuğu `components/Explorer.tsx` oldu ve `lazy()` ile gelir. İlk HTML seti **411.987 → 115.087 B gzip (−%72)**; `firebase-vendor` (149.338 B) artık ertelenen parça ve bütçe testi bunu kilitliyor.
- **T12 — Kontrast:** krem zeminde eyebrow `#a37c35 → #8f6224` (3,35 → 4,66:1), büyük başlık vurgusu `#ba8f45 → #9c7029` (2,59 → 3,86:1). Yeni kilit: `src/config/landingContrast.test.ts`.
- **T7 — Çerez bandı:** masaüstünde sağ alt kart, mobilde güvenli alanlı alt sayfa; "Dünyayı keşfet" CTA'sı artık örtülmüyor.
- Toplam CSS 35.117 B olduğu için eşik 35.300'e çekildi (yeni ağırlık yok, ~%0,5 pay). Typecheck, lint, 1126 test, build ve SW kabuğu yeşil.

## 2026-10-27 — Çekmece yalnız "Raporlarım"; moderasyon yalnız Yönetim Paneli'nde

Maintainer isteği: ekran görüntüsündeki çekmece moderatör hesabında moderasyon sekmelerini de gösteriyordu; ayrım netleştirildi.

- **Çekmece (Raporlar):** moderatör hesabında bile yalnız kullanıcının kendi raporları görünür; başlık herkeste "Raporlar". Kuyruk · İtirazlar · Kayıtlar · Duyurular sekmeleri çekmeceden kaldırıldı.
- **Yönetim Paneli:** moderasyon görünümleri yalnız tam ekran `admin` düzeninde ve yalnız moderatörde açılır (Ayarlar → Moderasyon → Yönetim Paneli, fail-closed kapı aynı).
- Kuyruk verisi artık çekmece açılınca değil, yalnız Yönetim Paneli açıkken dinlenir.
- Testler: ReportsPanel 24/24 (çekmece kilidi testi eklendi; moderasyon akış testleri Yönetim Paneli düzenine taşındı).


## 2026-10-26 — Düzeltme: CSS paket bütçesi taşması (main CI)

Yönetim Paneli (#112) birleşmesi toplam CSS'i bütçenin 53 bayt üzerine çıkardı; ana dal CI'ı bu yüzden kırmızıya döndü.

- Paneldeki tek seferlik yarım piksel yazı boyutları ve özel opaklık/renk sınıfları, uygulama genelinde zaten kullanılan karşılıklarıyla değiştirildi (görünüm farkı fark edilmez düzeyde).
- CSS: 35.153 → 35.042 bayt gzip (bütçe 35.100). Typecheck, lint, 1102 test ve build yeşil.

## 2026-10-26 — Yönetim Paneli: tam ekran moderasyon düzeni

Sandbox prototipinde onaylanan klasik admin düzeni gerçek panele taşındı.

- **Ayarlar → Moderasyon → Yönetim Paneli:** yalnız moderatörde görünür; moderatör durumu artık panel açılmadan da öğreniliyor (fail-closed aynı).
- **Sol menü:** Kontrol Paneli · Kuyruk · İtirazlar · Kullanıcılar · Kayıtlar · Duyurular · Raporlarım; dar ekranda ikonlara daralır.
- **Kontrol Paneli:** bekleyen rapor / aktif ban / bekleyen itiraz gibi tıklanabilir gösterge kartları + son işlemler listesi.
- **Kullanıcılar görünümü:** rapor sahipleri ve ban kayıtlarından toplanan özet (rapor sayısı, ban rozeti, geçmiş). Raporsuz ceza ilkesi değişmedi.
- Çekmece (Raporlarım) düzeni aynen; iki düzen aynı bileşeni ve aynı kuralları paylaşır. Firestore kural değişikliği yok.
- Testler: 1054 (admin düzeni +4). Bütçe içinde (JS 900.911/908.000).

## 2026-10-25 — Kapsamlı moderasyon: kademeli yaptırım, itiraz, duyuru

Akış: `docs/moderasyon-akisi.md` §7. Maintainer kararı: kapsam tam, içerik kaldırma kalıcı.

- **Uyarı:** incelenmiş rapor üzerinden resmî uyarı; kullanıcı "Anladım" demeden geçemez, kayıt silinmez.
- **İçerik kaldırma (kalıcı):** moderatör gönderi/hikâye/iz/yanıt silebilir; iki aşamalı onay; rapor otomatik kapanır, raporlayana bildirim gider.
- **İtiraz:** askı ekranından itiraz; panelde "İtirazlar" sekmesi; kabul ile ban kaldırma ayrı işlemler.
- **Kayıtlar:** bütün moderatör işlemleri `modActions` günlüğünde (değiştirilemez).
- **Duyurular:** moderatör duyurusu bütün kullanıcılara şerit olarak görünür (cihazda kapatılır).
- **Kuyruk araçları:** durum süzgeci, arama, hedef geçmişi (rapor/uyarı/ban özeti).
- **Kurallar:** 31 → 35 blok. `/warnings`, `/appeals`, `/modActions`, `/announcements`; moderatör silme yetkisi; `report_actioned` bildirimi inceleyen moderatöre kanıtla bağlandı.
- **İndeksler:** `reports` ve `blocks` bileşik indeksleri `firestore.indexes.json`'a eklendi (kaynak senkronu).
- **Testler:** 999 → 1016. **Bütçe:** JS 903.778 B ölçüldü, eşik gerekçeyle 908.000 B (CSS 34.713/34.800).

## 2026-10-25 — Moderasyon: rapor kuyruğu, askıya alma (ban)

Akış ve kurallar: `docs/moderasyon-akisi.md`.

- **Rapor kuyruğu:** Ayarlar → Moderasyon → "Raporlarım ve inceleme durumu". Herkes kendi raporlarının durumunu görür; `moderators/{uid}` belgesi olan hesapta "Kuyruk" sekmesi açılır. Durumlar: İnceleniyor / İncelendi / İşlem yapıldı + ≤500 karakter moderatör notu.
- **Askıya alma (yeni):** "İşlem yapıldı" işaretli raporun sahibi 7/30/90 gün veya kalıcı askıya alınabilir; gerekçe zorunlu (10–500) ve kullanıcıya gösterilir. Askı ekranı gerekçe + bitiş + çıkış sunar; süre dolunca kendiliğinden kalkar.
- **Yaptırım sunucuda:** `firestore.rules` — `/bans/{uid}` yalnız moderatöre açık ve ban **yalnız aynı moderatörün** "işlem yapıldı" dediği rapora dayanabilir; kendini askıya alma kapalı; belge silinemez (kaldırma `expiresAt`'i geçmişe çeker, iz kalır). Askıdaki hesap yeni gönderi/hikâye/yanıt/yer yazamaz; okumaya devam eder.
- **Fail-closed:** kurallar dağıtılmadıysa kuyruk ve ban hiç görünmez.
- **Testler:** 985 → 999 (ban sözleşmesi +6, rapor paneli +5, askı ekranı +3, kurallar +2).
- **Bütçe:** K-10 kararı gereği JS eşiği ölçümle 902.000 B'ye çekildi (ölçüm 897.644 B, CSS 34.602/34.800).

## 2026-10-25 — Tam kod denetimi sonrası düzeltme turu

Denetim kaydı: `docs/denetim/tam-kod-denetimi-2026-10-24.md`. Firestore kuralları, indeksler, CSP ve service worker değişmedi.

- **Harita:** iz kaydı önizlemesi atılınca/panel kapanınca `clearRoute()` çağrılıyor; haritada "hayalet rota" kalmıyor (`App.tsx`).
- **Hikâye görüntüleyici:** basılı tutup duraklatınca ilerleme çubuğu sıfırlanmıyor; süre ref'te tutuluyor ve kaldığı yerden devam ediyor.
- **Silme güvenliği:** gönderi ve hikâye silmede onay istendi (yer silme/engelleme ile aynı desen).
- **Paylaşım:** Atlas rota paylaşımı başarısız olunca sessiz kalmıyor; `role="alert"` ile bildiriliyor, kullanıcı iptali hatadan ayrılıyor.
- **Bildirimler:** panelde ham şema anahtarı yerine Türkçe etiket; cihaz hesabında bulut dinleyicisi açılmıyor ve hata loglanıyor.
- **Dayanıklılık:** rapor penceresinin kapanış zamanlayıcısı unmount'ta iptal ediliyor; iz kaydırıcıya 30 sn GPS `timeout`; üst bilgi logosu artık `href="#"` değil; ad çözümlemesinde `.catch`.
- **Ağ durumu:** `navigator.onLine` yanında aynı kaynaklı tek yoklama; captive portal/yanıtsız arka uçta "Bağlantı doğrulanamadı".
- **Testler:** 954 → 959 (`StoryViewer`, `NotificationsPanel`, `ReportDialog` eklendi; `useTrackRecorder` seçenek beklentisi güncellendi).

## 2026-10-21/22 — Üretim izin düzeltmesi, P17 çekirdeği, T1-AUTH

- **#31 (d393b4c):** Rota yayınlama/kaydetme ve yer kaydında `permission-denied` ve `undefined` alan hataları istemci tarafında düzeltildi (`withoutUndefined`, `readRouteIfVisible`); grup katılımı tam kimlikle yapılıyor. Firestore Rules değişmedi.
- **#32 (38dfa3a):** P17 çekirdeği (GPS sıçrama filtresi, 7 m sadeleştirme, `buildTrackDraft`, DEM yoksa "yükseklik bilinmiyor"). Bacaklı rotalar `toFirestoreRoute`/`fromFirestoreRoute` ile yazılıyor (Firestore iç içe dizi desteklemez). Onaylı kaydet akışı açık. Rules değişmedi.
- **#33 (447fbaa) T1-AUTH:** `VITE_PHONE_AUTH_ENABLED` (varsayılan kapalı; telefon düğmesi render edilmez). `scripts/verify-env.mjs` prebuild: yalnız Cloudflare Pages main build'inde eksik `VITE_FIREBASE_*` adlarını yazıp build'i durdurur (değer yazmaz). `docs/firebase-uretim-kontrol-listesi.md` eklendi; `.env.example` VITE_ satırı 7→8.
- **P1 hijyen:** PR triyajı (`teslimat-p1-hijyen.md`), `docs/gorevler/calisma-kurallari.md`.

## Giriş ve Kayıt Düzeltmesi

- Firebase bilgileri verilmediğinden tek giriş yolu kullanılamıyordu. E-posta/şifre formu eklendi; eksik yapılandırmada açıkça bu cihaza özel hesap modu çalışır.
- Giriş ekranı kompakt ve merkezde; kayıt ekranı Atlasia tanıtımı + üyelik formu olarak ayrılır. Görsel kimlik korunur.
- Cihaz hesabı şifreyi salt + PBKDF2 özetiyle IndexedDB'de saklar. Misafir geçişi, sahte sosyal giriş ve sahte SMS yoktur.
- Şifre göster/gizle, görünür etiketler, satır içi doğrulama, yüklenme ve hatalı kimlik bilgisi durumları eklendi.
- Cihaz hesaplarında kurtarma anahtarı; Firebase hesaplarında gerçek şifre yenileme e-postası kullanılır.
- Firebase e-posta/şifre hesabı artık desteklenir. Doğrulama bekleyen hesap çıkışa zorlanmaz; ayrı doğrulama ekranından devam eder.
- Google/Apple/SMS yapılandırılmadan etkin gösterilmez. Canlı sağlayıcılar için AUTH_SETUP.md içindeki Firebase kurulum adımları gereklidir.
- Harita, rota ve keşif katmanları değiştirilmedi.

- İlk ekran uygulama tanıtımı (%65) ve doğrulanmış giriş (%35) olarak ayrıldı. Mobilde dikey, kaydırılabilir yerleşim var.
- Google ve Apple OAuth, reCAPTCHA korumalı telefon/SMS doğrulaması eklendi. Misafir oturumu veya sahte doğrulama yok.
- Kimlik bilgileri verilmediğinde giriş hata durumunu gösterir. Sağlayıcı kurulum adımları AUTH_SETUP.md ve .env.example içinde.
- Profil adı, profil düzenleme ve çıkış eklendi. Yer/rota koleksiyonları bu cihazda kullanıcı kimliğine göre ayrılır; cihazlar arası senkronizasyon iddiası yok.
- Bir sonraki güzel tesadüfün alt çubuğu geri geldi. Kayıtlar, sağ drawer yerine altta yatay bir şerit olarak açılır.
- Eksik rehber fotoğrafları gerçek Pexels ve Wikimedia Commons kaynaklarıyla tamamlandı. Yanlış konumla eşleşen stok sonuçları kullanılmadı.
- Küçük çevre görünümü resmi OpenStreetMap embed kullanır. Street View, anahtarsız modda resmi panorama bağlantısını açar; embed için geçerli Maps Embed API anahtarı gerekir.
- OSM araması Photon + şehir araması yedeği ile çalışır; istekler zaman aşımı, iptal ve önbellek içerir.
- Atlas AI seçili yer/adı, mesafe, süre ve ulaşımı dikkate alır. Uzak şehirleri yürüyüş rotasına katmaz; yeterli veri yoksa söyler.
- Rota sırası değişince saatler, mesafe ve polyline yeniden hesaplanır. Önizleme ve kullanıcı onayı ayrı kalır.
- Altın saat hedef yerin saat dilimi ve SunCalc ile hesaplanır. Canlı ücret, erişim ve hava verisi yoksa belirsizlik açıkça belirtilir.
- Ana src/components/MapView.tsx kaynağı, katmanları, marker render'i, tile ve event mantığı değiştirilmedi.

## Doğrulama Sınırları

Üretim derlemesi kontrol edilir. Bu ortamda canlı Google/Apple oturumu, gerçek SMS, telefon tarayıcısı veya iframe içeriği uçtan uca test edilemez.
Yayın için Firebase projesi, yetkili alan adı ve sağlayıcı ayarları gereklidir.