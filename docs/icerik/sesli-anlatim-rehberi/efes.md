# Efes sesli anlatım turu

Tur kimliği: `efes-kamusal-yasam` · `placeId`: `efes` · **57 durak**
Kaynak dosya: `public/assets/sesli-turlar.json` → `tours[0]`
Genel kural: [`README.md`](./README.md)

## 1. Numara düzeni

Numaralar tur içinde **1–57 kesintisiz** gider. İki işaret biçimi vardır:

| Biçim | Anlamı | Sayı | Numaralar |
| --- | --- | --- | --- |
| Yeşil damla pin | Antik kent çekirdeği **içinde** | 48 | 1–15, 19–23, 28, 30–37, 39–57 |
| Mor ◆ elmas | Antik kent çekirdeği **dışında** | 9 | 16, 17, 18, 24, 25, 26, 27, 29, 38 |

### Neden 46'dan sonra 47–57 geliyor?

Efes turu 2026-11-07'ye kadar **46 durak**tı ve numaralar dizi indeksinden
(`index + 1`) üretiliyordu. Mor ◆ duraklar numara tüketmediği için haritada
**16, 17, 18, 24, 25, 26, 27, 29, 38 numaraları boş** görünüyordu — pin yoktu
ama numara atlanmıştı. Bu, ekran görüntüsündeki boşlukların sebebiydi.

Aynı gün Kalkidikum'un 9 durağı ana katalogdan çıkarılıp tura taşındı ve
numaralar veriden okunmaya başlandı. 2026-11-08'de 57 kayıtlık envanterin
son iki kaydı da ayrı durak olarak eklendi. Sonuç:

```
1 … 46   mevcut duraklar (numara artık veriden geliyor)
47 … 55  Kalkidikum eki (Hydreion → Kent Surları)
56 … 57  Chalcidicum ve Domitian Çeşmesi (2026-11-08)
```

## 2. Kalkidikum eki (47–57)

Bu on bir durak Efes ören yerinin **içindedir**; ayrı bir tur değil, Efes
turunun devamıdır. Her biri 57 kayıtlık envanterdeki sıra numarasını
`envanterNo` alanında taşır.

| # | Durak | Envanter no | Kaynak |
| --- | --- | --- | --- |
| 47 | Hydreion (Çeşme Yapısı) | 14 | gtp.gr + Wikipedia (Efes) |
| 48 | Triodos Meydanı | 16 | gtp.gr + Wikipedia (Efes) |
| 49 | Heksagon (Altıgen Yapı) | 28 | gtp.gr **(tek kaynak — borç)** |
| 50 | Verulanus Meydanı ve Salonu | 40 | Turkish Archaeological News **(tek kaynak — borç)** |
| 51 | Antik Liman ve Liman Kanalı | 42 | Wikipedia + gtp.gr |
| 52 | Meryem Kilisesi Vaftizhanesi | 44 | Wikipedia + gtp.gr |
| 53 | Bizans Hamamları | 45 | Wikipedia + gtp.gr |
| 54 | Vedius Gymnasionu | 47 | Turkish Archaeological News + Visit İzmir |
| 55 | Helenistik ve Bizans Kent Surları | 48 | ToposText + Visit İzmir |
| 56 | Chalcidicum (Kalkidikum) | 12 | gtp.gr + Wikipedia (ES · Basílica-estoa) |
| 57 | Domitian Çeşmesi | 11 | Alan tabelası (HMDB) + Turkish Archaeological News |

**56 ve 57 — 2026-11-08 eklemesi, dürüst kayıt:** iki durak için de bağımsız
coğrafi referans bulunamadı (bkz. `docs/gorevler/efes-tekil-dogrulama-calismasi-2026-11-04.md`),
bu yüzden koordinat **uydurulmadı**: iki durak da komşu durağın temsili
noktasını `sharedWith` ile paylaşır (56 ↔ Bazilika Stoası noktası, 57 ↔
Pollio Anıtı noktası). Metinlerde doğrulanmamış olanlar açıkça yazılıdır:
Chalcidicum'un doğu/batı ucu eşleştirmesi ve işlevi hâlâ araştırmada;
Domitian Çeşmesi ile Pollio Anıtı ayrı yapılardır ancak tek temsili noktayla
gösterilir (isim/kimlik uyuşmazlığı tekil doğrulama çalışmasında kayıtlıdır).
İkisi de görsellerini komşu durakla aynı lisanslı Wikimedia Commons görselinden
paylaşır (repo deseni); yeni kayıtlar "Kullanım izni doğrulanmadı" görsel
içermez.

