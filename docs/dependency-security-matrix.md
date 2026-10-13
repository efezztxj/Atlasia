# Üretim bağımlılığı güvenlik matrisi

Son doğrulama: 13 Ekim 2026

Bu belge, üretim açığı bulunan bağımlılıkların neden topluca `latest` sürümüne taşınmadığını ve her düzeltmenin kalite kapısını kaydeder. `npm audit fix --force` kullanılmaz; özellikle npm'in Firebase için önerdiği eski `9.14.0` sürümüne dönüş uygulanmaz.

## Karar matrisi

| Zincir | Başlangıç | Advisory / ilk güvenli sürüm | Seçilen değişiklik | Uyumluluk değerlendirmesi | Durum |
| --- | --- | --- | --- | --- | --- |
| `maplibre-gl` | `5.24.0` | `GHSA-jrc7-96c5-q579`; etkilenen `<=6.4.0`, ilk yama `6.4.1` | Tam olarak `6.4.1` | Major geçiş ESM-only'dir; default import namespace import'a çevrildi. Vite için worker `?worker&url` ile derlenip `setWorkerUrl` ile aynı-origin asset'e bağlandı. Projede kaldırılan `map.transform`, `styleimagemissing`, iki parametreli `setData`, olay `instanceof` kontrolü veya iç içe GeoJSON özelliğine `JSON.parse` kullanımı bulunmadı. v6 WebGL2 gerektirir. | **Kod ve otomatik kapılar tamamlandı. Cloudflare preview'da gerçek tarayıcı duman testi gerekli.** |
| `firebase` → `@firebase/firestore` → `@grpc/grpc-js` | `firebase@12.19.0`, `@firebase/firestore@4.17.2`, `@grpc/grpc-js@1.9.16` | `GHSA-m9gg-hp2v-232j` ve `GHSA-f596-whhp-79r4`; ilk güvenli 1.x sürüm `1.13.6` | Ayrı görev/committe değerlendirilecek | Firebase `13.0.0` dahi Firestore üzerinden `@grpc/grpc-js ~1.9.0` ister; tek başına Firebase major yükseltmesi açığı kapatmaz ve gereksiz API/engine riski taşır. Aday çözüm, yalnız gRPC'yi `1.13.6` sürümüne kontrollü override edip Rules emulator, unit, typecheck, build ve audit ile kanıtlamaktır. | **Açık; sonraki bağımsız güvenlik değişikliği.** |

## MapLibre v5 → v6 kontrolü

- Paket, advisory'nin önerdiği ilk yama olan `6.4.1` sürümüne tam sabitlendi; daha geniş `6.14.0` yükseltmesi yapılmadı.
- MapLibre paketinin motor şartı Node `>=16.14.0` / npm `>=8.1.0` olsa da v6 stil belirtimi zincirindeki `@mapbox/jsonlint-lines-primitives@2.0.3` Node `>=22` ister. Desteklenen proje motoru ve CI bu nedenle EOL olmuş Node 20'den Node `22.13+` tabanına taşındı.
- Üretim build'i ayrı, hash'li `maplibre-gl-worker-*.js` asset'i üretir ve uygulama bundle'ı bu aynı-origin URL'yi referanslar.
- `npm audit --omit=dev` sonucunda kritik bulgu `1 → 0`, toplam production bulgusu `5 → 4` oldu; kalanların tamamı Firebase/gRPC zinciridir.
- Audit baseline artık MapLibre paketini veya advisory'sini izinli saymaz ve kritik bulgu üst sınırını sıfır olarak uygular.
- Harita başlatma, raster tabanlar, globe, terrain, marker/pin, rota çizgisi, konum doğruluk alanı, mobil dokunma ve masaüstü kontrolleri gerçek Cloudflare preview üzerinde gözle doğrulanmadan yayın yapılmamalıdır.

## Kaynaklar

- GitHub Advisory Database: `GHSA-jrc7-96c5-q579`
- MapLibre GL JS resmî v5 → v6 migration guide
- GitHub Advisory Database: `GHSA-m9gg-hp2v-232j`, `GHSA-f596-whhp-79r4`
- Firebase JavaScript SDK release notes ve npm paket metadata'sı
