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

> **8 Kasım 2026 — iki kaynak birleşti.** Aşağıdaki tablo `main`'in
> kaynaklarını taşır; ses sütunu bu dalın katkısıdır. Tur 57/57 **İngilizce**,
> 56/57 **Türkçe** sesli. Eksik olan tek kayıt Heksagon: metni ve konumu
> 8 Kasım'da yeniden yazıldığı için eski Türkçe kayıt yanlış metni okuyordu.

| # | Durak | Envanter no | Konum kaynağı | Fotoğraf | Ses |
| --- | --- | --- | --- | --- | --- |
| 49 | Hydreion (Çeşme Yapısı) | 14 | OSM yolu 1411590456 | Dosseman, Hydreion + Memmius · CC BY-SA 4.0 | TR + EN |
| 50 | Triodos Meydanı | 16 | TAN Triodos | Sailko, Hadrian Kapısı + Kuretler Caddesi · CC BY-SA 3.0 | TR + EN |
| 51 | Heksagon | 28 | Thür (ÖAW) + Berns | Elelicht, Kuretler Caddesi · CC BY-SA 3.0 | **TR yok**, EN var |
| 52 | Verulanus Salonu | 40 | TAN — temsilî | Dosseman, Meryem Kilisesi'ne bakış · CC BY-SA 4.0 | TR + EN |
| 53 | Antik Liman | 42 | Ephesus.net planı — havza ortası | Dosseman, Bülbül Dağı'ndan ovaya bakış · CC BY-SA 4.0 | TR + EN |
| 54 | Meryem Kilisesi Vaftizhanesi | 44 | Commons dosya GPS'i | Dosseman, vaftiz havuzu · CC BY-SA 4.0 | TR + EN |
| 55 | Bizans Hamamları | 45 | Vici 24223 | Jarvis, Bizans Sarayı · CC BY-SA 2.0 | TR + EN |
| 56 | Vedius Gymnasionu | 47 | OSM yolu 183304727 | Raddato, Kaistros heykeli · CC BY-SA 2.0 | TR + EN |
| 57 | Helenistik ve Bizans Kent Surları | 48 | Commons dosya GPS'i — kesit | Sepp, sur kesiti · CC BY-SA 3.0 | TR + EN |


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
`src/data/audioDiscovery.test.ts` **karşılıklılık + ≤30 m** koşulunu arar.
Birleşme sonrası hiçbir durakta yazılı değil.

Bunun yerine harita, birbirine **20 m'den yakın** durakların pinlerini 16 m
yarıçaplı bir yay üzerinde kaydırır (`src/components/audioStopMarkers.ts`).
Koordinat verisi değişmez; yalnız pin görsel olarak ayrılır. Bu, 4–8 m aralıkla
duran **45 Chalcidicum · 46 Pollio · 47 Domitian Çeşmesi** üçlüsünün (23 Domitian
Meydanı ile birlikte) tek leke gibi görünmesini bitirdi. Eşik 20 m'nin altına
inmez: daha büyük kaydırma pini komşu yapıya taşır.

## 4. Açık borçlar

1. ~~İngilizce ses kaydı eksiği.~~ **Kapatıldı (8 Kasım 2026).**
   57 durağın tamamı İngilizce sesli. 12 kayıt ilk üretimde eski anlatıcıdan
   farklı bir sesle çıkmıştı; MFCC + bant enerjisiyle ölçülüp yeniden üretildi
   ([tını denetimi](./ses-tinisi-denetimi-2026-11-08.md)).
2. **Heksagon (51) Türkçe kaydı yok — açık.** Metin ve konum 8 Kasım'da
   yeniden yazıldı (Kalkidikum parçası değil; Kuretler Caddesi'nin güney
   kenarında, Oktogon ile Alytarkhos Stoası arasında altıgen monopteros).
   Eski kayıt yanlış metni okuyordu, bağlantı kaldırıldı. İngilizce kayıt yeni
   metinden üretildi (referansa uzaklık 6.18). Kilit: `SES_BEKLEYEN`.
   Yeni Türkçe kayıt için Türkçe anlatıcı sesi gerekiyor.
