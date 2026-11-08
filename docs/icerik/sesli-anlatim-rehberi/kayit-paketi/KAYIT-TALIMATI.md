# Kayıt talimatı — okunacak dosya

> **İki dil var.** İngilizce: `dikte-metni.md` + `kayit-listesi.csv` (11 dosya).
> Türkçe: `dikte-metni-tr.md` + `kayit-listesi-tr.csv` (10 dosya).
> İkisi bağımsız ilerler; biri bitince o dil yayına girer. **İkisi de tamam**
> (8 Kasım 2026); bu paket artık yeniden kayıt ve arşiv içindir.

## Ne kaydedilecek

Efes sesli turunun **45 ve 47–57 numaralı** durakları için İngilizce anlatım.
**11 ayrı dosya.** Toplam ≈ **1 035 kelime**, ≈ **7 dakika** konuşma.

> **Durum (8 Kasım 2026):** Bu 11 kaydın tamamı üretildi ve turda yayında.
> Paket artık **yeniden kayıt / arşiv** içindir; yeni bir durak eklenirse aynı
> adımlar izlenir.

Metinler rehberde **zaten yayında**; eksik olan yalnızca ses. Yani kayıt
bittiğinde uygulamada İngilizce dinlenebilir hâle geliyor.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `dikte-metni.md` | **Seslendirenin okuyacağı tek parça.** Sadece metin, sırayla. |
| `telaffuz-sozlugu.md` | Zor adların okunuşu + ton/hız kuralları |
| `kayit-listesi.csv` | Excel/Sheets: dosya adı, süre, kelime sayısı, metin |

## Adım adım

1. `telaffuz-sozlugu.md`'yi seslendirenle birlikte bir kez oku.
2. `dikte-metni.md`'yi aç. Sırayla **11** bölüm oku.
3. Her bölümü **ayrı dosya** olarak kaydet. Dosya adları `kayit-listesi.csv`'de
   hazır; uydurma.
4. Her dosyanın başında ve sonunda **0,5 sn sessizlik**, bölümler arası 2 sn.
5. Kayıtları şu klasöre koy: **`public/audio/`**

## Teknik

| | |
|---|---|
| Biçim | MP3 |
| Örnekleme | **24 000 Hz** (turdaki 114 dosyayla aynı) |
| Kanal | **Mono** |
| Bit hızı | **32 kbps CBR** (sabit) |
| Ses düzeyi | -16 LUFS (hedef), tepe ≤ -1 dB |
| Gürültü | Arka plan sessiz; klima/fan kapalı |
| Süre | Dosya başına 24–51 sn |

Bu değerler turdaki 114 dosyanın (57 TR + 57 EN) tamamı `miniaudio` ile
çözülerek doğrulandı: 24 000 Hz, mono, 32 kbps CBR (saniyede 4 000 bayt).
Yalnız ilk çerçeve (Xing bilgi çerçevesi) 64 kbps başlığı taşır; dosya
bit hızını oradan okumak yanıltır, süre = boyut / 4 000. Farklı bir ayarla
kaydedersen duraklar arasında duyulabilir tını farkı olur.

## Dosya adları (aynen bunlar)

```
public/audio/en-efes-chalcidicum.mp3
public/audio/en-efes-domitian-cesmesi.mp3
public/audio/en-efes-hydreion.mp3
public/audio/en-efes-triodos-meydani.mp3
public/audio/en-efes-heksagon.mp3
public/audio/en-efes-verulanus-salonu.mp3
public/audio/en-efes-antik-liman.mp3
public/audio/en-efes-meryem-vaftizhanesi.mp3
public/audio/en-efes-bizans-hamamlari.mp3
public/audio/en-efes-vedius-gymnasionu.mp3
public/audio/en-efes-kent-surlari.mp3
```

Adı uydurma — `kayit-listesi.csv`'deki `hedef_yol` sütunu neyse o; test
ikisinin birebir aynı olduğunu kilitler.

## Teslimden sonra

Dosyalar geldiğinde `public/audio/efes-en.json` içindeki on bir kayda `audio`
alanı eklenir ve yayına çıkar. **Bu adım 8 Kasım 2026'da tamamlandı.**

**Kısmi teslim olur.** Üç dosya gelse üçü bağlanır; kalanlar Türkçe metinle
çalışmaya devam eder. Hepsini beklemek gerekmez.


---

# Türkçe kayıt (10 dosya)

Metni 8 Kasım 2026'da yenilenen on durağın Türkçe kaydı (33–38, 45, 47, 48, 51).
Sesleri güncel metinden üretildi; bu bölüm artık **yeniden kayıt / arşiv**
içindir. Teknik künye İngilizceyle **aynı**: 24 kHz · mono · 32 kbps CBR.

| Dosya | Neden |
|---|---|
| `dikte-metni-tr.md` | Seslendirenin okuyacağı Türkçe metin, 10 bölüm |
| `kayit-listesi-tr.csv` | Dosya adı, süre, kelime sayısı, metin |
| `turkce-dikte-33-38-48-51.json` | Aynı metinlerin makine okunur kopyası |

## Dosya adları (aynen bunlar)

```
public/audio/efes-tiyatro-gymnasionu.mp3
public/audio/efes-yukari-hamam.mp3
public/audio/efes-serapeion.mp3
public/audio/efes-yamac-ev-2.mp3
public/audio/efes-liman-hamamlari.mp3
public/audio/efes-meryem-ana-evi.mp3
public/audio/efes-chalcidicum.mp3
public/audio/efes-domitian-cesmesi.mp3
public/audio/efes-laecanius-cesmesi.mp3
public/audio/efes-heksagon.mp3
```

Adı uydurma — `kayit-listesi-tr.csv`'deki `hedef_yol` sütunu neyse o; test
ikisinin birebir aynı olduğunu kilitler.

## Türkçe telaffuz notları

| Yazım | Okunuş |
|---|---|
| Chalcidicum | "kalkidikum" (c'ler k) |
| Pollio | "pollio" |
| Domitian | "domisyan" |
| Heksagon | "heksagon" |
| Kuretler | "kuretler" |
| Alytarkhos | "alitarkhos" |
| Oktogon | "oktogon" |
| Embolos | "embolos" |
| MS 92/93 | "milattan sonra doksan iki, doksan üç" |
| 8 × 6,5 m | "sekiz çarpı altı buçuk metre" |
