# ATLASIA — ANA YOL HARİTASI VE YAPILACAKLAR

**Belge sürümü:** 1.0
**Son güncelleme:** 13 Ekim 2026
**Canlı uygulama:** https://atlasia.pages.dev
**Ana hedef:** Atlasia’yı güvenilir bir prototipten, gerçek kullanıcılarla test edilmiş ve TÜBİTAK 2204-A kapsamında savunulabilir bir kültürel keşif ürününe dönüştürmek.

> Bu belge Atlasia’nın bundan sonraki ana çalışma sırasıdır. Maddeler gerçekten tamamlandıkça işaretlenecek; yapılmamış test, ölçüm veya özellik tamamlanmış gibi gösterilmeyecektir.

---

## 1. Atlasia’nın ana fikri

Atlasia; kullanıcıların tarihî, kültürel ve doğal yerleri harita üzerinden keşfetmesini, kendi izlerini bırakmasını, zamanına ve ilgi alanlarına göre rota oluşturmasını ve bir noktaya yaklaştığında o yerin hikâyesini sesli biçimde dinlemesini sağlayan akıllı bir keşif platformudur.

Atlasia’nın üç ana ürün omurgası şunlardır:

1. **Harita tabanlı kültür ve turizm keşfi**
2. **Zaman ve bağlama göre açıklanabilir Atlas AI rotaları**
3. **Konuma yaklaşıldığında kullanıcı onayıyla başlayan kaynaklı sesli rehber**

Topluluk, profil, rozetler, PWA, çevrimdışı kullanım ve çoklu dil bu üç omurgayı destekleyen katmanlardır.

### Hedef kullanıcı deneyimi

1. Kullanıcı sinematik Atlasia giriş sayfasını görür.
2. Hesabına girer ve 3B dünya üzerinden keşfe başlar.
3. Bir yer arar veya haritadaki önerileri inceler.
4. Atlas AI’ya zamanını, ulaşım biçimini ve ilgi alanlarını söyler.
5. Atlasia neden seçildiği açıklanan bir rota üretir.
6. Kullanıcı rotayı kaydeder veya Google/Yandex üzerinden navigasyona geçer.
7. Tarihî bir noktaya yaklaşınca sesli rehber önerisi alır.
8. Ses yalnızca kullanıcının onayıyla başlar.
9. Kullanıcı fotoğraf, kısa not, pin veya story biçiminde kendi izini bırakır.
10. Daha sonra kayıtlarını, rotalarını ve keşif geçmişini profilinde görür.

---

## 2. Durum anahtarı

- [x] **Tamamlandı:** Özellik uygulanmış ve temel akışı çalışıyor.
- [ ] **Yapılacak:** Henüz tamamlanmadı.
- **Yerelde hazır:** Kod mevcut fakat GitHub/canlı sürüme gönderilmedi.
- **Kısmen hazır:** Temel var; güvenilirlik, kapsam veya gerçek cihaz testi eksik.
- **Ertelendi:** Maliyet, güvenlik veya öncelik nedeniyle daha sonraki aşamada yapılacak.

---

## 3. Bugünkü gerçek durum

### Tamamlanan temel yapı

- [x] React + Vite tabanlı web uygulaması
- [x] MapLibre tabanlı döndürülebilir 3B dünya ve harita
- [x] Uydu, koyu, sokak ve topoğrafik harita seçenekleri
- [x] Arama, kategori filtreleri ve haritada odaklanma
- [x] Rehber pinleri ve kullanıcı izleri
- [x] Firebase Authentication ve Firestore bağlantısı
- [x] E-posta/şifre ve Google ile giriş altyapısı
- [x] Mobil hesaptan çıkış
- [x] Mobil “İzlerim” alanı ve kullanıcının kendi pinini silmesi
- [x] Google Maps ve Yandex Maps yönlendirmeleri
- [x] Topluluk gönderileri, fotoğraf, yanıt, beğeni ve 24 saatlik story
- [x] Kaydedilen yerler ve Atlas AI rotaları
- [x] Kural tabanlı, açıklanabilir Atlas AI rota MVP’si
- [x] Yakındaki açık harita verisi ve hava durumuyla rota zenginleştirmesi
- [x] Konum tetiklemeli sesli rehberin ilk prototipi
- [x] Sinematik landing page
- [x] Koyu/açık tema altyapısı
- [x] PWA kurulumu ve çevrimdışı uygulama kabuğu
- [x] Firestore Rules ve Firebase App Check temeli
- [x] GitHub → Cloudflare Pages yayın zinciri

