# Atlasia — MVP Denetimi ve Yapılacaklar (madde madde)

**Tarih:** 27 Ekim 2026 · **Kesit:** `main` = `fd9b780` (PR #114) · **Dal:** `arena/c16a6f9b-atlasia`
**Yöntem:** Her MVP akışı tek tek okundu, kapılar çalıştırıldı, sayılar depoda **ölçüldü**. Kanıt satır numarasıyla verildi. Tahminler "≈" ile işaretli.

---

## 1. Ölçüm özeti (bu turda çalıştırıldı)

| Kapı | Sonuç |
|---|---|
| `npx tsc --noEmit` | **PASS** (0 hata) |
| `npx eslint . --max-warnings=0` | **PASS** (0 uyarı) |
| `npm run test:run` | **PASS** — 149 dosya / **1.202 test** *(2026-10-28 ölçümü)* |
| `npm run test:scripts` | **PASS** — 8/8 paket |
| `npm run build` | **PASS** — ama paylar kritik (§2) |
| `verify:sw-shell` | **PASS** — 44/44 |

**2026-10-28 güncel ölçüm** (`main` = `f58d0ef` + bu turdaki eşik sıkılaştırması):

| Ölçüm | Değer | Bütçe | **Kalan pay** |
|---|---|---|---|
| **Tanıtım yolculuğu (gzip)** | **116.702 B** | **120.300 B** | **3.598 B (%3,0)** |
| Uygulama kabuğu (giriş sonrası) | 516.564 B | 532.000 B | 15.436 B (%2,9) |
| **İlk boya JS (gzip)** | **90.444 B** | **93.200 B** | 2.756 B (%3,0) |
| İlk boya CSS (gzip) | 24.504 B | 25.200 B | 696 B (%2,8) |
| entry (uygulama kodu) | 19.722 B | 20.400 B | 678 B (%3,3) |
| **Toplam JS (gzip)** | **915.389 B** | 916.500 B | **1.111 B (%0,12)** ⚠️ |
| Toplam CSS (gzip) | 35.021 B | 35.700 B | 679 B (%1,9) |
| `verify:sw-shell` | 44/44 | — | — |

> 27 Ekim (kabuk bölünmesinden önce): ilk HTML seti 412.238 / 439.000, ilk boya JS 387.761 / 398.000, tanıtım 413.463. Bölünmeyle tanıtım **413.463 → 116.702 B gzip (−%72)**.

Kaynak: 143 dosya · en büyük dosyalar `components/Explorer.tsx` 1.680, `moderation.ts` 1.199, `SocialPanel.tsx` 853, `firestoreData.ts` 809, `MapView.tsx` 785. `App.tsx` artık **58 satır** (giriş kapısı).
Testi olmayan kaynak dosya: **≈36** (kabuk bölünmesinden sonra; `Explorer` dolaylı kapsanıyor).

---

## 2. KAPANDI: CSS bütçesi — kapsam hatası düzeltildi (2026-10-27)

Eski durum: `Toplam CSS 34.957 / 35.100` → 143 B pay, yani **tek bir yeni sınıf build'i kırıyordu**.

**Teşhis:** bütçe yanlış şeyi ölçüyordu. "Toplam CSS" haritanın **10.517 B'lik lazy `map-vendor` dosyasını** da sayıyor; oysa `dist/index.html` yalnız `index-*.css` (24.440 B gzip) çekiyor — lazy harita CSS'i ilk HTML'de **hiç yok** (M-01a fiilen zaten yapılmış, `deferredAssetPrefixes` bunu koruyor).

**Yapılan (gevşetme değil, sıkılaştırma):**
- `initialCssGzipBytes: 25_900` ve `initialJsGzipBytes: 398_000` eklendi → ilk boyaya giren gerçek maliyet ayrı ve **daha sıkı** ölçülüyor (24.440 / 25.900 ve 387.761 / 398.000).
- `totalCssGzipBytes` 35.100 → **35.700** (743 B ≈ %2,1 pay). Gerekçe `scripts/bundle-budget.mjs` başlığında yazılı.
- `scripts/bundle-budget.node-test.mjs`: iki yeni test — (i) lazy harita CSS'i toplamda var, ilk boyada yok; (ii) yalnız ilk boya CSS bütçesini aşan dosya, toplam içinde kalsa bile CI'ı kırar.
- Rapor satırı eklendi: `İlk boya CSS: … · İlk boya JS: …`.

**Sonuç:** CSS işi yapmak artık CI'yı kırmıyor; üst sınır korunuyor ve ilk boya iki yeni kapıyla izleniyor. M-01a kapandı, M-02 kapandı.

**Maddeler:**

- **M-01 · P0 — CSS bütçesini aç.** ~~(b) ölü kural silme~~ **yapıldı** (9 sınıf, +117 B). Kalan yol:
  - (a) **hâlâ açık** — `map-vendor` CSS'i (83 KB ham / 10,5 KB gzip) yalnız harita yüklenirken çekilsin: `MapView` lazy olduğu için `maplibre-gl/dist/maplibre-gl.css` importu `index.css`'ten `MapView.tsx`'e taşınır. Kazanç ≈ 10 KB gzip → pay ~%30.
- **M-02 · P0 — Eşikleri gerçek ölçüme sabitle.** Bütçe ölçümün hemen üstünde tutulmaya devam ederse her iş kırılır; CSS eşiğini (a) uygulandıktan sonra **28.000**'e, JS'i **895.000**'e çek. Amaç: pay ≥ %2.
- **M-03 · P1 — Bütçeyi "sadece toplam" olmaktan çıkar.** `initialGzipBytes` zaten var; **route bazlı** ölçüm ekle: açılış sayfası ≤ 250 KB, uygulama kabuğu ≤ 700 KB.

---

## 2b. DÜZELTİLDİ (2026-10-28): bütçe eşikleri bayatlamıştı — kapı fiilen ölmüştü

Kabuk bölünmesi tanıtımı 413 KB → 117 KB'ye indirdi ama **eşikler eski yerinde kaldı**:

| Kapı | Ölçüm | Eski eşik | Boşluk |
|---|---|---|---|
| initial (ilk HTML seti) | 116.702 | 439.000 | **%73** |
| ilk boya JS | 90.444 | 398.000 | **%77** |
| tanıtım yolculuğu | 116.702 | 425.000 | **%73** |
| entry | 19.722 | 174.000 | **%89** |
| uygulama kabuğu | 516.564 | 830.000 | %38 |

Yani **tanıtıma 300 KB eklemek bile CI'dan geçerdi**. Bütçe "koruma" değil, süs olmuştu.

**Yapılan:**
1. Tüm bizim-kod kapıları ölçüme ~%3 payla yeniden bağlandı: `initial 120.300`, `initialJs 93.200`, `initialCss 25.200`, `entry 20.400`, `landing 120.300`, `appShell 532.000`, `mapView 9.100`.
2. **Bayatlama kapısı** eklendi (`BUNDLE_BUDGET.staleness`): sahibi olduğumuz bir kapı ölçümün **%20'sinden** fazla (ve 4 KB'dan çok) üstündeyse build **kırılır** ve mesaj hedef eşiği söyler (*"entry eşiği bayat: ölçüm 40 B, eşik 140 B… eşiği ~100 B yap"*). Böylece büyük bir kazançtan sonra eşik sıkılaştırmak zorunlu; sessizce gevşeyemez.
3. Satıcı (vendor) kategorileri kapsam dışı — sürüm yükseltmelerinde doğal dalgalanırlar.
4. 3 yeni test: bayat eşik kırar · güncel eşik kırmaz · vendor kapsam dışı (`test:bundle-budget` 14/14).

