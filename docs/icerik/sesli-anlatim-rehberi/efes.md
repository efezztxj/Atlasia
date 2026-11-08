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


## 3. Aynı noktayı paylaşan duraklar (`sharedWith`)

8 Kasım 2026 itibarıyla turda **aynı koordinatı paylaşan durak kalmadı**;
`sharedWith` hiçbir durakta yazılı değil. Daha önce altı grup zorunlu olarak tek
noktaya oturtulmuştu (Bazilika/Heksagon, Meryem Kilisesi/vaftizhane,
stadyum/Vedius/surlar, Liman Caddesi/antik liman, Liman Hamamları/Bizans
Hamamları, Pollio/Hydreion). Her biri konum kaynağı yeniden belirlenerek ayrıldı.

Mekanizma yürürlükte: iki durak gerçekten aynı noktayı temsil ederse koordinat
uydurulmaz, `sharedWith` **karşılıklı** yazılır ve testte zorunlu tutulur.

## 4. Açık borçlar

1. **İngilizce ses kaydı yok (49–57).** 2026-11-07'de İngilizce **metinler**
   yazıldı: `public/audio/efes-en.json` 46 → **57 kayıt**, turun tamamı
   çevrili. Ses kaydı gerçek anlatım gerektirdiği için üretilmedi; o dokuz
   durakta `audio` alanı yoktur ve arayüz "English audio is not available yet.
   You can read the text." der. Kilit: `src/data/audioDiscovery.test.ts` →
   `KALKIDIKUM_ENGLISH_AUDIO_PENDING` (liste sessizce büyüyemez).
2. **Temsilî noktalar:** 51 (sıralamadan türetildi), 52 (avlu sınırları toprak
   altında), 53 (havza ortası, erişim yok), 57 (korunmuş bir kesit). Kaynaklar
   arasında 25–90 m fark süren duraklar var; sahada ölçüm yapılmadı.
3. ~~Tek kaynaklı iki durak~~ **Kapatıldı:** 51 ve 52 artık üç kaynak taşıyor.
4. **İki görselin lisansı doğrulanmadı:** `heroon` (#20) ve `magnesia-kapisi`
   (#27), kaynak Turkish Archaeological News. Yayında gösteriliyor; lisans
   teyidi veya değişim gerekiyor.
5. **Türkçe ses kaydı olmayan üç durak.** Chalcidicum (45) ve Domitian
   Çeşmesi (47) tura eklendi; içerik ve koordinat doğrulandı ama ses yok.
   Pollio Anıtı'nın (46) metni bölündüğü için eski kayıt artık yanlış metni
   okuyordu; ses alanı kaldırıldı. Üçünde de arayüz "Ses kaydı yok. Metni
   okuyabilirsin." der. Kilit: `SES_BEKLEYEN`.
6. **Ses tınısı denetlenmedi.** 49–57 kayıtları yenilendi ve teknik künye
   mevcut dosyalarla aynı, ama turdaki 46 eski Türkçe kayıtla kulakla
   karşılaştırma yapılmadı. Tını ayrı düşerse o dokuz dosya başka sesle
   yeniden üretilmeli.
