# Efes sesli anlatım turu

Tur kimliği: `efes-kamusal-yasam` · `placeId`: `efes` · **57 durak**
Kaynak dosya: `public/assets/sesli-turlar.json` → `tours[0]`
Genel kural: [`README.md`](./README.md)

## 1. Numara düzeni

Numaralar tur içinde **1–57 kesintisiz** gider. İki işaret biçimi vardır:

| Biçim | Anlamı | Sayı | Numaralar |
| --- | --- | --- | --- |
| Yeşil damla pin | Antik kent çekirdeği **içinde** | 48 | 1–15, 19–23, 28, 30–37, 39–49, 51–57 |
| Mor ◆ elmas | Antik kent çekirdeği **dışında** | 9 | 16, 17, 18, 24, 25, 26, 27, 29, 38 |

> 2026-11-07: Chalcidicum (45) ve Domitian Çeşmesi (46) eklendi → **46 → 57**.

### Neden 46'dan sonra 47–55 geliyor?

Efes turu 2026-11-07'ye kadar **46 durak**tı ve numaralar dizi indeksinden
(`index + 1`) üretiliyordu. Mor ◆ duraklar numara tüketmediği için haritada
**16, 17, 18, 24, 25, 26, 27, 29, 38 numaraları boş** görünüyordu — pin yoktu
ama numara atlanmıştı. Bu, ekran görüntüsündeki boşlukların sebebiydi.

Aynı gün Kalkidikum'un 9 durağı ana katalogdan çıkarılıp tura taşındı ve
numaralar veriden okunmaya başlandı. Sonuç:

```
1 … 46   mevcut duraklar (numara artık veriden geliyor)
47 … 55  Kalkidikum eki (Hydreion → Kent Surları)
```

## 2. Kalkidikum eki (49–57)

Bu dokuz durak Efes ören yerinin **içindedir**; ayrı bir tur değil, Efes
turunun devamıdır. Her biri 57 kayıtlık envanterdeki sıra numarasını
`envanterNo` alanında taşır.

| # | Durak | Envanter no | Kaynak |
| --- | --- | --- | --- |
| 49 | Hydreion (Çeşme Yapısı) | 14 | gtp.gr + Wikipedia (Efes) |
| 50 | Triodos Meydanı | 16 | gtp.gr + Wikipedia (Efes) |
| 51 | Heksagon (Altıgen Yapı) | 28 | gtp.gr **(tek kaynak — borç)** |
| 52 | Verulanus Meydanı ve Salonu | 40 | Turkish Archaeological News **(tek kaynak — borç)** |
| 53 | Antik Liman ve Liman Kanalı | 42 | Wikipedia + gtp.gr |
| 54 | Meryem Kilisesi Vaftizhanesi | 44 | Wikipedia + gtp.gr |
| 55 | Bizans Hamamları | 45 | Wikipedia + gtp.gr |
| 56 | Vedius Gymnasionu | 47 | Turkish Archaeological News + Visit İzmir |
| 57 | Helenistik ve Bizans Kent Surları | 48 | ToposText + Visit İzmir |

Kaynak ayrıntısı ve Vikipedi/Wikidata bağı: duraklar tek tek `sources` ve
`coordinateSource` alanlarında taşır.

## 3. Aynı noktayı paylaşan duraklar (`sharedWith`)

Koordinat **uydurulmadı**. İki ayrı yapı gerçekten aynı noktayla temsil
ediliyorsa ilişki `sharedWith` alanına karşılıklı yazıldı ve harita bu pinleri
~14 m'lik bir yay üzerinde kaydırarak ayırıyor. Veri değişmiyor, yalnız pin
üst üste binmiyor.

| Nokta | Duraklar |
| --- | --- |
| Bazilika Stoası / Devlet Agorası kuzey kenarı | 3 (basilica-stoa), 51 (heksagon) |
| Meryem Kilisesi kompleksi | 14 (meryem-kilisesi), 54 (meryem-kilisesi-vaftizhanesi) |
| Stadyum alanı | 15 (efes-stadyumu), 56 (vedius-gymnasionu), 57 (kent-surlari) |
| Liman Caddesi | 22 (liman-caddesi), 53 (antik-liman-kanali) |
| Liman Hamamları kompleksi | 37 (liman-hamamlari), 55 (bizans-hamamlari) |
| Pollio / Hydreion | 46 (pollio-domitian-cesmesi), 49 (hydreion-kalkidikum) |

## 4. Açık borçlar

1. **İngilizce ses kaydı yok (49–57).** 2026-11-07'de İngilizce **metinler**
   yazıldı: `public/audio/efes-en.json` 46 → **57 kayıt**, turun tamamı
   çevrili. Ses kaydı gerçek anlatım gerektirdiği için üretilmedi; o dokuz
   durakta `audio` alanı yoktur ve arayüz "English audio is not available yet.
   You can read the text." der. Kilit: `src/data/audioDiscovery.test.ts` →
   `KALKIDIKUM_ENGLISH_AUDIO_PENDING` (liste sessizce büyüyemez).
2. **Koordinatlar temsilî.** 56 ve 57 hâlâ stadyum noktasını paylaşıyor; sahada
   hassas ölçüm gerekiyor. 55 ve 52 de aynı hamam kompleksini paylaşıyor.
3. **Tek kaynaklı iki durak:** 51 (Heksagon) ve 52 (Verulanus). İkinci bağımsız
   kaynak bekliyor.
4. **İki görselin lisansı doğrulanmadı:** `heroon` (#20) ve `magnesia-kapisi`
   (#27), kaynak Turkish Archaeological News. Yayında gösteriliyor; lisans
   teyidi veya değişim gerekiyor.
5. **Türkçe ses kaydı olmayan üç durak.** Chalcidicum (45) ve Domitian
   Çeşmesi (47) tura eklendi; içerik ve koordinat doğrulandı ama ses yok.
   Pollio Anıtı'nın (46) metni bölündüğü için eski kayıt artık yanlış metni
   okuyordu; ses alanı kaldırıldı. Üçünde de arayüz "Ses kaydı yok. Metni
   okuyabilirsin." der. Kilit: `SES_BEKLEYEN`.
