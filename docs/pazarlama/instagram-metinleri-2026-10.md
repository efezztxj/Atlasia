# Instagram gönderi metinleri + biyografi — "Bir yere dokun" (14 sn film)

> Kopyala–yapıştır metinler. Sınırlar: **caption 2.200 karakter**, **en fazla 30
> hashtag**, **bio 150 karakter**, **profil adı 30 karakter**.
> Ton: sakin, somut, "sen". Abartı yok, mağaza CTA'sı yok.

Video: `reklam/dokunma/reklam-dokunma.mp4` · Kapak: `reklam/dokunma/kapak.jpg`

---

## 1. Gönderi metni — ana sürüm (önerilen)

```
Bir yere dokun. Gerisi haritada.

Efes, 06:40. Kapı açılalı 10 dakika olmuş; mermer hâlâ serin, Celsus'un önünde dört kişi var. Bir saat sonra dört yüz olacak.

Atlasia'da bir noktaya dokunduğunda üç şey aynı ekranda geliyor: oranın hikâyesi, oraya hangi sırayla gideceğin ve başka gezginlerin bıraktığı küçük ipuçları.

Rota sihir değil — her durak için bir gerekçe yazıyor. Sesli anlatım sen isteyince başlıyor, konum izni sende kalıyor.

Cihazına ekle, hafta sonu lazım olacak. Bağlantı profilde.

#atlasia #efes #selçuk #izmir #gezirehberi #seyahat #rota #antikkent #sabahgezisi #kültürgezisi #gezgin #türkiye #kesfet #gündoğumu #seyahatnotları
```

*(~700 karakter, 15 hashtag. Instagram'da ilk 125 karakter görünür: "Bir yere dokun. Gerisi haritada." + Efes satırının başı.)*

---

## 2. Kısa sürüm (Story / Reels hızlı izleyici)

```
Efes'te 06:40. Kalabalıktan önce.

Bir yere dokun: hikâyesi, rotası ve sesi aynı ekranda. Rota sihir değil, her durağın gerekçesi var.

Cihazına ekle 👉 profildeki bağlantı

#atlasia #efes #selçuk #izmir #gezirehberi #rota #antikkent #sabahgezisi #kesfet #seyahat
```

---

## 3. Soru sürümü (yorum almak için — erişimi en çok bu açar)

```
Efes'e gittin mi, gittinse kaçta girdin?

06:40'ta Celsus'un önünde dört kişi oluyor. 08:00'de dört yüz.

Atlasia bu yüzden var: bir yere dokunduğunda sadece "nerede" değil, "ne zaman ve hangi sırayla" da yazıyor. Sesli anlatım sen isteyince başlar.

Cihazına ekle — bağlantı profilde.

#atlasia #efes #selçuk #izmir #gezirehberi #seyahat #rota #antikkent #erkenkalkan #kesfet #gezgin #türkiye
```

---

## 4. Hashtag havuzları (döndürerek kullan, her gönderide aynı 30'u yazma)

**Marka (her zaman 1 tane):** `#atlasia`

**Yer (gönderinin konusu):** `#efes` `#efesantikkenti` `#selçuk` `#izmir` `#kapadokya` `#pamukkale` `#göreme`

**Niş / konu:** `#gezirehberi` `#rota` `#antikkent` `#sabahgezisi` `#gündoğumu` `#kültürgezisi` `#sesli rehber`(boşluklu yazma) `#arkeoloji` `#tarihgezisi`

**Geniş / keşif:** `#seyahat` `#gezgin` `#türkiye` `#kesfet` `#seyahatnotları` `#haftasonu`

**Kural:** 12–15 hashtag yeter. 30'a doldurmak erişim getirmiyor; aynı seti her
gönderide tekrarlamak da getirmiyor. Her gönderide **1 marka + 2–3 yer + 4–5 niş +
4–5 geniş** karışımı kullan. Hashtag'leri caption'da bırakıyorsun (yorumda ayrı
yazmak zorunda değilsin), en alta, iki satır boşlukla.

**Etiketleme:** yerinde çekim yaptığın işletme/kurum varsa `@` ile etiketle;
uydurma hesap etiketleme.

---

## 5. Profil biyografisi (150 karakter sınırı)

**Aday 1 — 100 karakter (önerilen)**
```
Haritaya dokun, dünyaya düş. · Hikâye, rota ve ses aynı ekranda. · Web'de çalışır, cihazına eklenir.
```

**Aday 2 — 109 karakter**
```
Dünyayı merakınla keşfet. · Gezgin izleri, açıklanabilir rota, yerinde sesli anlatım. · Mağaza yok, link var.
```

**Aday 3 — 94 karakter (en sade)**
```
Merak ettiğin her yer, tek dokunuşta. · Rota + sesli rehber + gezgin izleri. · Cihazına ekle 👇
```

**Profil adı (30 karakter):** `Atlasia · keşif haritası` (23) · alternatif: `Atlasia | gezi rotası` (21)

**Bağlantı alanı:** uygulamanın kendi adresi. Birden fazla hedef gerekiyorsa tek
bir "link in bio" sayfası kullan; kısaltıcı servis kullanma (güven + KVKK).

**Öne çıkanlar (highlight) önerisi:** `Başla` · `Efes` · `Rotalar` · `Sesli rehber` · `Saha`

---

## 6. İlk yorum (caption'ı şişirmemek için)

```
Filmdeki sahne Efes, Sabah 06:40 — Celsus Kütüphanesi'ne çıkan mermer cadde. Rotayı Atlasia çizdi; sesli anlatım sen başlatınca çalışıyor.
```

---

## 7. Otomatik yayına hazır hâle getirmek (senin onayınla)

Video, Instagram API'sinin indirebilmesi için **herkese açık HTTPS** adresinde
olmalı (Drive linki çalışmaz — yönlendirme + giriş duvarı). Sıra:

```bash
cp reklam/dokunma/reklam-dokunma.mp4 public/social/bir-yere-dokun.mp4
cp reklam/dokunma/kapak.jpg public/social/bir-yere-dokun-kapak.jpg
```

Sonra `social/queue/YYYY-MM-DD-bir-yere-dokun.json`:

```json
{
  "id": "2026-10-29-bir-yere-dokun",
  "scheduledFor": "2026-10-29T19:00:00+03:00",
  "mediaType": "REELS",
  "mediaUrl": "https://atlasia.pages.dev/social/bir-yere-dokun.mp4",
  "coverUrl": "https://atlasia.pages.dev/social/bir-yere-dokun-kapak.jpg",
  "caption": "<1. bölümdeki metin, satır sonları \\n olarak>",
  "shareToFeed": true
}
```

Dosya `main`'e merge olunca Actions yayınlar. Önce `dry_run` ile dene:
[instagram-otomasyon.md](../../docs/instagram-otomasyon.md).
