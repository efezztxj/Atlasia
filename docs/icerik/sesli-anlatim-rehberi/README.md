# Sesli anlatım rehberi — yapılış tarzı ve ekleme kuralı

Bu klasör, Atlasia sesli anlatım rehberinin **tek yapılış kaynağıdır**.
Yeni bir yer, yeni bir şehir veya yeni bir tur eklenecekse önce buradaki
`README.md` okunur; sonra o yere ait dosya açılır.

## Dosyalar

| Dosya | İçerik |
| --- | --- |
| `README.md` | Bu dosya: yapılış tarzı, ekleme adımları, açık borçlar |
| `efes.md` | Efes turu: **57 durak**, numara düzeni, `sharedWith`, borçlar |
| `kapadokya.md` | Kapadokya turu iskeleti + durak kabul ölçütü |
| `ingilizce-ses-kayit-metinleri.md` | **Tarihsel** — 9 durağın İngilizce metni; kayıtlar 8 Kasım 2026'da tamamlandı |
| `kalan-11-yer-ingilizce.md` | **Tarihsel** — son 11 yerin İngilizce metni; kayıtlar tamamlandı |
| `agent-ses-gorevi.md` | **Agent'a verilecek görev**: teknik künye (24 kHz/32 kbps mono), telaffuz, kabul kontrolü |
| `kayit-paketi/PROMPT.md` | **Agent'a yapıştırılacak hazır prompt** + metinlerin okunacağı yollar |
| `kayit-paketi/metinler/` | Dokuz metin: `TUMU.txt` (hepsi) + durak başına `.txt` |
| `kayit-paketi/` | **İnsan seslendiren** için paket: dikte metni, telaffuz sözlüğü, CSV, talimat |

## 1. Yapı: tek dosya, içinde turlar

Sesli rehberin **verisi tek dosyadadır**:

```
public/assets/sesli-turlar.json
```

```json
{
  "version": 1,
  "tours": [
    { "id": "efes-kamusal-yasam", "placeId": "efes", "title": "…", "stops": [ … ] },
    { "id": "kapadokya-…",        "placeId": "kapadokya", "title": "…", "stops": [ … ] }
  ]
}
```

Kurallar:

- **Ayrı tur dosyası açılmaz.** `efes-tour.json`, `kalkidikum-tour.json` gibi
  dosyalar 2026-11-07'de kaldırıldı. Her yeni tur aynı dosyanın `tours`
  dizisine yeni bir nesne olarak eklenir.
- **Her turun kendi numaralandırması vardır.** `stops[].no` alanı tur içinde
  `1..N` kesintisiz gider. Boşluk bırakmak yasaktır: 2026-11-07 öncesinde
  yalnız ören yeri içi duraklar numara aldığı için haritada 16/17/18/24/25/26/
  27/29/38 numaraları boş görünüyordu.
- **Aynı yer iki yerde yaşamaz.** Bir durak ya ana katalogda (`src/data/places.ts`)
  ya sesli rehberin içinde olur, ikisinde birden olmaz. Kalkidikum durakları bu
  yüzden katalogdan çıkarıldı; haritada çift pin üretiyorlardı.
- **Koordinat uydurulmaz.** İki ayrı yapı gerçekten aynı noktada temsil
  ediliyorsa `sharedWith` alanı ile karşılıklı olarak yazılır; harita bu pinleri
  birkaç metre kaydırarak ayırır, veri değişmez.
- **Ses dosyası yoksa durak yayına girmez.** `audio` alanı zorunludur ve dosya
  `public/audio/` altında gerçekten bulunmalıdır (test kilitler).

## 2. Yeni bir yer eklemek — adım adım

1. **Kaynak topla.** En az iki bağımsız kaynak (Vikipedi/Wikidata, OSM, Pleiades,
   kazı raporu). Bilet, açılış saati ve sezon bilgisi doğrulanamıyorsa
   `Doğrulanmadı.` yazılır; uydurulmaz.
2. **Sesi üret.** Metni yaz, sesi kaydet, `public/audio/<yer>-<durak>.mp3` olarak koy.
   Dosya adı yalnız küçük harf, rakam ve tireden oluşur.
3. **Görseli seç.** Wikimedia Commons gibi lisansı **açıkça belli** bir kaynaktan.
   `author`, `license`, `licenseUrl` ve `source` alanlarının dördü de doldurulur.
   Lisansı doğrulanmamış görsel (`"Kullanım izni doğrulanmadı"`) yalnız mevcut
   kayıtlar için geçicidir; yeni kayıtta kullanılmaz.
