# Atlasia Update

## 2026-10-21 — P17 + T1-AUTH + P1 kapanış

- **#32 P17 kurtarma:** `routes/{id}` yayın/kayıt `permission-denied` düzeltildi (Firestore Rules `resource` null + `getAfter` okuma), `withoutUndefined` serileştiricisi ve `toFirestoreRoute`/`fromFirestoreRoute` ile iç içe dizi (legs.coords) Firestore yasağı aşıldı — bacaklı rota artık yayınlanıp kaydedilebiliyor. `src/lib/firestoreValue.ts` + `routeData.ts` çekirdek bitti, onaylı kaydet akışı açık. Taban `origin/main` 38dfa3a.
- **#31 izin/undefined/grup katılımı:** `routes/{id}` okunabilirlik, `undefined` alan yazımı (`withoutUndefined` zorunlu), grup katılım kodu akışı düzeltmeleri (PR #31 merge d393b4c, fix 7df4ffb).
- **T1-AUTH (P1, 298f02f → 6809bb9):** `VITE_PHONE_AUTH_ENABLED` bayrağı (yalnız `true` açık, varsayılan kapalı), telefon düğmesi kapalıyken render edilmez; üretim build kapısı `scripts/verify-env.mjs` yalnız `CF_PAGES=1 && BRANCH=main` iken eksik `VITE_FIREBASE_*` adlarını yazıp build'i kırar (değer yazmaz). `docs/firebase-uretim-kontrol-listesi.md` eklendi.
- **P1 hijyen:** depo hijyeni, env `VITE_` 6→8, CI `test:scripts` + `bundle-budget`, kalite kapısı yeşil (PR #33).

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