# Efes sesli anlatım turu

Tur kimliği: `efes-kamusal-yasam` · `placeId`: `efes` · **57 durak**
Kaynak dosya: `public/assets/sesli-turlar.json` → `tours[0]`
Genel kural: [`README.md`](./README.md)

## 1. Numara düzeni

Numaralar tur içinde **1–57 kesintisiz** gider. İki işaret biçimi vardır:

| Biçim | Anlamı | Sayı | Numaralar |
| --- | --- | --- | --- |
| Yeşil damla pin | Antik kent çekirdeği **içinde** | 47 | 1–15, 19–23, 28, 30–37, 39–56 |
| Mor ◆ elmas | Antik kent çekirdeği **dışında** | 10 | 16, 17, 18, 24, 25, 26, 27, 29, 38, 57 |

> **Denetim (9 Kasım 2026).** Bu iki satır veriyle birebir: 47 + 10 = 57. Önceki
> sürümde yeşil listede **50 (Triodos Meydanı)** atlanmıştı ve "Chalcidicum (45) ve
> Domitian Çeşmesi (46)" yazıyordu; Domitian Çeşmesi **47**'dir (46 Pollio
> Anıtı'dır). İkisi de düzeltildi. Sayımı `audioDiscovery.test.ts` kilitler.

> 2026-11-07: Chalcidicum (45) ve Domitian Çeşmesi (47) eklendi; dokuz Kalkidikum
> durağıyla birlikte tur **46 → 57** oldu. (46 Pollio Anıtı'dır; üçü aynı köşede durur.)

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

## 2. Ses künyesi ve metin–ses kilidi

Turdaki **114 kaydın** (57 TR + 57 EN) tamamı aynı künyede: **24 000 Hz, mono,
MP3, 32 kbps CBR**. Bu künye, `src/data/audioDiscovery.test.ts` içindeki süre
hesabının da temeli: CBR'de saniyede tam **4 000 bayt** düşer, yani süre =
dosya boyutu / 4 000. Doğrulama (`miniaudio` çözümü): heksagon 48.3 s ↔
boyut/4 000 = 48.4 s.

Tur geneli (8 Kasım 2026): TR medyan **14,55** kr/sn (12,09–15,92), EN medyan
**15,67** kr/sn (14,06–17,11). Test bu bantları kilitler (TR 11,5–17,5 ·
EN 13–18,5); metin düzenlenip ses eskide kalırsa test düşer.

## 3. Kalkidikum eki (49–57)

Bu dokuz durak ayrı bir tur değil, Efes turunun devamıdır. Sekizi ören yeri
çekirdeğinin içinde, 57 (korunmuş sur kesiti) sınırın dışında işaretlenir.
Her biri 57 kayıtlık envanterdeki sıra numarasını `envanterNo` alanında taşır.

> **8 Kasım 2026 — iki kaynak birleşti.** Aşağıdaki tablo `main`'in
> kaynaklarını taşır; ses sütunu bu dalın katkısıdır. Tur **57/57 Türkçe ve
> 57/57 İngilizce** sesli. Heksagon'un metni ve konumu yeniden yazıldığı için
> eski Türkçe kayıt yanlış metni okuyordu; yeni metinden yeniden üretildi.

| # | Durak | Envanter no | Konum kaynağı | Fotoğraf | Ses |
| --- | --- | --- | --- | --- | --- |
| 49 | Hydreion (Çeşme Yapısı) | 14 | OSM yolu 1411590456 | Dosseman, Hydreion + Memmius · CC BY-SA 4.0 | TR + EN |
| 50 | Triodos Meydanı | 16 | TAN Triodos | Sailko, Hadrian Kapısı + Kuretler Caddesi · CC BY-SA 3.0 | TR + EN |
| 51 | Heksagon | 28 | Thür (ÖAW) + Berns | Elelicht, Kuretler Caddesi · CC BY-SA 3.0 | TR + EN |
| 52 | Verulanus Salonu | 40 | TAN — temsilî | Dosseman, Meryem Kilisesi'ne bakış · CC BY-SA 4.0 | TR + EN |
| 53 | Antik Liman | 42 | Ephesus.net planı — havza ortası | Dosseman, Bülbül Dağı'ndan ovaya bakış · CC BY-SA 4.0 | TR + EN |
| 54 | Meryem Kilisesi Vaftizhanesi | 44 | Commons dosya GPS'i | Dosseman, vaftiz havuzu · CC BY-SA 4.0 | TR + EN |
| 55 | Bizans Hamamları | 45 | Vici 24223 | Jarvis, Bizans Sarayı · CC BY-SA 2.0 | TR + EN |
| 56 | Vedius Gymnasionu | 47 | OSM yolu 183304727 | Raddato, Kaistros heykeli · CC BY-SA 2.0 | TR + EN |
| 57 | Helenistik ve Bizans Kent Surları | 48 | Commons dosya GPS'i — kesit | Sepp, sur kesiti · CC BY-SA 3.0 | TR + EN |


Her durak iki–üç bağımsız kaynak taşır (`sources`). Ayrıntı ve konum
tartışmaları: [dokuz durak düzeltmesi](../gorevler/efes-dokuz-durak-kimlik-duzeltmesi-2026-11-08.md).

**27 Magnesia Kapısı konumu (8 Kasım 2026 doğrulaması):** duraktaki nokta
`37.9345538, 27.3504954`, Pleiades 43374417 "Gate of Magnesia" temsilî
noktasının birebir aynısı; Pleiades bunu OSM konumu olarak ±20 m hassasiyetle
kaydediyor. TAN'ın "Magnesian Gate Area" sayfasının GPS'i
(`37.934795, 27.346285`) kapının değil, alanın ilk anıtı olan Aziz Luka
yapısının noktası — 26. durak zaten orada duruyor. İki kaynak çelişmiyor.


## 4. Yakın durakların haritada ayrılması (`sharedWith` → mesafe eşiği)

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

## 5. Açık borçlar

1. ~~İngilizce ses kaydı eksiği.~~ **Kapatıldı (8 Kasım 2026).**
   57 durağın tamamı İngilizce sesli. 12 kayıt ilk üretimde eski anlatıcıdan
   farklı bir sesle çıkmıştı; MFCC + bant enerjisiyle ölçülüp yeniden üretildi
   ([tını denetimi](./ses-tinisi-denetimi-2026-11-08.md)).
2. ~~Heksagon (51) Türkçe kaydı yok.~~ **Kapatıldı (8 Kasım 2026).**
   Metin ve konum 8 Kasım'da yeniden yazıldı (Kalkidikum parçası değil;
   Kuretler Caddesi'nin güney kenarında, Oktogon ile Alytarkhos Stoası arasında
   altıgen monopteros). Eski kayıt yanlış metni okuyordu, bağlantı kaldırıldı ve
   dosya silindi; yeni metinden hem Türkçe (`/audio/efes-heksagon.mp3`) hem
   İngilizce kayıt üretildi. Tını: TR z ≈ +0.8, EN referansa 6.18 — ikisi de
   turun dağılımı içinde.
