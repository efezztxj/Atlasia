# 05 · "3 saatim vardı. 40 yer vardı." — sesli reklam (üretildi)

> **04'ün kardeşi.** Aynı kampanya dili, aynı görsel kit, aynı ses. 04 "turist olmayı",
> 05 "karar vermeyi" anlatıyor. İkisi arka arkaya yayınlanınca seri gibi duruyor.

| | |
|---|---|
| **Süre** | **16,70 sn** |
| **Format** | 1080×1920 (9:16), 30 fps, H.264 + AAC mono |
| **Ses** | [`../ses/05-tam-pad.mp3`](../ses/05-tam-pad.mp3) (16,69 sn) + [`beat-1…5`](../ses/) |
| **Üretici** | [`../video/render_05.py`](../video/render_05.py) |
| **Kapak** | `video/build/cover-05.jpg` |
| **Yapı** | Kanca (0–2,7) → Kanca (2,7–5,6) → Boşluk (5,6–8,0) → Konu (8,0–15,3) → Etki (15,3–16,7) |

---

## 1. Metin (sesle birebir aynı)

```
1  Üç saatim vardı. Kırk yer vardı.
2  İki saatimi nereye gideceğime karar vermekle geçirdim.
3  Sorun yer sayısı değildi. Sıraydı.
4  Atlasia yedi durağı saatiyle sıralıyor. Yürüyerek.
5  Şimdi üç saatte yedi durak. Ve hiç karar vermiyorum.
```

**Kanca → Etki yankısı:**

| | Kanca | Etki |
|---|---|---|
| Sayı | 3 saat · 40 yer · **2 saat kayıp** | 3 saat · **7 durak** · **0 karar** |
| Duygu | "karar veremedim" | "hiç karar vermiyorum" |

Kaybedilen 2 saat geri geliyor — ama "daha hızlı" diye değil, **karar ortadan kalktığı için.**

---

## 2. Beats (sesle ölçülmüş)

| sn | Beat | Ekran | Ses |
|---|---|---|---|
| 0,0–2,7 | Kanca | 40 kartlık kaos duvarı kayıyor, **sayaç 1→40** sayıyor | "Üç saatim vardı. Kırk yer vardı." |
| 2,7–5,6 | Kanca | Duvar kararıyor, **saat ibresi 3 tur dönüyor** (2 saat kayboluyor) | "İki saatimi nereye gideceğime karar vermekle geçirdim." |
| 5,6–7,0 | Boşluk | Duvar **tek noktaya çöküyor** | — |
| 7,0–7,9 | Boşluk | Siyah zemin | "Sorun yer sayısı değildi." |
| 7,9–8,0 | Boşluk | **"Sıraydı."** tam ekran (kartın üstünde devam eder) | "Sıraydı." |
| 8,0–11,9 | Konu | Ürün kartı: **7 durak, saatleriyle çiziliyor** (09:00 → 12:15) | "Atlasia yedi durağı saatiyle sıralıyor." |
| 11,9–15,3 | Konu | Durak detayı: **"Varışta 27° · yağış %10"** | "Yürüyerek." |
| 15,3–16,7 | Etki | **"0 karar"** + "7 durak · 3 saat" → logo | "Şimdi üç saatte yedi durak. Ve hiç karar vermiyorum." |

**Kritik detay:** "Sıraydı." tek kelime ama reklamın **dönüm noktası**. Bu yüzden
siyah zeminde tek başına, 132 px, 0,9 saniye duruyor. Kısaltma.

---

## 3. Neden bu kanca çalışır

1. **Herkesin derdi.** "Nereye gideceğime karar veremedim" bir gezi problemi değil,
   bir *karar yorgunluğu* problemi. Uygulamayı indirmeyen insan da bunu yaşıyor.
2. **Sayı üç tane, hepsi aynı hikâyede.** 3 saat / 40 yer / 2 saat kayıp.
   İlk 5 saniyede üç sayı var — izleyici "bu adam ölçmüş" diyor.
