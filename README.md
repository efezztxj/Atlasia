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
- Firestore güvenlik kuralı testleri için Java 21

## Yerel geliştirme

```bash
npm ci
npm run dev
```

Vite, varsayılan olarak yalnız kendi güvenli host davranışını kullanır. Uzak bir geliştirme önizlemesi gerekiyorsa `ATLASIA_ALLOWED_HOSTS` içine yalnız açık alan adlarını virgülle ayırarak yaz; joker (`*`), protokol ve port kabul edilmez.

## Doğrulama komutları

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:owner-index
npm run test:rules:emulator
npm run build
npm run audit:check
```

Tüm yerel doğrulamaları sırayla çalıştırmak için:

```bash
npm run check
```

`npm run ensure:owner-places-index`, yerel `firestore.indexes.json` dosyasındaki sahip-pin bileşik indeksini ekler; Firebase'e bağlanmaz ve kimlik bilgisi istemez. Bu betiğin sahte dosya erişimli Node testleri `npm run test:owner-index` ile çalışır.

Firestore Rules testi Google'ın Firestore Emulator 1.22.0 JAR'ını kullanıcı cache dizinine indirir ve sabit SHA-256 özetiyle doğrular. Emulator veya `firebase-tools` production paketine dahil edilmez.

## Ortam değişkenleri

`.env.example` dosyasını şablon olarak kullan. Gerçek değerleri repoya ekleme; yerelde `.env.local`, yayında Cloudflare ortam değişkenleri kullanılmalıdır.

Zorunlu Firebase web değişkenleri:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`

İsteğe bağlı:

- `VITE_GEOCODER_URL` — varsayılan Photon adresinin yerine kullanılacak geocoder kökü
- `VITE_APPLE_AUTH_ENABLED` — Apple sağlayıcısı tamamen yapılandırıldığında `true` (varsayılan kapalı)
- `VITE_PHONE_AUTH_ENABLED` — Telefon sağlayıcısı Firebase Console'da etkinleştirildiğinde `true` (varsayılan kapalı)
- `VITE_GOOGLE_MAPS_EMBED_KEY` — Street Peek gömüsü; HTTP referrer ve API kısıtları zorunludur

Firebase web yapılandırması ve diğer `VITE_` değerleri istemci uygulamasında görünür. Üretim erişimi Firestore Rules, Authentication, App Check ve sağlayıcı tarafındaki domain/API kısıtlarıyla sınırlandırılmalıdır. Yönetici anahtarı veya servis hesabı hiçbir zaman Vite değişkenine konmamalıdır.

## Veri modeli ve güvenlik kuralları

- `places/{placeId}` — kullanıcı keşif pinleri
- `posts/{postId}` — gönderi ve atomik `likedBy` üyelikleri; toplam beğeni = seed tabanı + benzersiz kullanıcılar
- `posts/{postId}/replies/{replyId}` — yazarı kuralla doğrulanan, değiştirilemeyen yanıtlar
- `stories/{storyId}` — 24 saatlik kullanıcı hikâyeleri; görüldü bilgisi yalnızca cihazda tutulur

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

GitHub Actions her pull request, `main` ve `arena/**` branch güncellemesinde üretim bağımlılığı güvenlik tabanını, typecheck'i, lint'i, birim testlerini, Rules emulator testlerini ve production build'i çalıştırır. Bilinen açıklar `SECURITY.md` içinde kayıtlıdır; `audit:check` yeni paket/advisory veya seviye artışında CI'ı durdurur. Dependabot npm ve GitHub Actions bağımlılıklarını ayrı pull requestlerle takip eder.

## Belgeler

- [Kimlik doğrulama kurulumu](AUTH_SETUP.md)
- [Sürüm değişiklik günlüğü](CHANGELOG.md)
