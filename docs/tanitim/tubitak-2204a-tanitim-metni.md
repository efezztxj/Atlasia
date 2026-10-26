# Atlasia — TÜBİTAK 2204-A Tanıtım Metinleri

Bu dosya, Atlasia projesinin **TÜBİTAK 2204-A Lise Öğrencileri Araştırma Projeleri
Yarışması** başvurularında kullanılabilecek tanıtım metinlerini içerir:

1. Proje özeti (form alanları için kısa metin)
2. Uzun tanıtım metni (başvuru dosyası / jüri için)
3. Madde madde sunum ve afiş materyali
4. Slogan ve kısa etiketler

Başvuru sahibine özgü bilgiler (ad, okul, danışman öğretmen, il) bu metinlere
dahil edilmemiştir; ilgili alanlara başvuru sırasında eklenmelidir.

---

## 1. Proje Özeti (formlar için — yaklaşık 150 kelime)

**Atlasia**, bir yere gittiğinizde orada ne yapacağınızı planlamanızı kolaylaştıran;
keşif haritası, açıklanabilir rota planlama, konum tabanlı sesli rehber ve topluluk
paylaşımlarını tek uygulamada birleştiren ücretsiz bir web/PWA seyahat platformudur.
Kullanıcılar gerçek uydu görüntüleri üzerinde dünyayı keşfeder, gezginlerin
bıraktığı ipuçlarını bulur ve kendi keşiflerini haritaya bırakır. Atlasia; yürüyüş,
bisiklet, araç ve tolu taşıma seçenekleriyle gün bazlı gezi rotaları üretir ve her
rotanın neden böyle kurulduğunu durak durak açıklar. Yaklaşılan noktalarda devreye
giren sesli rehber, tarihi ve doğal yerleri cihazınızın sesiyle anlatır. Proje;
OpenStreetMap, Wikidata ve Vikipedi gibi açık ve doğrulanabilir kaynaklara dayanır;
doğrulanamayan bilgiyi gizlemek yerine açıkça işaretleyen, gizliliğe ve erişilebilirliğe
önem veren, kurulum gerektirmeyen bir çözümdür.

---

## 2. Uzun Tanıtım Metni (başvuru dosyası / jüri için)

### Projenin Adı ve Alanı

**Atlasia** — Yazılım / Bilişim teknolojileri alanı: konum tabanlı, topluluk
destekli bir seyahat keşif ve gezi planlama platformu.

### Problem

Bir yeri ziyaret ederken karşılaşılan temel sorunlar şunlardır: *"Burada ne
yapmalıyım?"*, *"Hangi sırayla gezmeliyim?"* ve *"Bu yer hakkında doğru bilgiyi
nereden bulurum?"* Ticari rehber uygulamaları ücretlidir, reklamla çalışır veya
kullanıcının ilgisini ölçtükleri için gizliliği zedeler. Harita uygulamaları
yol tarifinde iyidir ama bir bölgeyi veya ören yerini gezmek için gereken
"sıralı, gerekçeli ve anlatımlı" planı sunmaz. Seyahat blogları ve sosyal medya
içeriği ise dağınık, doğrulanmamış ve yer yer güncelliğini yitirmiştir. Sonuçta
zamanı sınırlı bir ziyaretçi, ya rehber/uygulama ücreti öder ya da önemli noktaları
atlayarak gezisini tamamlar.

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
   "Efes içinde 3 saat"). Her ölçek için farklı bir yaklaşım tasarlanmış; bölge
   ölçeğinde durak sıralamasını ve süre bütçesini hesaplayan bir rota motoru,
   site ölçeğinde doğrulanmış yürüyüş yolu üzerinde ilerleyen tur rehberi
   kullanılmıştır.
3. **Açıklanabilir rota planlama:** Rota motoru; mesafe, ulaşım hızı, durak
   kategorileri ve kalan süre bilgisini kullanarak en fazla 7 duraklı bir gezi
   planı üretir ve her rotayı gerekçeleriyle kullanıcıya açıklar. Üretilen
   çizgilerin durakları bağladığı, yol navigasyonu olmadığı kullanıcıya açıkça
   bildirilir.
4. **Kaynak doğrulama:** Durak koordinatları ve yer bilgileri OpenStreetMap,
   Wikidata ve Vikipedi gibi açık kaynaklardan alınmış; bilgiler kaynaklardan
   kopyalanmak yerine yeniden yazılmıştır. Doğrulanamayan ücret, saat gibi
   bilgiler **"Doğrulanmadı."** olarak işaretlenmiştir. Ören yeri yürüyüş
   yolları, gerçekten var olan OSM patika verisiyle eşleştirilmedikçe "gerçek
   yol" kabul edilmemiştir.
5. **Geliştirme ve test:** Uygulama React 19, TypeScript ve Vite ile
   geliştirilmiş; her sürüm otomatik test hattından (tip kontrolü, lint, birim
   testleri, güvenlik kuralları testleri, üretim derlemesi) geçirilmiştir.
   Veri güvenliği, uygulama katmanında değil veritabanı güvenlik kurallarında
   tanımlanmış ve emülatör ortamında test edilmiştir.
6. **Değerlendirme:** Pilot bölgede gerçek kullanıcı geri bildirimleriyle
   kullanılabilirlik doğrulanmakta, canlı test listeleriyle eksikler izlenmektedir.

### Yenilikçilik (Özgünlük)

