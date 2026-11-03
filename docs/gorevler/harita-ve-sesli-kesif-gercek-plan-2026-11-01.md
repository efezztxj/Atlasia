# Atlasia — harita ve sesli keşif için gerçek durum ve uygulama planı

**Tarih:** 1 Kasım 2026
**Kapsam:** Atlasia’nın mevcut haritası ve birlikte tasarlanan harita + durak + sesli anlatım ekranının gerçek ürün olarak çalışması. Bu belge plan/incelemedir; değişikliklerin uygulandığı veya yayımlandığı anlamına gelmez.

## 1. Önce terimleri ayıralım

- **OpenStreetMap (OSM):** topluluk tarafından oluşturulan harita verisi. Veri, harita görseli/barındırma hizmeti ve sesli rehber içeriği birbirinden farklı şeylerdir.
- **OpenFreeMap:** OSM tabanlı haritayı sunan ayrı bir sağlayıcı. Mevcut Atlasia kodunda Karanlık altlıkta kullanılır.
- **MapLibre:** haritayı tarayıcıda gösteren açık kaynaklı kütüphane. Atlasia kullanıyor.
- **Esri:** mevcut uydu, sokak ve topoğrafik katmanların sağlayıcısı.
- **Sesli tur metni/fotoğrafı:** harita karolarından otomatik olarak gelmez; ayrı kaynak, doğrulama ve kullanım hakkı gerekir.

## 2. Gerçek durum: kodda gördüklerimiz

| Konu | Kanıt ve durum | Eksik/riski |
|---|---|---|
| Harita motoru | `src/components/MapView.tsx` MapLibre GL kullanıyor; worker uygulama paketinden yükleniyor. | Görünüm yeniden boyama ve gerçek cihazlarda WebGL/karolar ayrıca denenmeli. |
| Altlıklar | `MapView.tsx:184–226`: Karanlık OpenFreeMap; uydu/sokak/topoğrafik Esri; 3B yükselti AWS. `Explorer.tsx:125`: kayıtlı tercih yoksa uydu varsayılan. | Her katmanın ağ, erişim, kullanım şartları ve gerçek cihaz davranışı aynı değil. Uygulama teması ile altlık tercihi ayrı. |
| Harita görünmeme sorunu | Sandbox komutundan `tile.openstreetmap.org` ve `tiles.openfreemap.org` bağlantıları başarısız oldu. Kullanıcının önceki bağımsız önizlemesinde beyaz alan görüldü. | Sandbox çıkış kısıtı doğrulandı; **kullanıcı tarayıcısındaki tek kök neden henüz kanıtlanmadı**. DevTools ağ/CSP/WebGL hataları ve doğrudan tarayıcı denemesi gerekli. Bu, canlı Atlasia’nın kesin bozuk olduğu anlamına gelmez. |
| Bağımsız prototip | `mockups/atlasia-sesli-kesif-openmap.html`: gerçek OSM karo katmanı denemesi + başarısızlıkta şematik görsel. Önizleme ayrı HTML/Python sunucu, gerçek uygulama değil. | Geçici prototipte `tile.openstreetmap.org` doğrudan çağrılıyor; üretim mimarisi olarak kabul etmeyin. MapLibre stilinin yüklenmesi karo göründüğünü garanti etmez. |
| Hata görünürlüğü | `MapView.tsx:636` hazır durumunu `style.load` ile açıyor; incelenen `MapView` içinde karo/ağ hatası için kullanıcıya özel `map.on('error')` akışı görülmedi. `Explorer`’daki mevcut veri uyarısı harita karo hatasıyla aynı şey değildir. | Stil hazır olsa bile karolar gelmeyebilir; beyaz/boş harita için tanı, tekrar dene ve erişilebilir hata mesajı tasarlanmalı. |
| Telif/atıf | `MapView.tsx` otomatik atıfı kapatıyor; `src/index.css` kontrolü gizliyor. `Explorer.tsx:1344` metin atfı yalnız `md:block`, mobilde gizli ve tıklanamaz (`pointer-events-none`). | Mobilde ve tüm altlıklarda görünür/tıklanabilir, uygun sağlayıcı ve OSM atfı ihtiyacı var; mevcut ekranda başka görünür atıf olup olmadığını gerçek cihazda ayrıca doğrula. |
| Güvenlik politikası | `public/_headers`: OpenFreeMap ve Esri `connect-src` içinde; `*.openstreetmap.org` resimler için izinli, ancak doğrudan `tile.openstreetmap.org` MapLibre fetch çağrısı için `connect-src` içinde açıkça yok. | Bağımsız önizlemenin Python sunucusu Cloudflare CSP’sini uygulamaz. Üretime yeni alan adı eklenirse CSP ve CORS test edilmeli; güvenliği geniş jokerle gevşetme. |
| Durak ve yürüyüş yolu | `src/data/siteTours.ts`: mevcut Efes geometrisi elle çizilmiş; `isRealPath()` tüm turlarda false döner. `docs/icerik/site-turlari.md` kaynak zinciri ve test ölçütlerini açıklar. | Hiçbir tur için doğrulanmış kesintisiz yürüyüş geometrisi olduğu iddia edilemez; kuş uçuşu veya şematik çizgi navigasyon değildir. Efes’in eski süre/mesafe ve durak konumları da yayın öncesi ayrı kontrol ister. |
| İçerik ve fotoğraf | Prototipte metinler iki kaynaktan çapraz kontrol edildi, ancak prototip görseli yapay zekâ üretimi; OSM kareleri fotoğraf sağlamaz. | Her durak için kaynak/kimlik/tarih ve metin; gerçek fotoğrafta dosya bazında lisans, yazar, atıf ve yer eşleşmesi doğrulanmalı. Sahada doğrulama yapılmadı. |
| Ses | `NearbyAudioGuide.tsx`: mevcut ürün tarayıcının `SpeechSynthesis` motorunu kullanır; kullanıcı başlatır. | Tasarımdaki süre/sarma ses kaydı gibi güvenilir değil; sahte süre gösterilmez. iOS/Android, hata ve arka plan davranışı doğrulanmalı. |
| Konum | `useGeolocation.ts`: kullanıcı talebiyle konum ister; doğruluk bilgisi, ret, zaman aşımı ve izin geri alma durumları var. | İzin gerektirmeyen tur inceleme, izin reddi, GPS belirsizliği ve sahada konum doğruluğu akışları test edilmeli. |
| Offline | `OfflinePackage.tsx` yalnız Karanlık/OpenFreeMap paketini vaat eder; Esri ve arazi dışarıda. `docs/denetim/p15-lisans.md` mevcut sınırları açıklar. | iOS/Android uçak modunda paket ve eksik indirme testleri; sesin paket kapsamına girip girmediği açıkça belirtilmeli. Doğrudan OSM standart tile sunucusuna offline prefetch uygulanamaz. |
| Otomatik test | `e2e/smoke.spec.ts` dış karo isteklerini sahte boş yanıtlarla karşılıyor. | Testin yeşil olması gerçek harita karolarının ağdan geldiğini veya okunur olduğunu kanıtlamaz. Ayrı gerçek sağlayıcı cihaz testi gerekir. |

