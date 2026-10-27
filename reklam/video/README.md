# reklam/video — sesli reklam filmleri

İki film, ortak görsel kit ([`atlasia_kit.py`](atlasia_kit.py)):

| # | Dosya | Süre | Üretici |
|---|---|---|---|
| 04 | [`200-metre-04.mp4`](200-metre-04.mp4) — "4.000 fotoğraf" (turist gibi gezmek) | 17,78 sn | [`render_04.py`](render_04.py) |
| 05 | [`200-metre-05.mp4`](200-metre-05.mp4) — "3 saatim vardı" (karar yorgunluğu) | 16,70 sn | [`render_05.py`](render_05.py) |
| 06 | [`200-metre-06.mp4`](200-metre-06.mp4) — "Sinyal yok" (çevrimdışı) | 15,41 sn | [`render_06.py`](render_06.py) |
| 07 | [`200-metre-07.mp4`](200-metre-07.mp4) — "Yarın yağmur var" (hava) | 16,38 sn | [`render_07.py`](render_07.py) |

Her film **farklı bir konu** anlatır: turist gibi gezmek · karar yorgunluğu · çevrimdışı ·
hava. Ortak olan ton ve tipografi, içerik değil. Konu listesi: [`../reels/00-konseptler.md`](../reels/00-konseptler.md)

## 04 — "4.000 fotoğraf"

| | |
|---|---|
| Dosya | [`200-metre-04.mp4`](200-metre-04.mp4) |
| Süre | 17,78 sn |
| Format | 1080×1920 (9:16), 30 fps, H.264 High + AAC mono 48 kHz |
| Boyut | ~3,7 MB |
| Ses | [`../ses/04-dort-bin-fotograf.mp3`](../ses/04-dort-bin-fotograf.mp3) |
| Kapak | [`build/cover.jpg`](build/cover.jpg) |
| Üretici | `render_04.py` — tek komutla yeniden üretir |

## Yeniden üretmek

```bash
pip install --break-system-packages pillow imageio-ffmpeg
python3 reklam/video/render_04.py   # 04
python3 reklam/video/render_05.py   # 05
python3 reklam/video/render_06.py   # 06
python3 reklam/video/render_07.py   # 07
```

Betik `public/social/*.mp4` kliplerinden kare çıkarır (kareler `build/stills/`),
sonra kare kare üretip ffmpeg'e boru ile verir. Yaklaşık 80 saniye sürer.

## Tasarım kararı (önemli)

Kaynak reels'lerde **gömülü metin** var (kart geçişli şablon: başlık y≈600–930,
yer adı y≈1740, rozet y≈55–105). Bu yüzden:

- Hiçbir kaynak kare **tam ekran** kullanılmadı; yalnız yazısız bölgeden
  (y **1080–1732**, x 214–866) 652×652 kırpım alındı.
- Kurgu koyu marka zemininde **tipografi + ürün mockup'ı** üzerine kuruldu.
- Kırpımlar `build/qc/crops-sheet2.jpg` kontak baskısında doğrulandı: 10 karenin
  hiçbirinde yazı yok.

Bu, reklamı "stok video + yazı"dan çıkarıp **kendi grafik diline** sokuyor.

## Zaman çizelgesi

| sn | Beat | Görüntü | Ses |
|---|---|---|---|
| 0,00–2,40 | Kanca | Galeri duvarı, kayar | "4.000 fotoğraf." |
| 2,40–4,20 | Kanca | Duvar kararır, 5 kare kalır | "Hatırladığım 5." |
| 4,20–8,00 | Boşluk | Tek foto, 4 mekân | (sebep) |
| 8,00–14,20 | Konu | Ürün kartı: rota + durak | (Atlasia) |
| 14,20–16,60 | Etki | 12 kare + "12 fotoğraf" | "12 fotoğraf çektim." |
| 16,60–17,82 | Etki | Tam ekran foto → logo | "Hepsi aklımda." |


---

## 05 — "3 saatim vardı. 40 yer vardı."

| | |
|---|---|
| Dosya | [`200-metre-05.mp4`](200-metre-05.mp4) |
| Süre | 16,70 sn |
| Ses | [`../ses/05-tam-pad.mp3`](../ses/05-tam-pad.mp3) (16,69 sn, 0,63 sn sessiz kuyruk) |
| Kapak | [`build/cover-05.jpg`](build/cover-05.jpg) |
| Üretici | [`render_05.py`](render_05.py) |
| Plan | [`../reels/05-uc-saat-kirk-yer.md`](../reels/05-uc-saat-kirk-yer.md) |

| sn | Beat | Görüntü |
|---|---|---|
| 0,0–2,7 | Kanca | 40 kartlık kaos duvarı, sayaç 1→40 |
| 2,7–5,6 | Kanca | Duvar kararır, saat ibresi 3 tur döner (2 saat kaybolur) |
| 5,6–8,0 | Boşluk | Duvar tek noktaya çöker → "Sorun yer sayısı değildi." → "Sıraydı." |
| 8,0–11,9 | Konu | Ürün kartı: 7 durak, saatleriyle çizilir (09:00→12:15) |
| 11,9–15,3 | Konu | Durak detayı: "Varışta 27° · yağış %10" |
| 15,3–16,7 | Etki | "0 karar" → logo |

> `STOP_TIMES` dizisi temsilî saatlerdir. Yayından önce uygulamadan gerçek bir
> 3 saatlik rota çekip güncelle.

## Ortak kit

`atlasia_kit.py` şunları taşır: temiz kırpım (`clean_square`/`clean_wide`),
metin katmanı + gölge, rozet, ürün kartı + rota çizimi, durak çipi, galeri duvarı,
vignette/scrim, `encode_video`. Yeni bir reklam eklerken sadece beat karelerini yaz.


---

## 06 — "Sinyal yok" (çevrimdışı)

| | |
|---|---|
| Dosya | [`200-metre-06.mp4`](200-metre-06.mp4) |
| Süre | 15,41 sn |
| Ses | [`../ses/06-tam.mp3`](../ses/06-tam.mp3) |
| Kapak | [`build/cover-06.jpg`](build/cover-06.jpg) |
| Üretici | [`render_06.py`](render_06.py) |

Fotoğraf yok: harita döşemeleri yüklenemez (gri iskelet), %0→%100 indirme kartı,
uçak modu anahtarı, sonra dolu harita + rota. Kapanış: "SİNYAL YOK / harita var".

## 07 — "Yarın yağmur var" (hava)

| | |
|---|---|
| Dosya | [`200-metre-07.mp4`](200-metre-07.mp4) |
| Süre | 16,38 sn |
| Ses | [`../ses/07-tam.mp3`](../ses/07-tam.mp3) |
| Kapak | [`build/cover-07.jpg`](build/cover-07.jpg) |
| Üretici | [`render_07.py`](render_07.py) |

Yağmur animasyonu + 7 duraklı dikey liste. Her durağa varış saatindeki hava ikonu
(güneş/bulut/yağmur). Yağmur gelen durak listenin sonuna iner — **sıra değişir**.

> `STOPS` ve hava ikonları temsilî. Gerçek `optimizeForRain` çıktısıyla güncelle.
