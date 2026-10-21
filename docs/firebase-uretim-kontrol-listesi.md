# Atlasia Firebase Üretim Kontrol Listesi

Bu belge, `atlasia.pages.dev` için Firebase Console'da kullanıcı tarafından doğrulanması gereken ayarları listeler. **Hiçbir madde bu repo tarafından otomatik doğrulanmamıştır** — Console'a erişim yok, doğrulama kullanıcı tarafından yapılır.

## 1. Authentication → Sign-in method

| Sağlayıcı | Beklenen durum | Açıklama |
| --- | --- | --- |
| Email/Password | **Açık** | Atlasia e-posta + şifre girişinin kaynağı. Kapalıysa tüm e-posta akışları `auth/operation-not-allowed` hatası verir. |
| Google | Açık (mevcut üretimde etkin) | OAuth redirect URI → `atlasia.pages.dev` ve özel alan ekli olmalı. |
| Apple | `VITE_APPLE_AUTH_ENABLED === "true"` ise açık, değilse kapalı | Uygulama bayrağı varsayılan kapalı; sağlayıcı açılmadan `true` yapılmamalı. |
| **Phone** | **Kapalı** | SMS kötüye kullanım/SMS pumping riski nedeniyle kapalı tutulur. Repo'da `VITE_PHONE_AUTH_ENABLED` bayrağı varsayılan kapalı; Console'da Phone kapalı iken düğme uygulama içinde hiç render edilmez. |

> Phone kapalı iken `VITE_PHONE_AUTH_ENABLED=true` yapılırsa uygulama düğmeyi gösterir ama Firebase `auth/operation-not-allowed` döndürür. İkisi birlikte kapalı tutulmalı.

## 2. Authentication → Settings → Authorized domains

- `atlasia.pages.dev` listede olmalı.
- Varsa özel üretim alanı da eklenmeli.
- Preview alt alanları Cloudflare otomatik oluşturur; preview domain'leri ihtiyaç halinde eklenmeli, aksi halde popup/redirect `auth/unauthorized-domain` verir.
- Bu dosya alanın gerçekten eklendiğini **doğrulamaz**; kullanıcı Console'dan kontrol eder.

## 3. App Check

- Mevcut durumda **zorunlu tutma (Enforce) kapalı** varsayılıyor; Firestore Rules zaten tek yetkilendirme katmanıdır.
- Uygulama `ReCaptchaEnterpriseProvider` ile token üretir; token yenileme açık.
- İleride enforce açılacaksa önce preview alanında reCAPTCHA site key alan listesinin üretim + preview ile eşleştiği doğrulanmalı.
- Bu repo Console'daki App Check durumunu **doğrulamaz**.

## 4. Firestore Rules ve Indexes

- Repodaki `firestore.rules` ve `firestore.indexes.json` tek kaynaktır.
- Eşitlemek için **kullanıcı** çalıştırır (CI/deploy otomatik yapmaz):

```bash
firebase deploy --only firestore:rules --project <onayli-proje-id>
firebase deploy --only firestore:indexes --project <onayli-proje-id>
# veya birlikte:
firebase deploy --only firestore:rules,firestore:indexes --project <onayli-proje-id>
```

- **Dikkat:** `.firebaserc` içindeki varsayılan proje `atlasia-dev`'dir. `--project` yazılmazsa komut üretime değil dev projesine gider. Üretim proje kimliğini Cloudflare Pages'teki `VITE_FIREBASE_PROJECT_ID` ile karşılaştırarak doğrula; `--project` bayrağını her zaman açıkça yaz.
- Bu komut Firebase Hosting dağıtmaz; yayın hattı yalnız GitHub → Cloudflare Pages.
- Console'daki Rules sürümünün repodaki ile eşleştiği **bu belge ile doğrulanmadı**; kullanıcı Rules sekmesindeki zaman damgasını kontrol eder.

## 5. Cloudflare Pages → Environment variables

**Yer:** Cloudflare Dashboard → Pages → *atlasia* projesi → **Settings → Variables and secrets**

- `VITE_FIREBASE_API_KEY` (zorunlu — üretim ve preview'da ayrı tanımlanmalı)
- `VITE_FIREBASE_AUTH_DOMAIN` (zorunlu)
- `VITE_FIREBASE_PROJECT_ID` (zorunlu)
- `VITE_GEOCODER_URL` (isteğe bağlı)
- `VITE_APPLE_AUTH_ENABLED` (isteğe bağlı, varsayılan kapalı)
- `VITE_PHONE_AUTH_ENABLED` (isteğe bağlı, varsayılan kapalı — Phone Console'da açılmadan `true` yapılmamalı)
- `VITE_GOOGLE_MAPS_EMBED_KEY` (isteğe bağlı)
- `VITE_APPCHECK_DEBUG_TOKEN` **asla** buraya eklenmez; yalnız yerel `.env.local`'de tutulur.

- **Production** ve **Preview** değişkenleri ayrı yönetilir; preview'e üretim anahtarı kopyalanmaz.
- **Workers → Runtime variables / Secrets** alanı **kullanılmaz**; Pages projesi için tek geçerli alan yukarıdaki Pages Variables and secrets'tir.
- Değerler Cloudflare'de şifreli tutulur; repo veya build log'una yazılmaz.

## 6. Üretim build kapısı

- `scripts/verify-env.mjs` yalnızca `CF_PAGES === "1" && CF_PAGES_BRANCH === "main"` iken üç zorunlu Firebase değişkeninden biri eksik/boşluksa build'i kırar (hata mesajı yalnız değişken adını yazar).
- Yerel `npm run build`, GitHub Actions ve preview branch'lerde kapı **devreye girmez**.
- Test: `npm run test:scripts` (veya `node --test scripts/verify-env.node-test.mjs`)

## 7. Uygulanacak doğrulama adımları (kullanıcı)

1. Firebase Console → Authentication → Sign-in method → Phone **kapalı** olduğunu gör.
2. Authorized domains → `atlasia.pages.dev` olduğunu gör.
3. App Check → enforce durumunu not et (bu repo enforce'u zorunlu tutmaz).
4. Cloudflare Dashboard → Pages → Settings → Variables and secrets → Production/Preview ayrımını kontrol et.
5. Gerekirse `firebase deploy --only firestore:rules` çalıştır.

> Bu belge hiçbir maddeyi "doğrulandı" olarak işaretlemez; Console erişimi olan kullanıcı her maddeyi elle teyit eder.
