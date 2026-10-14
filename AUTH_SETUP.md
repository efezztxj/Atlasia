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
7. Denetim onayından sonra depodaki Firestore kuralları ve indekslerini açık proje kimliğiyle dağıt: `firebase deploy --only firestore:rules,firestore:indexes --project <onayli-proje-id>`. Bu komut web sitesini yayınlamaz; Atlasia web/PWA yayını yalnız GitHub → Cloudflare Pages hattından yapılır. Kurallar fotoğrafları yalnız giriş yapan içerik sahibinin oluşturmasına ve en fazla 180.000 karakterlik güvenli JPEG veri URL'lerine izin verir.
8. Vite geliştirme sunucusunu yeniden başlat veya projeyi yeniden derle.

Yapılandırma verilirse e-posta/şifre de Firebase üzerinden çalışır. Yeni e-posta hesapları doğrulama ekranına alınır; doğrulama tamamlanmadan harita açılmaz.
Bu ortamda Google/Apple sağlayıcıları ve SMS uçtan uca test edilemez.

## Doğrulama e-postaları

- Firebase proje görünen adı **Atlasia** olarak ayarlanmıştır ve istemci Türkçe doğrulama e-postası ister.
- Doğrulama ve şifre yenileme bağlantıları işlemden sonra `https://atlasia.pages.dev/` adresine geri döner.
- Firebase bu projede şablon güncellemesini `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED` ile sunucu tarafında engelliyor. Görsel HTML şablonu için Firebase Support üzerinden şablon düzenleme yetkisinin açılması/uygulanması istenmelidir; istemci kodu bu kısıtı güvenli biçimde aşamaz.
- Gmail'de gönderen alanını tamamen markalamak ve teslim edilebilirliği yükseltmek için Atlasia'nın sahip olduğu özel bir alan adı doğrulanıp Authentication > Templates > **customize domain** bölümünde DNS kayıtları eklenmelidir. `pages.dev` alt alanının DNS sahipliği kullanıcıda olmadığı için gönderen alanı olarak kullanılamaz.

## App Check

Atlasia Web uygulaması yalnız **reCAPTCHA Enterprise / Fraud Defense** sağlayıcısıyla App Check'e kayıtlıdır. Ekranda kullanımdan kaldırıldığı belirtilen klasik reCAPTCHA ayrıca bağlanmamalıdır.

- Production anahtarı yalnız `atlasia.pages.dev` ve onun alt alan adlarına izin verir; checkbox göstermez, görünmez skor tabanlı çalışır.
- İstemci App Check'i Firebase servislerinden önce başlatır ve tokenı otomatik yeniler.
- İlk yayından sonra Firebase Console > App Check > APIs metriklerinde doğrulanmış istekler izlenmelidir.
- Eski PWA sürümlerini kilitlememek için doğrulama görülmeden Firestore veya Authentication enforcement açılmamalıdır. Enforcement açıldığında doğrulanmamış bütün istekler reddedilir.
- Faturalandırmasız Fraud Defense Essentials kotası aşılırsa değerlendirmeler ay sonuna kadar `429` dönebilir; kullanım kotası ayrıca izlenmelidir.

## Oturum ve Veri

Firebase etkinse kullanıcı oturumunu Firebase yönetir. Harita ancak e-postası doğrulanmış desteklenen hesap veya telefon oturumu ile açılır. Bekleyen e-posta hesapları otomatik olarak çıkışa zorlanmaz; doğrulamayı tekrar gönderebilir ve kontrol edebilir.
Rotalar ve kaydedilen yerler bu sürümde kullanıcı kimliğine göre ayrı localStorage alanlarında tutulur ve başka cihazlarla senkronize değildir. Firebase etkin hesaplarda kullanıcı izleri, topluluk gönderileri ve story'ler Firestore'a kaydedilir.
Fotoğraflar tarayıcıda en fazla 180.000 karakterlik JPEG veri URL'ine sıkıştırılıp ilgili içerikle aynı Firestore dokümanında tutulur. Böylece prototip aşamasında ücretli Firebase Storage planı gerekmez; kayıt silinince fotoğraf da atomik olarak silinir. Trafik büyüdüğünde ayrı bir nesne depolama/CDN katmanına geçilmelidir.
Frontend kapısı tek başına sunucu verisi için güvenlik kuralı değildir. Depodaki `firestore.rules` dosyası production'a ayrıca dağıtılmalıdır.

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
- https://firebase.google.com/docs/auth/custom-email-handler
- https://firebase.google.com/docs/auth/email-custom-domain
- https://firebase.google.com/docs/firestore/quotas
- https://firebase.google.com/docs/rules/manage-deploy
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://firebase.google.com/docs/app-check/enable-enforcement
- https://cloud.google.com/recaptcha/docs/billing-information
- https://github.com/komoot/photon
- https://developers.google.com/maps/documentation/urls/get-started

## Manuel Kontrol Listesi

- Bu cihazdaki hesap: Üye ol, geçerli e-posta/şifre ve profil adı yaz, koşulları kabul et. Kurtarma anahtarını saklayıp devam et.
- Çıkış yapıp aynı tarayıcıda aynı hesapla giriş yap. Yanlış şifreyle girişin reddedildiğini kontrol et.
- Aynı e-posta ile ikinci kayıt oluşturulamamalı; sayfayı yenileyince mevcut oturum tanınmalı.
- Şifremi unuttum ekranında doğru anahtarla şifreyi yenile. Eski şifre çalışmamalı ve mevcut oturumlar iptal edilmeli.
- Firebase etkinse yeni e-posta hesabında doğrulama ekranı görünmeli. E-posta bağlantısını açtıktan sonra Doğrulamayı kontrol et ile devam et.
- Google, Apple ve gerçek SMS'i yetkilendirilmiş yayın alanında ayrıca test et.
- Bir iz, gönderi ve story fotoğrafı ekle; sayfayı yenilediğinde sıkıştırılmış görsellerin kaldığını, başka hesabın içeriği silemediğini ve içerik sahibi silince kayıtla fotoğrafın birlikte kalktığını kontrol et.

Bu kontrol listesindeki tarayıcı ve canlı sağlayıcı senaryoları burada çalıştırılmamıştır.