2b. ~~33–38 ve 48'in sesi ekrandaki metinle uyuşmuyordu.~~ **Kapatıldı
   (8 Kasım 2026).** Bu yedi durağın metni bir noktada kısaltılmış, ses
   kayıtları ise eski uzun metni okumaya devam etmişti. Ölçüt: metin/süre
   oranı. Tur medyanı 14,6 kr/sn iken bu duraklar 7,7–10,8 aralığındaydı
   (ses, ekrandaki metinden %25–47 daha uzun konuşuyordu). Yedisi de güncel
   metinden yeniden üretildi; yeni oranlar 13,2–15,2 kr/sn, yani tur dağılımının
   (12,1–15,9) tam içinde. Heksagon da 13,5. Güncel tur medyanı **14,55**
   (TR) ve **15,67** (EN). Bu sınıf hatayı bir daha kaçırmamak için
   `src/data/audioDiscovery.test.ts` içine **metin/süre oranı kilidi** eklendi:
   metin düzenlenip ses eskide kalırsa test düşer.
   Okunan metinler: `kayit-paketi/turkce-dikte-33-38-48-51.json`.
   **Ek olarak (8 Kasım 2026):** `kayit-paketi/turkce-dikte-49-57.json` de
   denetlendi. 49, 50, 52–57 için fark **üslup** (sayılar rakamla: "üçüncü
   yüzyıl" → "MS 3. yüzyıl"; "işaret" → "pin"); rakamla ya da yazıyla yazılan
   sayı seslendirmede aynı okunduğu için bu durakların kaydı doğru. **51
   Heksagon** ise dosyada hâlâ ESKİ yanlış metni taşıyordu (kayıt yeni metinden
   üretilmişti); dosya güncellendi ve artık 51'in metni turdaki metinle birebir
   aynı — test kilitler.
3. **Temsilî noktalar — gizlenmiyor, ölçüm borcu sürüyor (8 Kasım 2026).**
   52 (avlu sınırları toprak altında), 53 (havza ortası, erişim yok) ve 57
   (korunmuş bir kesit) veride `coordinateAccuracy: "approximate"` taşır.
   Durak kartındaki rozet **durağın kendi gerekçesini** yazar (9 Kasım'da
   düzeltildi): 52 "avlu 200 × 240 m; pin avlunun bir köşesini gösterir",
   53 "havza ortası; yürüyüş güzergâhı değil", 57 "9 km'lik hattın korunmuş
   tek kesiti". Önceki sürümde üçünde de aynı cümle vardı ("yapı geniş bir
   alana yayılıyor…") ve 53 için yanlıştı: orada yapı yok, alüvyonla dolmuş
   ve erişime kapalı bir havza var. Kısa gerekçe `coordinateShort`, uzun
   gerekçe `coordinateNote` alanında; ikisi de TR + EN yazılı. Pinin ekran
   okuyucu adı "(yaklaşık konum)" ile biter. Hepsi testte kilitli.
   Koordinat **uydurulmadı**: kaynaklar
   arasındaki 25–90 m farkı saha ölçümü olmadan kapatmak yanlış olurdu.
   **52 için ek kanıt:** Wikidata Q104641912 ("Halls of Verulanus") aynı yapıya
   37.944090, 27.339919 veriyor — mevcut pinden 100 m kuzeydoğu; avlu
   200 × 240 m olduğu için iki nokta da yapının içinde kalır. Fark durak
   kartında (`coordinateNote`) yazılı. **Kalan iş: üç noktayı yerinde ölçmek**
   (saha gerektirir; bu ortamda yapılamaz). Noktalar 2–3 bağımsız kaynakla
   çapraz kontrol edildi, sorun kaynak değil ölçüm.
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
   Commons/CC lisanslı.
   **Kalan iş (20 Heroon, 27 Magnesia Kapısı): yapının kendisini gösteren
   lisanslı kare.** 8 Kasım 2026'da Commons'ta arandı ve **bulunamadı**;
   aramalar tekrar edilmesin diye buraya yazılıyor:
   - `list=search` "Heroon Ephesus" → 15 sonuç, hepsi kitap/PDF; tek "Heroon"
     dosyaları **Trysa Heroonu** (Likya, Viyana müzesi frizleri) — Efes değil.
   - `list=search` "Ephesos Heroon" → 22 sonuç, yine Trysa frizleri.
   - `incategory:Ephesus heroon` → 0 sonuç.
   - `list=geosearch` 20'nin noktası (37.938754, 27.341317, r=120 m) → 25 dosya,
     hepsi Hadrian Kapısı / Yamaç Evler / Kuretler Caddesi manzarası; Heroon'u
     ayrı gösteren kare yok.
   - "Magnesian Gate" / "Magnesia Kapısı" / "Magnesia-Tor" → yalnız *kapıdan
     çıkan yol* kareleri (bizim kullandığımız dahil) ve tarihî kitap taramaları.
   - `list=geosearch` 27'nin noktası (37.934554, 27.350495, r=150 m) → 2 dosya,
     ikisi de "MariaRoad" yolu.
   Yani sorun lisans değil, **özgür lisanslı karenin var olmaması**. Fotoğraf
   yalnız yerinde çekilebilir; o yüzden bu kalem saha işi olarak duruyor. Mevcut
   iki kare CC BY-SA 4.0 (Dosseman) ve alt metinleri neyi gösterdiklerini açıkça
   yazıyor ("kapının kendisi bu karede görünmüyor"), yani yanlış bilgi vermiyorlar.
5. ~~Türkçe ses kaydı olmayan üç durak.~~ **Kapatıldı (8 Kasım 2026).**
   Chalcidicum (45) ve Domitian Çeşmesi (47) kayıtları bağlandı;
   `main`'de Pollio (46) da bağlanmıştı.
6. **Ses tınısı — ölçüldü (8 Kasım 2026).** Türkçe 57 dosyanın grup
   ortalamaları 2.4–3.4, perde 212–216 Hz. İngilizce 12 kayıt eski anlatıcıdan
   ayrışıyordu (referansa uzaklık 10.4–12.9'a karşı eski dosyalarda 0.0–9.3);
   12'si yeniden üretildi, yeni aralık 2.6–8.3. **#55 Türkçe** de yeniden
   üretildi (aşağıdaki 10. madde).
7. ~~45/46/47 pinleri üst üste biniyor.~~ **Kapatıldı (8 Kasım 2026).**
   Eşik 20 m'ye çıkarıldı, kümeler 16 m yarıçaplı yaya yerleştirildi (§3).
8. ~~45–47 Türkçe dikte dosyası yok.~~ **Kapatıldı (8 Kasım 2026).**
   `kayit-paketi/turkce-dikte-33-38-48-51.json` 33–38, 45, 47, 48 ve 51'in
   okunan Türkçe metnini birebir taşıyor. Bu metinler dinleyip çözümlenerek
   değil, **sesin üretildiği kaynaktan** alındı; bu yüzden uydurma riski yok.
9. **Birleşme notu (8 Kasım 2026).** `main` bu dal paralel çalışırken #196–#204
   ile ilerledi; ikisi de aynı dokuz durağı tura taşıdı. Birleşmede `main`'in
   araştırılmış metinleri (Heksagon) ve görselleri temel alındı, bu dalın
   ayırdığı koordinatlar (49, 52–57) ve sesleri korundu. `main`'de 49, 53, 54,
   55, 56, 57 aynı noktaya geri düşmüştü (Hydreion Pollio'da, vaftizhane Meryem
   Kilisesi'nde, Bizans Hamamları Liman Hamamları'nda, Vedius ve surlar stadyumda,
   antik liman Liman Caddesi'nde); bu dal o çakışmayı açıyor.

10. ~~#55 Türkçe kaydın tınısı ayrışıyordu.~~ **Kapatıldı (8 Kasım 2026).**
    Eski kayıt, turun geri kalanından hem tınıda hem perdede ayrışıyordu:
    MFCC sapması 12.03 (z ≈ **+2.7**, tur medyanı 6.16) ve medyan f0 **226.4 Hz**
    (tur medyanı **210.5 ± 12.3**). Metni sayı ağırlıklı olduğu için farkın bir
    bölümü sözcük dağılımından geliyordu, ama perde farkı bunu tek başına
    açıklamıyordu. Aynı sesle (`voice-03`) yeniden üretildi, 43.19 sn,
    metin/süre oranı 13.99 kr/sn:
    - MFCC sapması **8.69** (z **+1.2**) — artık olağan aralıkta; en aykırı
      dosya #52 (z +2.8).
    - medyan f0 **210.5 Hz** — tur medyanıyla birebir aynı.
    - 500–2 kHz bant oranı 0.210 (tur ortalaması 0.251, eski kayıtta 0.149).
    Yeniden üretim, ses kimliği korunduğu için turun geri kalanını etkilemedi;
    yalnız bu tek dosya değişti.