## 3. Sağlayıcı ve kullanım politikası

**Öneri:** Mevcut Atlasia altyapısını koruyarak, OSM verisi için önce var olan **OpenFreeMap + MapLibre** katmanını değerlendir; Esri uydu/sokak/topo mevcut tercihleri değişmeden kalır. Kullanıcının istediği OSM verisini sağlamanın tek yolu OSM Vakfı’nın doğrudan raster sunucusu değildir. Kullanıcı yeni servis veya ücretli altyapı onaylamadan eklenmez.

- [OpenFreeMap resmi sayfası](https://openfreemap.org/) verinin OSM’den geldiğini, görünür atfı, offline indirme sınırlarını ve kamu sunucusunda SLA garantisi bulunmadığını belirtir. Offline için her indirme ≤3.000 karo **veya** 50 MB, ≤4 paralel istek ve uygulamayı tanımlayan benzersiz User-Agent şartı yazılıdır; web tarayıcısında User-Agent kontrolü kısıtlı olduğundan mevcut uygulamanın bu koşula uyumu **ayrıca doğrulanmalı**, otomatik kabul edilmemeli. Sağlayıcı şartları ve lisanslar yayımlama öncesi tekrar kontrol edilir.
- [OSM standart tile politikası](https://operations.osmfoundation.org/policies/tiles/) normal kullanıcı görüntülemesini koşullarla kabul eder; görünür atıf, Referer ve önbellek kuralları ister, önceden toplu indirme/offline kullanımı yasaklar ve SLA sunmaz. Dolayısıyla doğrudan `tile.openstreetmap.org` offline paket kaynağı olarak kullanılamaz. Depodaki `docs/denetim/p15-lisans.md` daha korumacı biçimde uygulamada bu sunucuyu kullanmamayı önerir.
- Sağlayıcıya bağlılık için kesinti, hizmet şartları, kullanım hacmi, maliyet, lisans ve gizlilik incelenir; tek kamu sunucusunu kesintisiz garanti gibi sunmayız. Alternatif/self-host/ücretli hizmet yalnız ayrı karar ve onayla değerlendirilir.
- Haritadaki **fotoğraflar** için ayrıca hak sahibi ve lisans kaydı gerekir. Kullanıcının gönderdiği ekran görüntüsü ve üretim lisansı doğrulanmamış görsel kullanılmaz.

## 4. Sıralı uygulama planı

### P0. Kök nedeni kanıtla ve boş haritayı önle

1. Kullanıcı tarayıcısında canlı önizleme URL’sini ve ağ sekmesindeki ilgili hatayı incele: karo URL’si/status, DNS/ağ, CORS, CSP, worker, WebGL ve ekran boyutunu ayır. Kişisel veri/konum veya kimlik bilgilerini kaydetme. Sandbox dış erişim kısıtını tarayıcı hatasıyla karıştırma.
2. Mevcut uygulamadaki `MapView` ile taslak aynı testte karşılaştırılsın. Ayrı HTML’deki doğrudan OSM deneyinin üretim için varsayılan olması durdurulsun.
3. Stil hazır / veri yükleniyor / görünür karolar başarılı / kısmi ya da tam hata gibi durumlar tanımlansın. Her tile hatasında haritayı kapatmak yerine ilgili aktif kaynağa ve kapsamına göre karar verilsin. Kullanıcıya yeniden dene, alternatif katman ve gerekiyorsa dış harita bağlantısı sağlansın; şematik görsel harita gibi gösterilmesin.
4. **Kabul:** Harita sağlayıcısı kapalı, kısmi karo hatası, gecikme ve WebGL başlatılamama senaryolarında boş beyaz ekran yerine doğru mesaj/eylem; geri dönüşte başarı. Gerçek tarayıcıda karo göründüğünün ayrıca kanıtı. Özel ağ kısıtı açılmadan gerçek sağlayıcı testi geçti sayılmaz.

### P0. Lisans/atıf ve kaynak güvenliği

1. Aktif harita katmanına uygun, **mobilde de görünür ve erişilebilir** atıf alanını tasarla. Gereken OSM / OpenMapTiles / OpenFreeMap / Esri kaynak ve lisans bağlantılarını katman bazında güncel sağlayıcı şartlarıyla karşılaştır; alttaki kart atfı kapatmasın.
2. Yeni kaynak gerekiyorsa CSP `connect-src`, `img-src`, `worker-src`, CORS, HTTPS ve Referrer’ı en dar gerekli kapsamla değerlendir. Tarayıcıdan doğrudan özel User-Agent ayarlanabileceğini varsayma. Mevcut offline allowlist ve Esri/OSM bulk yasağı gevşetilmez.
3. **Kabul:** 3 tema, mobil/masaüstü ve her etkin altlıkta atıf görünür/tıklanabilir; kaynak ve offline uyumu kaydı güncel; hiçbir yetkisiz prefetch yok.

### P0. Sesli keşif ekranı ve veri sözleşmesi

1. Tasarlanan ekranı gerçek `Explorer`/`MapView` ile entegre et: tur aç/kapat, durak listesi ↔ harita işaretçisi ↔ alt kart senkron, geri dönüş, konumsuz manuel inceleme, boş/hata durumları.
2. Tur/durak veri modeline kaynak kimliği, koordinat ve erişim tarihi, içerik kaynağı/lisansı ve doğrulama düzeyi ekle veya mevcut modelin taşıdığını kanıtla. OSM/başka kaynaktaki bir temsil noktası, saha yürüyüş konumu demek değildir.
3. Her içerik iddiasını iki bağımsız güvenilir kaynaktan karşılaştır; uyuşmazlık veya belirsizlik varsa metni daralt/işaretle, çıkarsama yapma. Görseller için gerçek mekân eşleşmesi ve lisans denetimi ayrı; yoksa görselsiz kart.
4. Mevcut TTS’yi kontrollü yeniden kullan: kullanıcı başlatır; durak/tur değişimi eski sesi kapatır; desteklenmeyen/hata durumunda metin açılır. Motor gerçek süre sağlamıyorsa süre ve sarma gösterme.
5. **Kabul:** Doğru tur verisiyle üç tema, manuel/konum izinli kullanım, durak seçimi ve ses güvenilir çalışır; yeni tur yoksa doğru boş durum. Harita ve ses ekranı bağımsız kullanıcı akışı olarak test edilir.

### P0. Rota gerçekliği ve saha doğrulaması

1. İlk sürümde güvenilir yürüme geometrisi yoksa **durak işaretçileri ile sınırla**. Temsili çizgi gösterilmesi ayrı ürün kararıdır; sunulursa açıkça şematik olduğu belirtilir ve navigasyon gibi gösterilmez. Mesafe/süre bilinmiyorsa bilinmiyor göster.
2. Gerçek yol istenirse park yetkilisinin güncel ziyaretçi rotası/erişim kuralları ve OSM vb. açık verileri karşılaştır. `highway=footway/path/pedestrian`, way/node zinciri, sürüm, lisans, erişim/kapanış, duraklara bağlantı ve saha gözlemi kayıt altına alınır. OSM’de yol bulunması tek başına sahada erişim, güvenlik veya engelsiz rota garantisi değildir.
3. Gerçek yol niteliği yalnız doğrulama kanıtı ve regresyon testleriyle değişir; `isRealPath()` testleri noktaların sayısıyla gevşetilmez.
4. **Kabul:** İddia edilen her rota için kaynak ve saha kanıtı; aksi hâlde çizgi/navigasyon vaat edilmez. Konum hassasiyeti ve GPS hata payı kullanıcıya açık.

### P0. Performans, erişilebilirlik ve cihaz testleri

- iOS Safari / Android Chrome: ilk açılış, yakınlaştırma, iki parmak etkileşimi, kartı aç/daralt, durak seçimi, ses ve izin reddi, sekme arka plan/dönüş, 3 tema, küçük ekran/ekran okuyucu, atıf görünürlüğü. Test kayıtları cihaz/OS/tarayıcı/tarih/commit ile tutulur.
- Otomatik test: ağdan bağımsız sabit stub + karo gecikmesi/403/404/timeout, fallback ve tekrar dene, tur kapanınca katman temizliği, pano/kart seçim senkronu, yanlış koordinat, klavye/odak. Ardından ayrı izinli gerçek ağ/canlı test; boş/stub’lı tile sonucu gerçek harita sayılmaz.
- Ölçümler: gerçek ağda ilk görünür harita, kart açılışı, bellek, cihaz ısısı/akışkanlık ve veri tüketimi; taban çizgisi kaydedilmeden keyfî performans skoru ilan etme. WebGL kaybı ve geri dönüş kontrolü.
- **Kabul:** Kritik P0 açık değil; test/ölçüm kanıtları mevcut, gerçek cihazlarda harita ve atıf görünür, eksik destek açıkça belgelenmiş.

### P1. Çevrimdışı, izleme ve dayanıklılık

- Yalnız lisansına uygun ve mevcut üründe desteklenen OpenFreeMap Karanlık paketini gerçek cihazda uçak modunda doğrula: ön koşullar, kota, kısmi indirme/iptal, stale içerik ve silme. Ses ve başka katmanları destekleniyormuş gibi yazma.
- Sağlayıcı başarısızlıklarını minimum veriyle, uygun rıza/gizlilik ve mevcut ölçüm kararına göre izle. Harita hata verisine hassas koordinat, tam sorgu veya kişisel kimlik ekleme. SLA/sorumlu, destek ve geri dönüş yolu belirle.

## 5. Kararlar, bağımlılıklar, süre

1. İlk gerçek sürüm için öneri: **mevcut OpenFreeMap tabanı + mevcut MapLibre**, diğer harita seçenekleri korunarak; gerçek yürüyüş geometrisi yoksa durak odaklı deneyim. Onay ve sağlayıcı/atıf kontrolü gerekir.
2. Önizleme için dış karo erişimini mümkün kılan ortam veya kullanıcının tarayıcısında izinli gerçek ağ testi gerekir. Proxy/anahtar/ücretli servis kendiliğinden eklenmez.
3. İlk kapsamdaki tur ve duraklar, onaylı metin/fotoğraf hakları ve saha kontrolünden sorumlu kişi seçilmeli.
4. Yaklaşık sıralama: tanı/karar **1–2 gün**, harita hata ve atıf **2–4 gün**, tur ekranı/ses ve otomatik test **1–2 hafta**, gerçek cihaz ve saha doğrulaması **erişime bağlı**. Bunlar ölçülmüş taahhüt değil; gerçek rota, lisans ve saha belirsizliği kritik yolu uzatabilir.

## 6. Yayın kapısı

- Gerçek harita en az iOS Safari ve Android Chrome’da gösteriliyor; başarısızlıkta geri dönüş var.
- Mobil de dahil lisans/atıflar doğru ve görünür.
- Tur içerik ve koordinat kaynakları kontrol edilmiş; doğrulanmamış yol yol tarifi olarak gösterilmiyor.
- Ses, konum izni, üç tema ve erişilebilirlik akışları test edilmiş; saha/cihaz kanıtı kaydedilmiş.
- Otomatik test, typecheck, lint, build ve ilgili CI kuralları başarılı; Java 21 emülatörü bu sandbox’ta eksik olduğu için bu tur geçmiştir denemez. Bağımsız inceleme ve gerekli onaylar tamam.

**İncelemenin sınırı:** Depo ve resmi sağlayıcı politikaları okundu; sandbox ağ denemesi yapıldı. Gerçek iOS/Android cihaz, kullanıcı tarayıcısının ağ konsolu, canlı harita servisi ve saha gezisi bu incelemede doğrulanmadı. Mevcut yerel başka değişikliklere dokunulmadı.