3. **Ürün geç geliyor** (8. saniye) ama geldiğinde **kanıtla** geliyor: ekranda
   7 durağın saati tek tek yazılıyor.
4. **"0 karar"** iki kelime, tüm vaadi taşıyor. "Kolay planlama" demekten güçlü,
   çünkü bir *sonuç* değil bir *yokluk* iddia ediyor.

---

## 4. Caption

```
3 saatim vardı. 40 yer vardı.
2 saatimi nereye gideceğime karar vermekle geçirdim.

Sonra fark ettim: sorun yer sayısı değildi. Sıraydı.

Atlasia 7 durağı saatiyle sıralıyor. Yürüyerek. Nerede kaç dakika
kalacağın, sıradaki durağa kaç dakika yürüyeceğin belli.

Şimdi 3 saatte 7 durak. Ve hiç karar vermiyorum.

#200metre #atlasia #gezi #seyahat #rotapaylaşımı
```

---

## 5. Kuyruğa hazır JSON

Video `public/social/200-metre-05.mp4` olarak eklenince:

```json
{
  "id": "2026-11-10-200-metre-05",
  "scheduledFor": "2026-11-10T19:00:00+03:00",
  "mediaType": "REELS",
  "mediaUrl": "https://atlasia.pages.dev/social/200-metre-05.mp4",
  "caption": "3 saatim vardı. 40 yer vardı.\n\n2 saatimi nereye gideceğime karar vermekle geçirdim.\n\nSonra fark ettim: sorun yer sayısı değildi. Sıraydı.\n\nAtlasia 7 durağı saatiyle sıralıyor. Yürüyerek.\n\nŞimdi 3 saatte 7 durak. Ve hiç karar vermiyorum.\n\n#200metre #atlasia #gezi #seyahat #rotapaylasimi",
  "shareToFeed": true
}
```

---

## 6. Reklam metni (ücretli)

```
3 saatim vardı, 40 yer vardı. 2 saatimi nereye gideceğime karar vermekle geçirdim.

Sorun yer sayısı değildi. Sıraydı.

Atlasia 7 durağı saatiyle sıralıyor. Yürüyerek. Her durağa varış saatinde
hava durumu da yazıyor.

Şimdi 3 saatte 7 durak. Ve hiç karar vermiyorum.
```

**Başlık:** 40 yer, 3 saat, sıfır karar
**CTA:** Rotanı çiz
**Bağlantı:** `https://atlasia.pages.dev/?tab=kesfet&utm_source=meta&utm_medium=paid&utm_campaign=200metre&utm_content=kirkirk`

---

## 7. 04 ile birlikte kullanım

| Gün | Reklam | Rol |
|---|---|---|
| 1 | **04** "4.000 fotoğraf" | Kimlik: "turist gibi gezmeyi bırak" |
| 3 | **05** "3 saatim vardı" | Fayda: "karar verme, sadece yürü" |
| 5 | 04'ün en iyi hook'u + 05'in gövdesi | Test: kanca mı daha güçlü, fayda mı |

Aynı görsel kit (koyu zemin, DejaVu tipografi, altın vurgu) sayesinde ikisi
**tek bir kampanya** gibi görünüyor. Bu, tek tek reklamlardan daha hızlı marka kurar.

---

## 8. Dürüst not

- **09:00–12:15** saatleri kurguda temsilî. Gerçek bir rotanın saatleri değil.
  Yayına almadan önce uygulamadan gerçek bir 3 saatlik rota çekip saatleri
  güncellemek daha iyi olur (5 dakikalık iş, `STOP_TIMES` dizisi).
- "Celsus Kütüphanesi" ve **27° / %10** da temsilî. Gerçek veriyle değiştirilirse
  yorumlarda "bu ne zaman çekildi" sorusuna cevap verilebilir.
- Ses yine **anlatıcı**, spiker değil. Aynı ses 04'te de kullanıldı; seri
  tutarlılığı için değiştirme.
