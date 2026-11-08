# Kapadokya sesli anlatım turu

Durum: **henüz eklenmedi.** Bu dosya, eklenirken izlenecek iskeleti ve ölçütü
tutar. Genel kural ve adım adım ekleme: [`README.md`](./README.md)

## 1. Neden ayrı tur?

Kapadokya, Efes'ten bağımsız bir bölge. Ayrı tur olarak aynı dosyada
(`public/assets/sesli-turlar.json` → `tours[1]`) yaşar; kendi numaralandırması
1'den başlar. Ayrı JSON dosyası **açılmaz**.

## 2. Eklendiğinde dokunulacak yerler

| Yer | Ne yapılacak |
| --- | --- |
| `public/assets/sesli-turlar.json` | `tours` dizisine yeni tur nesnesi |
| `public/audio/kapadokya-*.mp3` | Durak sesleri |
| `src/components/AudioDiscoveryCategories.tsx` | `GROUPS_BY_TOUR["kapadokya-…"]` grubu |
| `src/data/places.ts` | Kapadokya katalog kaydı **zaten var** (id: `kapadokya`); tur bu kayda bağlanır |
| `src/content/landingStatic.ts` | `VERIFIED_CATALOG_COUNTS.audioStops` güncellenir |
| `docs/icerik/sesli-anlatim-rehberi/kapadokya.md` | Bu dosya gerçek duraklarla doldurulur |

`src/data/audioDiscovery.test.ts` turu otomatik denetler: numaralandırma,
koordinat, iki bağımsız kaynak, ses dosyası, görsel lisansı, çift pin.
Kod tarafında başka değişiklik gerekmez — tur listesi veriden okunuyor.

## 3. Ölçüt (durak kabul koşulu)

1. Yer, açık hava ören yeri/doğal alan olmalı (müze içi değil).
2. Koordinat OSM, Wikidata veya benzeri kaynaklı envanterden gelmeli; URL ve
   erişim tarihi buraya yazılmalı.
3. En az **iki bağımsız kaynak** (Kalkidikum'daki tek kaynak borcu tekrarlanmaz).
4. Ses kaydı gerçekten üretilmiş olmalı; metin varsa ses de olmalı.
5. Görselin lisansı açık olmalı; `"Kullanım izni doğrulanmadı"` **kullanılmaz**.
6. Bilet/açılış saati/sezon doğrulanamıyorsa `Doğrulanmadı.` yazılır.
7. Aynı fiziksel noktayı paylaşan duraklar `sharedWith` ile karşılıklı
   işaretlenir; koordinat uydurulmaz.

## 4. Aday başlıklar (doğrulanmadı)

Aşağıdaki liste yalnız çalışma notudur; hiçbiri koordinat/kaynak doğrulanmadan
tura eklenmez:

- Göreme Açık Hava Müzesi ve kaya kiliseleri
- Uçhisar Kalesi
- Kaymaklı / Derinkuyu yeraltı şehri
- Paşabağ (Rahipler Vadisi)
- Zelve Ören Yeri
- Avanos — Kızılırmak ve çömlek atölyeleri
- Devrent Vadisi
- Ihlara Vadisi

## 5. Bilinçli olarak tur dışı

- **Balon uçuşları:** ticari işletme, tek bir koordinatı ve sabit bilgisi yok;
  tur durağı olamaz. Landing metninde "gün doğumunda yapılması" bilgisi
  kaynaklı olarak duruyor, sesli turda yer almaz.
- **Konaklama ve restoranlar:** ücretli hizmet, ürün kapsamı dışı.
