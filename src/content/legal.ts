export type LegalDocumentType = "privacy" | "terms";

export interface LegalSection {
  title: string;
  paragraphs: readonly string[];
}

export interface LegalDocument {
  type: LegalDocumentType;
  shortTitle: string;
  title: string;
  updatedLine: string;
  intro: readonly string[];
  sections: readonly LegalSection[];
  ordered: boolean;
}

export const LEGAL_VERSION = "2.0";
export const LEGAL_SOURCE = "Notion page 3f90097a-5569-813f-9e27-e9f2f4f3135e · Yasal metinler v2 · MSG-059";
export const LEGAL_REVIEW_NOTICE = "Taslak · Künye ve avukat onayı bekleniyor";
export const LEGAL_PLACEHOLDERS = ["[TARİH]", "[AD SOYAD / UNVAN]", "[E-POSTA]", "[ŞEHİR]"] as const;

export const privacyDocument: LegalDocument = {
  type: "privacy",
  shortTitle: "Gizlilik açıklaması",
  title: "Gizlilik ve KVKK Aydınlatma Metni",
  updatedLine: "Son güncelleme: [TARİH] · Sürüm 2.0",
  intro: [
    "Merhaba, Atlasia'ya hoş geldin. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca; hangi kişisel verilerini, hangi amaçla, hangi hukuki sebebe dayanarak işlediğimizi; kimlerle paylaştığımızı ve haklarını açıklar. Metni kabul etmeden önce lütfen tamamını oku; soruların için bize her zaman yazabilirsin.",
  ],
  sections: [
    {
      title: "1. VERİ SORUMLUSU",
      paragraphs: [
        "Veri sorumlusu: [AD SOYAD / UNVAN]. Başvuru ve iletişim: [E-POSTA]. KVKK kapsamındaki başvurularını bu adrese yazılı iletebilirsin.",
      ],
    },
    {
      title: "2. İŞLEDİĞİMİZ VERİLER, KAYNAKLARI VE AMAÇLARI",
      paragraphs: [
        "2.1 Hesap ve kimlik doğrulama verisi: Kayıt ve giriş Firebase Authentication (Google) üzerinden yapılır. Kullanım biçimine göre e-posta adresin; Google ile girişte hesabının temel kimliği, Apple ile girişte Apple'ın sağladığı kimlik, telefonla girişte telefon numaran işlenir. Şifreni biz görmeyiz, bilmeyiz ve saklamayız; şifre doğrulaması sağlayıcı tarafından yapılır. Amaç: hesabını oluşturmak, seni tanımak ve hesabını yetkisiz erişime karşı korumak. Hukuki sebep: sözleşmenin kurulması ve ifası (KVKK m.5/2-c) ve hizmet güvenliği için meşru menfaat (m.5/2-f).",
        "2.2 Profil verisi: Görünür adın, biyografin, profil fotoğrafın, takip ettiğin/takipçilerin ve etkileşimlerin. Amaç: profilini diğer kullanıcılara göstermek ve topluluk özelliklerini çalıştırmak. Hukuki sebep: sözleşmenin ifası ve meşru menfaat.",
        "2.3 İçerik verisi: Bıraktığın izler (yer işaretleri; başlık, açıklama, kategori ve konum), oluşturduğun rotalar ve durakları, hikâyelerin, yüklediğin fotoğraflar, beğeni ve yorum etkileşimlerin. Hikâyeler 24 saatin sonunda görünümden kaldırılır. Herkese açık bıraktığın içerikler, diğer kullanıcılara ve atlasia sayfalarını ziyaret eden herkese görünür. Amaç: hizmetin temel işlevini sunmak. Hukuki sebep: sözleşmenin ifası; herkese açık paylaşımın, paylaşırken verdiğin karara dayanır (açık rıza).",
        "2.4 Konum verisi: 'Yakınımda', 'konumumu göster' ve sesli yakındaki rehber gibi özellikler yalnız cihazında konum izni verirsen çalışır; izin vermezsen bu özellikler çalışmaz ama uygulamanın geri kalanını kullanabilirsin. Konum iznin, tarayıcının/cihazının izin ekranıyla verilir ve dilediğinde aynı yerden geri alınabilir. İz bırakırken kaydettiğin konum, içeriğinin parçası olur ve herkese görünür; bu yüzden ev adresi gibi hassas yerlere iz bırakmamanı öneririz. Amaç: izin verdiğin özelliği sunmak. Hukuki sebep: açık rıza.",
        "2.5 Teknik ve güvenlik verisi: Hizmetin çalışması için gerekli teknik kayıtlar (istek zamanları, hata kayıtları) ile kötüye kullanımı önlemek için Google App Check (reCAPTCHA) ve Firebase güvenlik bileşenlerinin ürettiği doğrulama verileri. Amaç: spam, bot ve suistimalin önlenmesi; hizmet sürekliliği. Hukuki sebep: meşru menfaat ve hukuki yükümlülük hâlinde ilgili madde. Bu sürümde davranışsal izleme, reklam takibi ve kullanıcıyı siteler arası izleyen üçüncü taraf çerezleri KULLANILMAZ. İleride yalnızca çerezsiz, toplulaştırılmış ürün ölçümü eklenirse bu metin sürüm notuyla güncellenir ve hesabında yeniden onaya sunulur.",
        "2.6 Cihaz modu verisi: Hesap açmadan 'bu cihaz' modunu seçersen hesap verin (kullanıcı adı ve salt tuzlu PBKDF2 özeti olarak parola karşılığı) ve kayıtların yalnız tarayıcının yerel depolamasında kalır; sunucularımıza gönderilmez. Tarayıcı verilerini silersen bu hesap ve içerikleri geri getirilemez biçimde kaybolur. Bu modda çevrimiçi yedek/senkron yoktur.",
      ],
    },
    {
      title: "3. YEREL DEPOLAMA VE ÇEREZ BENZERİ TEKNOLOJİLER",
      paragraphs: [
        "Tarayıcında şu amaçlarla yerel depolama kullanılır: oturumun açık kalması (Firebase Authentication belirteçleri), tema ve tercihlerin (örn. karanlık/açık), servis çalışanının çevrimdışı önbelleği (uygulama dosyaları; kişisel içerik değildir) ve cihaz modu kayıtların. Reklam/analitik çerezi bu sürümde yoktur. Tarayıcından yerel depolamayı silersen oturumun kapanır ve cihaz modu verilerin silinir.",
      ],
    },
    {
      title: "4. VERİLERİ KİMLERLE, NEDEN PAYLAŞIYORUZ",
      paragraphs: [
        "4.1 Hizmet sağlayıcıları: Barındırma, kimlik doğrulama ve veritabanı için Google Firebase; uygulama ve site dağıtımı için Cloudflare; harita karo ve etiketleri için Esri ve OpenFreeMap/OpenMapTiles; yazı tipleri için Google Fonts. Bu sağlayıcılar, yalnızca hizmetin çalışması için gerekli teknik işlemleri gerçekleştirir; harita ve yazı tipi isteklerinde cihazının IP adresi gibi teknik bilgiler ilgili sağlayıcıya ulaşabilir.",
        "4.2 Diğer kullanıcılar: Profilin ve herkese açık içeriklerin (izler, rotalar, hikâyeler, fotoğraflar, yorumlar) doğası gereği diğer kullanıcılara görünür. Rotanı 'Google/Apple/Yandex ile aç' bağlantısıyla kendi seçiminle açarsan, ilgili rotanın koordinatları o uygulamaya aktarılır; o hizmetin gizlilik koşulları geçerlidir.",
        "4.3 Yasal zorunluluk: Kanunen yetkili kurumların hukuka uygun talepleri hâlinde, yükümlülüğümüz ölçüsünde paylaşım yapılabilir. Satış/pazarlama amacıyla verilerini üçüncü kişilerle paylaşmıyor, pazarlama iletisi göndermiyoruz.",
      ],
    },
    {
      title: "5. YURT DIŞI AKTARIM",
      paragraphs: [
        "Firebase ve bazı sağlayıcıların sunucuları yurt dışında bulunabilir. Hesap ve içerik verin, hizmetin çalışması için bu altyapılarda işlenir (KVKK m.9 kapsamında hizmetin gereği olan aktarım). Veriler şifreli bağlantıyla (HTTPS) taşınır.",
      ],
    },
    {
      title: "6. SAKLAMA SÜRELERİ",
      paragraphs: [
        "Hesap ve profil verin: hesabın açık olduğu süre boyunca. İçeriklerin: sen silene veya hesabın kapanana dek (sildiğin içerik görünümden kaldırılır). Hikâyeler: 24 saat sonra görünümden kaldırılır. Teknik güvenlik kayıtları: suistimali önlemek için gerekli makul süre. Hukuki yükümlülük gerektiren kayıtlar: ilgili mevzuatta öngörülen süre. Hesabını kapatmak için Ayarlar üzerinden veya bize e-posta ile başvurabilirsin.",
      ],
    },
    {
      title: "7. GÜVENLİK ÖNLEMLERİ",
      paragraphs: [
        "Verilere erişim, kimliğinle sınırlı ve güvenlik kurallarıyla (Firestore Rules) engellenir; veriler yalnızca kendi içeriklerini değiştirebilmeni, başkalarınınkini değiştirememeni sağlayacak biçimde korunur. Bot ve suistimal kontrolü (App Check), şifreli iletişim ve erişim sınırları uygulanır. Kişisel veri ihlali hâlinde, öğrendiğimiz andan itibaren mevzuattaki süreler içinde Kişisel Verileri Koruma Kurulu'na ve etkilenen kişilere bildirim yapmayı taahhüt ederiz.",
      ],
    },
    {
      title: "8. HAKLARIN (KVKK m.11) VE BAŞVURU",
      paragraphs: [
        "Hakların: kişisel verilerinin işlenip işlenmediğini öğrenme; işlenmişse bilgi talep etme; amacına uygun kullanılıp kullanılmadığını öğrenme; eksik/yanlış işlenmişse düzeltilmesini; silinmesini/yok edilmesini; aktarılan üçüncü kişilere düzeltme/silmenin bildirilmesini isteme; işlenen verilerin yalnızca otomatik sistemlerle analiz edilmesiyle aleyhine sonuç çıkmasına itiraz etme; kanuna aykırı işleme nedeniyle zarara uğrarsan giderilmesini talep etme. Başvurunu [E-POSTA] adresinden yapabilirsin; başvurular en geç 30 gün içinde ücretsiz cevaplanır (işlem ayrıca maliyet gerektirirse Kurul tarifesindeki ücret istenebilir). Kimliğini doğrulamak için ek bilgi isteyebiliriz.",
      ],
    },
    {
      title: "9. ÇOCUKLAR",
      paragraphs: [
        "Hizmet, 18 yaşından küçüklerin tek başına kullanımına yönelik değildir. 18 yaşından küçüksen hizmeti veli/vasi bilgin ve iznin ile kullanmalısın; izinsiz kullanımdan haberdar olursak hesabı kapatabiliriz.",
      ],
    },
    {
      title: "10. DEĞİŞİKLİKLER",
      paragraphs: [
        "Bu metindeki anlamlı değişiklikleri, yürürlüğe girmeden önce uygulama içinde bildirir ve gerektiğinde yeniden onayını isteriz. Güncel sürüm her zaman bu sayfada yer alır; eski sürümlerin tarihi bu sayfada görülür.",
      ],
    },
  ],
  ordered: false,
};

