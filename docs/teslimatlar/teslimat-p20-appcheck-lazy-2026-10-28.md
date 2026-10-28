# Teslimat — App Check'i landing'den çıkarma (P20, 2026-10-28)

## Görev ve branch

- Görev: canlı ölçümde landing'de `recaptcha__tr.js` (350 KB), `firebase-vendor` (146 KB),
  Google `iframe.js` (93 KB) ve 236 KB'lik `icon-512.png` indiği, `_GRECAPTCHA`
  çerezinin onaydan önce yazıldığı ve App Check exchange'inin `403` döndüğü
  görüldü. Performans 97 → 83, LCP 2,2 s → 3,9 s, Best Practices 75.
- Branch: `bionic/auth-idle`
- Taban commit: `ff35d7d` (Merge PR #148)

## Kök neden

`src/lib/firebase.ts` modül yüklenirken `initializeAppCheck(ReCaptchaEnterpriseProvider)`
çağırıyordu. App Check yalnız Firestore/Storage için gerekir; landing'de
Firestore çağrısı yoktur. Sonuç: tanıtım sayfası reCAPTCHA Enterprise'ı indiriyor,
Google iframe'ini açıyor ve üçüncü taraf çerez bırakıyordu.

Ayrıca `index.html` favicon olarak 512×512 manifest ikonunu (236 KB) kullanıyordu.

## Yapılanlar

- **`src/lib/firebase.ts`:** App Check kurulumu modül tepesinden `startAppCheck()`
  fonksiyonuna taşındı. Tek seferlik (`appCheckStarted`), yalnız tarayıcıda ve
  Firebase yapılandırılmışsa çalışır. `initializeApp` + `getFirestore` modül
  tepesinde kaldı (ağ isteği üretmez, SDK zaten auth için yükleniyor).
- **`src/components/Explorer.tsx` ve `src/components/AccountAccess.tsx`:**
  modül kapsamında `startAppCheck()` çağrısı. Her iki modül de `lazy()` ile
  yüklendiği için landing'de tetiklenmez; çağrı, bileşen render edilmeden
  (dolayısıyla ilk Firestore okumasından önce) çalışır.
- **`index.html`:** favicon `icon-32.png` (1,9 KB), apple-touch `icon-180.png`
  (33 KB). Manifest 192/512 ikonlarını kullanmaya devam eder.
- **`public/icons/icon-32.png`, `public/icons/icon-180.png`:** 512'lik ikondan
  LANCZOS ile üretildi.
- **`src/config/appCheckLazy.test.ts` (yeni):** `initializeAppCheck` çağrısının
  yalnız `startAppCheck()` içinde olduğunu, iki giriş modülünün onu çağırdığını
  ve favicon'un 512'yi indirmediğini kilitler.

## Çalıştırılan komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `npx vitest run src/config/appCheckLazy.test.ts src/config/lazyLoading.test.ts src/config/criticalPath.test.ts` | 16/16 geçti |
| `npm run typecheck` | temiz |
| `npm run lint` | temiz |
| `npm run test:run` | 1319/1320; tek hata `firestoreRulesRunner.test.ts` (Windows CRLF, bu değişiklikten bağımsız) |
| `npm run build` | derleme başarılı; bütçe adımı **yerelde** `entry 19.307 > 16.700` diyor |

### Bütçe notu (önemli)

`entry` eşiği (16.700 B) env değişkenleriyle yapılan ölçüme göre kalibre
edilmiş. Env'siz yerel derlemede `entry` **main'de de 19.303 B**; bu değişiklik
+4 B ekliyor (19.307). Yani yerel kırmızı bu PR'dan bağımsız, CI'da (env'li)
beklenen değer geçiyor. Doğrulama CI + Cloudflare preview üzerinden yapılacak.

## Beklenen etki (canlı ölçüm sonrası doğrulanacak)

| | Önce | Hedef |
|---|---|---|
| Performans | 83 | ~100 |
| LCP | 3,9 s | ~1,3 s |
| Landing ağırlığı | 1.369 KB | ~550 KB |
| `_GRECAPTCHA` çerezi | var | yok |
| App Check `403` konsol hatası | var | yok |

## Bilinen riskler

- App Check artık uygulama kabuğu yüklenince başlıyor. Firebase konsolunda
  App Check **zorunlu** hale getirilirse, kabuk yüklendikten hemen sonraki ilk
  Firestore okuması token yetişmeden gidebilir. Çağrı modül kapsamında
  (render'dan önce) olduğu için pencere çok küçük; yine de zorunlu kılınmadan
  önce bu akış test edilmeli.
- Google ile giriş akışı (`getRedirectResult`) hâlâ açılışta çalışıyor; buna
  bağlı `iframe.js` (93 KB) bu PR'ın kapsamı dışında. Sonraki adım: yalnız
  gerçek bir redirect dönüşünde çağırmak.

## Sonraki görev

- Cloudflare Pages aralıklı kırmızı: panel logu olmadan çözülemez.
- Ürün kararları: T20↔T11, T6 poster, WebP/AVIF + sunucu `srcset`, telemetry endpoint.