### Yerelde hazır fakat henüz canlı olmayan işler

- Anahtarsız OpenFreeMap tabanlı koyu harita hazırdır; henüz canlı sürüme gönderilmemiştir.
- Kapatıldığında kaybolmayan ince keşif kartı masaüstü ve mobil için hazırlanmıştır.
- İnce panel değişikliği henüz ayrı commit edilmemiştir.
- Son panel düzenlemesinden sonraki production build kesin olarak yeniden tamamlanmalıdır.

### Kısmen hazır ve olgunlaştırılması gereken alanlar

- Topluluk gönderisi ve story production testinde çalıştı; gerçek cihazdaki kesintili hata için retry ve taslak koruması eksik.
- Açık tema var; bazı bileşenlerde kontrast denetimi eksik.
- Atlas AI rota üretir; gerçek yol ağı üzerinde turn-by-turn navigasyon üretmez.
- Sesli rehber çalışır; kaynaklı pilot içerik ve fiziksel saha testi eksik.
- PWA kabuğu çevrimdışı açılır; offline harita ve güvenli yazma kuyruğu yoktur.
- XP, rozet ve takip alanlarının veri temeli vardır; güvenli ürün akışı tamamlanmamıştır.
- App Check kuruludur; doğrulanmış gerçek trafik görülmeden enforcement açılmayacaktır.
- Dependency denetiminde kapatılması gereken düşük, yüksek ve kritik güvenlik bulguları vardır.

---

# 4. Ana yol haritası

## AŞAMA 0 — Açık işleri güvenle kapat ve sağlam tabanı yayınla

**Öncelik:** P0
**Hedef:** Yerelde hazır olan işleri birbirine karıştırmadan test etmek, ayrı commit etmek ve doğrulanmış şekilde canlıya çıkarmak.

### Yapılacaklar

- [ ] İnce panel değişikliklerini yalnız ilgili dosyalar kapsamında incele.
- [ ] TypeScript kontrolünü çalıştır.
- [ ] Production build’i eksiksiz tamamla.
- [ ] 320, 375 ve 390 px mobil genişliklerini test et.
- [ ] Tablet ve masaüstü görünümünü test et.
- [ ] Kapalı ince karttan büyük panele yeniden dönüşü doğrula.
- [ ] İnce paneli ayrı ve açıklayıcı bir commit olarak kaydet.
- [ ] Anahtarsız harita commit’i ile panel commit’ini güvenli sırada gönder.
- [ ] Cloudflare Pages ve Workers Builds sonuçlarını doğrula.
- [ ] Canlıda dört harita görünümünü test et.
- [ ] Canlı ağ isteklerinde eski CARTO isteği ve filigran kalmadığını doğrula.
- [ ] Geçici production test gönderisini, story’yi ve test hesabını temizle.
- [ ] Yol haritasındaki gerçek durum bilgisini güncelle.

### Çıkış ölçütleri

- Çalışma ağacı kontrollü ve anlaşılır olacak.
- Harita ile panel ayrı commitlerde bulunacak.
- Production build başarılı olacak.
- Cloudflare kontrolleri başarılı olacak.
- Canlı haritada filigran olmayacak.
- Kapalı panel hem mobilde hem masaüstünde ince kart olarak kalacak.

---

## AŞAMA 1 — Güvenilirlik ve güvenlik temeli

**Öncelik:** P0
**Hedef dönem:** 14–24 Ekim 2026

### 1.1 Topluluk paylaşımını güvenilir hâle getir

- [ ] Metin gönderisi testini tamamla.
- [ ] Fotoğraflı gönderi testini tamamla.
- [ ] Yalnız fotoğraflı gönderi testini tamamla.
- [ ] Konumlu ve konumsuz gönderileri ayrı ayrı test et.
- [ ] Story oluşturma, açma ve silme testlerini tamamla.
- [ ] Kullanıcının gerçek cihazında yaşadığı hatayı yeniden üret.
- [ ] Başarısız işlemde yazı ve fotoğraf taslağını koru.
- [ ] Görünür “Tekrar dene” işlemi ekle.
- [ ] Çift dokunma/çift gönderim koruması ekle.
- [ ] Firebase hata kodlarını anlaşılır Türkçe mesajlara çevir.
- [ ] Yavaş bağlantı ve çevrimdışı senaryoları test et.
- [ ] Test verilerini otomatik veya kontrollü temizleme yöntemi oluştur.