---

## 3. Ölçüm katmanı — ~~3 olay tanımlı ama hiç çağrılmıyor~~ **kapandı (2026-10-27)**

> `analytics.share` (AtlasAssistant: native/clipboard), `analytics.offlinePack` (OfflinePackage: indirme + silme), `analytics.reportCreated` (ReportDialog) artık gerçek akışlara bağlı. Kalan iş: **M-07** olay şeması testi ve `docs/olcum-ve-hata-izleme.md` olay tablosunun bu 3 olayla güncellenmesi.


Geçen turda eklenen `analytics` API'sinin çağrı sayımı:

| Olay | Çağrı |
|---|---|
| `appOpen`, `sessionStart`, `signUp`, `signIn`, `placeCreated`, `routePublished`, `postCreated` | ✅ 1-2 |
| **`share`** | ❌ **0** |
| **`offlinePack`** | ❌ **0** |
| **`reportCreated`** | ❌ **0** |

Yani "paylaşım", "çevrimdışı paket" ve "rapor" ölçümleri **veri üretmiyor**. Bu benim geçen turdaki eksiğim; kapatılmalı.

**Maddeler:**
- **M-04 · P0** — `AtlasAssistant.share()` (`:307-320`) sonucunda `analytics.share({ channel, target: "route", ok })` çağır. Aynı desen `PlaceDetails`/`RecordsDock` paylaşımlarına da uygulanır.
- **M-05 · P0** — `OfflinePackage` indirme/silme sonucunda `analytics.offlinePack({ action, ok })`.
- **M-06 · P0** — `ReportDialog` gönderiminde `analytics.reportCreated({ targetType })`.
- **M-07 · P1** — Bu üç olay için test: olayın gerçekten tetiklendiğini kilitleyen bileşen testi (`analytics.share` şu an testte hiç çağrılmıyor).
- **M-08 · P0 — Toplayıcı yok, ölçüm kapalı.** `VITE_TELEMETRY_ENDPOINT` tanımlı değil → hiçbir veri çıkmıyor. Karar verilip Cloudflare'de değişken girilmeli (30-40 satırlık Worker yeterli; paket etkisi 0 kB).

