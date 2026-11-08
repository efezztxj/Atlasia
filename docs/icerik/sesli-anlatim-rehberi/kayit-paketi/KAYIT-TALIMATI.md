# Kayıt talimatı — okunacak dosya

> **İki dil var.** İngilizce: `dikte-metni.md` + `kayit-listesi.csv` (11 dosya).
> Türkçe: `dikte-metni-tr.md` + `kayit-listesi-tr.csv` (3 dosya).
> İkisi bağımsız ilerler; biri bitince o dil yayına girer.

## Ne kaydedilecek

Efes sesli turunun **45 ve 47–57 numaralı** durakları için İngilizce anlatım.
**11 ayrı dosya.** Toplam ≈ **899 kelime**, ≈ **6 dakika** konuşma.

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
| Örnekleme | **24 kHz** |
| Kanal | **Mono** |
| Bit hızı | **64 kbps (sabit)** |
| Ses düzeyi | -16 LUFS (hedef), tepe ≤ -1 dB |
| Gürültü | Arka plan sessiz; klima/fan kapalı |
| Süre | Dosya başına 24–51 sn |

Bu değerler turdaki 101 dosyanın **tamamından** çerçeve başlığı okunarak
ölçüldü. Farklı bir ayarla kaydedersen duraklar arasında duyulabilir tını
farkı olur.

## Dosya adları (aynen bunlar)

```
public/audio/en-kalkidikum-chalcidicum.mp3
public/audio/en-kalkidikum-domitian-cesmesi.mp3
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

Dosyalar geldiğinde `public/audio/efes-en.json` içindeki on bir kayda `audio`
alanı eklenir, test kilidi küçülür, yayına çıkar.

**Kısmi teslim olur.** Üç dosya gelse üçü bağlanır; kalanlar Türkçe metinle
çalışmaya devam eder. Hepsini beklemek gerekmez.


---

# Türkçe kayıt (3 dosya)

Aynı rehberin **Türkçe** sesi eksik olan üç durağı. Teknik künye İngilizceyle
**aynı**: 24 kHz · mono · 64 kbps CBR.

| Dosya | Neden |
|---|---|
| `dikte-metni-tr.md` | Seslendirenin okuyacağı Türkçe metin, 3 bölüm |
| `kayit-listesi-tr.csv` | Dosya adı, süre, kelime sayısı, metin |

## Dosya adları (aynen bunlar)

```
public/audio/chalcidicum.mp3
public/audio/domitian-cesmesi.mp3
public/audio/heksagon.mp3
```

Dikkat: bu üçü `kalkidikum-` öneki **taşımaz**. Turda 49–57 arasındaki
Kalkidikum durakları `kalkidikum-<id>.mp3` adını kullanıyor; 45, 47 ve 51 ise
yalın `<id>.mp3`. Adı uydurma — `kayit-listesi-tr.csv`'deki `hedef_yol`
sütunu neyse o.

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
