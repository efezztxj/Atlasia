# Atlasia

Atlasia; keşif haritası, kullanıcı izleri, açıklanabilir rota planlama ve konum tabanlı sesli rehberi bir araya getiren React tabanlı bir web/PWA ürünüdür.

## Teknik temel

- React 19 + TypeScript
- Vite + Tailwind CSS
- MapLibre GL
- Firebase Authentication, Firestore ve App Check
- Cloudflare üzerinden yayın

Netlify Atlasia yayın hattının parçası değildir.

## Gereksinimler

- Node.js 22.13+ veya 24+
- npm 10.9.2 (`packageManager` ile sabitlenmiştir)
- Firestore Emulator Rules testleri için Java 21 veya üzeri (JRE yeterlidir)

GitHub Actions, doğrulama job'ında Temurin Java 21'i `actions/setup-java` ile otomatik hazırlar. Yerel makinede `java -version` çıktısının 21 veya üzeri olduğunu doğrula; örneğin Ubuntu 24.04'te `sudo apt install openjdk-21-jre-headless`, macOS'ta `brew install openjdk@21`, Windows'ta `winget install EclipseAdoptium.Temurin.21.JDK` kullanılabilir.

## Yerel geliştirme

```bash
npm ci
npm run dev
```

Vite, varsayılan olarak yalnız kendi güvenli host davranışını kullanır. Uzak bir geliştirme önizlemesi gerekiyorsa `ATLASIA_ALLOWED_HOSTS` içine yalnız açık alan adlarını virgülle ayırarak yaz; joker (`*`), protokol ve port kabul edilmez.

## Doğrulama komutları

```bash
npm ci
npm run check:local
```

`check:local` typecheck, lint, tüm Vitest testleri, gerçek Java 21+ Firestore Emulator Rules testi, production build, sosyal metadata doğrulaması ve dependency audit'ini sırayla çalıştırır. Rota planlayıcı testini tek başına çalıştırmak için `npm run test:route`; bu test tüm testlerin de parçasıdır.

Eski `npm run check` adı `check:local` ile aynı doğrulama zincirini çalıştırır.

Firestore Rules testi Google'ın Firestore Emulator 1.22.0 JAR'ını kullanıcı cache dizinine indirir ve sabit SHA-256 özetiyle doğrular. Emulator veya `firebase-tools` production paketine dahil edilmez.

## Ortam değişkenleri

`.env.example` dosyasını şablon olarak kullan. Gerçek değerleri repoya ekleme; yerelde `.env.local`, yayında Cloudflare ortam değişkenleri kullanılmalıdır.

Zorunlu Firebase web değişkenleri:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`

İsteğe bağlı:

- `VITE_FIREBASE_APP_CHECK_SITE_KEY` — reCAPTCHA Enterprise public site key; boşsa kayıtlı Atlasia anahtarı kullanılır
- `VITE_GEOCODER_URL` — varsayılan Photon adresinin yerine kullanılacak geocoder kökü
- `VITE_APPLE_AUTH_ENABLED` — Apple sağlayıcısı tamamen yapılandırıldığında `true`
- `VITE_GOOGLE_MAPS_EMBED_KEY` — Street Peek gömüsü; HTTP referrer ve API kısıtları zorunludur

Firebase web yapılandırması ve diğer `VITE_` değerleri istemci uygulamasında görünür. Üretim erişimi Firestore Rules, Authentication, App Check ve sağlayıcı tarafındaki domain/API kısıtlarıyla sınırlandırılmalıdır. Yönetici anahtarı veya servis hesabı hiçbir zaman Vite değişkenine konmamalıdır.

## Veri modeli ve güvenlik kuralları

- `places/{placeId}` — kullanıcı keşif pinleri
- `posts/{postId}` — gönderi, atomik `likedBy` üyelikleri ve sınırlı gömülü yanıtlar
- `stories/{storyId}` — 24 saatlik kullanıcı hikâyeleri

Emekliye ayrılan profil/XP/rozet/takip koleksiyonu uygulama şemasında tanımlı değildir ve Firestore'un varsayılan reddetme kuralı altında kapalıdır. Akış ve harita okumaları kalıcı toplam içerik tavanı kullanmaz; küçük cursor sayfaları ve harita viewport sorgularıyla ilerler. Kurallar yerelde `npm run test:rules:emulator` ile test edilir. Onaylı Firebase projesine kural/index dağıtımı, web yayınının dışında ve açık denetim kapısından sonra şu kapsamla yapılır:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project <onayli-proje-id>
```

Bu komut Firebase Hosting dağıtmaz. Web/PWA yayın hattı yalnız GitHub → Cloudflare Pages'tir; build komutu `npm run build`, çıktı dizini `dist` olmalıdır.

## Değişiklik kuralları

- Her özellik ayrı görev, branch ve commit olarak ilerler.
- `main` üzerinde doğrudan geliştirme yapılmaz.
- Derlenmeyen veya test edilmemiş kod birleştirilmez.
- Kullanıcı istemeden kabul edilmiş masaüstü/mobil yerleşimi değiştirilmez.
- Gizli anahtar, PAT veya özel kullanıcı verisi commit edilmez.

## CI

GitHub Actions her pull request ve `main` güncellemesinde üretim bağımlılığı güvenlik tabanını, typecheck'i, lint'i, birim testlerini ve production build'i çalıştırır. Bilinen açıklar `SECURITY.md` içinde kayıtlıdır; `audit:check` yeni paket/advisory veya seviye artışında CI'ı durdurur. Dependabot npm ve GitHub Actions bağımlılıklarını ayrı pull requestlerle takip eder.
