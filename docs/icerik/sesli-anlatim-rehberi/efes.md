# Efes sesli anlatım turu

Tur kimliği: `efes-kamusal-yasam` · `placeId`: `efes` · **57 durak**
Kaynak dosya: `public/assets/sesli-turlar.json` → `tours[0]`
Genel kural: [`README.md`](./README.md)

## 1. Numara düzeni

Numaralar tur içinde **1–57 kesintisiz** gider. İki işaret biçimi vardır:

| Biçim | Anlamı | Sayı | Numaralar |
| --- | --- | --- | --- |
| Yeşil damla pin | Antik kent çekirdeği **içinde** | 47 | 1–15, 19–23, 28, 30–37, 39–49, 51–56 |
| Mor ◆ elmas | Antik kent çekirdeği **dışında** | 10 | 16, 17, 18, 24, 25, 26, 27, 29, 38, 57 |

> 2026-11-07: Chalcidicum (45) ve Domitian Çeşmesi (46) eklendi → **46 → 57**.

### Numaralar neden veriden okunuyor?

Efes turu 2026-11-07'ye kadar **46 durak**tı ve numaralar dizi indeksinden
(`index + 1`) üretiliyordu. Mor ◆ duraklar numara tüketmediği için haritada
**16, 17, 18, 24, 25, 26, 27, 29, 38 numaraları boş** görünüyordu — pin yoktu
ama numara atlanmıştı. Bu, ekran görüntüsündeki boşlukların sebebiydi.

Aynı gün Kalkidikum'un 9 durağı ana katalogdan çıkarılıp tura taşındı ve
numaralar veriden okunmaya başlandı. Sonuç:

```
1 … 46   mevcut duraklar (numara artık veriden geliyor)
49 … 57  Kalkidikum eki (Hydreion → Kent Surları)
         (45 Chalcidicum ve 47 Domitian Çeşmesi 2026-11-07'de araya girdi)
```

## 2. Kalkidikum eki (49–57)

Bu dokuz durak ayrı bir tur değil, Efes turunun devamıdır. Sekizi ören yeri
çekirdeğinin içinde, 57 (korunmuş sur kesiti) sınırın dışında işaretlenir.
Her biri 57 kayıtlık envanterdeki sıra numarasını `envanterNo` alanında taşır.

**8 Kasım 2026:** Dokuz durağın Türkçe anlatımı yeniden kaydedildi
(`/audio/efes-*.mp3`). Künye turdaki diğer kayıtlarla aynı — 24 000 Hz, mono,
32 kbps CBR — süreler 38–50 sn. Okunan metin:
`kayit-paketi/turkce-dikte-49-57.json`.

| # | Durak | Envanter no | Konum kaynağı | Fotoğraf |
| --- | --- | --- | --- | --- |
| 49 | Hydreion (Anıt Çeşme) | 14 | OSM yolu 1411590456 | Dosseman, Hydreion + Memmius, 1992 · CC BY-SA 4.0 |
| 50 | Triodos Meydanı | 16 | TAN Triodos | Sailko, Hadrian Kapısı + Kuretler Caddesi · CC BY-SA 3.0 |
| 51 | Heksagon | 28 | TAN Oktagon (sıralama) — yaklaşık | Holländer, Kuretler Caddesi · Copyrighted free use |
| 52 | Verulanus Salonu | 40 | TAN Verulanus — temsilî | Dosseman, Meryem Kilisesi'ne bakış · CC BY-SA 4.0 |
| 53 | Antik Liman | 42 | Ephesus.net planı — havza ortası | Dosseman, Bülbül Dağı'ndan ovaya bakış · CC BY-SA 4.0 |
| 54 | Meryem Kilisesi Vaftizhanesi | 44 | Commons dosya GPS'i | Dosseman, vaftiz havuzu · CC BY-SA 4.0 |
| 55 | Bizans Hamamları | 45 | Vici 24223 | Jarvis, Bizans Sarayı · CC BY-SA 2.0 |
| 56 | Vedius Gymnasionu | 47 | OSM yolu 183304727 | Raddato, Kaistros heykeli · CC BY-SA 2.0 |
| 57 | Helenistik ve Bizans Kent Surları | 48 | Commons dosya GPS'i — kesit | Sepp, sur kesiti · CC BY-SA 3.0 |

Her durak iki–üç bağımsız kaynak taşır (`sources`). Ayrıntı ve konum
tartışmaları: [dokuz durak düzeltmesi](../gorevler/efes-dokuz-durak-kimlik-duzeltmesi-2026-11-08.md).