Kaynak ayrıntısı ve Vikipedi/Wikidata bağı: duraklar tek tek `sources` ve
`coordinateSource` alanlarında taşır.

## 3. Aynı noktayı paylaşan duraklar (`sharedWith`)

Koordinat **uydurulmadı**. İki ayrı yapı gerçekten aynı noktayla temsil
ediliyorsa ilişki `sharedWith` alanına karşılıklı yazıldı ve harita bu pinleri
~14 m'lik bir yay üzerinde kaydırarak ayırıyor. Veri değişmiyor, yalnız pin
üst üste binmiyor.

| Nokta | Duraklar |
| --- | --- |
| Bazilika Stoası / Devlet Agorası kuzey kenarı | 3 (basilica-stoa), 49 (heksagon), 56 (chalcidicum) |
| Meryem Kilisesi kompleksi | 14 (meryem-kilisesi), 52 (vaftizhane) |
| Stadyum alanı | 15 (efes-stadyumu), 54 (vedius), 55 (kent-surlari) |
| Liman Caddesi | 22 (liman-caddesi), 51 (antik-liman-kanali) |
| Liman Hamamları kompleksi | 37 (liman-hamamlari), 53 (bizans-hamamlari) |
| Domitian Çeşmesi çevresi | 45 (pollio-domitian-cesmesi), 47 (hydreion), 57 (domitian-cesmesi) |

## 4. Açık borçlar

2026-11-08'de kapatıldı — İngilizce SES 47–57: Kalkidikum ekinin İngilizce
ses kayıtları üretildi (`public/audio/en-efes-*.mp3`; `efes-en.json` artık
**57/57** durakta `audio` taşıyor ve dosya diskte). Kayıtlar turun geri
kalanıyla aynı sentetik TTS boru hattından çıktı (32 kbps · 24 kHz · mono MP3;
RMS ≈ −19.6…−20.4 dBFS, peak ≤ 0.84); **insan dinlemesi yapılmadı** ve
anlatımın ekrandaki İngilizce metnin seslendirmesi olduğu dosyanın kendisinden
anlaşılır. Eski `KALKIDIKUM_ENGLISH_AUDIO_PENDING` kilidi listesi boşaldığı
için kaldırıldı; `audioDiscovery.test.ts` artık tüm duraklarda `audio` + dosya
varlığını kilitliyor.

Ayrıca 2026-11-08'de kapatıldı — **envanterde olmayan iki kayıt** (#11 Domitian
Çeşmesi, #12 Chalcidicum) artık #57 ve #56 olarak turda; tur 55 → **57**
durağa çıktı. Bu kapanış bir doğrulama onayı değildir: iki durak da bağımsız
coğrafi referanssız, paylaşılan temsili noktalarla eklendi (bkz. §2) ve tekil
doğrulama borcu sürüyor.

1. **Koordinatlar temsilî.** 54 ve 55 hâlâ stadyum noktasını paylaşıyor; sahada
   hassas ölçüm gerekiyor. 53 ve 50 de aynı hamam kompleksini paylaşıyor.
   Bazilika Stoası noktası 3, 49, 56 ve Domitian Çeşmesi noktası 45, 47, 57
   tarafından da paylaşılır; aynı ölçüm ihtiyacı onlar için de geçerli.
2. **Tek kaynaklı iki durak:** 49 (Heksagon) ve 50 (Verulanus). İkinci bağımsız
   kaynak bekliyor. (56 iki kaynaklı, 57 iki kaynaklı eklendi.)
3. **İki görselin lisansı doğrulanmadı:** `heroon` (#20) ve `magnesia-kapisi`
   (#27), kaynak Turkish Archaeological News. Yayında gösteriliyor; lisans
   teyidi veya değişim gerekiyor.