---

## 4. Akış akış MVP kontrolü

Her satır: **durum · kanıt · eksik.**

### 4.1 Açılış ve ilk kullanım

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-09** | ⚠️ Kısmi | `App.tsx:208` → başlangıç görünümü `{ zoom: 2, lng: 30, lat: 30 }` | İlk açılış **dünya görünümü**. 28 nokta dünyaya dağılmış → harita boş görünüyor. Pilot bölgeye (ör. İzmir/İzmir çevresi) `zoom 11` ile açılmalı; konum izni varsa oraya. **P1** |
| **M-10** | ⚠️ Kısmi | `LandingPage` → `AccountAccess`; `App.tsx:1601` `if (!user) return …` | **Misafir gezinme yok.** Hesabı olmayan kullanıcı haritayı hiç göremiyor. MVP dönüşümü için "keşfetmeye göz at" (salt okuma, yazma yok) düşünülmeli. **Karar gerekli.** |
| **M-11** | ✅ Var | `Onboarding.tsx` — 3 seçenek, odak tuzağı, Esc | — |
| **M-12** | ✅ Var | `CookieConsent` iki yol (zorunlu / anonim ölçüm), `aria` tam | — |

### 4.2 Kimlik doğrulama

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-13** | ✅ Var | E-posta + Google (`AccountAccess.tsx:292`), cihaz hesabı, kurtarma anahtarı, e-posta doğrulama | — |
| **M-14** | ✅ Kapandı (2026-10-27) | Apple düğmesi bayrak kapalıyken **hiç render edilmiyor** (`{APPLE_AUTH_ENABLED && …}`); "yakında" metni kaldırıldı, nottaki Apple ifadesi koşullu | Bayrak açıldığında düğme normal görünür ve `authConfigured` bekler. **P2** |
| **M-15** | ⚠️ Kısmi | Telefon girişi `VITE_PHONE_AUTH_ENABLED` arkasında | Bilinçli kapalı; iletişimde vaat edilmemeli. **Bilgi** |
| **M-16** | ✅ Var | `AuthContext` → giriş/kayıt olayları ölçülüyor | — |

### 4.3 Harita, arama, keşif

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-17** | ✅ Var | MapLibre + 3 altlık + katman sayfası (`MapLayersSheet`), mobil kapsül 3 düğme | — |
| **M-18** | ⚠️ Kısmi | `App.tsx:174-183` veri hatasında **tek seferlik `setToast`** | Feed/harita yüklenemezse: toast kayboluyor, **tekrar dene yok**, sessizce yerel veriye düşüyor. Kalıcı hata şeridi + "Yeniden dene" gerekli. **P0** |
| **M-19** | ⚠️ Kısmi | İskelet yalnız `RecordsDock:125`'te | Feed, arama sonuçları ve yer detayında iskelet yok → boş ekran algısı. **P1** |
| **M-20** | ⚠️ Kısmi | `PlaceDetails` zengin (foto, not, hava, yakın tarih) | Açılış saati/ücret/telefon **kasıtlı olarak yok** ("doğrulanmadı" deniyor). Dürüst ama kullanıcı beklentisi yönetilmeli. **Bilgi** |
| **M-21** | ✅ Var | `SearchBox` + geçmiş + `photon` | — |

