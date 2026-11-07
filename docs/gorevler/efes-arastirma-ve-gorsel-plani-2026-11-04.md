# Efes — yer, tarih ve fotoğraf hazırlık planı

4 Kasım 2026 · **Çalışma devam ediyor; yayın veya seslendirme onayı değildir.** Bu belge önceki 57 kayıtlık envantere dayanır: 13 mevcut ses durağı, 44 yeni aday. Bunlar 57 bağımsız yeni pin demek değildir: kompleksler, bölümler ve geniş alanlar bulunur. Ören yeri dışındaki yerler ayrıdır. Sıralama yaya rotası değildir. Bu araştırmada her iddia için 2–3 bağımsız kaynak karşılaştırması, bütün koordinatlar, erişim ve tüm görseller henüz tamamlanmamıştır.

## Kapsam ve kural

- Her iddiaya kaynak ve ilgili bölüm bağlanacak; üç bağlantı eklemek, her cümleyi üç kez doğrulamak anlamına gelmez. Birbirini kopyalayan yayınlar bağımsız kanıt sayılmaz. Kitap veya makalenin yalnız özeti okunmuşsa tam metin incelenmiş gibi yazılmaz.
- Koordinat bina, alan ya da caddeyi temsil edebilir; giriş veya güvenli yaya yolu sayılmaz. Güncel ziyaret erişimi, bilet ve saatler resmî kaynaktan ayrıca kontrol edilir.
- Mevcut Türkçe/İngilizce metinler ve kayıtlar ayrı incelenmeli. Düzeltilecek içerik ses dosyası da yenilenmeden doğruymuş gibi yayınlanmaz. Ses üretimi bu aşamanın kapsamı dışında.
- Fotoğrafın dosya sayfası, fotoğrafçı, lisans sürümü, lisans bağlantısı ve kırpma bilgisi her görsel için ayrı saklanacak. Bir sayfada “Efes” yazması fotoğrafın belirli bir yapıya ait olduğunu kanıtlamaz. Telifi açık olmayan gezi siteleri veya akademik sayfaların fotoğrafları kopyalanmaz.
- Bu belge arkeolojik incelemenin veya saha kontrolünün yerine geçmez. Tartışmalı ayrıntılar kesin anlatıya dönüştürülmez.

## Kaynak anahtarı

