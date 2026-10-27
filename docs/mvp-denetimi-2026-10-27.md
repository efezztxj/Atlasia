# Atlasia — MVP Denetimi ve Yapılacaklar (madde madde)

**Tarih:** 27 Ekim 2026 · **Kesit:** `main` = `fd9b780` (PR #114) · **Dal:** `arena/c16a6f9b-atlasia`
**Yöntem:** Her MVP akışı tek tek okundu, kapılar çalıştırıldı, sayılar depoda **ölçüldü**. Kanıt satır numarasıyla verildi. Tahminler "≈" ile işaretli.

---

## 1. Ölçüm özeti (bu turda çalıştırıldı)

| Kapı | Sonuç |
|---|---|
| `npx tsc --noEmit` | **PASS** (0 hata) |
| `npx eslint . --max-warnings=0` | **PASS** (0 uyarı) |
| `npm run test:run` | **PASS** — 140 dosya / **1.087 test** |
| `npm run test:scripts` | **PASS** — 8/8 paket |
| `npm run build` | **PASS** — ama paylar kritik (§2) |
| `verify:sw-shell` | **PASS** — 31/31 |

| Ölçüm | Değer | Bütçe | **Kalan pay** |
|---|---|---|---|
| İlk HTML seti (gzip) | 412.238 B | 439.000 B | 26.762 B (%6,1) |
| **Toplam JS (gzip)** | **902.648 B** | 908.000 B | **5.352 B (%0,6)** |
| **Toplam CSS (gzip)** | **35.074 B** | 35.100 B | **26 B (%0,07)** ⚠️ |

Kaynak: 142 dosya · 46.442 satır · en büyük dosyalar `App.tsx` 1.608, `moderation.ts` 1.199, `SocialPanel.tsx` 853, `firestoreData.ts` 809, `MapView.tsx` 785.
Testi olmayan kaynak dosya: **42** (27'si bileşen).

---

## 2. EN ACİL: CSS bütçesinde 26 bayt kaldı

`Toplam CSS: 224.335 B ham / 35.074 B gzip (bütçe 35.100)`

Bu, **tek bir yeni CSS sınıfının build'i kıracağı** anlamına gelir. Şu an herhangi bir arayüz işi (yeni buton stili, boşluk düzeltmesi, yeni panel) CI'da kırmızı verir. JS'te de pay 5,3 KB.

**Maddeler:**

- **M-01 · P0 — CSS bütçesini aç.** İki yol var, ikisi de 1 saatlik iş:
  - (a) `map-vendor` CSS'i (83 KB ham / 10,5 KB gzip) yalnız harita yüklenirken çekilsin: `MapView` lazy olduğu için `maplibre-gl/dist/maplibre-gl.css` importu `index.css`'ten `MapView.tsx`'e taşınır. Kazanç ≈ 10 KB gzip.
  - (b) Kullanılmayan kuralları sil: `.auth-access-security`, `.auth-access-top`, `.auth-access-wordmark`, `.auth-error` (hiçbir `.tsx`'te geçmiyor).
- **M-02 · P0 — Eşikleri gerçek ölçüme sabitle.** Bütçe ölçümün hemen üstünde tutulmaya devam ederse her iş kırılır; CSS eşiğini (a) uygulandıktan sonra **28.000**'e, JS'i **895.000**'e çek. Amaç: pay ≥ %2.
- **M-03 · P1 — Bütçeyi "sadece toplam" olmaktan çıkar.** `initialGzipBytes` zaten var; **route bazlı** ölçüm ekle: açılış sayfası ≤ 250 KB, uygulama kabuğu ≤ 700 KB.

---

## 3. Ölçüm katmanı — 3 olay tanımlı ama hiç çağrılmıyor

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
| **M-14** | ⚠️ Kısmi | Apple: `"Apple ile giriş yakında"` (`:293`) — buton görünür ama **devre dışı** | Ya arkasına gerçek yapılandırma, ya butonu tamamen gizle. Ölü buton profesyonel görünmüyor. **P2** |
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

## 7. Öncelik sırası (önerilen sıra)

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