4. **Durağı JSON'a yaz.** `public/assets/sesli-turlar.json` içinde ilgili turun
   `stops` dizisine ekle; `no` alanını sırayla güncelle.
5. **Kategori grubunu yaz.** `src/components/AudioDiscoveryCategories.tsx`
   içindeki `GROUPS_BY_TOUR[turId]` altına grubu ekle. Grup tanımlamazsan ekran
   durakları tek liste olarak gösterir; yine de boş kategori üretilmez.
6. **Çeviri (varsa).** `public/audio/<yer>-en.json` dosyasını koy ve
   `src/data/audioDiscoveryEnglish.ts` içindeki `ENGLISH_AUDIO_SOURCES`
   tablosuna satır ekle. Çeviri yoksa dil düğmesi gösterilmez — yanlış dosya
   istenmez.
7. **Kapıları çalıştır.** `npm run typecheck && npm run lint && npm run test:run && npm run build`.
   `src/data/audioDiscovery.test.ts` numaralandırmayı, kaynakları, ses ve görsel
   varlığını, çift pin olmadığını otomatik denetler.

## 3. Tur dosyaları

| Dosya | Ne tutar |
| --- | --- |
| [`efes.md`](./efes.md) | Efes turu — 57 durak (48 temel + 9 Kalkidikum eki), açık borçlar |
| [`kapadokya.md`](./kapadokya.md) | Kapadokya turu — henüz eklenmedi, iskelet ve ölçüt |

Yeni tur eklerken aynı klasöre `<yer>.md` açılır: o turda hangi durakların
olduğu, kaynakları, bilinen eksikleri ve doğrulanmamış alanlar orada tutulur.
Böylece her şehir kendi dosyasında, ana kural ise burada tek yerde durur.

## 4. Bilinen açık borçlar

Yalnızca **gerçekten açık** olanlar. Hepsi saha işi; hiçbiri kod veya ses
üretimiyle kapanmıyor.

| Borç | Neden açık | Nerede izlenir |
| --- | --- | --- |
| 52 Verulanus, 53 Antik Liman, 57 Kent Surları: nokta **temsilî** | Avlu sınırları toprak altında / havza ortası / korunmuş bir kesit. Noktalar 2–4 bağımsız kaynakla çapraz kontrol edildi; eksik olan **yerinde ölçüm**. Arayüzde "≈ Yaklaşık konum" yazar | `coordinateAccuracy` kilidi · `efes.md` §5 |
| Kalkidikum ekinin bir bölümünün noktası kaynaktan türetilmiş | Çift koordinat kalmadı (56↔57 artık 1,9 km ayrı), ama pin yapıyı değil alanı gösteriyor; saha ölçümü gerekir | `efes.md` §5 |
| 20 Heroon ve 27 Magnesia Kapısı: kartta **yapının kendisi** yok | Commons'ta 8 Kasım 2026'da dört ayrı sorguyla arandı, özgür lisanslı kare **yok** (Heroon aramaları Likya'daki Trysa Heroonu'na çıkıyor). Fotoğraf yerinde çekilmeli. Mevcut kareler CC BY-SA 4.0 ve alt metinleri neyi gösterdiklerini yazıyor | `efes.md` §5 |

Kapananlar (8 Kasım 2026): Heksagon (51) Türkçe kaydı · 33–38 ve 48'in
metinle ayrışan sesi · #55 Türkçe tınısı · 45–47 Türkçe dikte metni · kayıt
paketindeki yanlış bit hızı ve eski dosya yolları · 57 Kent Surları'nın
stadyum fotoğrafı.

## 5. Neden tek dosya?

Önceki yapıda her tur ayrı dosyadaydı ve her yeni şehir yeni bir dosya, yeni bir
`fetch`, yeni bir servis çalışanı kaydı ve yeni bir test anlamına geliyordu.
Daha kötüsü: Kalkidikum durakları hem ana kataloğa hem tur dosyasına eklenmişti.
Bu yüzden haritada üst üste binen pinler, çöken fotoğraf zinciri (`url.match is
not a function`) ve boş kategoriler oluştu. Tek dosya + tek numaralandırma +
tek doküman bu hataların tekrarını yapısal olarak engeller.
