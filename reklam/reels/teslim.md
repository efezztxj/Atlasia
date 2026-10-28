# Teslim — dört reklam filmi

Hepsi **ayrı konu**, hiçbiri 200 Metre'nin devamı değil. Ortak olan sadece ton, ses ve tipografi.

| # | Konu | Kanca | Süre | Boyut | Drive |
|---|---|---|---|---|---|
| 04 | Turist gibi gezmek | "Telefonumda 4.000 fotoğraf var. Hatırladığım 5 yer." | 17,78 sn | 3,72 MB | [izle](https://drive.google.com/file/d/12R4FAN51AtUFFyLZgXanxXNoDBGAR3Jz/view) |
| 05 | Karar yorgunluğu | "3 saatim vardı. 40 yer vardı." | 16,70 sn | 2,85 MB | [izle](https://drive.google.com/file/d/1w0gQofFM9ExRZ66DBMhOEUaVlzwb2wG8/view) |
| 06 | Çevrimdışı | "Bir yere gittim. Harita yüklenmedi." | 15,41 sn | 1,82 MB | [izle](https://drive.google.com/file/d/1akaXZV6ljpv_bQO49_DqtPRFSQ9kLNGd/view) |
| 07 | Hava | "Yarın Kapadokya'da yağmur var. Planın hâlâ geçerli mi?" | 16,38 sn | 2,52 MB | [izle](https://drive.google.com/file/d/1MLLDZzPngRwNcgSPoKbBraPxEiDHUw9d/view) |

Klasör (public): <https://drive.google.com/drive/folders/17xwh3olXhjQysoQ-x3FX7wAgMsrjt2z4>

## Ortak teknik

- 1080×1920 (9:16), 30 fps, H.264 High + AAC mono 48 kHz
- Anlatıcı sesi: `voice-00` (dördünde de aynı)
- Renkler: INK #020D17 · CREAM #F1F0E9 · GOLD #F3C870 · MINT #7EE0B8
- Kaynak kareler: `public/social/*.mp4` → `reklam/video/build/stills/`
- Kapaklar: 04 `build/cover.jpg` · 05 `build/cover-05.jpg` · 06 `build/cover-06.jpg` · 07 `build/cover-07.jpg`

## İskelet (dördünde de aynı)

```
kanca  →  (boşluk)  →  konu  →  etki
```

Etki, kancanın kurduğu duygunun matematiksel tersi: kayıp → bulma, kilitlenme → akış,
boşluk → doluluk, belirsizlik → karar.

## Dürüst notlar

- **05**'teki saatler (09:00–12:15) temsilî. Yayına girmeden önce gerçek bir rota ile değiştirilmeli.
- **07**'deki duraklar ve hava ikonları temsilî. `optimizeForRain` gerçek çıktısıyla beslenmeli.
- **06**'daki "42 MB" örnek bir değer; ürünün gerçek indirme boyutu değil.
- Marka fontu (Bricolage) bu ortamda yok; DejaVu ile üretildi. Marka fontuyla yeniden
  render edilirse tipografi bir tık daha "Atlasia" olur.

## Yeniden üretmek

```bash
pip install --break-system-packages pillow imageio-ffmpeg mutagen
python3 reklam/video/render_06.py
python3 reklam/video/render_07.py
```

Detay: [`../video/README.md`](../video/README.md) · Konu listesi: [`00-konseptler.md`](00-konseptler.md)