### 1.2 Firestore Rules’i sıkılaştır

- [ ] Her koleksiyon için izin verilen alanların allowlist’ini tanımla.
- [ ] Metin, fotoğraf ve dizi alanlarına tip ve uzunluk sınırı ekle.
- [ ] Enlem ve boylam aralıklarını doğrula.
- [ ] Sahiplik ve oluşturma zamanının sonradan değiştirilememesini sağla.
- [ ] Beğeni değişimini giriş yapan kullanıcının UID’siyle sınırlandır.
- [ ] Yanıtları güvenli alt koleksiyon modeline hazırlamayı değerlendir.
- [ ] Yetkisiz oluşturma, güncelleme ve silme senaryolarını test et.
- [ ] Firebase Emulator ve `@firebase/rules-unit-testing` tabanlı otomatik test paketi kur.

### 1.3 Açık tema kontrastını tamamla

- [ ] Ana harita ekranını kontrol et.
- [ ] Açık ve ince keşif panelini kontrol et.
- [ ] Topluluk ve story ekranlarını kontrol et.
- [ ] Profil ve ayarlar ekranlarını kontrol et.
- [ ] Atlas AI panelini kontrol et.
- [ ] Yer ayrıntısı ve kayıt ekranlarını kontrol et.
- [ ] Mobil alt menüyü kontrol et.
- [ ] Onay, hata ve boş durum pencerelerini kontrol et.
- [ ] Normal metinde 4.5:1, büyük metin ve kritik arayüzde en az 3:1 kontrast hedefle.

### 1.4 Cloudflare ve tarayıcı güvenliği

- [ ] Önce preview ortamında CSP Report-Only uygula.
- [ ] Firebase, harita, görsel ve hava servisi için gereken gerçek bağlantı listesini çıkar.
- [ ] Hatalı istek kalmadığında enforcing CSP’ye geç.
- [ ] Clickjacking koruması ekle.
- [ ] Permissions Policy belirle.
- [ ] Uygun COOP politikasını test et.
- [ ] Hash’li statik dosyalar için uzun immutable cache tanımla.
- [ ] `sw.js` için yeniden doğrulanan/no-cache stratejisi uygula.
- [ ] Preview deployment’ları Cloudflare Access ile korumayı değerlendir.

### 1.5 Dependency güvenliği

- [ ] `npm audit` sonuçlarını yeniden kaydet.
- [ ] Vite’ı güvenli 7.x patch sürümüne kontrollü yükselt.
- [ ] esbuild bulgusunu Vite/lock güncellemesiyle kapat.
- [ ] MapLibre 5.x → güvenli 6.x geçişini ayrı dal/committe yap.
- [ ] MapLibre geçişinden sonra küre, terrain, marker, rota ve stil davranışlarını test et.
- [ ] Firebase ve transitif `@grpc/grpc-js` bulgularını güncel upstream durumuna göre incele.
- [ ] Otomatik ve riskli `npm audit fix --force` kullanma.

### Aşama 1 çıkış ölçütleri

- Kullanıcının gerçek cihazında gönderi ve story güvenilir biçimde çalışacak.
- Başarısız gönderimde taslak kaybolmayacak.
- Kritik açık tema kontrast sorunu kalmayacak.
- Firestore Rules test paketi yeşil olacak.
- CSP canlıda uygulamayı kırmadan çalışacak.
- Kritik MapLibre güvenlik bulgusu kapanmış olacak.
- Harita, giriş ve veri akışında regresyon olmayacak.

---

## AŞAMA 2 — Hesap, kayıtlar ve topluluğu gerçek ürüne dönüştür

**Öncelik:** P1
**Hedef dönem:** 25 Ekim–7 Kasım 2026

### Profil

- [ ] Profil adını düzenleme
- [ ] Kısa biyografi
- [ ] Güvenli profil fotoğrafı stratejisi
- [ ] Kullanıcının iz, gönderi ve story özeti
- [ ] Hesap silme talebi
- [ ] Kullanıcı verisini dışa aktarma
- [ ] Gizlilik tercihleri
- [ ] E-posta doğrulama durumunu daha anlaşılır hâle getirme

### Kayıtların bulut senkronizasyonu

