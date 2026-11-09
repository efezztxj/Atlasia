# Ses tınısı denetimi — 8 Kasım 2026

`efes.md` §5 borcu ("ses tınısı kulakla doğrulanmadı") kapatılamıyordu: bu
ortamda dinleme yapılamıyor. Bunun yerine **ölçülebilir bir vekil** kullanıldı
ve sonuç bir sorunu ortaya çıkardı.

## Yöntem

Her MP3 mono çözüldü (`miniaudio`), 13 katsayılı MFCC çıkarıldı (512 FFT,
512 hop, 26 mel filtresi 50–8000 Hz, çerçeve RMS eşiği 0.01). Dosya başına
ortalama vektör alındı, dosyalar arası uzaklık Öklid normu. Ek olarak
otokorelasyonla medyan f0, bant enerji oranları ve spektral centroid ölçüldü.

Vekil ölçüt dinleme testi değildir; **ama tek tek dosyalarda değil, grup
hâlinde** ve iki bağımsız eksende (MFCC, bant enerjisi) aynı yöne çıktığında
sistematik bir farkı gösterir.

## Bulgular

**Türkçe (57 dosya) — tutarlı.**

| Grup | n | Ortalama sapma |
| --- | --- | --- |
| Eski kayıtlar (`d3e0d3d`) | 45 | 3.36 |
| 49–57 yeniden kayıt (`cba017b`) | 9 | 2.78 |
| 45–47 (`db6fba7`) | 3 | 2.44 |

Medyan sapma 3.02 (MAD 0.97). Medyan f0 eski 212.4 ± 13.4 Hz, yeni 215.6 ± 11.8
Hz — perde uyumlu. Tek aykırı nokta **#55 Bizans Hamamları** (sapma 6.88,
z ≈ +2.7); diğer yeni dosyalar 2.4–2.8 aralığında. İzlemeye alındı.

**İngilizce (57 dosya) — yeni 12 kayıt ayrı bir ses.**

| Grup | n | Ortalama sapma |
| --- | --- | --- |
| Eski kayıtlar (`d3e0d3d`) | 45 | 4.00 |
| 45–47 (`2e33f5e`) | 5 | 9.25 |
| 49–57 (`db6fba7`) | 7 | 9.45 |

