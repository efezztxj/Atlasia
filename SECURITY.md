# Güvenlik politikası

## Güvenlik bildirimi

Bir açık bulursan hassas ayrıntıları herkese açık issue veya pull request içinde yayımlama. Depo sahibine özel kanaldan; etkilenen sürüm, yeniden üretim adımları ve olası etkiyle birlikte bildir.

## Gizli bilgi sınırı

- Servis hesabı, yönetici anahtarı, PAT ve OAuth istemci sırrı repoya girmez.
- Vite ile başlayan değişkenler tarayıcı paketinde görünür; bu alana yalnız istemcide bulunması güvenli değerler yazılır.
- Firebase erişimi API anahtarının gizliliğine değil Authentication, Firestore Rules ve App Check'e dayanmalıdır.
- Üretim değerleri Cloudflare ortam değişkenlerinde tutulur; yerelde yalnız `.env.local` kullanılır.

## Bağımlılık denetimi

Üretim bağımlılıklarını denetlemek için:

```bash
npm run audit:prod
```

13 Ekim 2026 başlangıç tabanında `npm audit --omit=dev` **1 kritik ve 4 yüksek** bulgu bildirmişti. İki ayrı, en küçük güvenli değişiklikten sonra production sonucu **0** oldu:

| Paket | Başlangıç bulgusu | Çözüm |
| --- | --- | --- |
| `maplibre-gl@5.24.0` | Kritik — `GHSA-jrc7-96c5-q579` | Advisory'nin ilk yamalı sürümü `6.4.1` tam sabitlendi. ESM namespace import kullanılıyor; Vite worker'ı hash'li aynı-origin asset olarak yayımlayıp `setWorkerUrl` ile bağlıyor. v6 WebGL2 gerektirir. Cloudflare preview harita duman testi yapılmadan yayınlanmamalıdır. |
| `firebase@12.19.0` üzerinden `@grpc/grpc-js@1.9.16` | Yüksek — `GHSA-m9gg-hp2v-232j`; düşük — `GHSA-f596-whhp-79r4` | Firebase `12.19.0` korunup kök npm override ile ilk güvenli 1.x sürüm `@grpc/grpc-js@1.13.6` tam sabitlendi. Lockfile tek güvenli kopya içerir. Firebase `13.0.0` da eski `~1.9.0` aralığını istediği için gereksiz major yükseltme ve npm'in yanıltıcı `9.14.0` downgrade'i uygulanmadı. |

Production audit kapısı artık whitelist kullanmaz ve herhangi bir seviye/pakette bulgu varsa başarısız olur.

Tam denetimde yalnız Vite 7'nin sabitlediği `esbuild@0.27.7` için Windows geliştirme sunucusuna özgü düşük seviye `GHSA-g7r4-m6w7-qqqr` kalır. Geliştirme sunucusu internete açılmamalı; Vite uyumlu sürüme geçtiğinde esbuild düzeltmesi alınmalıdır. Bu geliştirme bağımlılığı tarayıcı production paketine girmez. Geniş ve ek advisories getiren `firebase-tools` proje bağımlılığı yapılmamıştır; Rules test çalıştırıcısı Google'ın Firestore Emulator 1.22.0 JAR'ını sabit URL'den indirir ve çalıştırmadan önce kayıtlı SHA-256 değerini doğrular.

Ayrıntılı sürüm ve uyumluluk kararı `docs/dependency-security-matrix.md` içindedir. Override, Firebase resmî paketleri güvenli gRPC aralığına geçtiğinde kaldırılmalı ve tüm kalite kapısı yeniden çalıştırılmalıdır.