- [ ] Kaydedilen yerleri kullanıcı hesabıyla eşitle.
- [ ] Kaydedilen rotaları kullanıcı hesabıyla eşitle.
- [ ] Cihazdaki mevcut kayıtları hesaba güvenli biçimde taşı.
- [ ] Aynı kaydın iki cihazda değişmesi için çakışma kuralı belirle.
- [ ] Çevrimdışı değişiklik kuyruğu tasarla.
- [ ] Kullanıcı oturumu kapandığında kişisel verinin cihaz davranışını belirle.

### Topluluk sağlığı

- [ ] Gönderi düzenleme
- [ ] İçerik raporlama
- [ ] Kullanıcı engelleme
- [ ] Topluluk kuralları
- [ ] Moderasyon kuyruğu
- [ ] Spam ve hız sınırları
- [ ] Tam konumu varsayılan olarak gizli tutma
- [ ] Yaklaşık konum paylaşımı
- [ ] Süresi dolan story’lerin güvenli temizlenmesi
- [ ] Yanıt ve beğenilerin eşzamanlı kullanıcılar için güçlendirilmesi

### Rozet sistemi

İlk sürümde yalnız anlamlı ve doğrulanabilir rozetler kullanılacak:

- [ ] İlk İz
- [ ] İlk Rota
- [ ] İlk Sesli Tur
- [ ] Beş tarih noktası
- [ ] Ege Kaşifi

Rozetler yalnız doğrulanmış olaylardan üretilecek; istemcinin kendi XP veya rozetini serbestçe yazmasına izin verilmeyecek.

---

## AŞAMA 3 — Atlas AI rota motorunu ikinci seviyeye çıkar

**Öncelik:** P1
**Hedef dönem:** 8–22 Kasım 2026

### Veri kalitesi

- [ ] Aynı POI’nin tekrarlarını azalt.
- [ ] OpenStreetMap etiketlerini Atlasia kategorileriyle daha doğru eşleştir.
- [ ] Varsa açılış saatlerini kullan.
- [ ] Her dış veri için kaynak ve güncellik bilgisi göster.
- [ ] Ücret ve erişilebilirlik bilgisinde “doğrulanmadı” etiketi kullan.
- [ ] Atlasia rehber noktalarıyla kullanıcı izlerini ayrı güven ağırlığıyla puanla.

### Rota kalitesi

- [ ] Ücretsiz/açık gerçek yol geometrisi servislerini değerlendir.
- [ ] Dış servis çalışmazsa mevcut açıklanabilir düz çizgi fallback’ini koru.
- [ ] Duraklar arası ulaşım süresini daha gerçekçi hesapla.
- [ ] Gereksiz geri dönüş ve zikzakları azalt.
- [ ] Yağmur, gün ışığı ve günün saatini rota puanına ekle.
- [ ] Çocuklu aile profili ekle.
- [ ] Sakin rota profili ekle.
- [ ] Erişilebilir rota tercihi için doğrulanabilir veri modeli kur.
- [ ] Kullanıcının belirli bir durağı sabitleyip rotayı yeniden hesaplamasını sağla.
- [ ] Rota dışa aktarma ve paylaşma deneyimini geliştir.

### Güven ve açıklanabilirlik

Her rota şu sorulara cevap vermeli:

- [ ] Bu durak neden seçildi?
- [ ] Bilginin kaynağı nedir?
- [ ] Mesafe kesin mi, tahmin mi?
- [ ] Açılış saati doğrulandı mı?
- [ ] Navigasyon hangi harici uygulamayla devam edecek?

### Üretken yapay zekâ için koşullar

- API anahtarı istemci koduna yazılmayacak.
- Ücretsiz kota ve kötüye kullanım koruması bulunacak.
- Kaynaksız tarihî bilgi kesin gerçek gibi sunulmayacak.
- Kural tabanlı motor güvenli fallback olarak korunacak.
- TÜBİTAK sürümü tek bir dış AI servisine bağımlı olmayacak.

---

## AŞAMA 4 — Sesli rehber ve kaynaklı kültür içeriği

**Öncelik:** P1 — Atlasia’nın imza özelliği
**Hedef dönem:** 23 Kasım–7 Aralık 2026

### İlk pilot bölge

İzmir ve çevresinde 5–10 yüksek kaliteli pilot nokta hedeflenecek:

- [ ] Efes Antik Kenti
- [ ] Bergama Akropolü
- [ ] İzmir Saat Kulesi
- [ ] Agora Ören Yeri
- [ ] Şirince
- [ ] Kadifekale, Kemeraltı veya danışmanla seçilecek ek noktalar

