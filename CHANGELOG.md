# Atlasia Update

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