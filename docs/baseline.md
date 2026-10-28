# Baseline — ölçüm tabanı (T3)

Bu dosya, iyileştirme planının "iyileşti mi?" sorusunu hisle değil sayıyla
yanıtlamak için tutulur. **Her satırda kaynak ve tarih vardır.** Ölçülmemiş bir
şey varsa "ölçülmedi" yazar; tahmini sayı yazılmaz.

Son güncelleme: **2026-10-28** · Taban sürüm: `2412ace` (main) · Ölçüm alınan sürüm: bu dal, #124/#125 üstüne T1–T3 + T9 + T13–T16 + T4/T5

## 1. Paket boyutları — ölçüldü

Komut: `npm run build` (üretim derlemesi; `scripts/bundle-budget.mjs` gzip ölçer).

| Ölçüm | Taban `2412ace` | Bu dal `7079387` | Fark |
|---|---|---|---|
| İlk HTML seti (gzip) | 411.987 B | **117.958 B** | −294.029 B (−%71) |
| İlk HTML seti (ham) | 1.371.468 B | 433.574 B | −937.894 B |
| İlk setteki JS (gzip) | 386.401 B | **91.539 B** | −294.861 B |
| `entry` chunk (gzip) | 166.244 B | **20.814 B** | −145.430 B |
| `firebase-vendor` (gzip) | 149.338 B — ilk sette | 149.339 B — **ertelenmiş** | ilk setten çıktı |
| `map-vendor` (gzip) | 248.691 B — ilk sette değil | 248.691 B — ilk sette değil | — |
| Toplam JS (gzip) | 905.483 B | 918.314 B | +12.831 B (ambalaj + T2 olayları + mobil menü + #125 parça bölünmesi + T4/T5 misafir modu; #127 sonrası bağımlılık yükseltmeleri ayrı satır) |
| Toplam CSS (gzip) | 35.061 B | 35.187 B | +126 B (T7 + T13/T14 sınıfları, T9 ölü CSS temizliği, T4 misafir dönüş çubuğu) |
| Yolculuk: tanıtım (gzip) | 411.987 B | 117.958 B | −294.029 B (bütçe 129.400) |
| Yolculuk: uygulama kabuğu (gzip) | 812.982 B | 517.826 B | −295.153 B (bütçe 830.000) |
| Bütçe durumu | içinde | içinde (ilk set 117.958/129.400 · entry 20.814/20.900 · JS 918.314/997.500 · CSS 35.187/35.700) | T4/T5 **hiçbir eşiği yükseltmedi**; #127'den beri eşikler ölçüme bağlı (bayatlama kapısı) |

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