### Her içerik paketinde bulunacaklar

- [ ] 60–120 saniyelik kısa anlatım
- [ ] Ayrıntılı tarihçe metni
- [ ] Kaynakça
- [ ] Fotoğraf lisansı ve atfı
- [ ] Önemli tarihler ve kavramlar
- [ ] “Biliyor muydun?” bölümü
- [ ] Erişilebilir tam metin/transkript
- [ ] Son doğrulama tarihi
- [ ] Coğrafya veya tarih öğretmeni kontrolü

### Teknik pilot

- [ ] 50 metre hedefini GPS doğruluğuna göre toleranslı uygula.
- [ ] Aynı durağın sürekli yeniden açılmasını engelle.
- [ ] Kullanıcı onayı olmadan ses başlatma.
- [ ] Pil tüketimini ölç.
- [ ] iOS Safari davranışını test et.
- [ ] Android PWA davranışını test et.
- [ ] Ekran kilidi ve arka plan davranışını test et.
- [ ] Gürültülü ortam için altyazı/transkript göster.
- [ ] GPS kaçırırsa manuel “Yakındayım” seçeneği sun.
- [ ] Tarayıcı TTS ile profesyonel ses kaydı seçeneklerini pilot sonuçlarına göre karşılaştır.

### Saha testi

- [ ] En az bir gerçek tarihî alanda yürüyüş testi yap.
- [ ] Gerçek tetikleme mesafelerini kaydet.
- [ ] Yanlış pozitifleri ve kaçırılan tetiklemeleri kaydet.
- [ ] Sesin anlaşılabilirliğini ölç.
- [ ] Kullanıcının dikkatini yoldan ayırıp ayırmadığını gözlemle.
- [ ] Bulgulara göre tetikleme aralığını ve arayüzü düzelt.

---

## AŞAMA 5 — TÜBİTAK araştırmasını ürünle paralel yürüt

**Öncelik:** P0 — son haftaya bırakılmayacak
**Hedef dönem:** Ekim–Aralık 2026

### Önerilen araştırma sorusu

> Konum ve zaman bilgisine göre kişiselleştirilmiş dijital rehber kullanımı, lise çağındaki kullanıcıların kültürel miras alanlarını keşfetme başarısını, bilgi hatırlama düzeyini ve gezi planlama süresini nasıl etkiler?

### Araştırma hazırlığı

- [ ] Araştırma sorusunu danışman öğretmenle kesinleştir.
- [ ] Hipotezi yaz.
- [ ] Bağımlı ve bağımsız değişkenleri tanımla.
- [ ] Katılımcı kriterlerini belirle.
- [ ] Etik/onam metnini hazırla.
- [ ] Veli ve okul kurallarını doğrula.
- [ ] Kişisel veri toplamadan anonim ölçüm planı oluştur.
- [ ] Normal harita ile Atlasia’yı karşılaştıran görevleri yaz.
- [ ] Ön test ve son test sorularını hazırla.
- [ ] Kullanılabilirlik ve memnuniyet anketini hazırla.

### Ölçülebilecek değişkenler

- Rota oluşturma süresi
- Doğru yer seçme sayısı
- Tamamlanan görev sayısı
- Ön test/son test puanı
- Sesli anlatım tamamlama oranı
- Yanlış rota veya durak sayısı
- Kullanılabilirlik puanı
- Kullanıcı memnuniyeti
- Uygulamayı tekrar kullanma niyeti

### Araştırma uygulaması

- [ ] Küçük pilot test yap.
- [ ] Pilot sonrası görev ve soruları düzelt.
- [ ] Gerçek katılımcılarla karşılaştırmalı çalışma yap.
- [ ] Verileri anonimleştir.
- [ ] Tablo ve grafikler oluştur.
- [ ] Uygun temel istatistik analizini uygula.
- [ ] Sınırlılıkları açık ve dürüst biçimde yaz.
- [ ] Yalnız gerçekten toplanmış sonuçları rapora ekle.

### Akademik kırmızı çizgiler

- Gerçekleşmemiş test yapılmış gibi gösterilmeyecek.
- Uydurma katılımcı sayısı yazılmayacak.
- Uydurma başarı oranı veya grafik kullanılmayacak.
- Yapay zekâ tarafından üretilen kaynak doğrulanmadan rapora alınmayacak.
- Tarihî içerikler öğretmen ve güvenilir kaynak kontrolünden geçecek.

---

