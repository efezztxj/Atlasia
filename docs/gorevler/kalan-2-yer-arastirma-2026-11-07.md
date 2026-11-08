# Kalan 2 durak — araştırma notu

7 Kasım 2026. Amaç: 57 kayıtlık envanterden turda eksik kalan **iki** kaydı
(`12. Chalcidicum`, `11. Domitian Çeşmesi`) eklemeye hazır hâle getirmek.
Genel kural: [`sesli-anlatim-rehberi/README.md`](../sesli-anlatim-rehberi/README.md)

## Durum

| | |
|---|---|
| Envanterdeki kayıt | **57** |
| Turdaki durak | **55** |
| Fark | 2 kayıt |

Farkın ne olduğu envanter belgesinden okunur; turda `envanterNo` taşıyan
dokuz durak Kalkidikum eki, kalan 46 durağın envanter eşleşmesi ada göre
yapılır. 57 − 55 = 2:

- `12. ○ Chalcidicum (Kalkidikum)` — envanterde **hiç pin yok**
- `11. ✓ Pollio Anıtı yanındaki Domitian Çeşmesi` — envanterde **ortak durak**
  işaretli, yani 10 ile 11 tek durak olarak temsil ediliyor

---

## 1. Chalcidicum (Kalkidikum)

### Kanıtlanan bilgiler

| Alan | Değer | Kaynak |
|---|---|---|
| Konum | Domitian Meydanı'nın batısı, Devlet Agorası'nın batı kenarı | TAN (Domitian Square) |
| İşlev | Bazilika Stoası'nın batı ucunu taşıyan **alt yapı**; üç odası doğrudan meydana açılıyor | TAN, Ephesus.net |
| Dönem | Nero döneminde eklendiği düşünülüyor (MS 54–68) | TAN, Turkish Archaeological News · State Agora |
| Ad kökeni | Latince *chalcidicum*: bazilikaya eklenen revak/salon | TAN |
| Görünüm | Büyük kesme taş bloklardan öne çıkan masif kütle | TAN |
| Komşular (kuzeyden güneye) | Chalcidicum → Pollio Anıtı → Domitian Çeşmesi | TAN |

**İki bağımsız kaynak var** → "kaynak ≥ 2" kilidi karşılanıyor.

### Eksik olan: koordinat ❗

- `wikidata.org` aramasında Efes Chalcidicum kaydı **yok**. Bulunan tek
  "Chalcidicum" kaydı Libya, Leptis Magna'ya ait (Q79048877).
- OpenStreetMap/Overpass sorgusu bu ortamdan koşulamıyor (TLS engeli), yani
  OSM way id'si de teyit edilemedi.

**Sonuç:** Chalcidicum için doğrulanmış bağımsız koordinat yok. Yapı, alanı
zaten kapsanan **Domitian Meydanı (durak 23)** ile **Bazilika Stoası
(durak 3)** arasındadır. Koordinat uydurmak yerine iki seçenek var; karar
senin:

| Seçenek | Ne olur | Dürüstlük |
|---|---|---|
| **A. TAN koordinatı alınır** | TAN sayfasındaki harita işaretinden lat/lng okunur, `coordinateSource` = TAN URL'si yazılır | Yayınlanmış tek kaynak; "temsilî" notu düşülür |
| **B. Mevcut noktayla paylaşılır** | `sharedWith: ["domitian-meydani"]`, pin 14 m ofsetle ayrılır | Veri uydurulmaz; sınır A seçeneğinden daha yumuşak |

### Hazır içerik

**Türkçe**
> Domitian Meydanı'nın batı kenarında, Bazilika Stoası'nın batı ucunu taşıyan
> masif bir alt yapı yükselir. Adı Latince *chalcidicum* kelimesinden gelir;
> bazilikaya eklenen revaklı salon anlamına gelir. Büyük kesme taş bloklardan
> örülmüş bu kütle, Nero döneminde eklendiği düşünülen üç odasıyla doğrudan
> meydana açılır. Yapı, üstündeki stoanın ağırlığını taşırken meydana bakan
> cephesiyle kamusal alanı çerçeveliyordu. Bugün kütlenin kendisi ayakta;
> süslemesinden geriye bir şey kalmamıştır.

**İngilizce**
> At the western edge of Domitian Square stands a massive substructure that
> carried the western end of the Basilica Stoa. Its name comes from the Latin
> *chalcidicum*, a porticoed hall added to a basilica. Built of large ashlar
> blocks, it opens onto the square through three chambers, and it is thought to
> have been added in the reign of Nero. The structure bore the weight of the
> stoa above while its front framed the public space. The mass itself survives;
> nothing of its decoration remains.

