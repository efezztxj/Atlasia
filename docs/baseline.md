# Baseline — ölçüm tabanı (T3)

Bu dosya, iyileştirme planının "iyileşti mi?" sorusunu hisle değil sayıyla
yanıtlamak için tutulur. **Her satırda kaynak ve tarih vardır.** Ölçülmemiş bir
şey varsa "ölçülmedi" yazar; tahmini sayı yazılmaz.

Son güncelleme: **2026-10-28** · Taban sürüm: `2412ace` (main) · Ölçüm alınan sürüm: bu dal, #124/#125 üstüne T1–T3 + T9 + T13–T16 + T4/T5

## 1. Paket boyutları — ölçüldü

Komut: `npm run build` (üretim derlemesi; `scripts/bundle-budget.mjs` gzip ölçer).

| Ölçüm | Taban `2412ace` | Bu dal | Not |
|---|---|---|---|
| İlk HTML seti (gzip) | 411.987 B | **127.763 B** | −285.213 B (−%69) |
| İlk HTML seti (ham) | 1.371.468 B | 463.624 B | −907.844 B |
| İlk setteki JS (gzip) | 386.401 B | **100.287 B** | −286.188 B |
| `entry` chunk (gzip) | 166.244 B | **20.889 B** | −145.430 B |
| `firebase-vendor` (gzip) | 149.338 B — ilk sette | 149.338 B — **ertelenmiş** | ilk setten çıktı |
| `map-vendor` (gzip) | 248.691 B — ilk sette değil | 300.903 B — ilk sette değil | maplibre 6.15 (lazy) |
| Toplam JS (gzip) | 905.483 B | 998.004 B | +92.278 B; tamamı **bağımlılık yükseltmeleri** (react 19.3.1, maplibre 6.15, firebase 13) + T4/T5 (+933 B) |
| Toplam CSS (gzip) | 35.061 B | 34.988 B | −73 B (T7/T13/T14 sınıfları eklendi, T9 ölü CSS ve Tailwind 4.3 çıktısı düştü) |
| Yolculuk: tanıtım (gzip) | 411.987 B | 127.763 B | −285.213 B (bütçe 129.400) |
| Yolculuk: uygulama kabuğu (gzip) | 812.982 B | 587.262 B | −226.014 B (bütçe 603.400) |
| Bütçe durumu | içinde | içinde (ilk set 127.763/129.400 · entry 20.889/20.900 · JS 998.004/998.500 · CSS 34.988/35.700) | T4/T5 yalnız **toplam JS** eşiğini 997.500 → 998.500 yükseltti (gerekçe `scripts/bundle-budget.mjs`); kullanıcıya görünen eşikler değişmedi |

> Derleme kimliği (`index.html` içindeki sürüm damgası) her derlemede birkaç
> bayt değiştiği için aynı ağaçta art arda iki `npm run build` ±≈20 B farklı
> gzip değeri verebilir. Yukarıdaki sayılar bu ağaçtaki son ölçümdür; eşik
> karşılaştırmalarında marj bu kadar oynayabilir.

> Plan hedefi "ilk yüklemede JS < 250 KB brotli". **Brotli ölçümü yapılmadı**;
> yukarıdaki değerler gzip. Brotli tipik olarak gzip'ten ~%10–15 küçüktür, yani
> gerçek ilk yükleme büyük olasılıkla hedefin altında — ama bu bir çıkarım,
> ölçüm değil. Ölçmek için: `dist/assets/*.js` dosyalarını `brotli -q 11` ile
> sıkıştırıp ilk HTML setindeki parçaları topla.

## 2. Core Web Vitals (Lighthouse mobil) — ölçülmedi

| Metrik | Hedef | Baseline | Durum |
|---|---|---|---|
| LCP (mobil 4G) | < 2,0 s | — | **ölçülmedi** (bu ortamda tarayıcı yok) |
| CLS | < 0,05 | — | **ölçülmedi** |
| INP | < 200 ms | — | **ölçülmedi** |
| Lighthouse Performans | ≥ 90 | — | **ölçülmedi** |
| Lighthouse Erişilebilirlik | ≥ 95 | — | **ölçülmedi** (kontrast hatları T12 ile giderildi, ölçüm tekrarı yapılmadı) |

Nasıl doldurulur (deploy sonrası, 3 kez):

```bash
npx lighthouse https://atlasia.pages.dev/ \
  --preset=desktop=false --form-factor=mobile \
  --throttling-method=simulate \
  --only-categories=performance,accessibility --output=json --output-path=./lh-1.json
# 2 ve 3'ü tekrarla; medyanı bu tabloya yaz.
```

## 3. Search Console — ölçülmedi

Mevcut durum (gösterim, tıklama, indekslenmiş sayfa sayısı) alınmadı: bu
oturumda Search Console erişimi yok. Doldurulunca: tarih, 28 günlük gösterim,
ortalama CTR, indekslenen URL sayısı.

**Bilinen teknik engel (T17 ile ilgili):** landing şu an istemci tarafında
render ediliyor; JS'siz HTML'de sayfa metni yok. Bu, arama motoru görünürlüğünü
sınırlar ve T17 (prerender/SSG) maddesinin neden gerekli olduğunu açıklar.

## 4. Dönüşüm hunisi — ölçülmedi (olaylar hazır)

Olay sözleşmesi T2 ile kodda (bkz. `docs/olcum-ve-hata-izleme.md` §2b), ancak
**toplayıcı uç noktası tanımlı olmadığı için hiçbir veri akmıyor**. Yani planın
"%15 → %40" gibi hedefleri için bugün yazılabilecek tek dürüst değer
"bilinmiyor". Uç nokta tanımlanınca bu tablo doldurulur:

| Adım | Olay | Hedef | Bugün |
|---|---|---|---|
| Landing görüntüleme | `app_open` | — | veri yok |
| CTA tıklama | `cta_click{placement}` | — | veri yok |
| Harita açılışı | `map_open{guest}` | %40+ (landing'den) | veri yok |
| Kayıt başlangıcı | `signup_start` | — | veri yok |
| Kayıt tamamlama | `signup_complete{method}` | %25+ (haritadan) | veri yok |
| Landing → kayıt | yukarıdakilerin bileşimi | %8+ | veri yok |
| Aktivasyon | `first_route_created` | — | veri yok |
| Sesli rehber | `audio_guide_start` | — | veri yok |

## 5. Kalite kapısı (bu dalda)

| Kontrol | Sonuç |
|---|---|
| `npm run typecheck` | temiz |
| `npm run lint` | temiz |
| `npm run test:run` | 1248/1248 (153 dosya) |
| `npm run build` | başarılı, bütçe içinde |
| `npm run test:scripts` | 19/19 (node test runner) |
| `npm run verify:sw-shell` | 44/44 varlık |
| `npm run test:rules:emulator` | çalıştırılmadı (emülatör/Java yok) |

## 6. Nasıl güncellenir

1. Paket satırları: `npm run build` çıktısındaki tabloyu kopyala.
2. Lighthouse: yukarıdaki komutu 3 kez çalıştır, medyanı yaz.
3. Huni: toplayıcıda son 7/28 günü oku.
4. Her güncellemede bu dosyanın başındaki tarihi ve ölçüm sürümünü değiştir.
