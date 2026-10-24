# Atlasia — tam kod denetimi (24 Ekim 2026)

**Kesit:** `arena/57b4022c-atlasia` dalı, `main` kökü `8f0bec9` (PR #96 merge).
**Talep:** Tüm kodu ve çalışan özellikleri tara; sorun var mı gör; **hiçbir şeyi düzeltme, onaylama veya reddetme** — yalnız düzeltilmesi gerekenleri raporla.
**Bu belge:** bulgu kaydı. §1–§8 denetim anındaki durumu anlatır.
**Ek (aynı gün, kullanıcı talebiyle):** "düzeltebiliyor musun" sorusu üzerine K-01, K-02, K-04, K-05, K-06, K-08, K-09, K-12, K-13, K-14, K-16 düzeltildi ve üçü testle kilitlendi; ayrıntı ve kapı sonuçları **§9**'da. K-03, K-07, K-10, K-11, K-15 bilinçli olarak **açık bırakıldı** (§9.3).

---

## 1. Yöntem ve sınırlar

Yapılanlar:

- `src/` altındaki tüm `.ts/.tsx` dosyaları okundu ya da hedefli olarak tarandı (bileşenler, hook'lar, `lib/`, `utils/`, `data/`, `contexts/`).
- `public/_headers` (CSP), `public/sw.js`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `vite.config.ts`, `.github/workflows/*`, `scripts/*` incelendi.
- Kapılar bu kesitte **çalıştırıldı** (sonuçlar §2'de).
- Ağ envanteri: üretim kodundaki her `fetch(` çağrısı tek tek çıkarıldı ve CSP `connect-src` ile karşılaştırıldı.
- Dinleyici/abonelik sızıntısı taraması: her `addEventListener` için `removeEventListener` eşi ve `onSnapshot` iade fonksiyonları kontrol edildi.
- Test kapsamı: her kaynak dosya için kardeş test (`*.test`, `*.io.test`, `*.cloud.test`, `*.local.test`) varlığı programatik olarak ölçüldü.

Yapılamayanlar (bu raporda "doğrulanamadı" olarak işaretli):

- **Tarayıcı yok** (Chromium/Chrome/Playwright kurulu değil) → gerçek render, gerçek CSS davranışı, klavye/ekran okuyucu turu, iki cihaz senkronu, uçak modu **çalıştırılamadı**.
- **Java yok** → `npm run test:rules:emulator` bu ortamda çalışmıyor (`scripts/run-firestore-rules-tests.mjs:65` açıkça Java 21 istiyor). Rules testleri yalnız CI'da koşuyor.
- Canlı Firebase Console durumu, dağıtılmış Rules/indeks sürümü, Cloudflare Pages production SHA → erişim yok.
- Gerçek GPS/sensör davranışı, kilitli ekranda iz kaydı, push/native katman → cihaz gerekir.

---

## 2. Kapıların durumu (bu kesitte ölçüldü)

| Kapı | Komut | Sonuç |
| --- | --- | --- |
| Tip denetimi | `npx tsc --noEmit` | **PASS** (0 hata) |
| Lint | `npx eslint . --max-warnings=0` | **PASS** (0 uyarı) |
| Birim/IO testleri | `npx vitest run` | **PASS** — 126 dosya, 954 test |
| Production build + bütçe | `npm run build` + budget | **PASS** — ama pay §3/K-10'da |
| SW kabuk doğrulaması | `verify:sw-shell` | **PASS** — 28/28 |
| Betik testleri | `npm run test:scripts` | **PASS** — 8/8 |
| Bağımlılık denetimi | `npm run audit:check` | **PASS** (bilinen açık yok) |
| Sosyal meta veri | `npm run verify:social-metadata` | **PASS** — 18 değer |
| Firestore Rules emülatörü | `npm run test:rules:emulator` | **ÇALIŞTIRILAMADI** — Java 21 yok (CI'ya bağlı) |

Kısaca: **otomatik kapılar yeşil.** Aşağıdaki bulguların hiçbiri tip/lint/test hatası olarak görünmüyor; hepsi davranış, tutarlılık, erişilebilirlik, dayanıklılık veya "kod var ama ulaşılabilir değil" sınıfında.

---

## 3. Kod kusurları

Öncelik ölçeği: **Y** = yüksek, **O** = orta, **D** = düşük, **B** = bilgi/nit.

| Bulgu | Öncelik | Durum |
| --- | --- | --- |
| K-01 hayalet rota çizgisi | O | **Düzeltildi** (§9.1) |
| K-02 hikâye duraklatma sıfırlaması | O | **Düzeltildi** + test |
| K-03 mobilde katman düğmeleri erişilemez | O | **Açık** — ürün kararı |
| K-04 onaysız gönderi/hikâye silme | D | **Düzeltildi** |
| K-05 sessiz paylaşım hatası | D | **Düzeltildi** |
| K-06 bildirimde ham enum | D | **Düzeltildi** + test |
| K-07 tutulamayacak moderasyon sözü | D | **Kısmen** — metin düzeltildi, işlev AY-03'te açık |
| K-08 temizlenmeyen zamanlayıcı | D | **Düzeltildi** + test |
| K-09 logo `href="#"` | D | **Düzeltildi** |
| K-10 bütçe payı | O | **Açık** — karar gerekiyor (düzeltmeler sonrası pay 1.343 B) |
| K-11 UI katmanı test açığı | O | **Kısmen** — 3 bulgu testle kilitlendi, 42 dosya açık |
| K-12 GPS `timeout` yok | D | **Düzeltildi** + mevcut test güncellendi |
| K-13 yalnız `navigator.onLine` | D | **Düzeltildi** |
| K-14 cihaz hesabında bulut dinleyicisi | D | **Düzeltildi** |
| K-15 `markAllRead` yazma patlaması | B | **Açık** — kusur değil |
| K-16 `catch`'siz söz zinciri | B | **Düzeltildi** |

### K-01 · O · İz kaydı taslağı atılınca haritada hayalet rota çizgisi kalıyor

- **Kanıt:** `src/components/TrackRecorderPanel.tsx:93` → `onPreview([])`; `src/App.tsx:798` → `mapRef.current?.drawRoute(coords, true)`; `src/components/MapView.tsx:466` → `if (!map || coords.length < 2) return;` (sessiz erken çıkış).
- **Ek kanıt:** `clearRoute()` `src/components/MapView.tsx:540`'ta **tanımlı ama hiçbir yerden çağrılmıyor** (`grep -rn "clearRoute" src` → yalnız iki tanım satırı, çağrı yok).
- **Etki:** Kullanıcı yürüyüş taslağını "Vazgeç/discard" ile atınca (`TrackRecorderPanel.tsx:89-94`) ya da paneli ✕ ile kapatınca, en son çizilen önizleme polyline'ı haritada **kalır**. Kayıt tamamlanmadığı için haritada artık var olmayan bir rota görünür; kullanıcı bunu "kaydedilmiş rota" sanabilir. Aynı sınıf: rota modundan çıkışta da açık bir temizleme yolu yok.
- **Düzeltme yönü (yapılmadı):** `onPreview([])` çağrısını `clearRoute`'a bağla veya `drawRoute`'ta boş koordinatı "temizle" anlamına getir; panel kapanışında da temizle.

### K-02 · O · Hikâye ilerleme çubuğu: basılı tutup duraklatınca baştan başlıyor

- **Kanıt:** `src/components/StoryViewer.tsx:60-78` ilerleme efektinde `elapsed` **efektin yerel değişkeni**; efekt bağımlılıkları `[index, paused, next]`. `paused` değişince efekt yeniden kurulur, `elapsed = 0` olur ve ilk RAF karesi `setProgress(~0)` yazar.
- **Tetikleyici:** `StoryViewer.tsx:106-110` → `onMouseDown`/`onTouchStart` `setPaused(true)`.
- **Etki:** Hikâyeyi okumak için basılı tutan kullanıcı çubuğun sıfıra döndüğünü görür; bıraktığında süre baştan işler (hikâye beklenenden çok daha uzun açık kalır). Dokunmatik cihazda en sık kullanılan etkileşim olduğu için görünür bir kusur.

### K-03 · O · Mobilde "Yer adları / 3B arazi / Hava katmanı" düğmeleri erişilemez

- **Kanıt:** `src/index.css:650` → `.mobile-map-controls > div:nth-of-type(n + 5) { display: none; }`. `MapControls.tsx:118-134` sırasıyla Konum, Yer adları, 3B arazi, Hava katmanı, İz kaydı, Atlas düğmelerini üretiyor; 5. `div`'den sonrası mobilde tamamen gizleniyor.
- **Ek kanıt:** Gönderi/rota/iz için mobil bir alternatif giriş yok: iz kaydının kendi FAB'ı var (`App.tsx:785-790`), Atlas'ın kendi başlatıcısı var (`.atlas-launcher`), ancak **yer adları, 3B arazi ve hava katmanı** için başka giriş yok (`grep "Katman"` → hiç sonuç).
- **Durum notu:** Bu, `docs/mobil-denetim-2026-10-23.md:37-38, 136`'da zaten "mobil katman menüsü alınmadı" olarak kayıtlı **açık** kalem. Denetim onu doğruluyor: `8f0bec9`'da hâlâ aynı. Yeni bulgu değil, **kapanmamış** bulgu.

### K-04 · D · Silme onayı tutarsız: yer silmede onay var, gönderi/hikâye silmede yok

- **Kanıt (onay var):** `src/App.tsx:594` → `window.confirm("… izini kalıcı olarak silmek istiyor musun?")`.
- **Kanıt (onay yok):** gönderi silme `src/components/SocialPanel.tsx:528-535` (tek tıkla `onRemovePost`), hikâye silme `src/components/SocialPanel.tsx:822-828` (tek tıkla `onRemoveStory`); buna karşılık engelleme `SocialPanel.tsx:550` onay istiyor.
- **Etki:** Geri alınamaz içerik silme, geri alınabilir bir işlemden (engelleme) daha az korumalı. Mobilde silme düğmesi hep görünür olduğu için yanlış dokunma riski gerçek.

### K-05 · D · Rota paylaşımı başarısız olunca kullanıcıya hiçbir şey söylenmiyor

- **Kanıt:** `src/components/AtlasAssistant.tsx:309` → `try { if (navigator.share) … else await navigator.clipboard.writeText(text); setShared(true); } catch { /* … */ }` — boş `catch`.
- **Etki:** Masaüstünde pano izni (`clipboard-write`) reddedilirse ya da `navigator.share` yoksa/pano yoksa düğme "Paylaş" olarak kalır ve **hiçbir uyarı çıkmaz**; kullanıcı paylaşıldı sanıp devam eder. Aynı dosyadaki bağlantı üreticileri (Google/Yandex/Apple) hata durumunu doğru raporluyor; yalnız bu tek yol sessiz.
- **Karşılaştırma:** `src/utils/inviteLink.ts:shareOrCopy` aynı işi `"shared" | "copied" | "failed"` olarak döndürüyor — doğru desen orada zaten var.

### K-06 · D · Bildirim panelinde ham enum anahtarı görünüyor

- **Kanıt:** `src/components/NotificationsPanel.tsx:40` → `{relativeTime(n.createdAt)} · {n.type}`. Ekranda `group_message`, `friend_accepted`, `report_received` gibi **İngilizce iç anahtarlar** çıkıyor; panelin geri kalanı Türkçe.
- **Etki:** Kullanıcıya anlamsız metin; ayrıca iç şema sızıntısı.

### K-07 · D · Bildirim paneli, ürünün tutamayacağı bir söz veriyor

- **Kanıt:** `NotificationsPanel.tsx:34` → "Moderasyon: raporların durumu burada görünecek."
- **Karşıt kanıt:** `src/lib/notifications.ts:20-26` ve `firestore.rules:527-546` birlikte `report_actioned`, `blocked`, `system` tiplerini **istemciye kapatıyor**; repoda sunucu/yönetici yazıcısı yok. Yani "raporun durumu" bildirimi bu mimaride hiç üretilemez.
- **Durum notu:** Kök neden `docs/gorevler/ana-yol-acik-kalanlar-2026-10-23.md` AY-03 ile aynı; fark, kullanıcıya **verilen sözün** AY-03 kapanmadan görünür olması.

### K-08 · D · `ReportDialog` zamanlayıcısı temizlenmiyor

- **Kanıt:** `src/components/ReportDialog.tsx:39-42` — gönderim başarılıysa 900 ms sonra `onReported()` + `onClose()` çağrılıyor; `setTimeout` kimliği saklanmıyor, unmount'ta `clearTimeout` yok.
- **Etki:** Kullanıcı bildirim gönderdikten sonra 900 ms içinde pencereyi kapatırsa/kapatılırsa, kapanmış bileşenin üstündeki ebeveyne `onClose` yeniden gider. React 19'da çökme değil, **çift kapanma / yanlış panel kapanması** riski.

### K-09 · D · Logo bağlantısı `href="#"`

- **Kanıt:** `src/components/Header.tsx:38`.
- **Etki:** Tıklama adres çubuğuna `#` yazıyor ve `hashchange` dinleyicisini (`src/App.tsx:265`) boşuna tetikliyor. Uygulamanın paylaşım/davet jetonları da fragment'ta yaşıyor (`#r=`, `#grup=`, `#arkadas=`); aynı alanı boş bir bağlantıyla karıştırmak gereksiz risk. Semantik olarak da bir `<a>` değil `<button>` olmalı.

### K-10 · O · Paket bütçesi neredeyse tamamen dolu (CI kırılganlığı)

- **Ölçüm:** JS **886.088 / 888.000 B (gzip)** → 1.912 B boşluk; CSS **34.451 / 34.500 B** → 49 B boşluk.
- **Etki:** En küçük ekleme (tek bir ikon seti, tek bir yardımcı fonksiyon, bir cümlelik CSS) `build:budget` kapısını kırar. Bu bir "hata" değil, ama **her yeni işi bloke eden** bir durum; sıradaki iş paketinde bütçenin ya büyütülmesi ya da bölünmesi (lazy chunk) kararı gerekiyor.

### K-11 · O · Test ağı UI katmanında ince: 45 kaynak dosyanın kardeş testi yok

- **Ölçüm (programatik):** `src` altında 45 dosya için `*.test/.io.test/.cloud.test/.local.test` eşi yok.
- **Dağılım:** 30 bileşen (`App.tsx` dahil: `AccountAccess`, `AddDiscoveryModal`, `AtlasAssistant`, `BottomPanel`, `GroupsPanel`, `Header`, `Hero`, `LandingPage`, `MapControls`, **`MapView`**, `MyPlacesPanel`, `NearbyAudioGuide`, `NearbyHistory`, `NotificationsPanel`, `OfflinePackage`, `Onboarding`, `PlaceDetails`, `ProfilePanel`, `ReportDialog`, `SearchBox`, **`SocialPanel`**, `StoryComposer`, **`StoryViewer`**, `StreetPeek`, `UpdateNotice`, `Avatar`, `Drawer`, `PlaceImage`, `NetworkStatus`, `AppErrorBoundary`), 7 altyapı dosyası (`contexts/AuthContext.tsx`, `hooks/useServiceWorkerUpdate.ts`, `utils/shareLinkUrl.ts`, `utils/contrast.ts`, `main.tsx`, `types.ts`), 8 veri/fixture dosyası.
- **Neden önemli:** `lib/` ve `utils/` katmanı gerçekten iyi test edilmiş (saf mantık, sınırlar, hata yolları). Buna karşılık **K-01, K-02, K-04, K-05, K-06, K-08** bulgularının hepsi tam olarak test edilmeyen bu katmanda. Yani bu bulgular "yazılmadı" değil, "yakalayacak ağ yok".
- **Not:** Davranış testi için tarayıcı şart değil; bu bulguların çoğu `@testing-library` benzeri DOM koşumu olmadan da saf fonksiyon ayrıştırmasıyla kilitlenebilir — bu bir öneri, uygulanmadı.

### K-12 · D · İz kaydırıcıda `timeout` yok: GPS hiç dönmezse ekran sessizce bekler

- **Kanıt:** `src/hooks/useTrackRecorder.ts:112` → `watchPosition(..., { enableHighAccuracy: true, maximumAge: 0 })`.
- **Etki:** `timeout` verilmediği için tarayıcı "TIMEOUT" hatası üretmez; açık gökyüzü yoksa/konum hiç gelmezse kayıt "0 nokta" ile süresiz açık kalır, kullanıcıya "neden ilerlemiyor" bilgisi verilmez. `useGeolocation` aynı işi `timeout: REFINE_MS / 15_000` ile doğru yapıyor (`src/hooks/useGeolocation.ts:163,175`).
- **Ayrıca:** Kilitli ekranda davranış (Wake Lock yok) yalnız cihazda doğrulanabilir — bkz. §5.

### K-13 · D · Ağ durumu yalnız `navigator.onLine`'a bakıyor

- **Kanıt:** `src/components/NetworkStatus.tsx` (tamamı) — yalnız `online`/`offline` olayları.
- **Etki:** Captive portal, DNS'siz ağ veya yanıt vermeyen backend durumunda uygulama "çevrimiçi" der; kullanıcı hataları ağdan bağımsız sanır. `fetch` tabanlı bir sağlık yoklaması ya da en az "son başarılı yazma" göstergesi yok.

### K-14 · D · Cihaz hesabında bildirim dinleyicisi kimliksiz açılıyor, hatası da işlenmiyor

- **Kanıt:** `src/App.tsx:303-308` → `subscribeNotifications(user.uid, setNotifications)` — bulut/cihaz ayrımı yok, `onError` de verilmiyor.
- **Karşıt kanıt:** `src/hooks/useCollections.tsx:46-48` (`isCloudAccount`) aynı ayrımı doğru yapıyor; `src/lib/profileSync.ts` cihaz hesabında hiç yazmıyor; `subscribeNotifications` (`src/lib/notifications.ts:80-98`) `onError` parametresini destekliyor ama çağıran geçmiyor.
- **Etki:** Firebase yapılandırılmış derlemede cihaz hesabıyla giriş yapıldığında `users/{uid}/notifications` dinleyicisi kimliksiz açılır; kural reddeder; hata işleyicisi olmadığı için yalnız konsol gürültüsü + boşa okuma denemesi olur. İşlevi bozmuyor, ama "cihaz hesabı buluta hiç dokunmaz" kuralının tek istisnası.

### K-15 · B · `markAllRead` açılışta 50'ye kadar tekil yazma yapıyor

- **Kanıt:** `src/lib/notifications.ts:115-135` — okunmamış her bildirim için `batch.update`; tavan `limit(50)` olduğu için tek partide en fazla 50 yazma.
- **Etki:** Teknik olarak doğru (tek commit), ama "Okundu"ya basıldığında ücretsiz kotada 50 belge yazımı tetikleniyor. Ölçüm yapılmadı; yalnız not edilmeli.

### K-16 · B · `AddDiscoveryModal`'da söz zinciri `catch`'siz

- **Kanıt:** `src/components/AddDiscoveryModal.tsx` — `reverseName(...).then(...)`, `.catch` yok; `loadingName`/`region` yalnız çözülünce güncelleniyor.
- **Durum:** Bugün **güvenli**, çünkü `src/utils/geo.ts` içindeki `reverseName` kendi içinde hatayı yutuyor. Yani kusur değil, **kırılgan sözleşme**: `geo.reverseName` bir gün hata fırlatırsa modal "ad getiriliyor" durumunda kilitlenir.

---

## 4. Doküman / README iddiası ↔ kod

| İddia | Kaynak | Kodda durum |
| --- | --- | --- |
| Typecheck, lint, birim testleri, build, güvenlik denetimi PR'da koşar | `README.md:91-97`, `.github/workflows` | **Doğru.** Bu kesitte yerelde de aynı kapılar yeşil. |
| Firestore Rules testleri emülatörle koşar | `README.md:36-51` | **Doğru ama yalnız CI'da.** Yerelde Java yok; denetimde çalıştırılamadı. |
| Mobil katman menüsü açık kalem | `docs/mobil-denetim-2026-10-23.md:136` | **Hâlâ açık** (`index.css:650`). Doküman güncel, bkz. K-03. |
| Harita hava katmanı / 3B arazi / yer adları "bağlı" | `docs/gorevler/ana-yol-acik-kalanlar-2026-10-23.md:59` (AY-16) | **Kısmen.** Masaüstünde bağlı; mobilde düğmeler gizli olduğu için **telefonda ulaşılamaz** (K-03). İfade mobil için fazla iyimser. |
| Takip/rozet yordamı var, arayüze bağlı değil | AY-06 | **Doğru.** `src/lib/follows.ts` var, `src/components`/`App.tsx` içinde çağrı yok. |
| "Moderasyon sonucu bildirilecek" (arayüz metni) | `NotificationsPanel.tsx:34` | **Kodla uyuşmuyor** — bkz. K-07, AY-03. |
| Verilerimi indir (KVKK) eksiksiz/kısmi dosya üretmez | `src/lib/accountExport.ts:1-40` | **Doğru.** Sayfalama `readAllPages` sınır aşımında hata fırlatıyor, kısmi dosya yazmıyor; `replies` collection-group indeksi `firestore.indexes.json` içinde `COLLECTION_GROUP` olarak tanımlı. |
| "Bulut hesabı yoksa yayınlama çalışmaz" | `useCollections.tsx:141-153` | **Doğru ve dürüst.** Yerel modda rota cihaza yazılıyor ve çağırana açık Türkçe gerekçeyle hata dönüyor; "yayınlandı" denmiyor. |

---

## 5. Cihaz / canlı ortam olmadan doğrulanamayanlar

Bunlar **bulgu değil**, kapanış için kanıt gerektiren kalemler:

1. **Firestore Rules + indekslerin canlı sürümü** (`AY-09`): emülatör CI'da; Console'daki yayın durumu bu ortamdan görülemez.
2. **Production SHA + smoke** (`AY-10`): Cloudflare Pages dağıtımı ve gerçek tarayıcı smoke'u.
3. **Gerçek cihaz matrisi** (`AY-11`): Android Chrome / iOS Safari / masaüstü. Özellikle K-02 (dokunmatik duraklatma), K-03 (mobil düğme erişimi), K-12 (kilitli ekranda iz) burada kesinleşir.
4. **İki hesap / iki cihaz senkronu ve hesap silme** (`AY-12`): tek cihaz testleri bunun yerine geçmiyor.
5. **Uçak modu / zayıf ağ saha testi** (`AY-15`): paket indirme, kota, iptal ve geri alma.
6. **Ekran okuyucu ve dinamik erişilebilirlik** (`AY-17`): statik tarama var, NVDA/VoiceOver turu yok. Not: `usePanelAccess` odak tuzağı ve odak dönüşü kodda mevcut; MapLibre canvas'ın klavye alternatifi yok.
7. **Bildirim dinleyicisinin cihaz hesabındaki gerçek hata metni** (K-14): kod okumasıyla kesin, tarayıcı konsoluyla teyit edilmedi.
8. **K-10 bütçe sınırının CI'daki gerçek davranışı**: yerelde ölçüldü; CI'daki Node/sürüm farkı birkaç yüz bayt oynatabilir.

---

## 6. Denetlendi, sorun bulunmadı (yanlış alarmları kapatmak için)

Bunlar özellikle arandı ve **temiz** çıktı; rapora tekrar bulgu olarak girmemeli:

- **CSP `connect-src` ile ağ envanteri uyumlu.** Üretimdeki yedi `fetch` hedefi — `commons.wikimedia.org` (`hooks/usePlaceGallery.ts:25`, **`connect-src`'de var**), `overpass-api.de` (`utils/openMapPlaces.ts:59`, `utils/historicSites.ts:203,12`), Photon (`utils/geo.ts:58`), Open-Meteo (`utils/weather.ts:320`), DEM karoları (`utils/elevation.ts:277`, `s3.amazonaws.com`), `hooks/useInstallApp.ts:55` — CSP'de karşılığı olan hostlara gidiyor. `pleiades.stoa.org`, `en.gancarczyk.com`, `yandex.com/maps`, `maps.apple.com` **fetch değil**, `<a href>` hedefi veya veri alanı; CSP sorunu değil.
- **Tek service worker dinleyicisi.** `useServiceWorkerUpdate` yalnız `UpdateNotice` içinden (`src/main.tsx:25`) çağrılıyor; çift kayıt/çift banner yok.
- **Dinleyici sızıntısı yok.** `addEventListener`/`removeEventListener` eşleri tutarlı (`App.tsx`, `MapView.tsx`, `useServiceWorkerUpdate.ts`, `useGeolocation.ts`); `MapView`'daki iki fazla `addEventListener` marker elemanına bağlı ve marker ile birlikte gidiyor.
- **Bildirim yazımı ↔ Rules uyumu.** `createNotification` gövdesi `firestore.rules:489-546`'daki `validNotification` + `notificationProof` + `friendDeclineProof` ile alan alan örtüşüyor; istemcinin yazdığı altı tipin hepsi kanıt kapısına sahip.
- **`accountExport` sayfalaması** imleç + `EXPORT_MAX_PAGES` ile sınırlı; sınır aşılırsa kısmi dosya üretmiyor.
- **`polyline.ts`** encode/decode çifti simetrik; bozuk girdide döngüden çıkıyor.
- **`offlinePacks` eksik hesabı** (`missing = total - done + failed`) **doğru**: `done` hem başarılı hem başarısız öğeleri sayıyor, formül iptal senaryosunda da tutuyor (denetim sırasında yeniden hesaplandı; önceki not yanlıştı). İptal yolunda yarım karolar siliniyor ve paket dizine yazılmıyor.
- **`useCollections.publishRoute` yerel modda "kaydet + hata" davranışı** kasıtlı ve mesajı dürüst ("rota bu cihazda kaydedildi, yayımlanamadı").
- **`useGeolocation`** izin değişimi, nesil sayacı, geçersiz ölçüm reddi ve `timeout` ile doğru kurulmuş.
- **`dist/` gitignore'da**, çalışma ağacı temiz; denetim sırasında üretilen build çıktısı commit edilebilir durumda değil.

---

## 7. Önerilen düzeltme sırası (yalnız öneri — hiçbiri uygulanmadı)

1. **K-04 + K-05 + K-06** — küçük, tek dosyalık, kullanıcıya doğrudan dokunan tutarlılık işleri (onay diyaloğu, başarısız paylaşım geri bildirimi, bildirim tipi etiketi).
2. **K-01 + K-02** — haritada hayalet rota ve hikâye duraklatma; ikisi de "kullanıcı yanlış durum görüyor" sınıfı.
3. **K-08 + K-09 + K-14** — ucuz sağlamlaştırma (zamanlayıcı temizliği, `href="#"` yerine düğme, cihaz hesabında bildirim aboneliğini kapatma + `onError`).
4. **K-03** — ürün kararı gerekiyor (mobil katman menüsü); doküman zaten açık kalem olarak tutuyor.
5. **K-10 + K-11** — sürdürülebilirlik: bütçe kararı ve UI katmanı için davranış testleri. Bunlar yapılmadan yeni özellik eklemek her seferinde CI ve regresyon riskiyle karşılaşacak.
6. **K-07** — AY-03 kapanmadan bildirim panelindeki vaat metni düzeltilmeli ya da metin koşullu hale gelmeli (ürün/hukuk kararı).

---

## 8. Kesin sayılar (özet)

- Okunan/taranan kaynak dosya: `src` altındaki 200'ü aşkın dosya (tamamı ya tümüyle ya hedefli).
- Doğrulanmış kod kusuru: **14** (O: K-01, K-02, K-03, K-10, K-11 · D: K-04…K-09, K-12…K-14 · B: K-15, K-16).
- Ayrıca **1** doküman/arayüz uyumsuzluğu (K-07 + AY-16 mobil ifadesi).
- Bu kesitte düzeltilen/onaylanan/reddedilen iş: **yok** — talep gereği yalnız kayıt.
- Sonraki düzeltme turu (kullanıcı talebi): **11 bulgu kapandı**, 3 bulgu kısmen, 5 bulgu açık (§9).

---

## 9. Düzeltme turu (kullanıcı talebi: "düzeltebiliyor musun")

**Branch:** `arena/57b4022c-atlasia` · **Taban:** `8f0bec9`

### 9.1 Yapılan düzeltmeler

| Bulgu | Dosya | Ne değişti |
| --- | --- | --- |
| K-01 | `src/App.tsx`, `src/components/TrackRecorderPanel.tsx` | `trackPreviewDrawn` ref'i eklendi. İz önizlemesi boşaltılınca ve panel kapanınca `clearRoute()` çağrılıyor; Atlas rota çizimine dokunulmuyor. |
| K-02 | `src/components/StoryViewer.tsx` | Geçen süre ref'e taşındı; rAF döngüsü bir kez kuruluyor, `paused`/`next` ref üzerinden okunuyor. Duraklatma çubuğu sıfırlamıyor. |
| K-04 | `src/components/SocialPanel.tsx`, `src/components/StoryViewer.tsx` | Gönderi ve hikâye silmede `confirm` onayı (yer silme ve engelleme ile aynı desen). Hikâyede iptal, görüntüleyiciyi kapatmıyor. |
| K-05 | `src/components/AtlasAssistant.tsx` | Paylaşım hatası `role="alert"` ile gösteriliyor; pano yokluğu ve kullanıcı iptali (`AbortError`) ayrı ele alınıyor. |
| K-06 | `src/components/NotificationsPanel.tsx` | `TYPE_LABELS` ile Türkçe etiketler; bilinmeyen tip için nötr "Bildirim". |
| K-07 | `src/components/NotificationsPanel.tsx` | "raporların durumu burada görünecek" → "Rapor sonucu bildirimi bu sürümde gönderilmiyor" (AY-03 kapanana kadar dürüst metin). |
| K-08 | `src/components/ReportDialog.tsx` | Kapanış zamanlayıcısı ref'te; unmount'ta `clearTimeout`. |
| K-09 | `src/components/Header.tsx` | `href="#"` bağlantısı marka `<span>`'ine dönüştü; hash kirlenmesi bitti. Görsel yerleşim değişmedi (masaüstü başlık solda). |
| K-12 | `src/hooks/useTrackRecorder.ts` | `watchPosition`'a `timeout: 30_000` eklendi (`GPS_TIMEOUT_MS`). |
| K-13 | `src/components/NetworkStatus.tsx` | `online` olayından sonra aynı kaynaklı `/manifest.webmanifest` tek seferlik yoklanıyor (6 sn iptal); ulaşılamazsa "Bağlantı doğrulanamadı" şeridi. Yoklama isteğe bağlı, başarısız olsa da uygulama çalışır. |
| K-14 | `src/App.tsx` | Bildirim aboneliği `isCloudAccount(...)` kapısına bağlandı (cihaz hesabında açılmıyor) ve `onError` ile loglanıyor. |
| K-16 | `src/components/AddDiscoveryModal.tsx` | `reverseName` zincirine `.catch` eklendi; hata durumunda "ad getiriliyor" kilidi oluşmuyor. |

Davranış değişikliği içeren iki madde (K-04 onay diyaloğu, K-13 yoklama) bilinçli olarak en küçük tutuldu; ürün yerleşimi, tema, harita kontrolleri ve yayın hattı **değişmedi**.

### 9.2 Eklenen / güncellenen testler

| Dosya | Test | Kilitlediği bulgu |
| --- | --- | --- |
| `src/components/StoryViewer.test.ts` | duraklatma süreyi korur; süre dolunca sonraki hikâyeye geçer | K-02 |
| `src/components/NotificationsPanel.test.ts` | ham anahtar görünmez; tutulamayacak söz yok | K-06, K-07 |
| `src/components/ReportDialog.test.ts` | unmount sonrası `onClose`/`onReported` çağrılmaz | K-08 |
| `src/hooks/useTrackRecorder.test.ts` (güncellendi) | `watchPosition` seçeneklerinde `timeout: 30_000` | K-12 |

K-01 için bileşen testi yazılmadı: `MapView` MapLibre/WebGL gerektiriyor, bu ortamda çalıştırılamıyor; davranış `App.tsx` içindeki açık `clearRoute()` çağrısıyla sağlanıyor ve cihazda doğrulanmalı (§5/3).

### 9.3 Bilinçli olarak açık bırakılanlar

1. **K-03 (mobil katman menüsü).** Yerleşim/ürün kararı; AGENTS.md "kullanıcı istemeden yerleşim değişikliği yapma" kuralı gereği dokunulmadı. Açık kalem: `docs/mobil-denetim-2026-10-23.md`.
2. **K-07'nin işlevi.** Rapor sonucu bildirimi sunucu/yönetici yazımı gerektiriyor; AY-03 kararı olmadan kod eklenmez. Yalnız yanıltıcı metin düzeltildi.
3. **K-10 (bütçe).** Düzeltmeler JS'i 886.088 → **886.659 B gzip** yaptı; pay **1.341 B**. Bütçeyi büyütmek ya da chunk bölmek bir karar; bu turda yapılmadı.
4. **K-11'nin kalanı.** 45 dosyadan 3'ü artık testli (42 açık). UI katmanının tamamını kapsamak ayrı bir iş.
5. **K-15.** Kusur değil; `markAllRead` hâlâ tek partide en fazla 50 yazma yapıyor.

### 9.4 Kapılar (düzeltme sonrası, yerel)

| Kapı | Sonuç |
| --- | --- |
| `npm run typecheck` | PASS (0 hata) |
| `npm run lint` | PASS (0 uyarı) |
| `npm run test:run` | PASS — **129 dosya, 959 test** (önce 126/954) |
| `npm run build` (bütçe + SW kabuğu) | PASS — JS 886.659/888.000 B, CSS 34.451/34.500 B, SW 28/28 |
| `npm run test:scripts` | PASS — 6 betik grubu, 0 hata |
| `npm run audit:check` | PASS |
| `npm run verify:social-metadata` | PASS — 18 değer |
| `npm run rules:inventory` | Çalıştı; kurallar değişmedi |
| `npm run test:rules:emulator` | **Çalıştırılamadı** — Java 21 yok (CI'ya bağlı) |

Kurallar (`firestore.rules`), indeksler, CSP (`public/_headers`) ve service worker (`public/sw.js`) bu turda **değişmedi**; değişiklikler yalnız istemci davranışı ve iki bileşen metni düzeyinde.
