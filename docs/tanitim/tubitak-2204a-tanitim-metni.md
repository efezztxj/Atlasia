# Atlasia — TÜBİTAK 2204-A Tanıtım ve Başvuru Metinleri (v2)

Bu dosya, Atlasia projesinin **TÜBİTAK 2204-A Lise Öğrencileri Araştırma
Projeleri Yarışması** başvurularında kullanılabilecek metinleri içerir.

**v2'de değişenler:** araştırma sorusu eklendi; ürün etiketi "MVP" değil
"test edilmiş, pilot öncesi beta" olarak düzeltildi; karşılaştırma tablosu,
ölçülebilir değerlendirme ölçütleri, öğrenci katkısı, dürüst proje sınırları,
İngilizce özet ve kaynakça bölümleri eklendi.

Başvuru sahibine özgü bilgiler (ad, okul, danışman öğretmen, il) başvuru
sırasında eklenmelidir. Kategori olarak **Yazılım / Bilgisayar** önerilir;
güncel kategori listesi TÜBİTAK kılavuzundan doğrulanmalıdır.

---

## 1. Proje Özeti (formlar için — yaklaşık 150 kelime)

**Atlasia**, bir yere gittiğinizde orada ne yapacağınızı planlamanızı
kolaylaştıran; keşif haritası, açıklanabilir rota planlama, konum tabanlı sesli
rehber ve topluluk paylaşımlarını tek uygulamada birleştiren ücretsiz bir
web/PWA seyahat platformudur. Kullanıcılar gerçek uydu görüntüleri üzerinde
dünyayı keşfeder, gezginlerin bıraktığı ipuçlarını bulur ve kendi keşiflerini
haritaya bırakır. Atlasia; yürüyüş, bisiklet, araç ve toplu taşıma seçenekleriyle
gün bazlı gezi rotaları üretir ve her rotanın neden böyle kurulduğunu durak durak
açıklar. Yaklaşılan noktalarda devreye giren sesli rehber, tarihi ve doğal yerleri
cihazınızın sesiyle anlatır. Proje; OpenStreetMap, Wikidata ve Vikipedi gibi açık
ve doğrulanabilir kaynaklara dayanır; doğrulanamayan bilgiyi gizlemek yerine açıkça
işaretler. Test altyapısına sahip, pilot öncesi beta aşamasındaki Atlasia'nın
araştırma sorusu şudur: açıklanabilir ve doğrulanabilir bir dijital rehber,
ziyaretçinin planlama süresini ve atladığı durak sayısını azaltabilir mi?

---

## 2. Uzun Tanıtım / Başvuru Metni (jüri için)

### Projenin Adı, Alanı ve Durumu

**Atlasia** — Yazılım / Bilişim teknolojileri: konum tabanlı, topluluk destekli
seyahat keşif ve gezi planlama platformu. Proje durumu: **çalışan, test edilmiş,
pilot öncesi beta** (fikir veya MVP değil).

### Araştırma Sorusu

*Sınırlı süresi olan bir ziyaretçi için; açık ve doğrulanabilir kaynaklara
dayanan, açıklanabilir rota planlama ve konum tabanlı sesli anlatım sunan bir
dijital rehber; gezi planlama süresini ve atlanan ilgi noktası sayısını
azaltabilir mi?*

### Varsayım (Hipotez)

Durak sıralamasını ve süre bütçesini **gerekçeli** üreten bir planlayıcı ile
konuma duyarlı anlatım birleştirildiğinde; kullanıcıların planlama süresi kısalır,
gezilerinde kaçırdıkları ilgi noktası azalır ve ziyaret memnuniyeti artar.

### Problem

