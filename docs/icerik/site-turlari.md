# Site turları — kaynaklar ve ekleme ölçütü

Bu dosya `src/data/siteTours.ts` içindeki site turlarının **kanıtını** tutar.
Kural: koordinat ve yol uydurulmaz. Yol (patika) geometrisi doğrulanamıyorsa o
tur `polyline` olmadan eklenir ve `isRealPath()` false döner; geometri
doğrulanmadan çizgi çizilmez.

## Ölçüt (yeni tur eklerken)

1. Yer **açık hava ören yeri** olmalı (müze içi değil).
2. Durakların koordinatı OSM, Wikidata/Wikipedia veya Pleiades gibi
   kaynaklı envanterden gelmeli; kimlik/URL ve erişim tarihi burada tutulmalı.
   İkincil koordinat kaynaklarının niteliği ve sınırları ayrıca belirtilmeli.
3. Yürüyüş yolu OSM'de `highway=footway|path|pedestrian` olarak gerçekten
   alınmalı; kesintisiz way/node zinciri, sürüm ve erişim etiketleri saklanmalı.
   Gerçeklik ancak bu kaynak geometriyle eşleşme kontrolünden sonra işaretlenmeli.
4. Yol doğrulanamıyorsa tur `polyline: ""` ile eklenir; `isRealPath()` false
   kalır ve bu durum PR'da açıkça yazılır.
5. Testler (`src/data/siteTours.test.ts`) turu otomatik doğrular: durak sırası,
   saat artışı, koordinatların girişe uzaklığı, `tourGuide` uyumu.

## Efes — `site-efes-3h`

- Tur: Magnesia Kapısı → Devlet Agorası → Odeon → Domitian → Herakles Kapısı →
  Kuretler Caddesi → Yamaç Evler → Hadrian Tapınağı → Celsus → Büyük Tiyatro.
- Patika: `EPHESUS_PATH_COORDS` eski elle yazılmış temsildir; `isRealPath()` **false**.
  Fazla ara nokta OSM kanıtı değildir. Eski çizgi korunur, doğrulanmış yol sayılmaz.
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
  kaynak geometriyle eşleşme denetimi ekle; yalnız nokta sayısıyla true yapma.

## Eklenmeyen adaylar (bilinçli)

| Aday | Neden eklenmedi |
|---|---|
| Miletos (Didim) | Durak koordinatları ve patika aynı gün doğrulanamadı; uydurma riski. |
| Afrodisias (Karacasu) | Aynı neden; ayrıca alan büyük, durak seçimi kaynak gerektiriyor. |
| Hierapolis (Pamukkale) | Traverten yürüyüş yasağı/rotalar mevsimsel; resmî kaynak doğrulanmadı. |

Bu adaylar eklendiğinde yukarıdaki ölçütün 2 ve 3. maddesi zorunludur.


## 23 Ekim 2026 eki — #65 üstüne Pompeii ve Ostia

### Ön kontrol ve temel

#65 açıkken incelendi (https://github.com/efezztxj/Atlasia/pull/65,
inceleme 2026-10-23). `arena/b1059179-atlasia` dalının `503e7d2` commit'i,
oturum dalı `arena/673a7d32-atlasia` içine fast-forward ile alındı. Böylece
Priene, `SITE_TOURS`, `siteTourForPoint` ve uygulama entegrasyonu korunuyor;
yeni bir altyapı kurulmadı. PR #65'e bağımlı ek teslimdir.

Ön kontrolde Efes'in nokta sayısıyla true sayıldığı doğrulandı ve kaldırıldı.
Şu an hiçbir tur için kaynaklı, kesintisiz OSM geometrisi yoktur;
`isRealPath` tüm katalogda false döner. Gerçek yol desteği eklenirken kaynak
geometriyle eşleşme doğrulaması da yazılmalıdır. 500 sentetik nokta ve OSM
atıfı eklemek bile true sonucuna yol açamaz; regresyon testi bunu kilitler.

### Yeni hatlar ve bilinmeyen alan sözleşmesi

- `site-pompeii-forum`: **Porta Marina → Bazilika → Pompeii Forumu**.
- `site-ostia-theatre`: **Porta Romana → Roma Tiyatrosu → Korporasyonlar Forumu**.

Bitiş noktaları park çıkış kapısı değil, tur anlatımının son durağıdır.
Ostia'nın başlangıcı tarihî kent girişidir; modern gişe veya park kapısı
diğer koordinatlara taşınmış gibi gösterilmez. Modern park girişinden antik
kapıya geçiş doğrulanmadı. Dönüş yolu eklenmedi.

**İki yeni turda mesafe/süre tahmini yok:** AtlasRoute sayısal alanları
zorunlu olduğundan `totalDistanceKm`, `totalDurationHours`, `durationMinutes`
**0 = bilinmiyor**, `startTime` ve `endTime` **boş = planlanmadı**.
Bunlar gerçek sıfır mesafe/süre veya ziyaretin ücretsiz olduğu anlamına gelmez.
İki turda da `polyline: ""`, `isRealPath: false`; açıklamalar eksikliği açıkça
belirtir. `planRoute` çağrısı, duraklar arası düz çizgi veya uydurma ara nokta yok.
**Giriş ücreti, açılış saati ve sezon bilgisi doğrulanmadı**; değer yayımlanmaz.
Mevcut Efes/Priene'nin eski editoryal saatleri bu ekle yeniden doğrulanmış değildir.

### Yeni kaynaklar (her satırın erişim tarihi: 2026-10-23, Europe/Istanbul)

