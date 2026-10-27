# reklam/video — "4.000 fotoğraf" sesli reklam filmi

| | |
|---|---|
| Dosya | [`200-metre-04.mp4`](200-metre-04.mp4) |
| Süre | 17,78 sn |
| Format | 1080×1920 (9:16), 30 fps, H.264 High + AAC mono 48 kHz |
| Boyut | ~3,7 MB |
| Ses | [`../ses/04-dort-bin-fotograf.mp3`](../ses/04-dort-bin-fotograf.mp3) |
| Kapak | [`build/cover.jpg`](build/cover.jpg) |
| Üretici | [`render-reklam.py`](render-reklam.py) — tek komutla yeniden üretir |

## Yeniden üretmek

```bash
pip install --break-system-packages pillow imageio-ffmpeg
python3 reklam/video/render-reklam.py
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
