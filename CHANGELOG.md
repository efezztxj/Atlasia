# Atlasia Update

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
- Ölçüm: ilk set 115.753 B gzip; JS 908.600/909.000; CSS 35.083/35.300 (T13/T14 sınıfları, gerekçe `scripts/bundle-budget.mjs`). Typecheck, lint, 1148 test, build ve SW kabuğu yeşil.

## 2026-10-28 — Denetim düzeltmeleri + giriş ekranı sürtünmesi (T9)

Ayrıntı: `docs/teslimatlar/teslimat-denetim-t9-2026-10-28.md`.

- **T9 — Giriş/kayıt ekranı:** Google (ve etkinse Apple) artık her iki modda da e-posta formunun **üstünde** birincil boyutta; e-posta "veya e-posta ile" altında. Devre dışı "Apple ile giriş yakında" düğmesi kaldırıldı; yerine e-posta formunda mikro metin. Firebase yapılandırılmamışsa hiç sosyal düğme gösterilmiyor. Şifre göster/gizle, `autocomplete` değerleri ve satır içi hatalar korundu (7 yeni test).
- **Denetim:** `cta_click` kablolaması için 3 davranışsal test eklendi (hero/header/footer ayrımı, landing'de huni sırası); ölü `auth-secondary-providers` CSS'i silindi (CSS 35.117 → 34.964 B gzip, eşik yeniden 35.100'e çekildi); `consent_choice{analytics:false}` sınırı kodda ve belgede açıklandı.
- Erişilebilirlik testi `Explorer.tsx`i de tarıyor (dizin taraması) — kapsam kaybı yok. Typecheck, lint, 1139 test, build ve SW kabuğu yeşil.

## 2026-10-28 — Ölçüm tabanı: huni olayları ve baseline (T1–T3)

Ayrıntı: `docs/teslimatlar/teslimat-t1-t2-t3-olcum-2026-10-28.md`.

- **T2 — Huni olayları:** `cta_click{placement}`, `map_open{guest}`, `signup_start`, `signup_complete{method}`, `first_route_created`, `audio_guide_start`, `consent_choice` eklendi (10 → 16 olay). Landing'in dört CTA'sı yerleşim adıyla sayılıyor; `sign_up` adı `signup_complete` oldu. Tüm olaylar sabit enum/boolean taşır, rıza kapısı aynen geçerli.
- **T3 — Baseline:** `docs/baseline.md` eklendi (paket ölçümleri dolu; Lighthouse/CWV/Search Console satırları "ölçülmedi" olarak işaretli, ölçüm komutlarıyla).
- **T1 — Durum:** panel/hesap açılmadı (dış servis kimliği yok); toplayıcı seçenekleri ve tek zorunlu adım (`VITE_TELEMETRY_ENDPOINT`) `docs/olcum-ve-hata-izleme.md` §5b'de.
- Toplam JS 908.149 B gzip; eşik 908.000 → 909.000 (gerekçe aynı dosyada). Typecheck, lint, 1129 test, build ve SW kabuğu yeşil.

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