# Üretim bağımlılığı güvenlik matrisi

Son doğrulama: 13 Ekim 2026

Bu belge, üretim açığı bulunan bağımlılıkların neden topluca `latest` sürümüne taşınmadığını ve her düzeltmenin kalite kapısını kaydeder. `npm audit fix --force` kullanılmaz; özellikle npm'in Firebase için önerdiği eski `9.14.0` sürümüne dönüş uygulanmaz.

## Karar matrisi

| Zincir | Başlangıç | Advisory / ilk güvenli sürüm | Seçilen değişiklik | Uyumluluk değerlendirmesi | Durum |
| --- | --- | --- | --- | --- | --- |
| `maplibre-gl` | `5.24.0` | `GHSA-jrc7-96c5-q579`; etkilenen `<=6.4.0`, ilk yama `6.4.1` | Tam olarak `6.4.1` | Major geçiş ESM-only'dir; default import namespace import'a çevrildi. Vite için worker `?worker&url` ile derlenip `setWorkerUrl` ile aynı-origin asset'e bağlandı. Projede kaldırılan `map.transform`, `styleimagemissing`, iki parametreli `setData`, olay `instanceof` kontrolü veya iç içe GeoJSON özelliğine `JSON.parse` kullanımı bulunmadı. v6 WebGL2 gerektirir. | **Kod ve otomatik kapılar tamamlandı. Cloudflare preview'da gerçek tarayıcı duman testi gerekli.** |
| `firebase` → `@firebase/firestore` → `@grpc/grpc-js` | `firebase@12.19.0`, `@firebase/firestore@4.17.2`, `@grpc/grpc-js@1.9.16` | `GHSA-m9gg-hp2v-232j` ve `GHSA-f596-whhp-79r4`; ilk güvenli 1.x sürüm `1.13.6` | Kök `overrides` ile tam olarak `@grpc/grpc-js@1.13.6`; Firebase `12.19.0` korunur | Firebase `13.0.0` dahi Firestore üzerinden `@grpc/grpc-js ~1.9.0` ister; tek başına Firebase major yükseltmesi açığı kapatmaz ve gereksiz API/engine riski taşır. Override tek kopya üretir; `npm ls`, Rules emulator, unit, typecheck, lint, build ve production audit ile doğrulanır. | **Kod ve otomatik kapılar tamamlandı; production audit sıfır.** |

## MapLibre v5 → v6 kontrolü

- Paket, advisory'nin önerdiği ilk yama olan `6.4.1` sürümüne tam sabitlendi; daha geniş `6.14.0` yükseltmesi yapılmadı.
- MapLibre paketinin motor şartı Node `>=16.14.0` / npm `>=8.1.0` olsa da v6 stil belirtimi zincirindeki `@mapbox/jsonlint-lines-primitives@2.0.3` Node `>=22` ister. Desteklenen proje motoru ve CI bu nedenle EOL olmuş Node 20'den Node `22.13+` tabanına taşındı.
- Üretim build'i ayrı, hash'li `maplibre-gl-worker-*.js` asset'i üretir ve uygulama bundle'ı bu aynı-origin URL'yi referanslar.
- `npm audit --omit=dev` sonucunda kritik bulgu `1 → 0`, toplam production bulgusu `5 → 4` oldu; kalanların tamamı Firebase/gRPC zinciridir.
- Audit baseline artık MapLibre paketini veya advisory'sini izinli saymaz ve kritik bulgu üst sınırını sıfır olarak uygular.
- Harita başlatma, raster tabanlar, globe, terrain, marker/pin, rota çizgisi, konum doğruluk alanı, mobil dokunma ve masaüstü kontrolleri gerçek Cloudflare preview üzerinde gözle doğrulanmadan yayın yapılmamalıdır.

## Firebase / gRPC kontrolü

- npm'in `firebase@9.14.0` önerisi bir güvenlik düzeltmesi değil, mevcut `12.19.0` sürümünden eski ve davranış kırabilecek bir downgrade olduğu için reddedildi.
- 13 Ekim 2026 tarihinde güncel `firebase@13.0.0` içindeki `@firebase/firestore@4.18.0` hâlâ `@grpc/grpc-js ~1.9.0` ister. Bu nedenle Firebase major yükseltmesi açığı kapatmaz.
- İki advisory için ilk güvenli 1.x sürüm `1.13.6` seçildi. Bu sürüm Node `>=12.10.0` ister ve proje Node 22 tabanıyla uyumludur.
- Kök npm override, Firestore'un dar `~1.9.0` aralığını kontrollü olarak değiştirir. Lockfile'da yalnız tek `@grpc/grpc-js@1.13.6` kopyası vardır; eski iç içe `1.9.16` kopyası yoktur.
- Firebase upstream'de bağımlılığı `~1.14.5` sürümüne taşıyan çalışma henüz yayımlanmış pakete girmedi. Uyumlu resmî Firebase patch'i çıktığında override kaldırılıp lockfile ve tüm kalite kapısı yeniden doğrulanmalıdır.
- Override öncesi ve sonrası tarayıcı build'inde `firebase-vendor-1BLvj0e2.js` aynı hash ve `581.85 kB` boyutta kaldı; gRPC browser bundle'ına eklenmedi. Rules emulator'daki 12/12 test Node/Firestore yolunun çalıştığını doğruladı.
- Production audit sıfıra indirildi ve baseline artık hiçbir production advisory'sini izinli saymaz.

## Kaynaklar

- GitHub Advisory Database: `GHSA-jrc7-96c5-q579`
- MapLibre GL JS resmî v5 → v6 migration guide
- GitHub Advisory Database: `GHSA-m9gg-hp2v-232j`, `GHSA-f596-whhp-79r4`
- Firebase JavaScript SDK release notes ve npm paket metadata'sı
