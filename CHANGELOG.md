# Atlasia Update

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