## AŞAMA 6 — Projeyi dondur ve TÜBİTAK teslimini tamamla

**Hedef dönem:** 8 Aralık 2026–4 Ocak 2027
**Not:** Son başvuru tarihi ve saati TYBS ile güncel çağrı metninden yeniden doğrulanacak.

### 8–15 Aralık

- [ ] Pilot testi tamamla.
- [ ] Kritik uygulama hatalarını düzelt.
- [ ] Eksik içerik kaynaklarını tamamla.
- [ ] Ana kullanıcı akışlarının ekran görüntülerini hazırla.

### 16–22 Aralık

- [ ] Gerçek kullanıcı çalışmasını tamamla.
- [ ] Verileri anonimleştir.
- [ ] Tablo ve grafikleri oluştur.
- [ ] Bulgular bölümünü yaz.

### 23–28 Aralık

- [ ] Yöntem bölümünü tamamla.
- [ ] Bulgular bölümünü tamamla.
- [ ] Tartışma ve sonuç bölümünü tamamla.
- [ ] APA kaynakçayı tamamla.
- [ ] Ekleri düzenle.
- [ ] Danışman öğretmen kontrolünü al.

### 29 Aralık–2 Ocak

- [ ] Yeni özellik eklemeyi durdur.
- [ ] Yalnız kritik hata düzeltmesi yap.
- [ ] Proje posterini hazırla.
- [ ] Sunumu hazırla.
- [ ] TYBS alanlarını doldur.

### 3–4 Ocak

- [ ] Başvuru dosyalarını son kez kontrol et.
- [ ] Danışman/e-imza gereksinimlerini doğrula.
- [ ] Dosyaları son saatten önce yükle.
- [ ] Son gün büyük kod, tasarım veya rapor değişikliği yapma.

---

## AŞAMA 7 — TÜBİTAK sonrası Atlasia 1.1

**Öncelik:** P2
**Hedef dönem:** 2027’nin ilk yarısı

### Ürünleşme

- [ ] Atlasia’ya özel alan adı
- [ ] Kurumsal e-posta alan adı
- [ ] Tam markalı doğrulama ve parola e-postaları
- [ ] Cloudflare zone WAF, TLS ve yönlendirme ayarları
- [ ] Gizlilik politikası
- [ ] Kullanım koşulları
- [ ] Hesap silme ve veri indirme
- [ ] Hata ve performans izleme

### Ölçeklenebilir medya

Mevcut Firestore data URL yaklaşımı yalnız ücretsiz pilot için kullanılmaktadır. Kullanıcı sayısı arttığında:

- [ ] Cloudflare R2’nin güncel ücretsiz kotasını incele.
- [ ] Cloudinary/Uploadcare benzeri ücretsiz planları karşılaştır.
- [ ] Supabase ve açık kaynak seçeneklerini karşılaştır.
- [ ] Görsel CDN, sıkıştırma ve dönüşüm maliyetlerini hesapla.
- [ ] Güvenli taşıma planı oluştur.

Firebase Storage/Blaze’e otomatik olarak geçilmeyecek; maliyet ve güvenlik karşılaştırması yapılacak.

### Topluluk ve moderasyon

- [ ] Moderatör paneli
- [ ] Rapor inceleme kuyruğu
- [ ] Güven puanı
- [ ] Spam önleme
- [ ] Öne çıkan gezgin içerikleri
- [ ] Takip edilen kullanıcıların akışı
- [ ] Arkadaşlarla rota paylaşma

### Çevrimdışı deneyim

- [ ] Şehir veya ören yeri içerik paketi indirme
- [ ] Ses ve tarihçe kartlarını offline kullanma
- [ ] Sınırlı offline vektör harita
- [ ] Bağlantı geldiğinde kontrollü senkronizasyon

### Dil ve erişilebilirlik

- [ ] Türkçe/İngilizce altyapısı
- [ ] Daha sonra turizm odaklı ek diller
- [ ] Ekran okuyucu denetimi
- [ ] Klavye navigasyonu
- [ ] Yüksek kontrast modu
- [ ] Büyük yazı modu
- [ ] İşitme için tam transkript
- [ ] Hareket hassasiyeti ayarı

---

## AŞAMA 8 — Uzun vadeli “Büyük Atlasia” vizyonu

**Öncelik:** P3 — 2027 ve sonrası

