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

13 Ekim 2026 başlangıç tabanında `npm audit --omit=dev` **1 kritik ve 4 yüksek** bulgu bildirmişti. MapLibre düzeltmesinden sonra production sonucu **0 kritik ve 4 yüksek** oldu:

| Paket | Seviye | Durum ve sonraki işlem |
| --- | --- | --- |
| `maplibre-gl@6.4.1` | `GHSA-jrc7-96c5-q579` kapatıldı | Advisory'nin ilk yamalı sürümüne tam sabitlendi. ESM namespace import kullanılıyor; Vite worker'ı hash'li aynı-origin asset olarak yayımlayıp `setWorkerUrl` ile bağlıyor. v6 WebGL2 gerektirir. Otomatik kapılar geçmeden ve Cloudflare preview harita duman testi yapılmadan yayınlanmamalıdır. |
| `firebase@12.19.0` üzerinden `@grpc/grpc-js@1.9.16` | Yüksek — `GHSA-m9gg-hp2v-232j`, `GHSA-f596-whhp-79r4` | Advisories gRPC sunucu davranışını etkiliyor; Atlasia tarayıcı istemcisidir. Buna rağmen etkilenen paket lockfile'da bulunduğu için risk açık kalır. Firebase `13.0.0` da `@grpc/grpc-js ~1.9.0` ister; npm'in önerdiği Firebase `9.14.0` downgrade'i uygulanmamalıdır. Güvenli `@grpc/grpc-js@1.13.6` override adayı ayrı committe tüm kapılarla doğrulanmalıdır. |

Tam denetimde ayrıca Vite 7'nin sabitlediği `esbuild@0.27.7` için Windows geliştirme sunucusuna özgü düşük seviye `GHSA-g7r4-m6w7-qqqr` bulunur. Geliştirme sunucusu internete açılmamalı; Vite uyumlu sürüme geçtiğinde esbuild düzeltmesi alınmalıdır.

Firestore Rules testleri için kullanılan `@firebase/rules-unit-testing@5.0.2`, aynı Firebase/`@grpc/grpc-js` advisories zincirini geliştirme bağımlılığı olarak bir kez daha raporlar. MapLibre düzeltmesinden sonra tam bağımlılık ağacı 5 yüksek ve 1 düşük paket bulgusu, production denetimi ise 4 yüksek bulgu gösterir. Test paketi tarayıcı build'ine girmez. Geniş ve ek advisories getiren `firebase-tools` proje bağımlılığı yapılmamıştır; test çalıştırıcısı Google'ın Firestore Emulator 1.22.0 JAR'ını sabit URL'den indirir ve çalıştırmadan önce kayıtlı SHA-256 değerini doğrular.

Ayrıntılı sürüm ve uyumluluk kararı `docs/dependency-security-matrix.md` içindedir. Bu kayıt risk kabulü değil, kontrollü devir kaydıdır; ilgili yükseltmeler doğrulama testleri olmadan otomatik uygulanmamalıdır.