**27 Magnesia Kapısı konumu (8 Kasım 2026 doğrulaması):** duraktaki nokta
`37.9345538, 27.3504954`, Pleiades 43374417 "Gate of Magnesia" temsilî
noktasının birebir aynısı; Pleiades bunu OSM konumu olarak ±20 m hassasiyetle
kaydediyor. TAN'ın "Magnesian Gate Area" sayfasının GPS'i
(`37.934795, 27.346285`) kapının değil, alanın ilk anıtı olan Aziz Luka
yapısının noktası — 26. durak zaten orada duruyor. İki kaynak çelişmiyor.


## 3. Yakın durakların haritada ayrılması (`sharedWith` → mesafe eşiği)

8 Kasım 2026'da altı durakta duran `sharedWith` kayıtları **silindi**. Alanın
tanımı "aynı fiziksel nokta"ydı; oysa koordinatlar aylar önce ayrılmıştı:

| Kayıt | Ölçülen mesafe |
| --- | --- |
| 3 Bazilika Stoası ↔ 51 Heksagon | 324 m |
| 14 Meryem Kilisesi ↔ 54 Vaftizhane | 65 m |
| 15 Stadyum ↔ 56 Vedius / ↔ 57 Surlar | 157 m / 1 774 m |
| 22 Liman Caddesi ↔ 53 Antik Liman | 701 m |
| 37 Liman Hamamları ↔ 55 Bizans Hamamları | 345 m |
| 46 Pollio ↔ 49 Hydreion | 66 m |

Kayıtlar karşılıklı da değildi (3 → 51 yazıyordu, 51 → 3 yazmıyordu). Düzeltme
veride: alan yalnız gerçekten aynı nokta temsil edilirse kullanılır ve
`src/data/audioDiscovery.test.ts` artık **karşılıklılık + ≤30 m** koşulunu arar.
Şu an hiçbir durakta yazılı değil.

Bunun yerine harita, birbirine **20 m'den yakın** durakların pinlerini 16 m
yarıçaplı bir yay üzerinde kaydırır (`src/components/audioStopMarkers.ts`).
Koordinat verisi değişmez; yalnız pin görsel olarak ayrılır. Bu, 4–8 m aralıkla
duran **45 Chalcidicum · 46 Pollio · 47 Domitian Çeşmesi** üçlüsünün (23 Domitian
Meydanı ile birlikte) tek leke gibi görünmesini bitirdi. Eşik 20 m'nin altına
inmez: daha büyük kaydırma pini komşu yapıya taşır.

## 4. Açık borçlar

1. ~~İngilizce ses kaydı eksiği.~~ **Kapatıldı (8 Kasım 2026).**
   Turun 57 durağının tamamı hem Türkçe hem İngilizce sesli
   (`/audio/efes-*.mp3`, `/audio/en-efes-*.mp3`). Son beş dosya: Chalcidicum,
   Pollio, Domitian Çeşmesi, Vedius, Kent Surları.
   `src/data/audioDiscovery.test.ts` içindeki iki borç listesi
   (`SES_BEKLEYEN`, `KALKIDIKUM_ENGLISH_AUDIO_PENDING`) **boş** ve kilit
   olarak duruyor: yeni durak sesi olmadan eklenemez.
2. **Temsilî noktalar — gizlenmiyor, ölçüm borcu sürüyor (8 Kasım 2026).**
   51 (sıralamadan türetildi), 52 (avlu sınırları toprak altında), 53 (havza
   ortası, erişim yok) ve 57 (korunmuş bir kesit) veride
   `coordinateAccuracy: "approximate"` taşır. Durak kartında "≈ Yaklaşık konum ·
   yapı geniş bir alana yayılıyor; pin merkezini gösterir" yazar; pinin ekran
   okuyucu adı "(yaklaşık konum)" ile biter. İkisi de testte kilitli.
   Koordinat **değiştirilmedi**: kaynaklar arasındaki 25–90 m farkı saha ölçümü
   olmadan kapatmak uydurma olurdu. Kalan iş: bu dört noktayı yerinde ölçmek.