---

## 2. Domitian Çeşmesi (Pollio'dan ayrı)

### Kanıtlanan bilgiler

| Alan | Değer | Kaynak |
|---|---|---|
| Konum | **Pollio Anıtı'nın güneyinde**, apsisi Domitian Meydanı'na bakar | Historical marker (hmdb.org) |
| Tarih | MS **92/93** | hmdb.org, TAN |
| İlişki | Pollio Anıtı bu yeni yapının içine alındı; birlikte tek bir mimari kulis oluşturuyorlar | hmdb.org |
| Niş | İçinde Odysseus'un Polyphemos'u kör etme sahnesini canlandıran **Polyphemos Grubu** heykelleri (MÖ 1. yy) | hmdb.org, TAN |
| Su dağıtımı | Kemerlerden gelen su, pişmiş toprak borularla dallanan bir sisteme veriliyordu | TAN, Ephesus.net |
| Onarım | 2019'da gri beton dolgular orijinalle uyumlu malzemeyle değiştirildi | TAN |
| Ad silinmesi | Domitian'ın adı, ölümünden sonra yazıttan kazındı | Ephesus Tours by Locals |

**Üç bağımsız kaynak var** → kilit karşılanıyor.

### Koordinat

İki yapı bitişik; ayrı pin gerekiyorsa ofset yeterli. Envanterin kendisi bunu
"ortak durak; ayrı yapı" diye işaretliyor, yani fiziksel olarak 5–15 m
mesafede iki farklı yapı kabul ediliyor:

- `sharedWith: ["pollio-domitian-cesmesi"]` + Pollio tarafında tersi
- Pinler zaten `SHARED_PIN_OFFSET_METERS = 14` ile ayrılıyor

> **Not:** Bugünkü 45. durak `pollio-domitian-cesmesi` adıyla **ikisini birden**
> temsil ediyor. Ayrıldığında 45 = Pollio Anıtı, yeni durak = Domitian Çeşmesi
> olur; 45'in başlığı ve metni de bölünmeli.

### Hazır içerik

**Türkçe (yeni durak: Domitian Çeşmesi)**
> Pollio Anıtı'nın hemen güneyinde, MS 92/93 yıllarında inşa edilmiş bir çeşme
> yapısı yükselir. Büyük apsisi doğrudan Domitian Meydanı'na bakar. Sarmaşık
> motifli payelerin taşıdığı kemerlerden gelen su, pişmiş toprak borularla
> kentin dört bir yanına dağıtılıyordu. Nişin içinde, Odysseus'un tek gözlü
> Polyphemos'u kör etmesini anlatan heykel grubu duruyordu; bu grup çeşme için
> özel yapılmamış, başka bir yapıdan buraya getirilmişti. Yapı, daha eski olan
> Pollio Anıtı'nı içine alarak tek bir mimari kulis oluşturur. İmparatorun
> ölümünden sonra adı buradaki yazıttan da kazınmıştı.

**İngilizce**
> Just south of the Pollio Monument rises a fountain built in 92/93 CE, its
> great apse opening directly onto Domitian Square. Water carried by the arches
> on tendril-carved piers was distributed through a branching network of fired
> clay pipes. In the niche stood a sculptural group showing Odysseus blinding
> the one-eyed Polyphemus; the group was not made for this fountain but brought
> here from another building. The structure absorbed the older Pollio Monument,
> creating a single architectural screen. After the emperor's death his name was
> chiselled out of the inscription here as well.

---

## 3. Eklenirse ne değişir

| Alan | Bugün | Sonra |
|---|---|---|
| Durak sayısı | 55 | **57** |
| Numaralar | 1–55 | 1–57 (yeni ikisi rotada yerine göre) |
| `landingStatic.ts` → `audioStops` | 55 | 57 |
| `public/llms.txt` | 55 durak | 57 durak |
| Çeviri dosyası | 55 kayıt | 57 kayıt (metinler yukarıda hazır) |
| Ses dosyası | 9 eksik | 11 eksik |

Ses dosyası adları (senin kayıt ekibine):
`public/audio/kalkidikum-chalcidicum.mp3` · `public/audio/kalkidikum-domitian-cesmesi.mp3`

---

## Karar gereken tek şey

**Chalcidicum koordinatı.** Diğer her şey (içerik, kaynak, çeviri) hazır.
A (TAN koordinatı) veya B (paylaşılan nokta) seçilirse iş yarım saatlik.
