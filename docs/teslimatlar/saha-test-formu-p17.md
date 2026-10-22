# P17 Saha Test Formu — yürüyüş kaydı ve durak tespiti

Bu form, `TRACK_DETECTION` eşiklerinin **gerçek cihazda** doğrulanması içindir.
Sentetik fixture'lar (`src/utils/fixtures/trackFixtures.ts`) saha testinin
yerine geçmez; bu form ikisini birbirine bağlar: her saha senaryosu bir
fixture kimliğine karşılık gelir ve ölçülen değerler
`src/utils/trackFieldCheck.ts` (`checkFieldMeasurements`) ile denetlenebilir.

## Ön koşullar

- Bulut (e-posta) hesabıyla giriş (iz kaydı cihaz hesabına yazılamaz).
- Konum izni açık, "kesin konum" etkin. Kayıt sırasında **ekran açık**
  kalmalı (web'de arka plan konumu yok — ROADMAP §5.1).
- Pil tasarrufu kapalı (bazı cihazlar GPS örneklemesini seyreltir).
- Bilinen uzunlukta parkur: ölçülü yürüyüş yolu, stadyum pisti ya da harita
  üzerinde önceden ölçülmüş güzergâh. Referans mesafe forma **önceden** yazılır.

## Kayıt bilgileri

| Alan | Değer |
|---|---|
| Tarih / saat | |
| Cihaz (marka-model, OS sürümü) | |
| Tarayıcı (ad + sürüm) | |
| Ortam | açık alan / şehir içi / orman |
| Atlasia sürümü (commit) | |
| Testi yapan | |

## Hangi değer nasıl ölçülür?

| Değer | Nasıl ölçülür | Nereden okunur |
|---|---|---|
| Referans mesafe (km) | Parkurun bilinen/ölçülmüş uzunluğu; uygulamadan bağımsız | Parkur bilgisi veya harita ölçümü |
| Ölçülen mesafe (km) | Uygulamanın sadeleştirilmiş çizgiden ölçtüğü | Taslak özeti: "X,XX km" |
| Beklenen durak | Protokolde planlanan ≥3 dk duruş sayısı | Bu form (aşağıdaki tablo) |
| Bulunan durak | Uygulamanın tespit ettiği | Taslak özeti: "N durak" |
| En büyük sapma (m) | Sadeleştirmenin ham ölçümlerden en çok ne kadar saptığı | Taslak özeti: "en büyük sapma X m" |
| Ortalama doğruluk (m) | GPS ölçümlerinin ortalama doğruluğu | Taslak özeti: "ortalama doğruluk ±X m" |
| Tutulan/ham nokta | Sadeleştirme oranı | Taslak özeti: "k/n nokta" |

Kabul eşikleri (`trackFieldCheck` ile aynı): mesafe hatası **±%15**, en büyük
sapma **≤ 10 m**, durak sayısı **birebir**.

## Protokol (senaryo senaryo)

Her senaryoda: kaydı başlat → protokolü uygula → **Bitir** → taslak özetini
forma yaz → istersen "Hesabıma kaydet" (test için zorunlu değil; taslak
kaydedilmeden kapatılırsa silinir).

### S1 · Düz yürüyüş — fixture: `duz-yuruyus` (beklenen durak: 0)
1 km kesintisiz, sabit tempoda yürüyüş; hiç durma. Durak bulunmamalı.

### S2 · İki gerçek mola — fixture: `molali` (beklenen durak: 2)
~400 m yürü, **4 dk** yerinde dur (kronometreyle), ~400 m yürü, **4 dk** dur,
~300 m yürü. Duruşlar 3 dk eşiğinin üstünde olmalı; iki durak bulunmalı,
bacak sayısı 3 olmalı.

### S3 · Sinyal kaybı — fixture: `sinyal-kaybi` (beklenen durak: 0)
Yürüyüşün ortasında tünel/alt geçit gibi çekmeyen bir noktadan geç ya da
10 dk uçak modunda bekleyip yürümeye devam et. Boşluk durak süresine
**eklenmemeli**.

### S4 · Şehir içi sürüklenme — fixture: `kentsel-suruklenme` (beklenen durak: 0)
Yüksek binalar arasında 10 dk yavaş yürüyüş. Doğruluk ±50 m'nin üstüne
çıktığında sahte durak açılmamalı. Ortalama doğruluğu forma not et.

### S5 · Mola + sıçrama — fixture: `gps-sicramasi` (beklenen durak: 1)
6 dk mola ver. (Sıçrama sahada üretilemez; ölçüm sıçraması doğal oluşursa
not et.) Mola tek durak olarak bulunmalı, ikiye bölünmemeli.

### S6 · Duruşta sinyal kaybı — fixture: `sinyal-kaybi-durus` (beklenen durak: 0)
Bir noktaya var, 12 dk uçak modunda bekle (ölçümsüz), modu kapatıp bitir.
Kanıtsız aralık durak sayılmamalı (muhafazakâr davranış beklenen sonuçtur).

### S7 · Kısa duruş — fixture: `kisa-durus` (beklenen durak: 0)
Yürüyüş ortasında yalnız **2 dk** dur. Eşik altı olduğu için durak
bulunmamalı.

## Sonuç tablosu

| Senaryo | Fixture | Referans km | Ölçülen km | Hata % | Beklenen durak | Bulunan durak | Sapma (m) | Ort. doğruluk (m) | Nokta k/n | Not |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | duz-yuruyus | | | | 0 | | | | | |
| S2 | molali | | | | 2 | | | | | |
| S3 | sinyal-kaybi | | | | 0 | | | | | |
| S4 | kentsel-suruklenme | | | | 0 | | | | | |
| S5 | gps-sicramasi | | | | 1 | | | | | |
| S6 | sinyal-kaybi-durus | | | | 0 | | | | | |
| S7 | kisa-durus | | | | 0 | | | | | |

## Değerlendirme

Doldurulan satırlar `FieldMeasurement` listesi olarak
`checkFieldMeasurements`a verilir; `fieldCheckSummary` çıktısı buraya
yapıştırılır:

```
(özet buraya)
```

Eşik dışına çıkan senaryoda: cihaz/ortam notuyla birlikte sorunu aynen yaz;
eşik değerlerini sessizce gevşetme — önce `TRACK_DETECTION` gerekçeleri
(`src/utils/track.ts`) ile karşılaştır, gerekiyorsa ayrı bir değişiklik
önerisi aç.
