# Teslimat — T10: görsel boru hattı (yükleme kapıları + teslim işaretleri)

**Tarih:** 2026-10-28 · **Dal:** `arena/1ec07123-atlasia`
**Kapsam kararı (ajan):** Boru hattının kendisi (küçültme → JPEG → kademeli
kalite) zaten vardı. Eksik olan **giriş kapıları** ve **teslim işaretleri**
idi; ikisi de tarayıcı ölçümü gerektirmeden doğrulanabilir. WebP/AVIF'e geçiş
ve sunucu tarafı türev üretimi **yapılmadı** (yeni bağımlılık/servis gerekir,
kota ölçümü olmadan riskli).

## 1. Bulunan gerçek kusurlar

| # | Kusur | Sonuç |
|---|---|---|
| 1 | Girdi dosyası için **boyut sınırı yoktu** | 48 MP telefon fotoğrafı (≈15 MB, kimi zaman 40 MB) doğrudan decode ediliyordu; mobilde sekme düşebiliyor (OOM) ve kullanıcı anlaşılmaz bir hata görüyordu. |
| 2 | **HEIC** dosyaları sessizce deneniyordu | iPhone varsayılan biçimi tarayıcıda çözülemez; "Görsel okunamadı" gibi yol gösterici olmayan bir hata çıkıyordu. |
| 3 | EXIF yönü **örtük** varsayılıyordu | `createImageBitmap(file)` varsayılanına güveniliyordu; eski tarayıcılarda fotoğraf yan yatmış kaydedilebiliyordu. |
| 4 | Akış/kayıt görsellerinde `decoding` yoktu | Büyük JPEG'lerin çözümü ana iş parçacığında yapılıyor, kaydırma takılabiliyordu. |
| 5 | `RecordsDock` rota fotoğrafı **tembel değildi** | Ekran dışındaki yatay kartlar için bile indirme başlıyordu. |

## 2. Değişiklikler

`src/utils/image.ts`:

- `MAX_INPUT_BYTES = 25 MB` + **decode öncesi** kapı; hata metni gerçek boyutu
  söyler: `Fotoğraf çok büyük (26,0 MB). Üst sınır 25 MB; daha küçük bir fotoğraf seç.`
- HEIC/HEIF için çözüm öneren hata: *"Ayarlar → Kamera → Biçimler → 'En Uyumlu'
  seç ya da fotoğrafı JPEG olarak yükle."*
- `createImageBitmap(file, { imageOrientation: "from-image" })` — yön açıkça istenir.
- Kademeli plan `CLOUD_PHOTO_ATTEMPTS` olarak dışa açıldı (test edilebilirlik).
- Tek `assertUsableImage(file)` kapısı iki giriş noktasında da çağrılır
  (`compressImage`, `compressImageWithinLimit`).

Teslim tarafı: `PlaceDetails`, `SocialPanel`, `PlaceImage` görsellerine
`decoding="async"`; `RecordsDock` rota fotoğrafına `loading="lazy" decoding="async"`.
Hero görseli **bilinçli olarak** `fetchPriority="high"` ve tembel değil (LCP).

## 3. Doğrulama

`src/config/imagePipelineT10.test.ts` (7 test):

- 26 MB dosya decode edilmeden, anlaşılır hatayla reddedilir (iki giriş noktası),
- HEIC dosyası "En Uyumlu" yönlendirmesiyle reddedilir,
- görsel olmayan dosya reddedilir,
- kademeli plan **tek yönlü** (her adımda boyut ve kalite düşer), son adım ≤ 480 px,
  `MAX_CLOUD_PHOTO_CHARS` Firestore kuralındaki 180.000 ile aynı,
- `imageOrientation: "from-image"` kaynakta sabit,
- galeri/akış görsellerinde `decoding="async"`,
- hero `fetchPriority="high"` ve tembel değil; `RecordsDock` tembel.

## 4. Bütçe ve kapılar

| Ölçüm | Değer | Eşik |
|---|---|---|
| `entry` | 18.938 B gzip | 20.900 |
| İlk boya JS | 98.283 B gzip | 102.200 |
| Toplam JS | 1.001.304 B gzip | 1.003.000 |
| SW kabuğu | 46/46 | ✅ |

`typecheck` ✅ · `lint --max-warnings=0` ✅ · **1292/1292** (161 dosya) ·
`test:scripts` 8 paket `# fail 0` · `build` ✅ · `audit:check` ✅ ·
`firestore.rules` değişmedi.

## 5. Yapılmayanlar (bilinçli)

1. **WebP/AVIF çıktısı:** `canvas.toDataURL("image/webp")` destekli tarayıcıda
   daha küçük veri üretir, ama Firestore'daki 180.000 **karakter** sınırı
   yeniden ölçülmeden format değiştirmek kayıt kaybı riski taşır. Ayrı iş.
2. **`toBlob` + FileReader:** bellek kazancı gerçek ama ölçülemiyor (tarayıcı yok).
3. **Sunucu tarafı türev (küçük/orta/büyük + `srcset`):** depolama kotası ve
   yeni bağımlılık gerektirir; onay ister.
4. **Gerçek cihaz ölçümü** (10 MB fotoğrafın işlenme süresi, bellek tepe noktası):
   `docs/gorevler/t3-olcum-protokolu.md` protokolüyle alınacak.
