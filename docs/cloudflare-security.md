# Atlasia Cloudflare güvenlik ve yayın runbook'u

Bu belge Atlasia web/PWA için tek yayın yolunu tanımlar: **GitHub → Cloudflare Pages**. Netlify ve paralel Workers Builds hattı yayın kaynağı değildir.

> DDoS/bot/kota saldırısı sertleştirme (ücretsiz katmanlar) runbook'u: `docs/ddos-playbook.md`.

## 1. Sürüm kontrollü güvenlik politikası

`public/_headers`, Vite tarafından `dist/_headers` olarak kopyalanır ve Cloudflare Pages tarafından statik yanıt politikası olarak yorumlanır.

Politikanın amaçları:

- Uygulamanın başka bir sayfada çerçevelenmesini engellemek.
- Betik, bağlantı, görsel, font, iframe ve worker kaynaklarını Atlasia'nın kullandığı sağlayıcılarla sınırlamak.
- Firebase Google/Apple popup girişini `Cross-Origin-Opener-Policy: same-origin-allow-popups` ile korumak.
- Firebase telefon girişindeki görünmez reCAPTCHA ve App Check reCAPTCHA Enterprise akışlarını açık tutmak.
- Harita, geocoder, hava ve Wikimedia/Pexels kaynaklarını izin listesinde tutmak.
- Hash'li Vite asset'lerini uzun süre önbelleklerken `index.html` ve `sw.js` dosyalarının güncel kalmasını sağlamak.
- Cloudflare preview alt alanlarının arama motorları tarafından indekslenmesini engellemek.

Yeni bir dış servis eklenirse geniş `https:` veya `*` izni ekleme. Yalnız gereken origin'i doğru CSP direktifine ekle, `src/config/cloudflareHeaders.test.ts` testini güncelle ve ilgili kullanıcı akışını gerçek preview alanında doğrula.

> `_headers` yalnız Cloudflare Pages'ın statik asset yanıtlarına uygulanır. Pages Functions veya Workers bir rotayı karşılamaya başlarsa aynı güvenlik başlıkları o fonksiyon/worker yanıtında kodla ayrıca ayarlanmalıdır.

## 2. SPA yönlendirme kararı

Atlasia kökte `index.html` üretir ve top-level `404.html` üretmez. Cloudflare Pages bu durumda uygulamayı SPA olarak algılar ve statik dosyayla eşleşmeyen yollar için kök sayfayı sunar.

Bu nedenle `/* /index.html 200` biçiminde bir `_redirects` kuralı **eklenmez**. Cloudflare Pages yönlendirme kuralları mevcut statik asset'lerden önce çalışabildiği için böyle bir catch-all kural hash'li JavaScript/CSS veya PWA dosyalarını yanlışlıkla HTML'e çevirebilir.

Kaynaklar:

- https://developers.cloudflare.com/pages/configuration/serving-pages/
- https://developers.cloudflare.com/pages/configuration/redirects/
- https://developers.cloudflare.com/pages/configuration/headers/

## 3. Cloudflare Pages proje ayarı

Üretim projesinde doğrulanacak değerler:

| Alan | Beklenen değer |
| --- | --- |
| Üretim branch'i | Kullanıcının onayladığı `main` |
| Build komutu | `npm run build` |
| Çıktı dizini | `dist` |
| Node.js | `20.19+`, `22.13+` veya `24+` |
| Root directory | Repo kökü |
| Preview deploy | Açık; preview URL'leri `noindex` |

GitHub Actions kalite kapısı (`npm ci` ve `npm run check`) geçmeden üretim branch'ine birleştirme yapılmaz. Cloudflare build'i kalite kapısının yerine geçmez.

Tek yayın hattı kontrolü:

1. Cloudflare Pages'ın doğru GitHub deposuna ve üretim branch'ine bağlı olduğunu doğrula.
2. Aynı repo için ikinci bir Workers Builds otomatik dağıtımı varsa durdur veya kaldır.
3. Cloudflare üretimi doğrulanmadan mevcut DNS kaydını değiştirme.
4. Üretim doğrulandıktan sonra Netlify site deploy'unu ve GitHub uygulama bağlantısını kaldır.
5. DNS'te eski Netlify hedefi kalmadığını kontrol et.
6. GitHub branch protection içinde Atlasia CI'ı zorunlu kontrol yap.

## 4. Ortam değişkenleri ve Firebase

