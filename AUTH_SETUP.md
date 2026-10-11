# Atlasia Kimlik Doğrulama

Giriş ekranı e-posta/şifre, Google, Apple ve telefon seçenekleri sunar.
Misafir, anonim giriş, sahte Google/Apple oturumu veya sahte SMS kodu yoktur.

## Şimdi Kullanılabilen Cihaz Hesabı

Firebase yapılandırması yoksa e-posta/şifreyle **bu cihazda** bir hesap oluşturulabilir.
Üye ol > e-posta, şifre ve profil adı > Hesap oluştur > kurtarma anahtarını sakla > devam et.
Sonraki girişte aynı tarayıcıda aynı e-posta ve şifre kullanılır.

- E-posta sahipliği doğrulanmaz; Gmail/Google hesabı bağlanmış sayılmaz.
- Hesap kaydı IndexedDB'de tutulur. Şifre düz metin olarak kaydedilmez; rastgele salt + PBKDF2-SHA256 (600.000 iterasyon) özeti saklanır.
- 12 saatlik cihaz oturumu sessionStorage'daki rastgele token ile açılır. Token'ın özeti IndexedDB'deki oturumla karşılaştırılır. Çıkışta oturum kaldırılır, şifre yenilenince diğer cihaz-oturumları iptal edilir.
- Şifremi unuttum akışı e-posta + kayıt sırasında verilen kurtarma anahtarıyla çalışır. Kurtarma e-postası gönderildiği iddia edilmez.
- Tarayıcı verileri silinirse hesap da silinir. Başka tarayıcı/cihazda oturum veya kayıt senkronizasyonu yoktur.
- Bu istemci içi hesap akışı bir **online kimlik doğrulama sunucusu değildir**. Gerçek kullanıcı verisinin uzaktan korunması için aşağıdaki Firebase ayarları tamamlanmalıdır.

Google/Apple/SMS düğmeleri yapılandırılmadan etkin gösterilmez. Cihaz hesabı yalnızca eksik Firebase yapılandırmasında kullanılır; bir Firebase ağ hatası olduğunda sessizce cihaz hesabına geçilmez.

## Yapılandırma

1. Firebase Console'da sana ait bir proje ve Web uygulaması oluştur.
2. Authentication > Sign-in method altında **Email/Password**, Google, Apple ve Phone'u etkinleştir.
3. `.env.example` dosyasını `.env.local` olarak kopyala. Web uygulamasının apiKey, authDomain, projectId ve appId değerlerini ilgili VITE_FIREBASE alanlarına koy.
4. Authentication > Settings > Authorized domains listesine yayın alanını ekle. Geliştirme için Google girişinde localhost'u ayrıca eklemek gerekebilir.
5. Telefon için SMS bölge politikasında kullanacağın ülkeleri etkinleştir; SMS kota/ücret ve güncel faturalandırma gereksinimlerini kontrol et. Gerçek SMS'i yetkilendirilmiş HTTPS alanında test et.
6. Apple için Apple Developer üyeliği, Services ID, Team ID ve private key Firebase Console'da yapılandırılmalı. Apple private key'i hiçbir VITE_ değişkenine veya frontend dosyasına koyma.
7. Vite geliştirme sunucusunu yeniden başlat veya projeyi yeniden derle.

Yapılandırma verilirse e-posta/şifre de Firebase üzerinden çalışır. Yeni e-posta hesapları doğrulama ekranına alınır; doğrulama tamamlanmadan harita açılmaz.
Bu ortamda proje kimlik bilgileri verilmediği için Google/Apple sağlayıcıları ve SMS uçtan uca test edilemez.

## Oturum ve Veri

Firebase etkinse kullanıcı oturumunu Firebase yönetir. Harita ancak e-postası doğrulanmış desteklenen hesap veya telefon oturumu ile açılır. Bekleyen e-posta hesapları otomatik olarak çıkışa zorlanmaz; doğrulamayı tekrar gönderebilir ve kontrol edebilir.
Rotalar, kaydedilen yerler ve izler bu sürümde kullanıcı kimliğine göre ayrı localStorage alanlarında tutulur.
Bu veriler başka cihazlarla senkronize değildir. İçerik depolama sunucusu yeniden eklenmedi.
Frontend kapısı tek başına sunucu verisi için güvenlik kuralı değildir; daha sonra uzaktan veri eklersen Firebase Rules/ID token doğrulaması gerekir.

## Harita ve Fotoğraflar

Ana MapView tile/layer/marker kodu değiştirilmedi. Küçük çevre görünümü OpenStreetMap'in resmi embed adresini kullanır.
Street View için geçerli Maps Embed API anahtarın varsa VITE_GOOGLE_MAPS_EMBED_KEY ekleyebilirsin; key'i alan adıyla kısıtla.
Anahtar yoksa gerçek sokak görünümü Google'ın resmi panorama linkiyle yeni sekmede açılır.
Arama Photon'un belgeli OSM geocoding API'sini kullanır; şehir aramasında Open-Meteo yedektir.
Photon demo hizmetinin erişim garantisi yoktur. Üretim trafiğinde VITE_GEOCODER_URL ile kendi hizmetini kullan.

Kaynaklar:
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/web/apple
- https://firebase.google.com/docs/auth/web/phone-auth
- https://github.com/komoot/photon
- https://developers.google.com/maps/documentation/urls/get-started

## Manuel Kontrol Listesi

- Bu cihazdaki hesap: Üye ol, geçerli e-posta/şifre ve profil adı yaz, koşulları kabul et. Kurtarma anahtarını saklayıp devam et.
- Çıkış yapıp aynı tarayıcıda aynı hesapla giriş yap. Yanlış şifreyle girişin reddedildiğini kontrol et.
- Aynı e-posta ile ikinci kayıt oluşturulamamalı; sayfayı yenileyince mevcut oturum tanınmalı.
- Şifremi unuttum ekranında doğru anahtarla şifreyi yenile. Eski şifre çalışmamalı ve mevcut oturumlar iptal edilmeli.
- Firebase etkinse yeni e-posta hesabında doğrulama ekranı görünmeli. E-posta bağlantısını açtıktan sonra Doğrulamayı kontrol et ile devam et.
- Google, Apple ve gerçek SMS'i yetkilendirilmiş yayın alanında ayrıca test et.

Bu kontrol listesindeki tarayıcı ve canlı sağlayıcı senaryoları burada çalıştırılmamıştır.