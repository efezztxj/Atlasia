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

13 Ekim 2026 mühendislik tabanı sırasında `npm audit --omit=dev` çıktısı **1 kritik ve 4 yüksek** bulgu bildirmiştir. Bunlar gizlenmemiştir:

| Paket | Seviye | Durum ve sonraki işlem |
| --- | --- | --- |
| `maplibre-gl@5.24.0` | Kritik — `GHSA-jrc7-96c5-q579` | npm düzeltme olarak davranış ve API doğrulaması gerektiren `6.14.0` major yükseltmesini öneriyor. Harita bileşeni bu görevde kilitli olduğundan yükseltme; marker, kaynak, terrain, olay ve mobil testleriyle ayrı güvenlik görevinde yapılmalıdır. Mevcut marker etiketi kullanıcı metnini `textContent` ile yazar; geliştirme sırasında doğrulanmamış HTML eklenmemelidir. |
| `firebase@12.19.0` üzerinden `@grpc/grpc-js@1.9.16` | Yüksek — `GHSA-m9gg-hp2v-232j`, `GHSA-f596-whhp-79r4` | Advisories gRPC sunucu davranışını etkiliyor; Atlasia tarayıcı istemcisidir. Buna rağmen etkilenen paket lockfile'da bulunduğu için risk açık kalır. npm'in önerdiği Firebase 9.14 downgrade'i uygulanmamalı; Firebase'in uyumlu düzeltmesi takip edilmelidir. |

Tam denetimde ayrıca Vite 7'nin sabitlediği `esbuild@0.27.7` için Windows geliştirme sunucusuna özgü düşük seviye `GHSA-g7r4-m6w7-qqqr` bulunur. Geliştirme sunucusu internete açılmamalı; Vite uyumlu sürüme geçtiğinde esbuild düzeltmesi alınmalıdır.

Bu kayıt risk kabulü değil, kontrollü devir kaydıdır. İlgili major yükseltmeler doğrulama testleri olmadan otomatik uygulanmamalıdır.