Bir yeri ziyaret ederken karşılaşılan temel sorunlar şunlardır: *"Burada ne
yapmalıyım?"*, *"Hangi sırayla gezmeliyim?"* ve *"Bu yer hakkında doğru bilgiyi
nereden bulurum?"* Ticari rehber uygulamaları ücretlidir, reklamla çalışır veya
kullanıcının ilgisini ölçtükleri için gizliliği zedeler. Harita uygulamaları yol
tarifinde iyidir ama bir bölgeyi veya ören yerini gezmek için gereken "sıralı,
gerekçeli ve anlatımlı" planı sunmaz. Seyahat blogları ve sosyal medya içeriği ise
dağınık, doğrulanmamış ve yer yer güncelliğini yitirmiştir. Sonuçta zamanı sınırlı
bir ziyaretçi, ya rehber/uygulama ücreti öder ya da önemli noktaları atlayarak
gezisini tamamlar.

### Amaç

Atlasia'nın amacı; herkesin ücretsiz erişebileceği, doğrulanabilir kaynaklara
dayanan ve kullanıcısını adım adım yönlendiren bir dijital gezi rehberi
oluşturmaktır. Hedef; kullanıcıya (1) gideceği bölge için **ne zaman, hangi
sırada, hangi duraklarla** gezeceğini gösteren açıklanabilir bir rota, (2) yerinde
konuma duyarlı sesli anlatım, (3) başkalarının keşiflerinden öğrenme ve kendi
keşfini paylaşma imkânı sağlamaktır.

### Yöntem

Proje, aşağıdaki bilimsel ve mühendislik adımlarıyla geliştirilmiştir:

1. **İhtiyaç analizi:** Seyahat planlamada karşılaşılan zaman kaybı, bilgi
   dağınıklığı ve maliyet sorunları belirlenmiştir.
2. **İki ölçekli modelleme:** Planlama problemi iki ayrı ölçeğe ayrılmıştır:
   *bölge ölçeği* (km — "Kapadokya'da 1 gün") ve *site ölçeği* (yüz metre —
   "Efes içinde 3 saat"). Bölge ölçeğinde durak sıralamasını ve süre bütçesini
   hesaplayan bir rota motoru; site ölçeğinde doğrulanmış yürüyüş yolu üzerinde
   ilerleyen tur rehberi kullanılmıştır.
3. **Açıklanabilir rota planlama:** Rota motoru; mesafe, ulaşım hızı, durak
   kategorileri ve kalan süre bilgisini kullanarak en fazla 7 duraklı bir gezi
   planı üretir ve her rotayı gerekçeleriyle açıklar. Üretilen çizgilerin durakları
   bağladığı, yol navigasyonu olmadığı kullanıcıya açıkça bildirilir.
4. **Kaynak doğrulama protokolü:** Durak koordinatları ve yer bilgileri
   OpenStreetMap, Wikidata ve Vikipedi gibi açık kaynaklardan alınmış; bilgiler
   kopyalanmak yerine yeniden yazılmıştır. Doğrulanamayan bilgiler **"Doğrulanmadı."**
   olarak işaretlenmiştir. Ören yeri yürüyüş yolları, gerçekten var olan OSM patika
   verisiyle eşleştirilmedikçe "gerçek yol" kabul edilmemiştir. Bu protokol,
   projenin tekrarlanabilir ve denetlenebilir yöntem bileşenidir.
5. **Geliştirme ve doğrulama:** Uygulama React 19, TypeScript ve Vite ile
   geliştirilmiş; her sürüm otomatik test hattından (tip kontrolü, lint, birim
   testleri, veritabanı güvenlik kuralları testleri, üretim derlemesi)
   geçirilmiştir. Veri güvenliği, uygulama katmanında değil veritabanı güvenlik
   kurallarında tanımlanmış ve emülatör ortamında test edilmiştir.
6. **Değerlendirme planı:** Aşağıdaki ölçülebilir göstergeler pilot çalışmasında
   toplanacaktır (aşağıya bkz. "Ölçülebilir Göstergeler").

### Ölçülebilir Göstergeler (pilot'ta doldurulacak)

> Aşağıdaki alanlar, yarışma raporunda gerçek verilerle doldurulacaktır.
> Şu ana kadar uydurma sayı üretilmemiştir; boşluklar bilinçli olarak
> "pilot'ta toplanacak" biçiminde bırakılmıştır.

