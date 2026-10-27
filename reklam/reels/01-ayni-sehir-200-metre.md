# 01 · "Aynı şehir, 200 metre"

> **Kampanyanın amiral gemisi.** Tek bir yerde çekilir, hiçbir efekt gerekmez,
> iki açı arasındaki fark reklamın tamamıdır.

| | |
|---|---|
| **Süre** | 16 sn |
| **Oran** | 9:16 (1080×1920) |
| **Çekim** | Telefon, elde, gimbal yok |
| **Ses** | Sadece ortam sesi + tek nota müzik (isteğe bağlı) |
| **Kanal** | Reels, TikTok, Shorts |
| **Hedef** | Farkındalık + paylaşım |

---

## Zaman çizelgesi

| sn | Görüntü | Ses | Ekran yazısı |
|---|---|---|---|
| 0,0–1,5 | Kalabalık: aynı pozu veren 5–10 kişi, sırtları dönük, telefonlar havada | Ortam kalabalığı, konuşma | **Herkes burada.** |
| 1,5–3,0 | Aynı kadraj, kalabalık yavaşça solar (kesme yok, aynı açı) | Kalabalık kısılır | **Aynı şehir. Aynı gün.** |
| 3,0–4,5 | Yürüyen ayaklar, taş zemin, 4 saniyelik stabilize yürüyüş | Sadece ayak sesi | **200 metre.** |
| 4,5–7,0 | Aynı açıyla boş sokak / avlu / manzara. Tek kişi yok | Rüzgâr, kuş | **Kimse yok.** |
| 7,0–9,0 | Telefon kaldırılır, ekranda harita + tek pin | Bildirim "tık" | **4 dk yürüyüş.** |
| 9,0–12,0 | Pin açılır: bir gezginin notu okunur | Sessizlik | **"Buradan gir, sıra kısa."** |
| 12,0–14,0 | Aynı boş sokak, ama bu kez bizim yürüdüğümüz | Müzik girer | **200 metre. Hepsi bu.** |
| 14,0–16,0 | Logo + tek satır | Müzik kısılır | **atlasia.** / *Kaç metre yürüyeceğini Atlasia söylüyor.* |

---

## Çekim listesi (telefonla, tek kişi, 40 dakika)

1. **Kalabalık kadrajı.** Turistik noktanın en kalabalık yerinde, göğüs hizasından,
   insanların yüzü görünmeden. 15 saniye kesintisiz çek. *Mümkünse sabah 10:00–11:00.*
2. **Aynı kadraj, 200 metre sonrası.** Aynı yükseklik, aynı açı, aynı lens.
   *Kural: aynı ufuk çizgisi.* Fark yalnızca içerikte olsun.
3. **Yürüyüş.** Telefon aşağı 45°, ayaklar + taş. 10 saniye. Adımlar ritmik olsun.
4. **Telefon ekranı.** Harita açık, pin görünür, ekranı başka bir telefonla çek
   (yansıma olmasın diye ekranı hafif yana çevir).
5. **Not kartı.** Pin açıldığında gelen notun ekran görüntüsü — dikey kırp.
6. **Kapanış.** Logo için 2 saniyelik boş gökyüzü / harita dokusu.

> **En kritik şey:** 1. ve 2. çekim **birebir aynı kadraj** olmalı. Reklamın
> inandırıcılığı bu eşleşmede. Farklı açı olursa "photoshop" hissi verir.

---

## Kurgu notları

- **Hiçbir geçiş efekti kullanma.** Sert kesme. Kalabalık → boşluk kesmesi 0,1 sn bile gecikirse etki ölür.
- Kalabalık sesini 0,30'a kadar düşür, ayak sesini yükselt: **ses de kesme yapıyor.**
- Renk: soğuk kalabalık, sıcak boşluk. Küçük bir sıcaklık farkı bile "oraya gitmek istiyorum" hissi yaratır.
- Altyazılar **ekranın üst üçte birinde** olsun; alt kısım platform arayüzüyle kapanıyor.
- 9:16 güvenli alan: alt 250 px, üst 150 px boş bırak.

---

## Kapak (thumbnail)

İkiye bölünmüş kare: solda kalabalık, sağda boş sokak. Üstte tek satır:
**"200 metre"**. Yüz yok — yüz olmayan kapak, gezi nişinde daha iyi tıklanıyor.

---

## Caption (kopyala-yapıştır)

```
Aynı şehir, aynı gün, aynı ışık. Arada 200 metre var.

O 200 metrede ne olduğunu kimse yazmıyor çünkü kimse oraya kadar
yürümüyor. Atlasia haritayı değil, o 200 metreyi gösteriyor:
kaç dakika, sıradaki durak neresi, varınca ne dinleyeceksin.

Senin bildiğin bir "200 metre" var mı? Yorumda yaz, haritaya ekleyelim.

#200metre #atlasia #gezi #seyahat #gizlikalmışyerler
```

---

## Kuyruğa hazır JSON

Video `public/social/200-metre-01.mp4` olarak eklenince:

```json
{
  "id": "2026-11-02-200-metre-01",
  "scheduledFor": "2026-11-02T19:00:00+03:00",
  "mediaType": "REELS",
  "mediaUrl": "https://atlasia.pages.dev/social/200-metre-01.mp4",
  "caption": "Aynı şehir, aynı gün, aynı ışık. Arada 200 metre var.\n\nO 200 metrede ne olduğunu kimse yazmıyor çünkü kimse oraya kadar yürümüyor. Atlasia haritayı değil, o 200 metreyi gösteriyor.\n\nSenin bildiğin bir \"200 metre\" var mı? Yorumda yaz, haritaya ekleyelim.\n\n#200metre #atlasia #gezi #seyahat #gizlikalmışyerler",
  "shareToFeed": true
}
```

---

## Neden tutar

İnsanlar bir uygulamayı değil, **kendi utancını** paylaşıyor: "Ben de hep orada
duranlardan biriyim." Reklam onları suçlamıyor, bir kaçış yolu gösteriyor.
Yorum üretme oranı yüksek olur — algoritmanın sevdiği tek şey bu.