export const termsDocument: LegalDocument = {
  type: "terms",
  shortTitle: "Kullanım koşulları",
  title: "Kullanım Koşulları",
  updatedLine: "Son güncelleme: [TARİH] · Sürüm 2.0",
  intro: [],
  sections: [
    {
      title: "1. KABUL",
      paragraphs: [
        "Atlasia'yı kullanarak bu koşulları ve Gizlilik/KVKK metnini kabul etmiş olursun. Kabul etmiyorsan hizmeti kullanmamalısın.",
      ],
    },
    {
      title: "2. HİZMET",
      paragraphs: [
        "Atlasia, gerçek haritalar üzerinde keşif izleri ('izler'), rotalar ve hikâyeler paylaştığın bir keşif platformudur. Harita, rota, mesafe ve süre bilgileri yardımcı amaçlıdır; kesinlik vaat etmez. Bir yeri ziyaret etmeden önce saat, ücret, erişim, güvenlik ve yasallığı resmi kaynaklardan kontrol etmek senin sorumluluğundadır. Atlasia, gerçek dünyada maruz kalabileceğin risklerden sorumlu tutulamaz.",
      ],
    },
    {
      title: "3. HESAP",
      paragraphs: [
        "Bilgilerin doğruluğundan ve hesabındaki etkinliklerden sen sorumlusun; hesap bilgilerini kimseyle paylaşma. Bir hesabı yalnız sen kullanırsın. Başkasının adına hesap açmak, sahte kimlik kullanmak yasaktır.",
      ],
    },
    {
      title: "4. İÇERİĞİN",
      paragraphs: [
        "İzlerin, rotaların, hikâyelerin, fotoğrafların ve yorumların ('İçeriğin') fikri hakları sende kalır. Atlasia'ya içeriğini hizmeti sunmak için gereken ölçüde (saklama, gösterme, ölçekleme, yedekleme) kullanma izni verirsin; bu izin, içeriğini sildiğinde (yedeklerin makul sürede dönüşmesi dışında) sona erer. Başkasına ait içeriği (fotoğraf, metin) hak sahibinin izni olmadan yükleyemezsin.",
      ],
    },
    {
      title: "5. YASAKLAR",
      paragraphs: [
        "Şunlar yasaktır: spam ve reklam; taciz ve nefret söylemi; yanıltıcı veya hayali konumu gerçekmiş gibi göstermek; başkalarının özel bilgilerini (ev adresi, telefon, plaka, kişilerin fotoğrafları) izinsiz paylaşmak; çocukların mahremiyetini ihlal eden içerik; izinsiz girilmesi yasak/tehlikeli yerlere girişe teşvik; telif ihlali; hizmetin güvenliğini bozma (otomatik toplu istek, güvenlik kurallarını baypas girişimi); başkasının hesabını kullanma.",
      ],
    },
    {
      title: "6. MODERASYON VE ŞEFFAFLIK",
      paragraphs: [
        "Bildirilen içerikler önce gözden geçirilir; kurala aykırı bulunan içerik kaldırılır ve sahibine sebebi bildirilir, hesabında görünür. Karara [E-POSTA] veya uygulama içi yol üzerinden itiraz edebilirsin; itirazın incelenir ve sonucu paylaşılır. Spam'i önlemek için yeni hesapların ilk içerikleri kısa süre yayın öncesi denetime tabi olabilir ve topluluğu korumak amacıyla makul paylaşım sınırları uygulanabilir; bu sınırlar abonelikle satılmaz. Tekrarlayan veya ağır ihlallerde hesap sınırlandırılabilir ya da kalıcı kapatılabilir; sessizce veri silmiyoruz — hesapla ilgili her işlemden seni haberdar ederiz (yasal zorunluluk veya acil güvenlik hâlleri dışında).",
      ],
    },
    {
      title: "7. ROZETLER VE SIRALAMA",
      paragraphs: [
        "Rozetler ve ilerleme göstergeleri eğlence ve dürüst ilerleme takibi içindir; gerçek aktivitelerinden türetilir, maddi karşılıkları yoktur ve Atlasia'nın takdiriyle düzeltilebilir. Hiçbir gösterge/resmi sıralama satın alınamaz.",
      ],
    },
    {
      title: "8. ÜCRETLER",
      paragraphs: [
        "Bu sürümde hizmet ücretsizdir; ileride ücretli özellik sunulursa koşullar ayrıca sunulur ve önceden bilgilendirilirsin. Satın alma yapılmadan ücretlendirme yapılamaz.",
      ],
    },
    {
      title: "9. HARİTA VE ÜÇÜNCÜ TARAFLAR",
      paragraphs: [
        "Harita görüntüleri Esri, OpenFreeMap/OpenMapTiles ve OpenStreetMap katkıcılarına; harita verisi © OpenStreetMap katkıcıları'na aittir (atıflar uygulama içinde yer alır). Üçüncü taraf hizmetlere bağlantılar (harita uygulamaları vb.) kendi koşullarına tabidir.",
      ],
    },
    {
      title: "10. HİZMET DURUMU VE DEĞİŞİKLİK",
      paragraphs: [
        "Hizmeti geliştirebilir, değiştirebilir veya sonlandırabiliriz; anlamlı değişiklikler önceden duyurulur. Hizmet 'olduğu gibi' sunulur; kesintisiz/hatasız çalışma ve belirli bir amaca uygunluk vaat edilmez. Yürürlükteki tüketici hakların saklıdır; hiçbir koşul, kanunen vazgeçilemez haklarını ortadan kaldırmaz.",
      ],
    },
    {
      title: "11. FESİH",
      paragraphs: [
        "Koşulları ihlal hâlinde hesabın, sana bildirilerek (acil güvenlik ve yasal hâller dışında) feshedilebilir; sen de dilediğinde hesabını kapatıp koşullar ilişkisini bitirebilirsin. Fesihte herkese açık içeriklerinin akıbeti, kapatma anındaki seçimlerinde açıklandığı gibi olur.",
      ],
    },
    {
      title: "12. UYGULANACAK HUKUK VE İLETİŞİM",
      paragraphs: [
        "Bu koşullar Türkiye hukukuna tabidir. Anlaşmazlıklarda önce bize yazmanı isteriz: [E-POSTA]. Çözülemeyen uyuşmazlıklarda [ŞEHİR] mahkemeleri ve icra daireleri yetkilidir (tüketici işlemlerinde tüketici hakem heyetleri/mahkemelerine başvurma hakkın saklıdır).",
      ],
    },
  ],
  ordered: true,
};

export function getLegalDocument(type: LegalDocumentType): LegalDocument {
  return type === "privacy" ? privacyDocument : termsDocument;
}

export function legalDocumentText(document: LegalDocument): string {
  return [
    document.title,
    document.updatedLine,
    ...document.intro,
    ...document.sections.flatMap((section) => [section.title, ...section.paragraphs]),
  ].join("\n");
}

export function unresolvedLegalPlaceholders(document: LegalDocument): string[] {
  const text = legalDocumentText(document);
  return LEGAL_PLACEHOLDERS.filter((placeholder) => text.includes(placeholder));
}
