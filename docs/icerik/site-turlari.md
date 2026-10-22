# Site turları — kaynaklar ve ekleme ölçütü

Bu dosya `src/data/siteTours.ts` içindeki site turlarının **kanıtını** tutar.
Kural: koordinat ve yol uydurulmaz. Yol (patika) geometrisi doğrulanamıyorsa o
tur `polyline` olmadan eklenir ve `isRealPath()` false döner; geometri
doğrulanmadan çizgi çizilmez.

## Ölçüt (yeni tur eklerken)

1. Yer **açık hava ören yeri** olmalı (müze içi değil).
2. Durakların koordinatı OSM düğümünden ya da Wikidata/Wikipedia koordinatından
   gelmeli; düğüm/ madde kimliği bu dosyaya yazılmalı.
3. Yürüyüş yolu OSM'de `highway=footway|path|pedestrian` olarak **gerçekten
   varsa** `polyline` üretilir ve `isRealPath()` true olur.
4. Yol doğrulanamıyorsa tur `polyline: ""` ile eklenir; `isRealPath()` false
   kalır ve bu durum PR'da açıkça yazılır.
5. Testler (`src/data/siteTours.test.ts`) turu otomatik doğrular: durak sırası,
   saat artışı, koordinatların girişe uzaklığı, `tourGuide` uyumu.

## Efes — `site-efes-3h`

- Tur: Magnesia Kapısı → Devlet Agorası → Odeon → Domitian → Herakles Kapısı →
  Kuretler Caddesi → Yamaç Evler → Hadrian Tapınağı → Celsus → Büyük Tiyatro.
- Patika: `EPHESUS_PATH_COORDS` elle yazılmış yaya aksı; `isRealPath()` **true**.
- Kaynak: OpenStreetMap (ODbL) alan verisi + Wikipedia maddeleri; durak
  saatleri Atlasia editör yazımı.
- Not: Bilet/açılış saatleri değişebilir; tur metni kullanıcıyı resmî kaynağa
  yönlendirir.

## Priene — `site-priene-1h` (patika doğrulanmadı)

Durak koordinatları OpenStreetMap düğümlerinden **birebir** alındı:

| Durak | OSM düğümü | Koordinat |
|---|---|---|
| Demeter Kutsal Alanı | [node/3751926827](https://www.openstreetmap.org/node/3751926827) | 37.6606561, 27.2958851 |
| Alexandreion | [node/919567612](https://www.openstreetmap.org/node/919567612) | 37.6585781, 27.2949996 |
| Isis Kutsal Alanı | [node/919567617](https://www.openstreetmap.org/node/919567617) | 37.6594486, 27.2990539 |
| Wiegand Moloz Tepeciği (manzara noktası) | [node/4014933868](https://www.openstreetmap.org/node/4014933868) | 37.6584604, 27.2990505 |

- Mesafe: duraklar arası **kuş uçuşu** toplam 0,72 km (haversine, testle kilitli).
- **Yol geometrisi: doğrulanmadı.** 2026-10-22'de Overpass API (overpass-api.de)
  "502 Gateway Timeout — at capacity" döndü; `overpass.osm.ch` aynası veri
  döndürmedi; Wikidata SPARQL uç noktası otomatik trafiği reddetti. Bu yüzden
  `highway=footway` yolları alınamadı ve `polyline` boş bırakıldı.
- Tur metinleri yalnız **adı ve konumu** tarif eder; tarih/ölçü iddiası
  içermez. Ayrıntı isteyen kullanıcı kazı raporuna yönlendirilir.
- Yol doğrulandığında yapılacak: Overpass'tan `highway=footway|path` yollarını
  al, duraklar arasında sırala, `encodePolyline` ile `polyline` yaz ve
  `isRealPath()` true olacak şekilde testi güncelle.

## Eklenmeyen adaylar (bilinçli)

| Aday | Neden eklenmedi |
|---|---|
| Miletos (Didim) | Durak koordinatları ve patika aynı gün doğrulanamadı; uydurma riski. |
| Afrodisias (Karacasu) | Aynı neden; ayrıca alan büyük, durak seçimi kaynak gerektiriyor. |
| Hierapolis (Pamukkale) | Traverten yürüyüş yasağı/rotalar mevsimsel; resmî kaynak doğrulanmadı. |

Bu adaylar eklendiğinde yukarıdaki ölçütün 2 ve 3. maddesi zorunludur.