Pleiades'in `reprPoint` alanı [boylam, enlem] sırasıyla okunup RouteStop
alanlarına çevrildi. Anıtın temsilî noktasıdır, yürünebilir yüzeye oturtulmuş
GPS navigasyon noktası değildir. Türkçe metinler kısa olgusal özetlerdir.

| Durak | Enlem, boylam | URL / alınan bilgi | Erişim |
|---|---|---|---|
| Pompeii / Porta Marina | 40.74857267367671, 14.483180053934703 | https://pleiades.stoa.org/places/615138225 — Strada della Marina batı ucundaki kapı | 2026-10-23 |
| Pompeii / Bazilika | 40.7487294102377, 14.48450735252601 | https://pleiades.stoa.org/places/945930915 — kamusal bazilika, erken örnek | 2026-10-23 |
| Pompeii / Forum | 40.74943545853224, 14.48478436801491 | https://pleiades.stoa.org/places/188321148 — ana forum | 2026-10-23 |
| Ostia / Porta Romana | 41.757398, 12.295696 | https://en.gancarczyk.com/Ostia-Antica-map-directions-sightseeing-curiosities/ — “Roman Gate” ondalık GPS noktası, ikincil gezi yazısı | 2026-10-23 |
| Ostia / Tiyatro | 41.755783949874804, 12.29147340477965 | https://pleiades.stoa.org/places/443253553 — Marcus Agrippa himayesinde tiyatro | 2026-10-23 |
| Ostia / Ticaret meydanı | 41.7563893179929, 12.291007512869603 | https://pleiades.stoa.org/places/489630692 — tiyatro avlusu, Augustus dönemi, ikinci yüzyıl yenilemesi | 2026-10-23 |

Pleiades kayıtları GitHub aynasından yeniden okundu:
https://github.com/isawnyu/pleiades.datasets/tree/6df2361f61b13f0034aed21f5393c2de6121cf3d
(erişim 2026-10-23). Örneğin `data/json/6/1/5/1/3/8/2/615138225.json`;
diğer kimliklerde de son iki rakam dışındaki rakamlar klasör yoludur.
Atıf: Pleiades contributors, CC BY 3.0. Koordinatlar aynadan, açıklamalar
aynı kayıtların `description` alanından alındı; koordinat uydurulmadı.

Ek bağlam kaynakları:

| URL | Kullanılan bilgi ve sınırı | Erişim |
|---|---|---|
| https://www.pompeionline.net/en/pompeii-info/pompeii-map | Porta Marina ziyaretçi girişleri listesinde; güncel açık kapı garantisi değil | 2026-10-23 |
| https://www.ostia-antica.org/regio2/pr/pr.htm | Roma yönünden Via Ostiensis üzerinden tarihî kapı girişi; modern bilet gişesi değil | 2026-10-23 |

Gezi yazısının metni/fotoğrafı kopyalanmadı; koordinat ve kısa olgusal özet
kullanıldı. Ücret, açılış saati ve sezon iddiası bu kaynaklardan türetilmedi.

### OSM denemesi ve kalan eksik

2026-10-23'te iki hat için küçük bbox sorguları denendi. Uç nokta:
https://overpass-api.de/api/interpreter (erişim denemesi 2026-10-23).

```overpass
[out:json][timeout:10];
way[highway~"footway|path|pedestrian|steps"](40.747,14.482,40.751,14.487);
out geom;
```

Ostia için bbox `(41.754,12.289,41.759,12.298)` kullanıldı.
Pompeii isteği içerik alınamadan başarısız oldu; Ostia isteği
`502 Gateway Timeout — all query workers are busy` yanıtı verdi.
**İki tur için de kesintisiz gerçek yürüyüş yolu elde edilmedi.** Erişim ve
way/node zinciri doğrulaması kalan eksiktir. Haritaya çizgi eklenmedi.

### Denetim kapıları — bu ekin gerçek yerel koşusu

Tarih: 2026-10-23 (Europe/Istanbul). Bağımlılıklar `npm ci --ignore-scripts
--no-audit --no-fund` ile kuruldu; kilit dosyası değiştirilmedi.

| Komut | Gerçek sonuç / test sayısı |
|---|---|
| `npm run typecheck` | çıkış 0; test çalıştırmaz (0 test) |
| `npm run lint` | çıkış 0; 0 uyarı, test çalıştırmaz (0 test) |
| `npm run test:run` | çıkış 0; 110 dosya, 789 test geçti |
| `npm run test:scripts` | çıkış 0; 22 test geçti: owner-index 7, bundle-budget 6, verify-env 6, content 3 |
| `npm run build` | çıkış 0; Vite + postbuild bundle bütçesi geçti; test çalıştırmaz (0 test) |
| `npx vitest run src/data/siteTours.test.ts src/utils/tourGuide.test.ts` | çıkış 0; 2 dosya, 29 test geçti (tam Vitest sayısına dahildir) |

Build ölçümleri (gzip byte): ilk HTML seti **416896 / 439000**,
toplam JS **872450 / 886000**, toplam CSS **33123 / 34500**.
Vite büyük chunk tavsiyesi verdi; postbuild bütçe kapısı başarısız olmadı.
Bu koşular Firestore emülatör testleri veya üretim ortamı testi değildir.

Testler yeni tur sırasını, giriş/tur bitişini, boş saatleri (tahmin yok),
sıfır yer tutucuları, kaynak URL'lerini, konumdan seçimi ve tourGuide ile her
durağa gerçek çözümleyici üzerinden sırayla giriş/çıkışı denetler. Başlangıçta
ve her durakta aynı koordinatta kalınca yanlış tekrar giriş olmaması da
sınanır. Sahada kaydedilmiş GPS izi kullanılmadı; test konumları durak
koordinatlarıdır. Priene ve mevcut testler korunmuştur.