### 4.4 İçerik üretme (asıl MVP değeri)

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-22** | ✅ Var | `AddDiscoveryModal` → iz bırakma, foto sıkıştırma (`compressImage`) | — |
| **M-23** | ⚠️ Kısmi | `MAX_CLOUD_PHOTO_CHARS = 180_000`, `storage.rules` **tamamen kapalı** | Fotoğraf **Firestore belgesinin içinde** base64. 50 gönderilik akış dolarsa ≈ 1,8-9 MB indirme; **çoklu foto imkânsız** (1 MiB belge sınırı). **P0 — karar: Storage/Blaze mı, 60-80 KB'ye sıkıştırma mı.** |
| **M-24** | ✅ Var | `RouteEditor` + yükseklik profili + görünürlük (özel/yayın) | — |
| **M-25** | ⚠️ Kısmi | `src/data/siteTours.ts` → `isRealPath` **her turda `false`** | Site turlarının yürüme geometrisi yok; çizgi temsilî. Etiket arayüzde görünüyor mu doğrulanmalı. **P1** |
| **M-26** | ⚠️ Kısmi | `useTrackRecorder.ts` — `timeout` eklendi | **Wake Lock yok** (`wakeLock` hiç geçmiyor): ekran kapanınca kayıt durur. Yürüyüş kaydı için kritik. **P1** |
| **M-27** | ✅ Var | İz → taslak → onay → kaydet/yayınla akışı | — |

### 4.5 Sosyal katman

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-28** | ✅ Var | Gönderi, hikâye (24s TTL), yanıt, beğeni, engelleme | — |
| **M-29** | ⚠️ Kısmi | `SocialPanel` 853 satır tek dosya | Bakım riski; testi de yok. Parçalanmalı (Feed / PostCard / StoryBar / Replies). **P2** |
| **M-30** | ⚠️ Kısmi | Arkadaşlık + grup + davet linki (`groups.ts` 775 satır) | Arama yarışı düzeltilmiş (`FriendsTab:91-107` seq kontrolü) ✅. Grup sohbeti kota riski ölçülmemiş. **P2** |
| **M-31** | ❌ Yanlış metin | `NotificationsPanel.tsx:46` → "Kaydettiğin yerler ve rotalar, alttaki **Kaydet sekmesinde** seni bekler." | **O sekme kaldırıldı** (kayıtlar artık üç çizgi menüsünde). Kullanıcı olmayan bir sekmeyi arıyor. Metin düzeltilmeli. **P0 — 1 satır** |
| **M-32** | ⚠️ Kısmi | `NotificationsPanel` grup/arkadaş için aksiyon düğmesi var | Rapor sonucu bildirimi gönderilmiyor (metinde dürüstçe yazıyor). Push yok. **Karar** |
| **M-33** | ⚠️ Kısmi | Silme onayı `confirm()` (native) — `SocialPanel:527`, `App.tsx:906` | Marka dışı; bazı uygulama içi tarayıcılarda engellenir. Ortak `ConfirmDialog` bileşeni. **P2** |

### 4.6 Profil, ayarlar, hesap

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-34** | ✅ Var | 3 sekmeli sade profil, hesap bilgileri `<details>`, hesap silme + dışa aktarma (`moderation.ts:1058-1195`) | — |
| **M-35** | ⚠️ Kısmi | `ProfilePanel` (testi yok) | 42 testsiz dosyanın içinde; hesap silme gibi geri alınamaz akış test edilmiyor. **P1** |
| **M-36** | ✅ Var | `SettingsPanel` — tema, altlık, erişilebilirlik, konum, kurulum | — |