- [ ] Şehirlerin doğrulanmış kültür rotaları
- [ ] Müze ve belediye içerik ortaklıkları
- [ ] Öğretmenler için eğitim rotası oluşturucu
- [ ] Sınıf gezisi modu
- [ ] Öğrenciler için görev ve keşif kartları
- [ ] Birlikte rota hazırlama
- [ ] Aile ve erişilebilir gezi profilleri
- [ ] Karbon ayak izi ve toplu taşıma odaklı öneriler
- [ ] Yoğunluk ve sürdürülebilir turizm uyarıları
- [ ] Artırılmış gerçeklikle tarihî yapı katmanları
- [ ] Kişisel keşif günlüğü ve yıllık gezi özeti
- [ ] Doğrulanmış rehber profilleri
- [ ] Açık veri ve akademik araştırma iş birlikleri

Bu vizyon işleri; güvenlik, güvenilirlik, kaynaklı içerik ve çalışan rota/rehber deneyimi tamamlanmadan öne alınmayacaktır.

---

# 5. Öncelik sırası

## P0 — Önce yapılacaklar

1. Yerel anahtarsız harita ve ince paneli güvenle canlıya çıkarma
2. Production test verilerini temizleme
3. Topluluk paylaşımını gerçek cihazda güvenilir hâle getirme
4. Açık tema kritik kontrast sorunlarını kapatma
5. Firestore Rules’i sıkılaştırma ve otomatik test etme
6. CSP ve güvenlik başlıklarını ekleme
7. Kritik MapLibre güvenlik güncellemesini tamamlama
8. TÜBİTAK araştırma tasarımını danışmanla kesinleştirme

## P1 — Ana ürün değerini güçlendirenler

1. Atlas AI rota kalitesi
2. Sesli rehber saha prototipi
3. Kaynaklı 5–10 pilot kültür noktası
4. Kayıtların hesapla bulut senkronizasyonu
5. Profil ve topluluk güvenliği
6. Fiziksel iOS/Android testleri

## P2 — Ürünleşme

1. Özel alan adı
2. Tam profil
3. Güvenli rozet ve takip sistemi
4. Moderasyon paneli
5. Çoklu dil
6. Push bildirimleri
7. Gelişmiş offline paketler

## P3 — Büyük vizyon

- Eğitim rotaları
- Kurum ortaklıkları
- Artırılmış gerçeklik
- Ortak rota
- Sürdürülebilir turizm
- Gelişmiş kişisel istatistikler

---

# 6. Sürüm hedefleri

| Sürüm | Ana amaç | İçerik |
|---|---|---|
| **Stabilizasyon paketi** | Bugünkü açıkları kapatmak | Anahtarsız harita, ince panel, topluluk güvenilirliği, açık tema |
| **Güvenlik paketi** | Üretim temelini sertleştirmek | CSP, güvenlik başlıkları, cache, Rules testleri, dependency yamaları |
| **Atlasia 0.9 Pilot** | TÜBİTAK testine hazır ürün | Sağlam rota MVP, 5–10 kaynaklı yer, sesli rehber saha prototipi |
| **Atlasia 1.0 TÜBİTAK** | Dondurulmuş araştırma sürümü | Test edilmiş ana akış, gerçek ölçümler, rapor ve poster |
| **Atlasia 1.1** | Ürünleşme | Özel alan adı, bulut senkronu, profil ve topluluk olgunlaştırması |
| **Atlasia 2.0** | Geniş platform | Çoklu dil, offline paketler, kurum ve şehir ortaklıkları |

Bir sürüm adı yalnız çıkış ölçütleri gerçekten tamamlandığında kullanılacaktır.

---

# 7. Değiştirilmeyecek ürün kararları

- Masaüstünde başlık solda kalacak.
- Masaüstünde arama kutusu sağda kalacak.
- Mobil yerleşim bu karar nedeniyle bozulmayacak.
- Atlas AI sağ altta kalacak.
- Sağdaki harita kontrolleri korunacak.
- Masaüstünde tek keşif paneli bulunacak.
- Panel kapatıldığında tamamen kaybolmayacak; ince karta dönüşecek.
- İnce kart mobilde de çalışacak.
- Koyu tema ana kimlik, açık tema ikinci seçenek olacak.
- Ücretsiz veya anahtarsız araçlar öncelikli olacak.
- Firebase Storage/Blaze yaklaşımına geri dönülmeyecek.
- API anahtarı veya kişisel erişim anahtarı sohbet içinde paylaşılmayacak.
- Her özellik mümkün olduğunca ayrı commit edilecek.
- Doğrulanmamış veya yarım özellik canlıya gönderilmeyecek.
- Yayın hattı GitHub → Cloudflare olarak korunacak.
- TÜBİTAK raporunda yapılmamış çalışma yapılmış gibi gösterilmeyecek.