- **A** [Turkish Archaeological News, Efes indeksi](https://turkisharchaeonews.net/site/ephesus) — yapı listesi ve bağlantılı rehber-kitap bölümleri. Aynı yazarın sayfaları birbirinden bağımsız sayılmaz.
- **B** [Ephesus.net, antik kent](https://www.ephesus.net/ancient-city/) — kent ve yapılar; yorum ve yazım biçimleri kıyaslanmalı.
- **C** [Madain Project, Efes arkeolojik alanı](https://madainproject.com/archaeological_site_of_ephesus) — karşılaştırma; her iddiaya karşılık gelen bölüm ayrıca kaydedilmeli.
- **D** [Nomadic Niko, Efes](https://nomadicniko.com/turkey/ephesus/) — yerleşim ve fotoğraf referansı, güncel erişim kanıtı değil.
- **E** [UNESCO, Efes](https://whc.unesco.org/en/list/1018/) — bütün alanın genel çerçevesi; her bina ayrıntısını doğrulamaz.
- **F** [ICOMOS 2015 değerlendirme raporu, UNESCO PDF](https://whc.unesco.org/document/151544) — antik kent, çevre ve aday bileşenler; değerlendirme ve nihai listeyi birbirine karıştırma.
- **G** [ÖAW/ÖAI, Efes yapı araştırmaları](https://www.oeaw.ac.at/en/oeai/research/historical-archaeology/historische-bauforschung/ephesos-archaeological-building-research-in-ephesos) — bilimsel çalışma kapısı, tek tek tüm eserler için doğrulama sayılmaz.
- **H** [Encyclopaedia of the Hellenic World, Devlet Agorası PDF](http://constantinople.ehw.gr/forms/filePage.aspx?lemmaId=8213) — PDF arama sonucunda alıntılanan bölümler incelendi; metnin tamamı bağımsız olarak henüz gözden geçirilmedi.
- **I** [TAN, Devlet Agorası](https://turkisharchaeonews.net/object/state-agora-ephesus) ve [kuzeydeki yapılar](https://turkisharchaeonews.net/object/public-buildings-north-state-agora-ephesus) — stoa, agora, Prytaneion ve hamam; iki sayfa aynı yayın ailesi.
- **J** [ÖAW, Celsus koruma çalışması](https://www.oeaw.ac.at/en/news/preserving-world-cultural-heritage-austrian-researchers-start-conservation-of-the-celsus-library-in-ephesos-1) — inşa ve yeniden yapım; tam sayfa incelendi.
- **K** [Quatember, Trajan Çeşmesi projesi](https://www.quatember.at/index.php/en/projects-2/fountain-of-trajan.html) — proje özeti; monografinin tamamı incelenmedi.
- **L** [TAN, Hydreion ve Memmius](https://turkisharchaeonews.net/object/hydreion-and-memmius-monument-ephesus) — ortak çevre ve yorum; tam sayfa incelendi.
- **M** [Scientific Reports, Oktagon kafatası, 2025](https://www.nature.com/articles/s41598-024-83870-x) — özet ve giriş incelendi; makalenin tüm yöntem ve ekleri gözden geçirilmedi.
- **N** [TAN, Hellenistik Heroon](https://turkisharchaeonews.net/object/hellenistic-heroon-ephesus); [Hellenic World Heroon](http://asiaminor.ehw.gr/Forms/fLemmaBody.aspx?lemmaid=8257) — yorum ve ihtiyat.

## Ekran ve veri şeması

Efes pinine bas → **Sesli keşif turu** ve hemen altında **Sesli anlatım kategorileri** → bölge → metin solda, fotoğraf sağda yer kartları → yer detayı. Turdayken **Diğer yerler** aynı kataloğu açar. Ses gerçekten çalıyorsa kategori ve ilgili kart sarı, ayrıca “Şu an çalıyor”; sadece seçiliyse farklı/etiketli. Başka yer seçimi sesi durdurur, kullanıcı oynatmayı başlatır. Bugün uygulamadaki kategoriler yalnız 13 mevcut durağı kapsar.

Yeni veri modeli önerisi: `PlaceRecord` = kalıcı `id`, TR/EN ad, alternatif adlar, `regionId`, birden fazla `typeIds`, `parentId?`, `geometry` (nokta/alan/çizgi ve temsilî nokta), koordinat kaynakları + belirsizlik, kısa/uzun TR/EN metinler ve iddia-kaynak eşleştirmesi, ihtilaflar, güncel erişim kaynağı+tarih+durum, `photos[]`, `audio` dil bazında metin sürümü ve dosya, içerik revizyonu ve yayın durumu. Alanın sınırı bilinmiyorsa hayalî poligon çizilmez.

`Photo` = `id`, özgün dosya bağlantısı, görüntü URL'si, TR/EN açıklama ve alt metni, yaratıcı/istenen atıf, lisans adı+sürümü+bağlantısı, kaynak dosya sayfası, çekim tarihi varsa, kırpma/değişiklik, doğrulama durumu, kapak/galeri sırası. Fotoğraf bulunamazsa boş/yer tutucu; başka yerin resmi veya üretken görsel gerçek fotoğraf yerine kullanılmaz. İçerik durumu `aday → araştırılıyor → kaynak incelemesi → görsel/konum incelemesi → ses bekliyor → QA → yayına hazır`; alanlar ayrı durum taşır.

## Mevcut 13 durağın yeniden kontrol kaydı

Bu kısım önceden yapılan kontrolleri ve bu turda incelenen ek kaynakları özetler; metindeki her ayrıntı için yeniden 2–3 bağımsız kaynak denetimi tamamlandı anlamına gelmez. Bütün pinler yaklaşık, bütün seslerin insan tarafından dinlenmesi ve metinle eşleştirilmesi bekliyor.

| Durak | Güvenli çekirdek ve açık konu | Kaynak / işlem |
|---|---|---|
| Prytaneion | Kutsal ocak, Kuretler ve müzedeki Artemis heykelleri mevcut metinde. | I; önceki kayıt: [Steskal kitap özeti](https://verlag.oeaw.ac.at/produkt/das-prytaneion-in-ephesos/600705), B. Kitap tümü okunmadı. |
| Devlet Agorası | Kamusal alan ve daha eski mezarlık; sınır ve kesin ölçü vermeme. | I, B; H arama alıntısı. Fotoğraf Odeon'a doğru bir bakış; kartta bu söylenmeli. |
| Bazilika Stoası | Kuzey kenarı, boğa başlı başlıklar ve adak. MS 11 ve adak ayrıntısı için I ile H karşılaştırılmalı. | I, H; H'nin PDF tamamı denetlenmeli. |
| Celsus | Aquila, baba Celsus, mezar odası, 1970–78 cephe yeniden kuruluşu J ile destekleniyor. | J, [TAN](https://turkisharchaeonews.net/object/library-celsus-ephesus), B. Restorasyonun güncel saha durumu ayrı kontrol. |
| Büyük Tiyatro | Helenistik köken ve Roma evreleri; kapasite için kesin rakamdan kaçın. | [TAN](https://turkisharchaeonews.net/object/great-theatre-ephesus), [Ancient Theatres](https://ancienttheatrescom.wpcomstaging.com/theatre/ephesus-modern-selcuk-turkey/); E yalnız genel bağlam. |
| Hadrian Tapınağı olarak bilinen yapı | Adlandırma ve işlev yorumunu kesinleştirme; rölyef kopyası/aslı konusunda kaynakları tekrar karşılaştır. | [TAN](https://turkisharchaeonews.net/object/temple-hadrian-ephesus), B, [Quatember makale kaydı](https://www.cambridge.org/core/journals/journal-of-roman-archaeology/article/abs/temple-of-hadrian-on-curetes-street-in-ephesus-new-research-into-its-building-history/C75546F79FF48D0E2E21AAB8D2BEFA55); sonuncusunun tam metni okunmadı. |
| Trajan Çeşmesi | İkinci yüzyıl başı ve adak metni kaynaklarla karşılaştırıldı; mevcut İngilizce ve Türkçe vurgu/detay birebir aynı değil, olgusal düzeyde yeniden karşılaştır. | [TAN](https://turkisharchaeonews.net/object/trajans-nymphaeum-ephesus), [alan tabelası](https://www.hmdb.org/m.asp?m=84519), K. |
| Yamaç Evler | İki kompleks var; mevcut tek pin tümünü temsil eder. Ev 1/2 ve güncel erişim karıştırılmamalı. | [TAN](https://turkisharchaeonews.net/object/terrace-houses-ephesus), [World Archaeology](https://www.world-archaeology.com/features/ephesus-4/), E. |
| Odeon/Bouleuterion | Meclis alanı ve olası gösteri; önceki yapı ihtimali dikkatle anlatılmalı. | [TAN kuzey yapıları](https://turkisharchaeonews.net/object/public-buildings-north-state-agora-ephesus), [Ancient Theatres](https://ancienttheatrescom.wpcomstaging.com/theatre/ephesus-odeum/), B. |
| Ticaret Agorası | Büyük alanı tek nokta temsil ediyor. Augustus evresi ve sonraki düzenleme farklı tarih aralıkları içeriyor; metin ayrıntılı kıyaslanmalı. | [TAN](https://turkisharchaeonews.net/object/commercial-agora-ephesus), [alan tabelası](https://www.hmdb.org/m.asp?m=84363), B. |
| Mazaeus ve Mithridates Kapısı | Yazıt ve MÖ 4–3; kimin kimin azatlısı olduğu açık kaynaklarda farklı aktarılabildiği için bireysel eşleştirme yapılmadı. | [TAN](https://turkisharchaeonews.net/object/gate-mazaeus-and-mithridates-ephesus), [restorasyon](https://www.ephesos.at/en/completed-projects), B. |
| Memmius | L, Gaius Memmius'un yaptırdığını aktarıyor; [Info Ephesus](https://infoephesus.com/memmius-monument-ephesus/) anıtın onun için dikildiğini söylüyor. Mevcut “yaptırdığını” ifadesi ek uzman/yazıt incelemesi gerektiriyor; yeni ses üretmeden çöz. Hydreion ayrı yapı. | L, C; [ÖAI yayın dizini](https://www.oeaw.ac.at/en/oeai/publishing/series/forschungen-in-ephesos) monografi listesi, tam metin değil. |
| Skolastika | Geç antik yenileme ve hamam bölümleri; Varius ile özdeşlik öne sürülmemeli. | [TAN](https://turkisharchaeonews.net/object/scholastica-baths-ephesus), C, B; her cümle için çapraz kontrol açık. |

## 44 aday — kategori ve inceleme şeması

Kısaltmalar: **P** bağımsız pin adayı; **A** geniş alan/çizgi, temsilî işaret düşün; **Ç** ana kompleksin parçası, ayrı pin kararı bekliyor; **D** tartışma veya kimlik kararı. Aşağıdaki anahtarlar araştırmaya giriş içindir, 2–3 bağımsız kaynakla tamamlanmış onay değildir. **Tüm 44'te koordinat, resmî erişim, TR/EN metin, fotoğraf dosyası/lisansı ve QA henüz açık.**

### Üst kent ve Devlet Agorası

| Yer | Model | Tarihî inceleme odağı / başlangıç kaynağı |
|---|---|---|
| Agora merkezindeki tapınak | P, D | İsis mi Roma/Sezar kültü mü; tarih yorumları farklı. I, H, B. |
| Yukarı Hamam / Devlet Agorası Hamamları | P, D | Varius ve Skolastika adları karışıyor; bina kimliği ve evreleri. I, A, D. |
| Laecanius Bassus Çeşmesi | P | Adı, konum ve Pollio'dan farkı. A, B, D. |
| Domitian Meydanı | A | Alan sınırı ve tapınaktan ayrımı. [TAN meydan](https://turkisharchaeonews.net/object/domitian-square-ephesus), G, D. |
| Domitian / imparatorluk kültü tapınağı | P, D | İmparatora atıf ve farklı Flavius yorumları. G, C, B. |
| Pollio Anıtı | P, D | Çeşme ile aynı/ayrı olup olmadığını ve hangi kalıntıyı temsil edeceğini araştır. A, B, D. |
| Domitian Çeşmesi | P, D | Pollio anıtı/çeşmesi ile mükerrerlik ve tarihsel ad çözülmeden pin yok. A, B, D. |
| Chalcidicum | Ç | Basilica Stoa ile ilişkisi ve doğu/batı konumlarının farklı kaynaklardaki kullanımı. I, H. |
| Hydreion | P, D | Memmius'tan ayrı; L, A, D. Ortak koordinat bina girişi değildir. |
| Herakles Kapısı | P | Yer, yeniden kullanılan kabartma ve yapı evreleri. A, B, D. |
| Triodos Meydanı | A, D | Kavşak yeri ve sınırı; Hadrian Kapısı ile mükerrerlikten kaçın. D, N. |

### Kuretler Caddesi ve çevresi

| Yer | Model | Tarihî inceleme odağı / başlangıç kaynağı |
|---|---|---|
| Kuretler Caddesi | A | Çizgisel alan, antik adı ve kullanım evreleri. A, B, D. |
| Alytarkhos Stoası | P/Ç | Caddeye ve dükkânlara ilişkisi. A, C, D. |
| Latrina / kamusal tuvalet | P | Skolastika yakınındaki bağımsız tesisle ilişki. [TAN](https://turkisharchaeonews.net/object/public-latrines-ephesus), B, D. |
| Yamaç Ev 1 | Ç | Mevcut Yamaç Evler pininin alt birimi; ayrıştırılmış görsel ve ziyaret erişimi. A, B, D. |
| Yamaç Ev 2 | Ç | Mevcut kompleksin alt birimi; 1 ile evre, eser ve erişim karışmasın. A, B, D. |
| Oktagon | P, D | M'deki 2025 analizine göre incelenen iskelet erkek çocuk ve Arsinoe IV değil; bütün anıtın tarihçesi, defin evreleri ve kimliği ayrıca incelenecek. A, M, B. |
| Hellenistik Heroon | P, D | Androklos'la eşleştirme yorumdur; yakındaki lahdi otomatik olarak yapıya bağlama. N, B. |
| Heksagon | P | Oktagon ve Heroon'dan ayrı kimlik/konum. A, B, D. |
| Hadrian Kapısı | P, D | Hadrian Tapınağı değil; adanma ve tarih yorumları farklı. A, D, B. |
| Aşk Evi denen yapı | P, D | Genelev işlevi kanıtlanmış kabul edilmez. D, A, B; akademik kaynak gerekli. |

### Kütüphane, agora ve tiyatro

| Yer | Model | Tarihî inceleme odağı / başlangıç kaynağı |
|---|---|---|
| Serapis Tapınağı denen yapı | P, D | Tanrı ve işlev atfı; C, A, B. |
| Mermer Cadde | A | Uzun cadde, bağlantı ve farklı döşeme evreleri. A, D, B. |
| Helenistik Çeşme | P | Tiyatro çevresindeki çeşmenin kimliği ve dönemlendirilmesi. A, B, D. |
| Tiyatro Gymnasionu | P | Kısmen kazılmış kompleks ve erişim. A, D, B. |

### Liman ve kuzey

| Yer | Model | Tarihî inceleme odağı / başlangıç kaynağı |
|---|---|---|
| Liman Caddesi / Arkadiane | A | Aynı cadde için tek kayıt; önceki evreler ve sonradan adlandırma. A, D, B. |
| Verulanus Meydanı/salonu | A, D | Liman hamam/gymnasionu ile ilişki ve ayrı pin. A, B, D. |
| Liman Hamamları ve Gymnasionu | P/A | Kompleks sınırları ve güncel erişim; A, B, D. |
| Antik liman ve kanal | A | Geniş coğrafya, kıyı değişimi ve erişim. E, F, A. |
| Meryem Kilisesi | P | Meryem Ana Evi ile karıştırma; konsil bağlantısı ve yapı evreleri. E, F, D. |
| Meryem Kilisesi Vaftizhanesi | Ç | Kilisenin bölümü; ayrı pin gerekliliği. A, D, B. |
| Bizans Hamamları | P | Ayrı yapı kimliği, tarihleme ve erişim. A, B, D. |
| Stadyum | P/A | Oturma izleri, evreler ve erişim. [TAN](https://turkisharchaeonews.net/object/stadium-ephesus), A, D. |
| Vedius Gymnasionu | P | Yazıt, tarihleme ve erişim. A, B, D. |
| Kent surları | A, D | Helenistik ve Bizans evreleri, geniş çizgi ve belirsiz sınır. A, D, E. |

### Kent çekirdeği dışında / giriş çevresi

| Yer | Model | Tarihî inceleme odağı / başlangıç kaynağı |
|---|---|---|
| Magnesia Kapısı | P, D | Antik kapıyı modern üst girişten ayır. [TAN](https://turkisharchaeonews.net/object/magnesian-gate-area-ephesus), D, B. |
| Doğu Gymnasionu | P | Doğu kapısı çevresi, yapı evreleri ve erişim. A, B, D. |
| Aziz Luka Mezarı denen yapı | P, D | Çeşmeden kiliseye dönüşüm; mezar kimliği kesin değil. D, A, B. |
| Artemis Tapınağı / Artemision | P/A | Çekirdek ören yerinden ayrı; farklı tapınak evreleri. E, F, [Tufts/Perseus](https://www.perseus.tufts.edu/hopper/artifact?name=Ephesos&object=Site&_pc=1). |
| Yedi Uyuyanlar | P/A | Gelenek/efsane ile kazı bulgularını ayır. [Visit İzmir](https://www.visitizmir.org/en/Destination/15263), C, D. |
| Ayasuluk Tepesi ve Kalesi | A/P | Geniş tepe ile kale, bazilika ve ayrı ziyaret alanları ayrıştırılmalı. E, F, D. |
| Aziz Yuhanna Bazilikası | P | Gelenek, erken kilise ve Justinianus evreleri. E, F, D. |
| İsa Bey Camii | P | Yapı tarihi, kullanım ve fotoğraf kuralları. F, [Visit İzmir](https://www.visitizmir.org/en/Destination/15263), C. |
| Meryem Ana Evi | P | Ayrı konum; Meryem'in burada yaşaması inanç/gelenek, arkeolojik kesinlik değil. E, F, D. UNESCO adaylık değerlendirmesi nihai statüyle karıştırılmamalı. |

## Fotoğraf envanteri — bu tur kontrolü

Aşağıdaki **13 mevcut kapak dosyasının** Commons dosya sayfasındaki açıklama, atıf ve lisansına bu tur bakıldı. Bu kontrol dosya sayfası beyanını doğrular; bağımsız saha eşleşmesi veya dış görsel sunucusunun her kullanıcıda çalışacağı garantisi değildir. Fotoğraflar önceki uygulamada zaten tek kapak olarak vardı; yeni bir galeri veya 44 aday için fotoğraf bu aşamada eklenmedi.

| Durak | Mevcut dosya ve fotoğrafçı | Dosyadaki lisans |
|---|---|---|
| Prytaneion | [Elelicht](https://commons.wikimedia.org/wiki/File:Ephesos_Prytaneion.JPG) | CC BY-SA 3.0 |
| Devlet Agorası | [Dosseman, Agora üzerinden Odeon](https://commons.wikimedia.org/wiki/File:Ephesus_State_agora_in_2011_3745.jpg) | CC BY-SA 4.0 |
| Bazilika Stoası | [Rita1234](https://commons.wikimedia.org/wiki/File:Ephesus_basilica2.jpg) | CC BY-SA 3.0 seçeneği |
| Celsus | [Emre D.](https://commons.wikimedia.org/wiki/File:Ephesus_Library_of_Celsus.jpg) | CC BY-SA 4.0 |
| Büyük Tiyatro | [Benh LIEU SONG](https://commons.wikimedia.org/wiki/File:Ephesus_Amphitheatre_(6998768420).jpg) | CC BY-SA 2.0 |
| Hadrian olarak bilinen yapı | [Mehveuuum](https://commons.wikimedia.org/wiki/File:Temple_of_Hadrian_at_Ephesus.jpg) | CC BY-SA 4.0 |
| Trajan Çeşmesi | [Carole Raddato](https://commons.wikimedia.org/wiki/File:The_Fountain_of_Trajan,_Ephesus,_Turkey_(18818526443).jpg) | CC BY-SA 2.0 |
| Yamaç Evler | [Ronan Reinart](https://commons.wikimedia.org/wiki/File:Ephesus_Terrace_Houses.jpg) | CC BY-SA 3.0 |
| Odeon | [Mehveuuum](https://commons.wikimedia.org/wiki/File:The_Odeon_at_Ephesus_01.jpg) | CC BY-SA 4.0 |
| Ticaret Agorası | [Erik Cleves Kristensen](https://commons.wikimedia.org/wiki/File:The_Commercial_Agora_(13975446283).jpg) | CC BY 2.0 |
| Mazaeus ve Mithridates | [José Luiz Bernardes Ribeiro](https://commons.wikimedia.org/wiki/File:16.1_Mazeus-Mithridates_Gate_in_Ephesus.JPG) | CC BY-SA 3.0 |
| Memmius | [Ashokmehta72](https://commons.wikimedia.org/wiki/File:Memmius_monument_(Ephesus)_Turkey.jpg) | CC BY-SA 4.0 |
| Skolastika | [José Luiz Bernardes Ribeiro](https://commons.wikimedia.org/wiki/File:11.2_Scholastikia_Baths_in_Ephesus.JPG) | CC BY-SA 3.0 |

**Ek galeri adayı:** [Marcus Cyron, Ephesos in 2010 39](https://commons.wikimedia.org/wiki/File:Ephesos_in_2010_39.JPG), CC BY-SA 3.0. Commons açıklaması yalnız “Efes kalıntıları” der; Commons bu dosyayı Celsus iç mekânı kategorisine de koyar. Yapı/açı eşleşmesi bağımsız görsel incelemeden geçmeden galeriye eklenmez. ÖAW Celsus fotoğrafları telifli işaretli; sadece araştırma referansı, açık lisans kanıtı olmadan kullanılmaz.

## Aşamalar ve tamamlanma kapıları

1. **Aday kartı ve kategoriler:** 57 kaydı kalıcı ID ve ilişkiyle ayrıştır; 44 adayın hangi bölüm/alan/ayrı pin olacağına karar ver. Kullanıcıların gördüğü 13 durağa zarar verme.
2. **İddia ve konum denetimi:** Her yapı için 2–3 bağımsız kaynak, kaynakların ilgili sayfası/bölümü, karşı görüşler; iki konum kaynağı ve farkı; uzman incelemesi gerekenleri beklet. Resmî erişimi ayrı doğrula.
3. **Görsel paketi:** Her yapı için gerçek ve lisanslı kapak; mümkünse farklı açılardan 2+ ek fotoğraf. Dosya bazında lisans ve tanımlama. Fotoğraf yoksa eksik olarak göster; sahte eşleştirme yapma.
4. **Metin:** Türkçe ve İngilizce taslak, olguların eşdeğerliği, hassas/tartışmalı ifadeler ve kaynaklar kontrol edilir. Çelişkili mevcut metin düzeltilirse mevcut iki dilin sesleri de güncellenir.
5. **Daha sonra seslendirme:** Onaylı son metinlerden dil başına kayıt; ses/metin sürümü eşitliği ve insan dinlemesi. Bu görevde yeni ses üretilmedi.
6. **Uygulamaya geçiş:** Önce küçük grup, sonra geri kalanlar; fotoğraf ve harita yüklenememe, TR/EN geçiş, ekran okuyucu, aktif ses göstergesi, mobil/masaüstü, performans ve erişim testleri. Bağımsız inceleme olmadan tamamlandı sayma.
