# "Bir yere dokun" — AI ile üretilmiş reklam filmi

14 sn · 1080×1920 (9:16) · 30 fps · H.264 + AAC · Türkçe seslendirme · jenerik müzik sentezlenmiş

```
reklam-dokunma.mp4   ← yayına hazır film
kapak.jpg            ← Reels kapak karesi (video ile aynı tasarım)
kareler/             ← AI ile üretilen 5 sahne + üretilen yazı katmanları
ses/vo-tr.mp3        ← Türkçe seslendirme (kadın, sıcak ton)
ses/jingle.wav       ← 4,2 sn jenerik (numpy ile sentez) — lisans sorunu yok
fontlar/             ← Bricolage Grotesque, birleştirilmiş Türkçe karakterli TTF
uret.py              ← tek komutla yeniden üretir
```

## Akış (14,2 sn, 5 sahne)

| # | Zaman | Sahne | Metin | Ses |
|---|---|---|---|---|
| 1 | 0,0–3,2 | Gece Dünyası, Türkiye/Akdeniz ışıkları | `atlasia` · **bir yere dokun.** · dünya yaklaşsın. | VO 1. cümle |
| 2 | 3,2–5,3 | Parmak, ekranda tek altın noktaya dokunuyor | **tek dokunuş.** · gerisi haritada. | — |
| 3 | 5,3–8,2 | Efes, gün doğumu, boş mermer cadde | `efes · selçuk` · **06:40.** · kalabalıktan önce. | VO 2. cümle |
| 4 | 8,2–10,8 | Sırtı dönük gezgin, kulaklık, sütunların arası | `sesli rehber` · **ses, sen iste.** · konum izni sende kalır. | VO 3. cümle |
| 5 | 10,8–14,2 | Kapanış: topografya, tek nokta | **atlasia.** · dünyayı merakınla keşfet. · `cihazına ekle` | jenerik |

Seslendirme metni: *"Bir yere dokun. Dünya yaklaşsın. Efes'te mermerin üstünde iki bin yıllık bir gölge var. Atlasia onu, sen yürürken anlatıyor. Ses, sen isteyince başlar."*

## Yeniden üretmek / değiştirmek

```bash
cd reklam/dokunma
FFMPEG=/path/to/ffmpeg python3 uret.py
```

Gereken: `ffmpeg` (libx264 + aac), Python 3.11, `pillow`, `numpy`.
`uret.py` içindeki `SCENES` listesi sahnelerin süresini, zoom aralığını, odak
noktasını ve **tüm metinleri** tutar. Metni değiştir, komutu çalıştır: yazı
katmanı, film ve kapak yeniden yazılır. Görsel üretimi (AI) bu betiğin dışında;
yeni kare eklemek için `kareler/<id>.png` koyup `SCENES`'e bir satır ekle.

## Bilinçli üretim kararları

- **CTA "cihazına ekle"**, mağaza değil: ürün web/PWA.
- **Ses kendiliğinden başlamıyor** anlatısı korundu (uygulamanın gerçek davranışı).
- **Abartılı rota iddiası yok**; "saniyeler içinde gitmen gereken 10 yer" dili kullanılmadı.
- Jenerik sentezlendi, üçüncü taraf müzik lisansı riski yok.
- Karelerde **gerçek kişi yok**, AI görselleri; "gerçek müşteri" iddiası kurulmuyor.
  Saha gününde çekilecek gerçek görüntülerle desteklenmesi planın F6 adımı.

## Sırada ne var (aynı üretim hattıyla)

1. **F2 "İzmir, 3 saatim var"** — ekran kaydı ağırlıklı; `kareler/` yerine uygulama kaydı gerekir.
2. **F4 "Kulaklığı tak"** — bu filmdeki 3. ve 4. sahne ayrı bir 18 sn kurguya çıkarılabilir.
3. **İngilizce sürüm** — `vo-tr.mp3` yerine İngilizce seslendirme + İngilizce `SCENES` metinleri.
