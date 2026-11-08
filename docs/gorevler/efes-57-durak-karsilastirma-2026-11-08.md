# Efes sesli turu: yayındaki 57 durak ↔ bu daldaki 57 durak

8 Kasım 2026 · Karşılaştırılan iki dosya aynı: `public/assets/sesli-turlar.json`

| | Sol sütun (yayın) | Sağ sütun (bu dal) |
| --- | --- | --- |
| Nereden | `origin/main` · #197 + #198 birleşmiş hâli | `arena/bb09b21b-atlasia` · PR #195 |
| Tur | `efes-kamusal-yasam` · **57 durak** | `efes-kamusal-yasam` · **57 durak** |
| Durak kimlikleri | 57 | 57, **birebir aynı küme** |
| Numaralar | 1–57 | 1–57 |
| İngilizce dosya | 57 kayıt | 57 kayıt, aynı 57 anahtar |

İki sürüm arasında **48 durak birebir aynı** (JSON nesnesi hash'i eşit: başlık, metin, koordinat, ses, görsel, kaynaklar). Fark **yalnız 9 durakta**: 49–57.

## 1. Dokuz durak: sayısal karşılaştırma

| # | Durak | Konum farkı | Yayındaki pin hangi durağın üzerinde | Yayındaki fotoğraf | Bu daldaki fotoğraf | Metin (karakter) | Kaynak |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 49 | Hydreion | 66 m | **46** Pollio Anıtı (0 m) | Pollio + Domitian anıtı | Hydreion + Memmius, 1992 | 406 → 684 | 2 → 3 |
| 50 | Triodos Meydanı | 0 m | — | Mazeus-Mithridates Kapısı | Hadrian Kapısı + Kuretler Caddesi | 483 → 592 | 2 → 3 |
| 51 | Heksagon | **324 m** | **3** Bazilika Stoası (0 m) | Bazilika Stoası | Kuretler Caddesi (anıt cadde altında) | 386 → 612 | 1 → 3 |
| 52 | Verulanus Salonu | 105 m | — (Liman Hamamları'na 6 m) | Liman Hamamları | Meryem Kilisesi'ne bakış | 414 → 585 | 1 → 3 |
| 53 | Antik Liman | **700 m** | **22** Liman Caddesi (0 m) | Arkadiane | Bülbül Dağı'ndan liman ovası | 319 → 531 | 2 → 3 |
| 54 | Vaftizhane | 65 m | **14** Meryem Kilisesi (0 m) | **Meryem Ana Evi** | Vaftiz havuzu (Dosseman) | 352 → 578 | 2 → 3 |
| 55 | Bizans Hamamları | 345 m | **37** Liman Hamamları (0 m) | Devlet Agorası Hamamları | Bizans Sarayı (Jarvis) | 341 → 604 | 2 → 3 |
| 56 | Vedius Gymnasionu | 157 m | **15** Stadyum (0 m) | Tiyatro Gymnasionu | Kaistros heykeli (İzmir Müzesi) | 394 → 612 | 2 → 3 |
| 57 | Kent Surları | **1774 m** | **15** Stadyum (0 m) | Stadyum | Yamaçtaki sur kesiti | 347 → 540 | 2 → 3 |

"Konum farkı" iki sürümün pinleri arasındaki mesafedir. "Yayındaki pin hangi durağın üzerinde" sütunu, yayındaki koordinatın **başka bir durağın koordinatıyla birebir aynı** olduğunu gösterir.

Yani yayındaki 9 durağın **7'si** başka bir durağın noktasına oturmuş, 1'i (52) Liman Hamamları noktasına 6 m mesafede, yalnızca 1'i (50) kendi başına doğru.

## 2. Aynı fotoğrafı paylaşan duraklar

Yayında 9 yeni durağın **tamamı**, zaten turda olan bir durağın fotoğrafını kullanıyor:

| Fotoğraf | Yayında paylaşan duraklar |
| --- | --- |
| `Ephesus_basilica2.jpg` | 3 Bazilika Stoası · 45 Chalcidicum · 51 Heksagon |
| `monumento_di_pollio_e_domizianeo` | 46 Pollio · 47 Domitian Çeşmesi · 49 Hydreion |
| `Mazeus-Mithridates_Gate` | 11 Mazaeus Kapısı · 50 Triodos |
| `Ancient_stadium_in_Ephesus` | 15 Stadyum · 57 Kent Surları |
| `Arcadiane_(Harbour)_Street` | 22 Liman Caddesi · 53 Antik Liman |
| `Theatergymnasion` | 33 Tiyatro Gymnasionu · 56 Vedius |
| `State_Agora_Baths` | 34 Yukarı Hamam · 55 Bizans Hamamları |
| `Harbor_Baths_(Ephesus)_6` | 37 Liman Hamamları · 52 Verulanus |
| `MariaHouse_6629` | 38 Meryem Ana Evi · 54 Vaftizhane |

Bu dalda iki ortak fotoğraf kalıyor; ikisi de **fiziksel olarak aynı yapı**:

- 3 Bazilika Stoası · 45 Chalcidicum — Chalcidicum, Bazilika'nın batı ucunu taşıyan alt yapıdır; ayrı bir fotoğrafı yok.
- 46 Pollio · 47 Domitian Çeşmesi — bitişik iki yapı, tek karede birlikte görünüyorlar.

## 3. Aynı koordinatı paylaşan duraklar

| | Yayın | Bu dal |
| --- | --- | --- |
| `sharedWith` yazılı durak | 13 | **0** |
| Aynı koordinatlı grup | 6 | **0** |
| En yakın iki durak | **0 m** (3↔51, 14↔54, 15↔56, 15↔57, 22↔53, 37↔55, 46↔49) | 4 m (23 Domitian Meydanı ↔ 45 Chalcidicum) |

Yayındaki 57 durakta üç pin (56 Vedius, 57 Surlar, 15 Stadyum) tam olarak aynı noktadaydı; harita bunları ~14 m'lik yay üzerinde kaydırarak ayırıyordu. Bu dalda hiçbir durak aynı noktayı paylaşmıyor.

Geriye kalan en yakın üçlü **45 Chalcidicum · 46 Pollio · 47 Domitian Çeşmesi** (4–8 m). Bu, #198'den devralınan temsilî bir konumlandırmadır: gerçekten yan yana yapılar ama sahada ölçülmedi; haritada üst üste binebilirler. Ölçüm yapılmadan değiştirilmedi.

## 4. Metinde düzeltilen iddialar

| Durak | Yayındaki ifade | Bu daldaki ifade | Dayanak |
| --- | --- | --- | --- |
| 51 Heksagon | "Kalkidikum'un bir parçası, Bazilika Stoası'nın batı ucunda" | Oktagon'un doğusunda, Kuretler Caddesi basamaklarının altında; konum sıralamadan türetilmiş yaklaşık değer | TAN Hellenistik Heroon ve Oktagon maddelerindeki batı→doğu sıralaması |
| 55 Bizans Hamamları | "Konstantin Hamamları olarak da bilinir" | "Konstantin Hamamları" adı **Liman Hamamları'na** aittir; karışma eski yayınlarda yaygın | TAN Liman Hamamları maddesi, Ephesus.net |
| 56 Vedius | "Afrodit ve İmparator Antoninus Pius'a adanan" | Adak tartışmalı: kaynaklar Afrodit ile Artemis + Antoninus Pius arasında ayrılıyor | TAN (Afrodit), My Favourite Planet (Artemis) |
| 57 Kent Surları | "yaklaşık 8 km" | Lysimakhos döneminde **9 km'yi aşan** hat; 3 km'den fazlası ayakta | 1911 Britannica (Vikikaynak), TAN |
| 49 Hydreion | "1. yüzyılda inşa… 3. yüzyıl başında yeniden düzenlendi" (tartışma yok) | 1. yüzyıl + 3. yüzyıl başı yenileme ile "MS 200 dolayı" görüşü yan yana, tartışma açık yazılı | Princeton Encyclopedia of Classical Sites (Perseus), Nomadic Niko |
| 53 Antik Liman | Liman Caddesi'ne kurulmuş pin | Pin havza ortasında; erişimin olmadığı açıkça yazılı | TAN liman maddesi (37.944080, 27.332599) |

## 5. İşaret biçimi

| | Yayın | Bu dal |
| --- | --- | --- |
| Yeşil damla (ören yeri içi) | 48 | 47 |
| Mor ◆ (çekirdek dışı) | 9 | **10** |

Değişen tek durak **57 Kent Surları**: Bülbül Dağı yamacındaki korunmuş kesit biletli ziyaret alanının dışında.

## 6. İki sürümde de açık olan borçlar

1. ~~49–57 Türkçe ses kayıtları yer tutucu.~~ **Bu dalda kapatıldı** (8 Kasım 2026): dokuz durak `efes-*.mp3` adlarıyla yeniden kaydedildi. Yayındaki sürüm hâlâ düzeltme öncesi metinleri okuyan `kalkidikum-*.mp3` dosyalarını kullanıyor. Ölçüm düzeltmesi: bu dosyaların süresi 6,6–9,7 sn değil **26–50 sn**. Eski kayıtlar da kendi (daha kısa) metinlerini baştan sona okuyordu; yanlış süre, "112 kbps" varsayımıyla yapılan bayt hesabından geliyordu. Gerçek künye: 24 000 Hz, mono, **32 kbps** CBR.
2. **İngilizce ses kaydı yok** (metin 57/57 tam). `KALKIDIKUM_ENGLISH_AUDIO_PENDING` kilidi sessiz büyümeyi engelliyor.
3. **Temsilî noktalar:** 51 (sıralamadan türetildi), 52 (avlu sınırları toprak altında), 53 (havza ortası, erişim yok), 57 (bir kesit). Sahada ölçüm yapılmadı.
4. Yayında ayrıca bilinen ve `efes.md` §4'te yazılı olan borç: "56 ve 57 hâlâ stadyum noktasını paylaşıyor; 55 ve 52 aynı hamam kompleksini paylaşıyor." Bu dal o dört maddeyi kapatıyor.

## 7. Sonuç

İki sürüm **durak sayısı ve numaralandırmada aynı**, içerikte dokuz durakta ayrılıyor. Bu dal, yayındaki 9 durağın 7'sindeki "başka durağın noktası + başka yapının fotoğrafı" durumunu düzeltiyor, metinleri kaynaklarıyla yeniden yazıyor ve mor ◆ sayısını 10'a çıkarıyor. Yayındaki sürüm #198 ile birleştiği için düzeltme yeni bir PR olarak değil, **#195 içinde** geliyor.

Karar verirken bakılacak tek ölçüt yok; ama sayısal olarak:

- konumu kendi yapısına ait durak: yayın **1/9** → bu dal **9/9** (4'ü temsilî)
- kendi yapısını gösteren fotoğraf: yayın **1/9** (50 Triodos bile kapı fotoğrafı) → bu dal **7/9** (Heksagon ve Vedius'ta yapının fotoğrafı yok, alt metinde yazılı)
- tek kaynaklı durak: yayın **2** → bu dal **0**