| Gösterge | Ölçüm yöntemi | Hedef |
|---|---|---|
| Planlama süresi | Görev tamamlama testi (katılımcı başına) | [pilot'ta toplanacak] |
| Atlanan durak sayısı | Karşılaştırmalı saha denemesi | [pilot'ta toplanacak] |
| Kullanıcı memnuniyeti | Kısa anket (5'li Likert) | [pilot'ta toplanacak] |
| Rota motoru tutarlılığı | Otomatik testler (süre bütçesi, durak kapsaması) | %100 otomatik doğrulama |
| İçerik doğrulanabilirliği | Kaynaklı durak oranı / "Doğrulanmadı." işaretli bilgi oranı | Raporlanır |

### İlgili Çalışmalarla Karşılaştırma

| Özellik | Harita/yol tarifi uygulamaları | Ücretli sesli rehber uygulamaları | Blog / sosyal medya | **Atlasia** |
|---|---|---|---|---|
| Yol tarifi | ✓ | ✗ | ✗ | Sınırlı (bkz. Proje Sınırları) |
| Sıralı gezi planı + süre bütçesi | ✗ | Kısmi | ✗ | **✓ gerekçeli** |
| Konum tabanlı sesli anlatım | ✗ | ✓ (çoğu ücretli/paketli) | ✗ | **✓ ücretsiz** |
| Topluluk izleri ve paylaşım | Yorumlar | ✗ | Dağınık | **✓ yerleşik** |
| Kaynak doğrulama + "Doğrulanmadı." etiketi | ✗ | ✗ | ✗ | **✓** |
| Ücretsiz ve kurulumsuz (PWA) | Kısmi | ✗ | ✓ | **✓** |

### Yenilikçilik (Özgünlük)

- **İki ölçekli keşif modeli:** Bölge planlaması (rota motoru) ile site içi
  rehberliği (tur anlatımı) aynı uygulamada, birbirine karıştırılmadan birleştirir.
- **Açıklanabilir planlama:** Rota bir "kara kutu" değil; neden bu durakların, bu
  sırayla seçildiğini anlatan, dürüst sınırlarını kullanıcıdan gizlemeyen bir
  sistemdir.
- **Konum tabanlı sesli rehber:** Yaklaşılan noktayı otomatik algılayıp cihazın
  kendi ses senteziyle (Türkçe) anlatım yapan, ek ücret veya donanım gerektirmeyen
  bir rehberlik deneyimi.
- **Doğrulanamayanı işaretleme ilkesi:** Bilinmeyen bilgi uydurulmaz veya gizlenmez;
  "Doğrulanmadı." olarak dürüstçe etiketlenir. Bu yaklaşım, özellikle genç
  kullanıcılar için güvenilir bilgi alışkanlığı kazandırır.
- **Erişilebilirlik ve gizlilik:** Ücretsiz, kurulum gerektirmeyen web/PWA; açık
  harita verisiyle çalışan, kullanıcı izini cihazında tutan, reklam amaçlı
  profillemeye dayanmayan bir yapı.

### Öğrenci Katkısı

Projede öğrencinin doğrudan emeği olan başlıca bileşenler: iki ölçekli planlama
modelinin tasarımı, rota motorunun durak sıralama ve süre bütçesi mantığı,
kaynak doğrulama protokolünün uygulanışı (OSM/Wikidata/Vikipedi eşleştirmesi),
birim ve güvenlik kuralları testlerinin yazımı, ören yeri tur içeriklerinin
hazırlanması ve "Doğrulanmadı." etiketleme disiplininin sürdürülmesi. (Rapor
sürümünde bu katkı, geliştirme günlüğü ile belgelenecektir.)

### Proje Sınırları (Dürütlük Notu)

- Rota çizgileri durakları birleştiren düz çizgilerdir; **yol/patika navigasyonu
  değildir** ve uygulama bunu kullanıcıya açıkça bildirir.
- Ören yeri turlarında yürüyüş yolları yalnızca OSM'de doğrulanabilen yerlerde
  "gerçek yol" olarak işaretlenir; doğrulanamayan temsili çizgiler gerçek yol
  sayılmaz.
- Ücret, çalışma saati ve sezon gibi değişken bilgiler doğrulanamadığında
  "Doğrulanmadı." olarak bırakılır.
- Bazı arayüz bileşenleri (ör. bildirim içeriği) iskelet aşamasındadır; kapsam
  bilinçli olarak pilot sonrasına planlanmıştır.

Bu sınırlar projenin eksik listesi değil, **bilimsel dürütlüğün gereği olarak
beyan edilen kapsam sınırıdır**; yarışma raporunda da aynen korunmalıdır.

### Teknik Altyapı

- React 19 + TypeScript, Vite, Tailwind CSS arayüzü
- MapLibre GL ile açık kaynak harita ve gerçek uydu görüntüleri
- Firebase Authentication, Firestore ve App Check ile kimlik, veri ve istemci
  bütünlüğü katmanı
- OpenStreetMap tabanlı arama (Photon), Wikimedia Commons görsel galerisi
- PWA desteği: çevrimdışı paket, bağlantı durumu bildirimleri
- GitHub Actions ile sürekli entegrasyon (test + güvenlik taraması); Cloudflare
  üzerinden yayın

### Beklenen Sonuçlar ve Toplumsal Fayda

- Ziyaretçilerin sınırlı zamanını daha verimli, daha bilinçli kullanması;
  önemli noktaların atlanmaması.
- Ücretsiz nitelikli gezi planlama imkânıyla bilgi erişiminde eşitlik: pahalı
  rehber uygulamalarına veya tura bağımlılığın azalması.
- Az bilinen yerlerin ve yerel işletmelerin keşfedilmesiyle yerel turizme katkı;
  topluluk üyelerinin bıraktığı ipuçlarıyla kolektif bilgi birikimi.
- Açık veri (OpenStreetMap, Wikidata) okuryazarlığı; doğrulanabilir kaynak
  kullanımı ve dijital gizlilik farkındalığının artması.
- Teknolojiyi yalnız tüketen değil, üreten bir gençlik örneği: tasarım, test,
  güvenlik ve sürüm süreçleriyle uçtan uca mühendislik deneyimi.

---

## 3. Madde Madde — Sunum / Afiş Materyali

### Atlasia nedir?

- Gerçek uydu görüntüleriyle dünyayı keşfettiğiniz, gezginlerin ipuçlarını
  bulduğunuz ve kendi keşfinizi haritaya bıraktığınız ücretsiz seyahat platformu.
- Web/PWA: telefon veya bilgisayardan, kurulum gerektirmeden çalışır.
- Durumu: test edilmiş, pilot öncesi beta.

### Temel özellikler

- **Keşif haritası:** Uydu görüntülü harita üzerinde keşif pinleri, katmanlar,
  yükseklik profili ve arama.
- **Açıklanabilir rota planlama:** Yürüyüş / bisiklet / araç / toplu taşıma
  seçenekleriyle gün bazlı gezi planı; her rotanın gerekçesi durak durak anlatılır.
- **Konum tabanlı sesli rehber:** Yaklaştığınız noktayı algılar, Türkçe sesli
  anlatım başlatır.
- **"Gitmeden bil" bilgileri:** Doğrulanmış kısa bilgilendirme notları ve ören
  yeri tur rehberleri (ör. Efes, Priene).
- **Sosyal katman:** Gönderi, beğeni, yanıt ve 24 saatlik hikâyeler; arkadaşlar,
  gruplar ve davet linkleri.
- **Kişisel koleksiyonlar:** Beğendiğiniz yerleri ve rotaları kaydedin, paylaşın.
- **Atlas AI asistanı:** Uygulama içi yerleşik rehber asistanı.
- **Güvenlik ve gizlilik:** Veritabanı güvenlik kuralları, uygulama bütünlüğü
  doğrulaması, görüldü bilgisinin yalnızca cihazda tutulması, çerez tercihi ve
  gizlilik bildirimi.

### Teknolojiler

- React 19, TypeScript, Vite, Tailwind CSS
- MapLibre GL (açık kaynak harita)
- Firebase (Authentication, Firestore, App Check)
- OpenStreetMap + Photon arama, Wikidata / Vikipedi kaynaklı içerik, Wikimedia
  Commons görselleri
- GitHub Actions (otomatik test ve güvenlik taraması), Cloudflare yayını

### Fark yaratan yönler

- Rota **açıklanır**: "Neden bu sıra?" sorusunun cevabı uygulamanın içinde.
- Bilgi **doğrulanır**: kaynağı olmayan bilgi yazılmaz, doğrulanamayan bilgi
  "Doğrulanmadı." olarak işaretlenir.
- Ücretsiz, reklamsız, profillemesiz, kurulumsuz: herkes için erişilebilir.

---

## 4. Slogan ve Kısa Etiketler

*Bu bölüm yalnızca afiş ve sosyal medya içindir; başvuru metnine girmez.*

- **Ana slogan:** "Atlasia — Dünyayı merakınla keşfet."
- "Keşfini haritaya bırak."
- "Rotanı anlatan tek uygulama."
- "Gitmeden bil, gidince keşfet."
- "Açık harita, açık bilgi, açık keşif."

---

## 5. İngilizce Özet (English Abstract — proje raporu için)

**Atlasia** is a free web/PWA travel platform that combines a discovery map,
explainable route planning, location-based audio guidance, and community-shared
tips in a single application. Users explore real satellite imagery, find
insights left by other travelers, and pin their own discoveries on the map.
Atlasia generates day-sized itineraries for walking, cycling, driving, and
transit, and explains — stop by stop — why each route is constructed the way it
is. Its audio guide activates near points of interest and narrates them using
on-device speech synthesis in Turkish. The platform is built on open, verifiable
sources such as OpenStreetMap, Wikidata, and Wikipedia; information that cannot
be verified is explicitly labeled as "unverified" instead of being fabricated or
hidden. As a tested, pre-pilot beta, Atlasia investigates whether an explainable
and verifiable digital guide can reduce trip-planning time and the number of
missed points of interest for time-limited visitors.

---

## 6. Kaynakça (rapor için başlangıç listesi)

> Rapor sürümünde bu liste, akademik literatürle (uyarlanabilir rota planlama,
> konum tabanlı rehberlik sistemleri, açık veri kullanımı) genişletilmelidir.

1. OpenStreetMap Contributors. *OpenStreetMap veri seti (ODbL).* Erişim: 2026.
2. Wikidata — *The Free Knowledge Base (CC0).* Erişim: 2026.
3. Vikipedi — ilgili yer maddeleri (Türkçe/İngilizce). Erişim: 22 Ekim 2026.
4. Wikimedia Commons — *Commons API (geosearch) görsel kaynakları.* Erişim: 2026.
5. Photon — *OpenStreetMap tabanlı geocoder (Komoot).* Erişim: 2026.
6. MapLibre GL JS — *Açık kaynak harita kütüphanesi dokümanları.*
7. React, Vite, Firebase ve Tailwind CSS resmî dokümanları.
8. TÜBİTAK — *2204-A Lise Öğrencileri Araştırma Projeleri Yarışması başvuru ve
   değerlendirme esasları (güncel kılavuz).* Başvuru öncesi doğrulanmalıdır.

---

*Not: Kapsam ve yol haritası için bkz. `ROADMAP.md`; ürün tezi ve mühendislik
kuralları için bkz. `AGENTS.md`. Ölçülebilir gösterge tablosundaki alanlar,
uydurma veriyle değil; pilot çalışmasının gerçek sonuçlarıyla doldurulacaktır.*