3. ~~Tek kaynaklı iki durak~~ **Kapatıldı:** 51 ve 52 artık üç kaynak taşıyor.
4. **İki görselin lisansı — karar verildi, beyan açık (8 Kasım 2026).**
   `heroon` (#20) ve `magnesia-kapisi` (#27) Turkish Archaeological News
   kaynaklı; sitede açık lisans beyanı yok. Karar: **kullanımda kalırlar**.
   Gerekçe: (a) kullanıcı "lisans şart değil" dedi, (b) kimlik doğrulandı —
   heroon fotoğrafındaki haç kabartmalı çevre panoları TAN metnindeki geç antik
   "Byzantine Fountain" dönüşümüyle birebir örtüşüyor; magnesia-kapisi
   fotoğrafı yol kenarında büyük bloklu bir kule ayağı gösteriyor ve kapının
   iki kuleli Hellenistik düzeniyle uyumlu — ancak **kapının kendisi olduğu
   bağımsız bir kaynakla doğrulanamadı**, bu yüzden risk kaydı açık kalıyor, (c) lisansı doğrulanmış Commons ikamesi **yok**:
   `Category:Heroon of Ephesus` bulunmuyor, heroon çevresindeki 120 m'lik
   geosearch yalnız Hadrian Kapısı/Teras Evler fotoğrafı veriyor, "Magnesian
   Gate" aramaları yalnız "road from the Magnesian Gate" ve hamam kalıntıları
   döndürüyor. Bu yüzden yanlış yapıyı gösteren lisanslı bir fotoğrafla
   değiştirmek doğruluk kaybı olurdu. Arayüzde görselin altında "Kullanım izni
   doğrulanmadı / Reuse permission not verified" ve kaynak bağlantısı görünür.
   Kalan iş: lisansı doğrulanmış bir Efes fotoğrafı bulunursa değiştirmek.
5. ~~Türkçe ses kaydı olmayan üç durak.~~ **Kapatıldı (8 Kasım 2026).**
   Chalcidicum (45), Pollio (46) ve Domitian Çeşmesi (47) kaydedildi
   (`/audio/efes-chalcidicum.mp3`, `efes-pollio-domitian-cesmesi.mp3`,
   `efes-domitian-cesmesi.mp3`). Böylece turun **57 durağının tamamı Türkçe
   sesli**; `SES_BEKLEYEN` listesi boş ve testte kilitli.
6. **Ses tınısı — denetlendi, İngilizce 12 kayıt uyuşmuyor (8 Kasım 2026).**
   Dinleme bu ortamda yapılamadığı için MFCC + bant enerjisi + f0 ile ölçüldü
   ([denetim belgesi](./ses-tinisi-denetimi-2026-11-08.md)).
   **Türkçe tutarlı:** 57 dosyanın grup ortalamaları 2.4–3.4 arası, perde
   212–216 Hz; tek aykırı #55 (z ≈ +2.7).
   **İngilizce tutarsız:** eski 45 dosya kullanıcının verdiği referans sese
   0–8.5 uzaklıkta (ort. 5.0), yeni 12 dosya 10.4–12.9 (ort. 11.5); grup
   mesafesi EN eski ↔ EN yeni 12.18'e karşı TR eski ↔ TR yeni 4.41. Fark
   kodlama kaynaklı değil (üst bant sınırı ikisinde de ≈8.3 kHz).
   **Kapatıldı (8 Kasım 2026, aynı gün):** 12 İngilizce kayıt eski anlatıcı
   sesiyle yeniden üretildi. Referansa uzaklık artık **2.57–8.26** (ort. 5.11);
   eski 45 dosyanın aralığı 0.00–9.31 (ort. 5.09). Künye değişmedi
   (24 000 Hz, mono, 32 kbps). Türkçe taraf zaten uyumluydu; tek izleme
   kalemi #55 Türkçe (z ≈ +2.7, metni sayı ağırlıklı).
7. ~~45/46/47 pinleri üst üste biniyor.~~ **Kapatıldı (8 Kasım 2026).**
   Eski ofset yalnız birebir aynı koordinatı kaydırıyordu; üç durak 4–8 m
   aralıkla durduğu için eşik tutmuyordu. Eşik 20 m'ye çıkarıldı ve kümeler
   16 m yarıçaplı yaya yerleştirildi (bkz. §3). 45–47 için test var:
   `src/components/audioStopMarkers.test.ts`.

8. **45–47 Türkçe dikte dosyası yok (açık).** `kayit-paketi/turkce-dikte-49-57.json`
   yalnız 49–57'yi kapsıyor. 45 Chalcidicum, 46 Pollio ve 47 Domitian Çeşmesi
   kayıtları üretildi (`/audio/efes-chalcidicum.mp3`,
   `efes-pollio-domitian-cesmesi.mp3`, `efes-domitian-cesmesi.mp3`) ama okunan
   Türkçe metin repoda yazılı değil; `kayit-paketi/metinler/45-*.txt` … `47-*.txt`
   dosyaları **İngilizce**. Kayıtların sözlerini sonradan yazmak dinleyip çözümleme
   gerektirdiği için yapılmadı — uydurma metin yazmak sesle uyuşmama riski taşır.
