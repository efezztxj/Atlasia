# 02 · "Kalabalığın bittiği yer"

> **Seri formatı.** Mevcut Yürüyüş Serisi'nin ([`social/queue`](../../social/queue/))
> devamı. Haftada 2 kez, aynı şablon, farklı şehir. Bir kez kurulur, 12 hafta döner.

| | |
|---|---|
| **Süre** | 10–12 sn |
| **Oran** | 9:16 |
| **Çekim** | Telefon, yürüyüş |
| **Kanal** | Reels (haftada 2), TikTok |
| **Hedef** | Süreklilik, takipçi birikimi, seri kimliği |

---

## Şablon (her şehirde aynı)

| sn | Görüntü | Ekran yazısı |
|---|---|---|
| 0,0–2,0 | Kalabalık, sıkışık kadraj | **[ŞEHİR] · [SAYI] kişi aynı yerde** |
| 2,0–4,0 | Yürüyüş başlar, kalabalık geride kalır | **Yürümeye devam.** |
| 4,0–7,0 | Yol boyunca 3 kesme: dar sokak, merdiven, açıklık | solda azalan kalabalık çubuğu `100 → 12` |
| 7,0–9,5 | Boş manzara / boş avlu | **[X] dakika. Kalabalık bitti.** |
| 9,5–11,0 | Logo + seri numarası | **200 METRE · 05** |

---

## Bu haftanın cümleleri (hook = ilk 2 saniye)

| # | Şehir | Hook |
|---|---|---|
| 05 | Efes | "Efes'te en çok fotoğraf çekilen yer, en sıkıcı yer." |
| 06 | İstanbul | "Balat'ta herkes aynı duvarın önünde. Duvarın arkası boş." |
| 07 | Kapadokya | "Balonlar 5.30'da kalkıyor. Vadi 6.15'te boşalıyor." |
| 08 | Roma | "Kolezyum'un arkasında sıra yok. Kimse dönüp bakmıyor." |
| 09 | Lizbon | "Tramvay 28'e binme. Aynı manzara, 12 dakika yürüyüş." |
| 10 | Nevşehir | "Herkes dereden bakıyor. Sırtın öbür tarafı boş." |

> **Kural:** Her cümle **bir sayı** içersin. Sayı, iddiayı kanıt gibi gösterir ve
> yorumlarda tartışma açar ("12 dakika mı, ben 20 dakikada gittim").

---

## Kurgu standardı

- **Aynı font, aynı konum, aynı renk.** 12. bölümde izleyici yazıyı görmeden seriyi tanımalı.
- Seri numarası **sağ üst** köşede küçük: `200 METRE · 05`.
- Kalabalık çubuğu her videoda aynı yerde, aynı animasyonla azalsın — imza hâline gelir.
- Müzik: tek, değişmeyen bir parça. Seri = ses.
- **12 saniyeyi geçme.** Bu format kısa olduğu için çalışıyor.

---

## Üretim takvimi (bir kez kur, 12 hafta işlesin)

```
Pazartesi: çekim (tek şehir, 3 video)
Salı:      kurgu (şablon)
Çarşamba:  yayın 1
Cuma:      yayın 2
```

Stok kuralı: **her zaman 4 yayınlanmamış video** hazır dursun. Tatil/hastalık
olduğunda seri durmasın — seri durursa izleyici kaybolur.

---

## Caption şablonu

```
[N sayı] kişi aynı yerde duruyor. [X] dakika yürüdüğünde kimse kalmıyor.

[Şehir]'de bunu ilk kez [yıl]'da fark ettim. O günden beri her gittiğim
yerde aynı şeyi soruyorum: "200 metre sonrasında ne var?"

#200metre #atlasia #[şehir] #gezi
```

---

## Kuyruğa hazır JSON

```json
{
  "id": "2026-11-04-200-metre-05-efes",
  "scheduledFor": "2026-11-04T19:00:00+03:00",
  "mediaType": "REELS",
  "mediaUrl": "https://atlasia.pages.dev/social/200-metre-05-efes.mp4",
  "caption": "Efes'te en çok fotoğraf çekilen yer, en sıkıcı yer.\n\n200 metre yürüdüğünde kimse kalmıyor. Sıradaki durak neresi, kaç dakika: Atlasia'da.\n\n#200metre #atlasia #efes #efesharabeleri #gezi",
  "shareToFeed": true
}
```

---

## Neden tutar

Seri, tek tek videolardan daha hızlı büyür: izleyici bir tanesini beğenirse geri
kalanı **arama** zorunda kalır. Ayrıca üretim maliyeti sıfıra yaklaşır — şablon
kurulduktan sonra video başına iş 20 dakika.