---

# 8. Her görev için “bitti” tanımı

Bir görev ancak aşağıdaki maddelerin tamamı sağlandığında tamamlanmış sayılır:

1. İstenen davranış gerçekten çalışıyor.
2. İstenmeyen başka tasarım veya konum değişmedi.
3. Hata, yükleniyor ve boş durumları ele alındı.
4. Masaüstü test edildi.
5. Mobil test edildi.
6. Temel erişilebilirlik kontrolü yapıldı.
7. Git diff yalnızca beklenen dosyaları içeriyor.
8. TypeScript kontrolü geçti.
9. Production build geçti.
10. Gerekliyse Firestore Rules testleri geçti.
11. Ayrı ve açıklayıcı commit oluşturuldu.
12. Cloudflare build başarılı oldu.
13. Canlı asset ve commit eşleşmesi doğrulandı.
14. Özellik canlıda yeniden test edildi.
15. Test verileri temizlendi.
16. Bu yol haritasındaki kutu gerçek duruma göre güncellendi.

“Bilgisayarımda açıldı” tek başına tamamlanma ölçütü değildir.

---

# 9. Ana riskler ve önlemler

| Risk | Etki | Önlem |
|---|---|---|
| Ücretsiz harita sağlayıcısının politika değiştirmesi | Harita bozulabilir | OpenFreeMap, sağlayıcı soyutlama ve uzun vadeli self-hosting planı |
| App Check yanlış pozitifleri | Gerçek kullanıcı engellenebilir | Enforcement öncesi metrik, kademeli açma ve geri alma planı |
| Firestore kota veya belge sınırı | Fotoğraf ve yanıt büyümesi | Sıkıştırma sınırı, alt koleksiyonlar ve medya geçiş planı |
| Eski PWA sürümünün cihazda kalması | Kullanıcı eski hata görür | Service worker cache politikası ve güncelleme bildirimi |
| Tam konumun yanlışlıkla paylaşılması | Gizlilik riski | Varsayılan yaklaşık konum, açık onay ve kolay kaldırma |
| Tarihî bilginin yanlış olması | Akademik ve etik risk | Kaynakça, öğretmen kontrolü ve son doğrulama tarihi |
| Harici API kesintisi | Rota, görsel veya hava verisi eksilir | Timeout, fallback ve dürüst kullanıcı uyarısı |
| Kapsamın kontrolsüz büyümesi | TÜBİTAK sürümü yetişmez | P0/P1 kapıları ve Aralık özellik dondurma |
| Güvenlik güncellemesinin haritayı kırması | Ana deneyim bozulur | MapLibre geçişini ayrı commit ve görsel testlerle yapmak |
| Moderasyonsuz topluluk | Spam veya uygunsuz içerik | Raporlama, limit, Rules, App Check ve moderasyon |

---

# 10. Yeniden geliştirmeye başlandığında ilk 12 adım

1. Git durumunu ve bekleyen panel dosyalarını doğrula.
2. Son production build’i tamamla.
3. İnce panelin mobil ve masaüstü aç/kapat akışını test et.
4. Panel değişikliğini ayrı commit et.
5. Anahtarsız harita ve panel commitlerini güvenli biçimde gönder.
6. Cloudflare Pages ve Workers sonuçlarını doğrula.
7. Canlıda filigran ve panel testi yap.
8. Production test verilerini temizle.
9. Topluluk sorununu kullanıcının gerçek cihaz koşullarında yeniden üret.
10. Retry, taslak koruma ve Rules testlerini tamamla.
11. Açık tema kontrast paketini bitir.
12. Güvenlik başlıkları ve dependency güncellemelerine geç.

---

# 11. Tek cümlelik özet

**Önce mevcut harita, panel, topluluk, açık tema ve güvenlik açıkları kapatılacak; ardından Atlas AI rota motoru ile kaynaklı sesli rehber saha seviyesine çıkarılacak; aynı anda gerçek kullanıcı verisiyle TÜBİTAK araştırması yürütülecek; 2027’de özel alan adı, bulut senkronu, moderasyon, çoklu dil ve offline paketlerle Atlasia gerçek bir ürüne dönüştürülecek.**