- **İki ölçekli keşif modeli:** Bölge planlaması (rota motoru) ile site içi
  rehberliği (tur anlatımı) aynı uygulamada, birbirine karıştırılmadan birleştirir.
- **Açıklanabilir planlama:** Rota bir "kara kutu" değil; neden bu durakların,
  bu sırayla seçildiğini anlatan, dürüst sınırlarını (düz çizgi rota, tahmini
  süre) kullanıcıdan gizlemeyen bir sistemdir.
- **Konum tabanlı sesli rehber:** Yaklaşılan noktayı otomatik algılayıp cihazın
  kendi ses senteziyle (Türkçe) anlatım yapan, ek ücret veya donanım gerektirmeyen
  bir rehberlik deneyimi.
- **Doğrulanamayanı işaretleme ilkesi:** Bilinmeyen bilgi uydurulmaz veya
  gizlenmez; "Doğrulanmadı." olarak dürüstçe etiketlenir. Bu yaklaşım, özellikle
  genç kullanıcılar için güvenilir bilgi alışkanlığı kazandırır.
- **Erişilebilirlik ve gizlilik:** Ücretsiz, kurulum gerektirmeyen web/PWA;
  açık harita verisiyle çalışan, kullanıcı izini cihazında tutan (örneğin
  görülen hikâye bilgisi), reklam amaçlı profillemeye dayanmayan bir yapı.

### Teknik Altyapı

- React 19 + TypeScript, Vite, Tailwind CSS arayüzü
- MapLibre GL ile açık kaynak harita ve gerçek uydu görüntüleri
- Firebase Authentication, Firestore ve App Check ile kimlik, veri ve istemci
  bütünlüğü katmanı
- OpenStreetMap tabanlı arama (Photon), Wikimedia Commons görsel galerisi
- PWA desteği: çevrimdışı paket, çevrimdışı/yeniden bağlanma durum bildirimleri
- GitHub Actions ile sürekli entegrasyon; Cloudflare üzerinden yayın

### Beklenen Sonuçlar ve Toplumsal Fayda

- Ziyaretçilerin sınırlı zamanını daha verimli, daha bilinçli kullanması;
  önemli noktaların atlanmaması.
- Ücretsiz nitelikli gezi planlama imkânıyla bilgi erişiminde eşitlik: pahalı
  rehber uygulamalarına veya tura bağımlılığın azalması.
- Az bilinen yerlerin ve yerel işletmelerin keşfedilmesiyle yerel turizme
  katkı; topluluk üyelerinin bıraktığı ipuçlarıyla kolektif bilgi birikimi.
- Açık veri (OpenStreetMap, Wikidata) okuryazarlığı; doğrulanabilir kaynak
  kullanımı ve dijital gizlilik farkındalığının artması.
- Teknolojiyi yalnız tüketen değil, üreten bir gençlik örneği: tasarım,
  test, güvenlik ve sürüm süreçleriyle uçtan uca mühendislik deneyimi.

---

## 3. Madde Madde — Sunum / Afiş Materyali

### Atlasia nedir?

- Gerçek uydu görüntüleriyle dünyayı keşfettiğiniz, gezginlerin ipuçlarını
  bulduğunuz ve kendi keşfinizi haritaya bıraktığınız ücretsiz seyahat platformu.
- Web/PWA: telefon veya bilgisayardan, kurulum gerektirmeden çalışır.

### Temel özellikler

- **Keşif haritası:** Uydu görüntülü harita üzerinde keşif pinleri, katmanlar,
  yükseklik profili ve arama.
- **Açıklanabilir rota planlama:** Yürüyüş / bisiklet / araç / tolu taşıma
  seçenekleriyle gün bazlı gezi planı; her rotanın gerekçesi durak durak anlatılır.
- **Konum tabanlı sesli rehber:** Yaklaştığınız noktayı algılar, Türkçe sesli
  anlatım başlatır.
- **"Gitmeden bil" bilgileri:** 28+ yer için doğrulanmış kısa bilgilendirme
  notları ve ören yeri tur rehberleri (ör. Efes, Priene).
- **Sosyal katman:** Gönderi, beğeni, yanıt ve 24 saatlik hikâyeler; arkadaşlar,
  gruplar ve davet linkleri.
- **Kişisel koleksiyonlar:** Beğendiğiniz yerleri ve rotaları kaydedin,
  paylaşın.
- **Atlas AI asistanı:** Uygulama içi yerleşik rehber asistanı.
- **Güvenlik ve gizlilik:** Veritabanı güvenlik kuralları, uygulama bütünlüğü
  doğrulaması, görüldü bilgisinin yalnızca cihazda tutulması, çerez tercihi
  ve gizlilik bildirimi.

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
- Ücretsiz, reklamsız profillemesiz, kurulumsuz: herkes için erişilebilir.

---

## 4. Slogan ve Kısa Etiketler

- **Ana slogan:** "Atlasia — Dünyayı merakınla keşfet."
- "Keşfini haritaya bırak."
- "Rotanı anlatan tek uygulama."
- "Gitmeden bil, gidince keşfet."
- "Açık harita, açık bilgi, açık keşif."

---

*Not: Bu metinler proje durumuyla uyumlu olacak şekilde hazırlanmıştır; resmî
başvuru formundaki kelime/sayfa sınırlarına göre kısaltılabilir. Kapsam ve
yol haritası için bkz. `ROADMAP.md`; ürün tezi ve mühendislik kuralları için
bkz. `AGENTS.md`.*