Cloudflare üretim ve preview ortamlarında gerçek değerler yalnız şifreli proje değişkenleri olarak tutulur:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- isteğe bağlı `VITE_GEOCODER_URL`
- isteğe bağlı `VITE_APPLE_AUTH_ENABLED`
- isteğe bağlı `VITE_GOOGLE_MAPS_EMBED_KEY`

`VITE_` değişkenlerinin tarayıcı paketinde görüneceğini varsay. Yönetici SDK anahtarı, servis hesabı JSON'u, PAT veya özel sunucu sırrı hiçbir zaman `VITE_` değişkenine konmaz.

Firebase konsolunda:

1. `atlasia.pages.dev` ve üretim özel alanını Authentication → Authorized domains listesinde doğrula.
2. Google/Apple OAuth redirect URI ve domain ayarlarını üretim alanıyla eşleştir.
3. Telefon girişinde yalnız test numaralarıyla preview doğrulaması yap; gerçek SMS kotasını otomasyonda kullanma.
4. App Check reCAPTCHA Enterprise alan listesinin üretim ve izin verilen preview alanlarıyla uyumunu kontrol et.
5. Google Maps Embed anahtarını yalnız gerekli API ve HTTP referrer'larla sınırla.
6. Firestore Rules ve App Check'i birbirinin yerine kullanma; Rules her zaman zorunlu yetkilendirme katmanıdır.

## 5. Cloudflare alan ve TLS kontrolü

- SSL/TLS modu: `Full (strict)` (özel origin kullanılıyorsa).
- Minimum TLS: en az 1.2.
- Always Use HTTPS: açık.
- Automatic HTTPS Rewrites: açık olabilir; uygulama yine yalnız HTTPS kaynak kullanmalıdır.
- HSTS şu anda uygulama yanıtında bir yıllık, `includeSubDomains` ve `preload` olmadan gönderilir. Tüm alt alanlar doğrulanmadan bu iki seçenek eklenmez.
- Kullanılmayan Cloudflare Access, Worker route veya Page Rule bırakılmaz.

## 6. Preview duman testi

Her CSP veya kimlik doğrulama değişikliğinde preview URL üzerinde:

1. Ana sayfa ve doğrudan derin URL yenilemesi açılır.
2. Koyu/açık tema, harita karoları, topoğrafya ve görseller yüklenir.
3. Arama, ters geocoding, hava ve Wikimedia galerisi çalışır.
4. E-posta girişi ve çıkışı çalışır.
5. Google ve Apple popup/redirect akışları sağlayıcı etkinse çalışır.
6. Telefon reCAPTCHA alanı yüklenir; yalnız Firebase test numarası kullanılır.
7. Firestore canlı listeleri ve App Check token yenilemesi CSP hatası üretmez.
8. Google/Yandex/Apple dış harita bağlantıları yeni sekmede açılır.
9. Street Peek OpenStreetMap ve yapılandırılmışsa Google embed açılır.
10. Tarayıcı konsolunda yeni CSP ihlali veya mixed-content hatası yoktur.

Başlık kontrolü:

```bash
curl -sSI https://atlasia.pages.dev/ | grep -Ei 'content-security-policy|permissions-policy|x-content-type-options|cross-origin-opener-policy|strict-transport-security'
curl -sSI https://atlasia.pages.dev/sw.js | grep -Ei 'cache-control|service-worker-allowed'
curl -sSI https://atlasia.pages.dev/assets/GERCEK_HASHLI_DOSYA.js | grep -i cache-control
```

Beklenti: HTML ve service worker `no-store`; hash'li asset `max-age=31536000, immutable`.

## 7. Yayın ve geri alma

1. Bağımsız denetim sonucu ONAY olmalı.
2. Stacked görevler sırayla ve temiz bir entegrasyon branch'inde birleştirilmeli.
3. Entegrasyon branch'inde temiz `npm ci` ve `npm run check` çalışmalı.
4. Preview duman testi tamamlanmalı.
5. Kullanıcı üretim yayınını onaylamalı.
6. Üretim deploy sonrası başlıklar ve temel akışlar yeniden kontrol edilmeli.

Regresyonda yeni bir düzeltmeyi doğrudan üretime yazma. Cloudflare Deployments ekranından son doğrulanmış deployment'a geri dön; hatalı commit için ayrı revert/düzeltme PR'ı aç ve kalite kapısını yeniden çalıştır.