3. **Temsilî noktalar — gizlenmiyor, ölçüm borcu sürüyor (8 Kasım 2026).**
   52 (avlu sınırları toprak altında), 53 (havza ortası, erişim yok) ve 57
   (korunmuş bir kesit) veride `coordinateAccuracy: "approximate"` taşır.
   Durak kartında "≈ Yaklaşık konum · yapı geniş bir alana yayılıyor; pin
   merkezini gösterir" yazar; pinin ekran okuyucu adı "(yaklaşık konum)" ile
   biter. İkisi de testte kilitli. Koordinat **uydurulmadı**: kaynaklar
   arasındaki 25–90 m farkı saha ölçümü olmadan kapatmak yanlış olurdu.
   **52 için ek kanıt:** Wikidata Q104641912 ("Halls of Verulanus") aynı yapıya
   37.944090, 27.339919 veriyor — mevcut pinden 100 m kuzeydoğu; avlu
   200 × 240 m olduğu için iki nokta da yapının içinde kalır. Fark durak
   kartında (`coordinateNote`) yazılı. Kalan iş: üç noktayı yerinde ölçmek.
4. **Görseller — lisans kapısı geçildi, konu eşleşmesi iki durakta zayıf.**
   `main`'in 8 Kasım süpürmesi 57 görselin hepsini özgür lisanslı hâle getirdi
   ve "kullanım izni doğrulanmadı" durumunu testle yayından men etti; yerel
   `heroon`, `magnesia-kapisi`, `kuretler-caddesi`, `oktagon` dosyaları silindi.
   Buna karşılık 20 Heroon ve 27 Magnesia Kapısı'nda seçilen kareler yapının
   kendisini değil çevresini gösteriyor (Kuretler Caddesi'ne bakış / kapıdan
   çıkan yol). Kareler lisanslı olduğu için korundu; alt metinler artık neyi
   gösterdiklerini açıkça yazıyor. Ek olarak 49, 50, 53, 54, 55, 56, 57'de bu
   dalın daha isabetli kareleri geri getirildi (Hydreion, Triodos, liman ovası,
   vaftiz havuzu, Bizans Sarayı, Kaistros heykeli, sur kesiti) — hepsi zaten
   Commons/CC lisanslı. Kalan iş: 20 ve 27 için yapının kendisini gösteren,
   lisansı doğrulanmış bir kare bulmak.
5. ~~Türkçe ses kaydı olmayan üç durak.~~ **Kapatıldı (8 Kasım 2026).**
   Chalcidicum (45) ve Domitian Çeşmesi (47) kayıtları bağlandı;
   `main`'de Pollio (46) da bağlanmıştı.
6. **Ses tınısı — ölçüldü (8 Kasım 2026).** Türkçe 57 dosyanın grup
   ortalamaları 2.4–3.4, perde 212–216 Hz. İngilizce 12 kayıt eski anlatıcıdan
   ayrışıyordu (referansa uzaklık 10.4–12.9'a karşı eski dosyalarda 0.0–9.3);
   12'si yeniden üretildi, yeni aralık 2.6–8.3. Tek izleme kalemi **#55
   Türkçe** (z ≈ +2.7, metni sayı ağırlıklı).
7. ~~45/46/47 pinleri üst üste biniyor.~~ **Kapatıldı (8 Kasım 2026).**
   Eşik 20 m'ye çıkarıldı, kümeler 16 m yarıçaplı yaya yerleştirildi (§3).
8. **45–47 Türkçe dikte dosyası yok (açık).** `kayit-paketi/turkce-dikte-49-57.json`
   yalnız 49–57'yi kapsıyor. 45 Chalcidicum, 46 Pollio ve 47 Domitian Çeşmesi
   kayıtları var ama okunan Türkçe metin repoda yazılı değil; `metinler/45-*.txt`
   … `47-*.txt` dosyaları **İngilizce**. Dinleyip çözümleme gerektirdiği için
   uydurulmadı.
9. **Birleşme notu (8 Kasım 2026).** `main` bu dal paralel çalışırken #196–#204
   ile ilerledi; ikisi de aynı dokuz durağı tura taşıdı. Birleşmede `main`'in
   araştırılmış metinleri (Heksagon) ve görselleri temel alındı, bu dalın
   ayırdığı koordinatlar (49, 52–57) ve sesleri korundu. `main`'de 49, 53, 54,
   55, 56, 57 aynı noktaya geri düşmüştü (Hydreion Pollio'da, vaftizhane Meryem
   Kilisesi'nde, Bizans Hamamları Liman Hamamları'nda, Vedius ve surlar stadyumda,
   antik liman Liman Caddesi'nde); bu dal o çakışmayı açıyor.
