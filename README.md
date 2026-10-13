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

- Node.js 20.19+, 22.13+ veya 24+
- npm 10 veya üzeri

## Doğrulama komutları

```bash
npm ci
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run audit:check
```

Tüm yerel doğrulamaları sırayla çalıştırmak için:

```bash
npm run check
```

## Ortam değişkenleri

`.env.example` dosyasını şablon olarak kullan. Gerçek değerleri repoya ekleme; yerelde `.env.local`, yayında Cloudflare ortam değişkenleri kullanılmalıdır.

Zorunlu Firebase web değişkenleri:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`

İsteğe bağlı:

- `VITE_GEOCODER_URL` — varsayılan Photon adresinin yerine kullanılacak geocoder kökü
- `VITE_APPLE_AUTH_ENABLED` — Apple sağlayıcısı tamamen yapılandırıldığında `true`
- `VITE_GOOGLE_MAPS_EMBED_KEY` — Street Peek gömüsü; HTTP referrer ve API kısıtları zorunludur

Firebase web yapılandırması ve diğer `VITE_` değerleri istemci uygulamasında görünür. Üretim erişimi Firestore Rules, Authentication, App Check ve sağlayıcı tarafındaki domain/API kısıtlarıyla sınırlandırılmalıdır. Yönetici anahtarı veya servis hesabı hiçbir zaman Vite değişkenine konmamalıdır.

## Değişiklik kuralları

- Her özellik ayrı görev, branch ve commit olarak ilerler.
- `main` üzerinde doğrudan geliştirme yapılmaz.
- Derlenmeyen veya test edilmemiş kod birleştirilmez.
- Kullanıcı istemeden kabul edilmiş masaüstü/mobil yerleşimi değiştirilmez.
- Gizli anahtar, PAT veya özel kullanıcı verisi commit edilmez.

## CI

GitHub Actions her pull request ve `main` güncellemesinde üretim bağımlılığı güvenlik tabanını, typecheck'i, lint'i, birim testlerini ve production build'i çalıştırır. Bilinen açıklar `SECURITY.md` içinde kayıtlıdır; `audit:check` yeni paket/advisory veya seviye artışında CI'ı durdurur. Dependabot npm ve GitHub Actions bağımlılıklarını ayrı pull requestlerle takip eder.