Kullanıcının verdiği referans ses `en-efes-yamac-ev-1.mp3` (Drive dosyasının
SHA-256'sı bu dosyayla birebir):

| Grup | Referansa uzaklık |
| --- | --- |
| Eski 45 dosya | 0.00–8.49 (ort. 4.99) |
| Yeni 12 dosya (#45–47, 49–57) | 10.43–12.85 (ort. 11.48) |

Grup mesafeleri bu ayrımı doğruluyor:

```
TR eski ↔ TR yeni   4.41     (aynı ses)
TR eski ↔ EN eski   5.29     (aynı ses, iki dil)
EN eski ↔ EN yeni  12.18     ← ayrı
TR yeni ↔ EN yeni  13.33     ← ayrı
```

Yeni İngilizce dosyalar 0.5–4 kHz bandında daha fazla, 6–8 kHz bandında daha az
enerji taşıyor (centroid 794 Hz'e karşı 1 289 Hz); üst bant sınırı ikisinde de
≈8.3 kHz. Yani fark **low-pass/kodlama değil, tını**.

## Sonuç

1. Türkçe taraf eski sesle uyumlu; 9 + 3 yeni kayıt sorunsuz.
2. **İngilizce 12 kayıt (45, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57) eski
   anlatıcı sesiyle üretilmemiş.** Kullanıcının "aynı eski ses" talimatı bu
   dosyalarda karşılanmıyor; yeniden üretim gerekiyor.
3. #55 Türkçe kayıt kendi grubundan ayrışıyor; İngilizcesi yeniden üretilirken
   Türkçesi de kontrol edilmeli.

## Yeniden üretim planı

1. İngilizce aday ses `add_voice` ile seçilir; referans olarak
   `en-efes-yamac-ev-1.mp3` kullanılır.
2. 12 durak için metin `public/audio/efes-en.json` içindeki `description`
   alanından alınır (kayıtla birebir eşleşen metin).
3. Her dosya üretildikten sonra bu belgedeki ölçütle referansa uzaklık
   ölçülür; **< 8.5** (eski dosyaların üst sınırı) olana kadar aday değiştirilir.
4. Dosyalar 24 000 Hz, mono, 32 kbps CBR olarak kodlanır; `efes.md` §2/§5 ve bu
   belge güncellenir.

## Uygulama — 8/12 yeniden üretildi (8 Kasım 2026)

Denetimden sonra İngilizce kayıtlar `voice-03` ile yeniden üretildi. Bu ses,
referans dosyaya uzaklığı **6.34** olan ve eski dosyaların aralığına (0–9.31)
düşen sestir; 12 dosyanın üretildiği `voice-04` ise 10.41 ile aralığın dışında.

| Durak | Yeni uzaklık |
| --- | --- |
| 45 Chalcidicum | 4.40 |
| 46 Pollio | 3.31 |
| 47 Domitian Çeşmesi | 5.43 |
| 49 Hydreion | 6.71 |
| 50 Triodos | 3.73 |
| 51 Heksagon | 2.99 |
| 52 Verulanus | 8.26 |
| 53 Antik Liman | 6.03 |

Sekizinin tamamı eski aralıkta. Dosyalar 24 000 Hz, mono, 32 kbps — turdaki
diğer kayıtlarla aynı künye; yeniden kodlama gerekmedi (servis çıktısı zaten bu
biçimde).

**Kalan dördü de tamam (aynı gün, ikinci tur).**

| Durak | İlk ölçüm | Yeniden üretim | Not |
| --- | --- | --- | --- |
| 54 Vaftizhane | — | 3.68 | |
| 55 Bizans Hamamları | — | 6.07 | |
| 56 Vedius | — | 2.57 | |
| 57 Kent Surları | 9.32 | 8.17 | ilk alım sınırın 0.01 üstündeydi, yenilendi |

Böylece **12 İngilizce kaydın tamamı** eski aralıkta: 2.57–8.26, ortalama 5.11.
Eski 45 dosyanın ortalaması 5.09 — grup düzeyinde fark kalmadı.

**O tarihte açık kalan tek izleme (sonradan kapatıldı):** #55 Türkçe kayıt kendi grubundan ayrışıyor (z ≈ +2.7).
Metni sayı ağırlıklı ("yetmiş beş metreye elli metrelik", "bin dokuz yüz
ellili"); fark büyük olasılıkla sözcük dağılımından. O tarihte Türkçe anlatıcı
sesi kayıtlı olmadığı için dokunulmadı; 8 Kasım'ın üçüncü turunda Türkçe ses
kaydedildi ve kayıt yenilendi (**aşağıdaki son bölüm**).

## Türkçe taraf — 33–38, 48, 51 yenilendi (8 Kasım 2026, aynı gün üçüncü tur)

Türkçe anlatıcı artık bu ortamda kayıtlı (`voice-03`, İngilizce'de referansa
6.34 uzaklıkla seçilen ses). Bu yüzden #55 borcu artık "ses yok" değil, yalnız
ölçüm borcu.

**Yenilenen sekiz kayıt ve tını.** Aynı metinle üretilen iki örnek (TR
Prytaneion, EN Prytaneion) eski kayıtlarla karşılaştırıldı: aynı metin eski↔yeni
uzaklığı **TR 3.34 / EN 3.60**, korpusta *farklı* metinlerin tipik uzaklığı
**TR 4.61 (1.64–10.35) / EN 4.39 (2.05–8.17)**. Yani yeni kayıtlar eski
anlatıcıdan ayırt edilemiyor, ama eski dosyanın kopyası da değil.

57 Türkçe dosyanın tümünde MFCC sapması: medyan 2.82, MAD 0.78. Yenilenen
dosyaların z değerleri: 33 −0.4, 34 +0.4, 35 −0.4, 36 −1.0, 37 −0.4, 38 −0.8,
48 +0.1, 51 +0.8 — hepsi ±1.0 içinde. En aykırı dosya hâlâ **#55 (7.15,
z ≈ +3.7)**, sonra 14 (5.79), 17 (5.77), 16 (5.24), 32 (4.96).

**Metin/ses oranı kilidi.** Aynı turda 33–38 ve 48'in sesi ekrandaki kısa
metnin eski uzun hâlini okuduğu ortaya çıktı (7.7–10.8 kr/sn; tur medyanı 14.6).
Sekizi de güncel metinden üretildi. Bir daha kaçmaması için
`src/data/audioDiscovery.test.ts` süreyi MP3 boyutundan (32 kbps CBR → 4 000
bayt/sn) hesaplayıp metin/süre oranını kilitliyor: TR 11.5–17.5, EN 13–18.5.
Metin değişip ses eskide kalırsa test düşer.

**#55 Türkçe — yenilendi (aynı gün, dördüncü tur).** Eski kayıt hem tınıda hem
perdede turun dışındaydı; bu, metnin sayı ağırlıklı olmasıyla tek başına
açıklanamıyordu (f0 226.4 Hz'e karşı tur medyanı 210.5 ± 12.3 Hz). Kayıt
`voice-03` ile yeniden üretildi (43.19 sn, metin/süre oranı 13.99 kr/sn):

| Ölçüt | Eski #55 | Yeni #55 | Tur |
| --- | --- | --- | --- |
| MFCC sapması (medyan vektöre) | 12.03 (z **+2.7**) | **8.69 (z +1.2)** | medyan 6.16, MAD 1.49 |
| Medyan f0 | 226.4 Hz | **210.5 Hz** | 210.5 ± 12.3 Hz |
| 500–2 kHz bant oranı | 0.149 | **0.210** | ortalama 0.251 |
| Spektral centroid | 441 Hz | **481 Hz** | ~534 Hz |

Üç eksende de turun içine girdi; en aykırı dosya artık #52 (z +2.8).
**Türkçe tarafta açık tını borcu kalmadı.**