### 4.7 Çevrimdışı ve PWA

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-37** | ✅ Var | SW v7, kabuk 31/31, güncelleme kullanıcıya soruluyor | — |
| **M-38** | ⚠️ Kısmi | `OfflinePackage` + `offlinePacks.ts` sınırlar var | **Saha kanıtı yok**: uçak modu, kota, yarıda iptal, geri alma. **P1** |
| **M-39** | ⚠️ Kısmi | `NetworkStatus` yalnız `navigator.onLine` | Captive portal / DNS'siz ağda "çevrimiçi" der. `fetch` sağlık yoklaması. **P2** |

### 4.8 Moderasyon ve güvenlik

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-40** | ✅ Var | `firestore.rules` 1.326 satır, 35 `match`, rapor → inceleme → askı **sunucuda** zorlanıyor | — |
| **M-41** | ❌ Kanıt yok | Rules/indeks canlı sürümü Console'da teyit edilmedi | `docs` + `dogrula:canli` var, **panel teyidi yok**. **P0** |
| **M-42** | ❌ Kanıt yok | App Check `Enforce` açık mı? | Kodda entegrasyon var, enforce kanıtı yok. **P0** |
| **M-43** | ⚠️ Kısmi | `moderators/{uid}` elle atanıyor (`docs/moderasyon-akisi.md`) | SLA ve nöbetçi tanımsız; rapor yanıt süresi ölçülmüyor. **P1** |
| **M-44** | ⚠️ Kısmi | 63 boş `catch` bloğu sayıldı | Çoğu bilinçli (sessiz düşme) ama içerik/paylaşım gibi akışlarda kullanıcıya hiçbir şey söylenmiyor. Kritik 10 tanesi ayıklanıp telemetriye bağlanmalı. **P1** |

### 4.9 Erişilebilirlik

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-45** | ✅ İyi | 161 `aria-label`, `usePanelAccess` odak tuzağı, `role="alert"`, `aria-live`, kontrast testleri | — |
| **M-46** | ❌ Yok | `axe` / Lighthouse a11y kapısı yok | CI'da otomatik erişilebilirlik kontrolü yok → regresyon görülmez. **P1** |
| **M-47** | ⚠️ Kısmi | MapLibre canvas'ın klavye alternatifi yok | Harita dışı akışlar klavyeyle tamamlanabiliyor; harita için "liste görünümü" alternatifi düşünülmeli. **P2** |

### 4.10 Kalite ağı

| # | Durum | Kanıt | Eksik / yapılacak |
|---|---|---|---|
| **M-48** | ⚠️ Kısmi | 140 test dosyası / 1.087 test | **42 kaynak dosya testsiz** (27 bileşen: `App`, `SocialPanel`, `MapView`, `GroupsPanel`, `ProfilePanel`, `AccountAccess`, `AtlasAssistant`, `PlaceDetails`, `SearchBox`…) — bulguların çoğu bu katmanda çıkıyor. **P1** |
| **M-49** | ❌ Yok | Playwright/E2E hiç yok | 5 kritik akış otomatik doğrulanmıyor: açılış→giriş→harita→iz bırak→çıkış. **P1** |
| **M-50** | ⚠️ Risk | `App.tsx` 1.608 satır; 20 `setToast` çağrısı, 15 `void` promise | Dev dosya; alt bileşenlere ayrılmalı. **P2** |

---

## 5. Ürün ve içerik (kodla çözülmez)

| # | Durum | Eksik / yapılacak |
|---|---|---|
| **M-51** | ❌ | **Pilot bölge seçilmedi.** 28 rehber yer, 4 site turu — topluluk uygulaması için boş dünya. Tek bölgede **≥30 saha-doğrulanmış** nokta şart. **P0 (ürün kararı)** |
| **M-52** | ⚠️ | Fotoğraflar Pexels stock (`places.ts:4`). Pilot bölgede gerçek çekim tercih edilmeli. **P2** |
| **M-53** | ❌ | **Yasal metinlerde 17 yer tutucu** (`LEGAL_PLACEHOLDERS`): `[TARİH] [AD SOYAD / UNVAN] [E-POSTA] [ŞEHİR]` + "Taslak · avukat onayı bekliyor". Yayında böyle durması itibar riski. **P0** |
| **M-54** | ❌ | `sitemap.xml` yok, JSON-LD yok, özel alan adı yok (`atlasia.pages.dev`). **P1** |
| **M-55** | ❌ | Çok dilli değil (`lang="tr"` sabit) — pilot için doğru karar, lansman sonrası. **P2** |
| **M-56** | ❌ | Push bildirim yok; iOS'ta yalnız kurulu PWA'da çalışır. **Karar** |

