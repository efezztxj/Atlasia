# Kayıt talimatı — okunacak dosya

## Ne kaydedilecek

Efes sesli turunun **49–57 numaralı** durakları için İngilizce anlatım.
**9 ayrı dosya.** Toplam ≈ **963 kelime**, ≈ **6,4 dakika** konuşma.

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
2. `dikte-metni.md`'yi aç. Sırayla 9 bölüm oku.
3. Her bölümü **ayrı dosya** olarak kaydet. Dosya adları `kayit-listesi.csv`'de
   hazır; uydurma.
4. Her dosyanın başında ve sonunda **0,5 sn sessizlik**, bölümler arası 2 sn.
5. Kayıtları şu klasöre koy: **`public/audio/`**

## Teknik

| | |
|---|---|
| Biçim | MP3 |
| Örnekleme | 44.1 kHz |
| Kanal | **Mono** |
| Bit hızı | 96–128 kbps (sabit) |
| Ses düzeyi | -16 LUFS (hedef), tepe ≤ -1 dB |
| Gürültü | Arka plan sessiz; klima/fan kapalı |
| Süre | Dosya başına 25–37 sn |

## Dosya adları (aynen bunlar)

```
public/audio/en-kalkidikum-hydreion.mp3
public/audio/en-kalkidikum-triodos-meydani.mp3
public/audio/en-kalkidikum-heksagon.mp3
public/audio/en-kalkidikum-verulanus-meydani-salonu.mp3
public/audio/en-kalkidikum-antik-liman-kanali.mp3
public/audio/en-kalkidikum-meryem-kilisesi-vaftizhanesi.mp3
public/audio/en-kalkidikum-bizans-hamamlari.mp3
public/audio/en-kalkidikum-vedius-gymnasionu.mp3
public/audio/en-kalkidikum-kent-surlari.mp3
```

## Teslimden sonra

Dosyalar geldiğinde `public/audio/efes-en.json` içindeki dokuz kayda `audio`
alanı eklenir (benim işim), test kilidi küçülür, yayına çıkar.

**Kısmi teslim olur.** Üç dosya gelse üçü bağlanır; kalan altısı Türkçe
metinle çalışmaya devam eder. Hepsini beklemek gerekmez.