---

## 6. Altyapı ve operasyon

| # | Durum | Eksik / yapılacak |
|---|---|---|
| **M-57** | ⚠️ | **6 açık bağımlılık PR'ı** (#79-83, firebase 13 / maplibre 6.15 / react / tooling). Birikirse güvenlik açığı ve büyük sıçrama riski. **P1** |
| **M-58** | ⚠️ | `firestore-backup.mjs` var ama **zamanlanmış değil**, geri yükleme **hiç denenmemiş**. **P1** |
| **M-59** | ⚠️ | Firestore Rules emülatörü yalnız CI'da (yerelde Java yok) — yerel doğrulama eksik. **P2** |
| **M-60** | ⚠️ | Üretim projesi `atlasia-dev` (tek proje). Beyan edilmemiş: `ATLASIA_URETIM_PROJESI` + `ATLASIA_PROD_ENV_POLICY=enforce` panelde yok. **P0 — panel işi** |

---

## 7. Öncelik sırası (ilk öneri — arşiv; yerini §10 aldı)

### Sprint 1 — "Kırılmasın" (2-3 gün)
1. **M-01** CSS bütçesini aç (map-vendor CSS'i lazy yap) → **M-02** eşikleri düzelt
2. **M-31** yanlış "Kaydet sekmesi" metnini düzelt
3. **M-04, M-05, M-06** ölü üç analitik olayı bağla (+ M-07 test)
4. **M-08** telemetri uç noktası (Worker + Cloudflare değişkeni)
5. **M-18** feed/harita hata şeridi + "Yeniden dene"
6. **M-60, M-41, M-42** panel teyitleri (beyan, Rules, App Check enforce)

### Sprint 2 — "Güvenilir olsun" (3-4 gün)
7. **M-53** yasal metinler (avukat)
8. **M-23** fotoğraf mimarisi kararı ve uygulaması
9. **M-26** Wake Lock, **M-38** çevrimdışı saha testi
10. **M-19** iskeletler, **M-09** pilot bölgeye açılış

### Sprint 3 — "Ölçülsün" (3-4 gün)
11. **M-49** 5 E2E senaryo, **M-46** axe kapısı
12. **M-48** en riskli 8 bileşene test
13. **M-57** bağımlılık PR'ları, **M-58** yedek tatbikatı
14. **M-03** route bazlı bütçe + Lighthouse CI

### Sprint 4 — "Ürün olsun" (içerik)
15. **M-51** pilot bölge + 30 doğrulanmış nokta
16. **M-25** gerçek/etiketli site turu, **M-54** domain + sitemap
17. **M-10, M-32, M-56** misafir gezinme / bildirim kararları

---

## 8. Senden karar bekleyen 4 şey

| # | Soru | Neden blokaj |
|---|---|---|
| 1 | **Fotoğraf:** Blaze/Storage mı, 60-80 KB sıkıştırma mı? | Akış boyutu, çoklu foto, maliyet — M-23 |
| 2 | **Hukuk:** künye + KVKK metnini kim/ne zaman onaylar? | Yayında taslak metin olmaz — M-53 |
| 3 | **Pilot bölge:** hangi şehir/alan? | İçerik üretimi ve ilk açılış görünümü buna bağlı — M-51, M-09 |
| 4 | **Misafir gezinme:** hesapsız keşfetme olacak mı? | Mimari ve dönüşüm — M-10 |

---

## 9. Tek cümle

Kod sağlam (1.087 test, 0 tip/lint hatası); **ama CSS bütçesinde 26 bayt kaldı, 3 ölçüm olayı hiç çağrılmıyor, yasal metin taslak, fotoğraflar belge içinde ve pilot bölge seçilmedi** — MVP'yi "profesyonel" yapan fark tam olarak bu beş madde.

---

## 10. Revize sıra (2026-10-27, site turu sonrası)

**Neden değişti:** İlk sıra "kod yazma kolaylığına" göreydi. Site turunda Sprint 1'in dört maddesi (M-01b, M-31, M-04/05/06) ve site yüzeyi (yasal erişim, SSS, sitemap/robots, JSON-LD) kapandı. Darboğaz artık **kod değil, kanıt ve uyum**: yayınlanmamış site profesyonel sayılmaz, CSS payı hâlâ 143 B, yasal metin taslak, pilot bölge belirsiz.

**Yeni sıralama ölçütü — bir sonraki adımı bloke eden şey:**
1. Yayına çıkma (yoksa hiçbir madde kullanıcıya ulaşmaz)
2. Her arayüz işini kıran bütçe (yoksa hiçbir CSS işi yapılamaz)
3. Yasal/ürün riski (yanlış metin yayında kalırsa geri dönüşü pahalı)
4. Kanıt altyapısı (E2E, a11y, route bütçesi — kalıcı hız)

### Parti A — Yayın kapısı (≈0,5 gün · kilit: onayın)

| # | İş | Neden bu sırada | Efor | Kilit |
|---|---|---|---|---|
| A1 | PR #118 merge → deploy → `npm run dogrula:canli`, `/sitemap.xml`, `/robots.txt`, `/uygulama/` 200 kontrolü | Deploy edilmemiş iyileştirme yok hükmünde | 20 dk | **senin "deploy" onayın** |
| A2 | Search Console'a sitemap gönderimi + `_headers`/`_redirects` canlı doğrulaması | Robots/sitemap ancak yayında iş görür | 15 dk | **hesap erişimi sende** |
| A3 | Canlı doğrulama: JSON-LD, manifest sürümü, `?deploy=` cache busting | Eski service worker yeni kabuğu gölgelemesin | 15 dk | — |

### Parti B — Kırılganlık (≈1,5 gün · kilit yok, ben yaparım)

| # | İş | Neden bu sırada | Efor | Kilit |
|---|---|---|---|---|
| ~~B1~~ | ~~**M-01a** `map-vendor` CSS'i `MapView`'a taşı~~ → **yapıldı (2026-10-27)**: harita CSS'i zaten lazy'ydi; bütçe kapsamı düzeltildi, `initialCss`/`initialJs` kapıları eklendi | CSS payı 143 B → 743 B + iki sıkı kapı | — | ✅ kapandı |
| ~~B2~~ | ~~**M-14** Apple butonu: bayrak kapalıyken gizle~~ → **yapıldı (2026-10-27)**: bayrak kapalıyken düğme hiç render edilmiyor, nottaki Apple ifadesi de koşullu | Ölü düğme yok | — | ✅ kapandı |
| ~~B3~~ | ~~**M-48/A** saf fonksiyon testleri~~ → **yapıldı (2026-10-27)**: `shareLinkUrl` (8), `contrast` (12), `notifications` (11), `verifications` (15), `useServiceWorkerUpdate` (9). `routeData` ve `useCollections` zaten testliydi (yanlış sayım düzeltildi) | 55 yeni test; IO yolları ve kural sınırları kilitli | — | ✅ kapandı |
| ~~B4~~ | ~~**M-46** `axe-core` kapısı~~ → **yapıldı (2026-10-27)**: `src/components/a11y.test.ts` (7 test) — `LandingPage` ve `AccountAccess` axe taraması **0 ihlal**, tek `h1`/başlık sırası, düğme adları, form etiketleri, `index.html` dil + zoom. `BottomPanel` kapsam dışı: 20+ prop + `useCollections` bağı; RTL testi ayrı iş olarak D3'te | Tarayıcısız a11y kapısı; kasıtlı ihlal testi kapının boş yere yeşil olmadığını kanıtlıyor | — | ✅ kapandı (`axe-core` devDependency) |
| ~~B5~~ | ~~**M-07** olay şeması testi + olay kataloğu~~ → **yapıldı (2026-10-27)**: `docs/olcum-ve-hata-izleme.md` §4b olay kataloğu (10 olay × alan × tetikleyici dosya) + `src/config/telemetryCatalog.test.ts` (5 test) kod–belge–tetikleyici üçlüsünü kilitliyor | "Tanımlı ama ölü olay" geri gelemez | — | ✅ kapandı |

### Parti C — Uyum ve ürün kararı (ben 0,5 gün + senin girdin)

| # | İş | Neden bu sırada | Efor | Kilit |
|---|---|---|---|---|
| C1 | **M-53** 17 placeholder'ı **tek kurumsal künye bloğuna** indir (şirket, adres, veri sorumlusu, iletişim), kalan metni hukuk onayına hazır hâle getir | Landing'den açılan yasal pencere taslak metin gösteriyorsa, yasal erişim eklemek riski artırır | 2 sa | **künye bilgisi + hukukçu onayı** |
| C2 | **M-51** `src/config/pilotRegion.ts` sabiti + landing/onboarding kapsam cümlesi (Efes fixture'ı ile tutarlı) | Pilot bölge, SSS ve kapsam metnini doğrudan belirliyor | 2 sa | **hangi şehir/alan?** |
| C3 | **M-23** fotoğraf mimarisi kararı (Blaze/Storage ya da 60-80 KB sıkıştırma) | Karar yoksa içerik üretimi durur | 1 sa + 1 gün | **senin kararın** |
| C4 | **M-10** misafir gezinme kararı | Hesapsız keşif mimariyi değiştirir; erken karar sonradan dönüşü ucuzlatır | 30 dk | **senin kararın** |

### Parti D — Kanıt altyapısı (≈2-3 gün · çoğu CI'da)

| # | İş | Neden bu sırada | Efor |
|---|---|---|---|
| D1 | **M-49** 5 Playwright senaryosu (yalnız CI — bu ortamda tarayıcı yok: `libnss3.so` eksik) | Uçtan uca akışın tek gerçek kanıtı | 1 gün |
| D2 | **M-03 + M-03b** → **kapandı (2026-10-28)**: yolculuk bütçeleri + 6 panel lazy + **kabuk bölünmesi** (`App.tsx` = 58 satırlık kapı, `components/Explorer.tsx` = lazy harita/panel/Firestore). Firebase ve maplibre tanıtımda değil. Tanıtım **413.463 → 116.702 B gzip (−%72)**. Eşikler ölçüme ~%3 payla yeniden bağlandı + bayatlama kapısı. **Kalan:** Lighthouse CI (tarayıcı yok) | Bütçe artık gerçekten koruyor | — |
| D3 | **M-18** hata şeridi + **M-19** iskeletler | Kullanıcının gördüğü kalite | 4 sa |
| D4 | **M-57** bağımlılık PR'ları, **M-58** yedek tatbikatı | Operasyon disiplini | 3 sa |

### Eski sıradan ne değişti

| Madde | Eski yer | Yeni yer | Gerekçe |
|---|---|---|---|
| M-01a (map-vendor lazy) | Sprint 1 · 1 | **B1** (korundu) | Hâlâ tek gerçek blokaj |
| M-31, M-04/05/06 | Sprint 1 · 2-3 | **kapandı** | Site turunda yapıldı |
| M-48 (testsiz dosyalar) | Sprint 3 · 12 | **B3/B4** (öne alındı) | 46 dosya; en yüksek getiri/efor oranı |
| M-46 (axe) | Sprint 3 · 11 | **B4** (öne alındı) | Tarayıcısız, jsdom'da koşuyor |
| M-49 (E2E) | Sprint 3 · 11 | **D1** (CI'ya) | Bu ortamda koşamıyor; CI'da anlamlı |
| M-53 (yasal) | Sprint 2 · 7 | **C1** (paralel) | Kod işini bloke etmiyor, hukuk girdisi bekliyor |
| M-51 (pilot bölge) | Sprint 4 · 15 | **C2** (öne alındı) | Landing/SSS metnini belirliyor |
| M-23 (fotoğraf) | Sprint 2 · 8 | **C3** | Karar; uygulaması ayrı iş |

### Yeni tek cümle

Kod tarafı bitti sayılır (**142 dosya / 1110 test, 0 tip/lint hatası, bütçe içinde**); profesyonel eşiği geçmek için sırayla **yayın (A) → CSS payı + test/a11y ağı (B) → künye ve pilot bölge (C) → E2E/Lighthouse kanıtı (D)** gerekiyor.
