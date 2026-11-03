export interface AudioDiscoveryStop {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  sources: { title: string; url: string }[];
  coordinateSource: string;
  audio?: string;
  image?: { url: string; alt: string; source: string; author: string; license: string; licenseUrl: string };
}

export interface AudioDiscoveryTour {
  id: string;
  placeId: string;
  title: string;
  stops: AudioDiscoveryStop[];
}

const agoraSources = [
  { title: "Ephesus.net", url: "https://www.ephesus.net/ancient-city/" },
  { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/state-agora-ephesus" },
  { title: "Madain Project · Efes arkeolojik alanı", url: "https://madainproject.com/archaeological_site_of_ephesus" },
];

/** Koordinatlar yapının temsil noktalarıdır; yaya erişimi/saha konumu değildir. */
export const AUDIO_DISCOVERY_TOURS: AudioDiscoveryTour[] = [{
  id: "efes-kamusal-yasam",
  placeId: "efes",
  title: "Efes antik kentini keşfet",
  stops: [
    {
      id: "prytaneion", title: "Prytaneion", audio: "/audio/efes-prytaneion-v2.mp3", image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Ephesos_Prytaneion.JPG/960px-Ephesos_Prytaneion.JPG", alt: "Efes Prytaneion kalıntıları", source: "https://commons.wikimedia.org/wiki/File:Ephesos_Prytaneion.JPG", author: "Elelicht", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" }, lat: 37.9373905, lng: 27.344249,
      description: "Devlet Agorası’nın kuzeyindeki bu yapı, Efes’in kamusal ve dinsel yaşamında önemli bir yere sahipti. İçinde kentin kutsal ocağı bulunuyordu. Kuretler adıyla bilinen rahipler bu ateşe bakıyor, isimleri yapının sütunlarına işleniyordu. Kazılarda burada bulunan Efes Artemis’i heykelleri bugün Selçuk’taki Efes Müzesi’nde sergileniyor. Yeniden ayağa kaldırılmış sütunlar, yapının geçmişteki görünümünü hayal etmemize yardımcı oluyor.",
      coordinateSource: "https://www.wikidata.org/wiki/Q2114503",
      sources: [
        { title: "Ephesus.net", url: "https://www.ephesus.net/ancient-city/" },
        { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/public-buildings-north-state-agora-ephesus" },
        { title: "Martin Steskal · Das Prytaneion in Ephesos (ÖAW)", url: "https://verlag.oeaw.ac.at/produkt/das-prytaneion-in-ephesos/600705" },
      ],
    },
    {
      id: "devlet-agorasi", title: "Devlet Agorası", audio: "/audio/efes-devlet-agorasi-v2.mp3", image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Ephesus_State_agora_in_2011_3745.jpg/960px-Ephesus_State_agora_in_2011_3745.jpg", alt: "Devlet Agorası üzerinden Odeion görünümü", source: "https://commons.wikimedia.org/wiki/File:Ephesus_State_agora_in_2011_3745.jpg", author: "Dosseman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" }, lat: 37.936363, lng: 27.344286,
      description: "Yukarı Agora olarak da bilinen bu alan, Efes’in kamusal yaşamının merkezlerinden biriydi. Ticari Agora’dan farklı olarak resmî ve kamusal toplantılarla ilişkilendiriliyordu. Meydan, daha eski bir mezarlık alanının üzerine düzenlenmişti. Çevresindeki sütunlu ve çatılı galerilere stoa denirdi. Kuzeydeki Bazilika Stoası ve yakındaki kamusal yapılar, buranın kentin yönetim yaşamındaki önemini gösterir.",
      coordinateSource: "https://turkisharchaeonews.net/object/state-agora-ephesus",
      sources: agoraSources,
    },
    {
      id: "basilica-stoa", title: "Bazilika Stoası", audio: "/audio/efes-basilica-stoa-v2.mp3", image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Ephesus_basilica2.jpg/960px-Ephesus_basilica2.jpg", alt: "Efes Bazilika Stoası kalıntıları", source: "https://commons.wikimedia.org/wiki/File:Ephesus_basilica2.jpg", author: "Rita1234", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" }, lat: 37.936739, lng: 27.344431,
      description: "Devlet Agorası’nın kuzey kenarı boyunca uzanan bu büyük sütunlu yapı, Efes’in kamusal alanını çerçeveliyordu. Milattan sonra 11 yılında Gaius Sextilius Pollio ve ailesi tarafından Artemis’e, imparatorlara ve kente adanmıştı. İyon düzenindeki sütun başlıklarındaki boğa başları, yapının dikkat çekici ayrıntılarındandı. Uzun salon, yağmurdan ve güneşten korunulan bir alan sağlıyordu; kamu işleri ve toplantılarla da ilişkilendiriliyor.",
      coordinateSource: "https://www.wikidata.org/wiki/Q76533658",
      sources: agoraSources,
    },
    {
      id: "celsus-kutuphanesi", title: "Celsus Kütüphanesi", audio: "/audio/efes-celsus.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Ephesus_Library_of_Celsus.jpg/960px-Ephesus_Library_of_Celsus.jpg", alt: "Efes Celsus Kütüphanesi cephesi", source: "https://commons.wikimedia.org/wiki/File:Ephesus_Library_of_Celsus.jpg", author: "Emre D.", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
      lat: 37.939209, lng: 27.340901,
      description: "Celsus Kütüphanesi, Efes’in en tanınan yapılarından biridir. Roma döneminde, milattan sonra ikinci yüzyılda, Aquila tarafından babası senatör Celsus’un anısına yaptırıldı. Yapı yalnızca bir kütüphane değildi; Celsus’un mezar odası da kütüphanenin altında yer alıyordu. İçeride, yazma ruloların saklandığı nişler ve raflar bulunuyordu. Bugün gördüğümüz iki katlı cephe, yirminci yüzyılda kazılarda bulunan parçalar ve ek malzemeler kullanılarak yeniden ayağa kaldırıldı. Cephedeki dört heykel bilgelik, erdem, bilgi ve aklı temsil eder; özgün heykeller bugün Viyana’dadır.",
      coordinateSource: "https://turkisharchaeonews.net/object/library-celsus-ephesus",
      sources: [
        { title: "Avusturya Bilimler Akademisi · Celsus Kütüphanesi", url: "https://www.oeaw.ac.at/en/news/preserving-world-cultural-heritage-austrian-researchers-start-conservation-of-the-celsus-library-in-ephesos-1" },
        { title: "Turkish Archaeological News · Celsus Kütüphanesi", url: "https://turkisharchaeonews.net/object/library-celsus-ephesus" },
        { title: "Ephesus.net · antik kent", url: "https://www.ephesus.net/ancient-city/" },
      ],
    },
    {
      id: "buyuk-tiyatro", title: "Büyük Tiyatro", audio: "/audio/efes-buyuk-tiyatro.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Ephesus_Amphitheatre_%286998768420%29.jpg/960px-Ephesus_Amphitheatre_%286998768420%29.jpg", alt: "Efes Büyük Tiyatrosu ve oturma sıraları", source: "https://commons.wikimedia.org/wiki/File:Ephesus_Amphitheatre_(6998768420).jpg", author: "Benh LIEU SONG", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/" },
      lat: 37.941419, lng: 27.342517,
      description: "Efes Büyük Tiyatrosu, Panayır Dağı’nın yamacına yerleşen görkemli bir açık hava yapısıdır. İlk yapım dönemi Helenistik çağa uzanır; Roma döneminde genişletilerek bugünkü büyük ölçeğine ulaşmıştır. Yarım daireye yaklaşan oturma sıraları ve sahne yapısının kalıntıları, antik kentte toplulukların bir araya geldiği bu mekânın büyüklüğünü hissettirir. Seyirci kapasitesi için kaynaklar farklı tahminler verir; bu nedenle kesin bir sayı söylemek güçtür. Tiyatronun karşısındaki Liman Caddesi, antik dönemde kentin liman yönüne uzanıyordu. Bugün kalıntılar Efes’in çok katmanlı tarihini anlamamıza yardımcı oluyor.",
      coordinateSource: "https://turkisharchaeonews.net/object/great-theatre-ephesus",
      sources: [
        { title: "Turkish Archaeological News · Büyük Tiyatro", url: "https://turkisharchaeonews.net/object/great-theatre-ephesus" },
        { title: "Ancient Theatres · Efes", url: "https://ancienttheatrescom.wpcomstaging.com/theatre/ephesus-modern-selcuk-turkey/" },
        { title: "UNESCO · Efes", url: "https://whc.unesco.org/en/list/1018/" },
      ],
    },
    {
      id: "hadrian-tapinagi", title: "Hadrian Tapınağı", audio: "/audio/efes-hadrian.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Temple_of_Hadrian_at_Ephesus.jpg/960px-Temple_of_Hadrian_at_Ephesus.jpg", alt: "Hadrian Tapınağı cephesi", source: "https://commons.wikimedia.org/wiki/File:Temple_of_Hadrian_at_Ephesus.jpg", author: "Mehveuuum", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
      lat: 37.938538, lng: 27.341943,
      description: "Kuretler Caddesi üzerindeki bu zarif yapı, genellikle Hadrian Tapınağı adıyla tanınır. Adı kesin işlevinin tartışmasız olduğu anlamına gelmez; araştırmacılar yapının imparatorluk kültü içindeki yerini ve arkasındaki hamamla ilişkisini incelemiştir. İkinci yüzyıla tarihlenen yapının ön cephesindeki kemer, sütunlar ve bitkisel süslemeler dikkat çeker. Kazılarda bulunan parçalarla yirminci yüzyılda yeniden ayağa kaldırılmıştır. Ön bölümde görülen kabartmaların asılları Efes Müzesi’nde korunur; yerlerinde kopyaları bulunur. Bu küçük anıt, Efes’in mimarisini anlamak için zengin ayrıntılar sunar.",
      coordinateSource: "https://turkisharchaeonews.net/object/temple-hadrian-ephesus",
      sources: [
        { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/temple-hadrian-ephesus" },
        { title: "Ephesus.net", url: "https://www.ephesus.net/ancient-city/" },
        { title: "Ursula Quatember · araştırma makalesi", url: "https://www.cambridge.org/core/journals/journal-of-roman-archaeology/article/abs/temple-of-hadrian-on-curetes-street-in-ephesus-new-research-into-its-building-history/C75546F79FF48D0E2E21AAB8D2BEFA55" },
      ],
    },
    {
      id: "trajan-cesmesi", title: "Trajan Çeşmesi", audio: "/audio/efes-trajan-cesmesi.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/The_Fountain_of_Trajan%2C_Ephesus%2C_Turkey_%2818818526443%29.jpg/960px-The_Fountain_of_Trajan%2C_Ephesus%2C_Turkey_%2818818526443%29.jpg", alt: "Efes Trajan Çeşmesi kalıntıları", source: "https://commons.wikimedia.org/wiki/File:The_Fountain_of_Trajan,_Ephesus,_Turkey_(18818526443).jpg", author: "Carole Raddato", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/" },
      lat: 37.938121, lng: 27.342502,
      description: "Trajan Çeşmesi, Kuretler Caddesi üzerindeki anıtsal su yapılarından biridir. Kitabesine göre Tiberius Claudius Aristion ve eşi tarafından Efesli Artemis ile İmparator Trajan onuruna yaptırılmıştır. Milattan sonra ikinci yüzyılın başına tarihlenen yapı, su havuzunu çevreleyen süslü ve iki katlı bir cepheye sahipti. Merkezdeki büyük imparator heykeli ve çevredeki diğer heykeller, çeşmeyi yalnızca suyun ulaştığı bir nokta değil, aynı zamanda kentin gösterişli bir kamusal anıtı hâline getiriyordu. Bugün görülen mimari parçalar, çeşmenin geçmişteki düzenini anlamamıza yardımcı olur.",
      coordinateSource: "https://turkisharchaeonews.net/object/trajans-nymphaeum-ephesus",
      sources: [
        { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/trajans-nymphaeum-ephesus" },
        { title: "Kültür ve Turizm Bakanlığı ve ÖAI · alan tabelası", url: "https://www.hmdb.org/m.asp?m=84519" },
        { title: "Ephesus.net", url: "https://www.ephesus.net/ancient-city/" },
      ],
    },
    {
      id: "yamac-evler", title: "Yamaç Evler", audio: "/audio/efes-yamac-evler.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Ephesus_Terrace_Houses.jpg/960px-Ephesus_Terrace_Houses.jpg", alt: "Efes Yamaç Evler içindeki kalıntılar", source: "https://commons.wikimedia.org/wiki/File:Ephesus_Terrace_Houses.jpg", author: "Ronan Reinart", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
      lat: 37.93821, lng: 27.3414,
      description: "Yamaç Evler, Efes’te Roma dönemi konut yaşamını anlamak için önemli bir arkeolojik alandır. Evler Bülbül Dağı’nın eğimli yamacında teraslar üzerine kurulmuştur. Özellikle Yamaç Ev iki adı verilen bölümde, avlular çevresinde düzenlenmiş konutların duvar resimleri, mozaikleri ve mermer kaplamaları korunmuştur. Su tesisatı ve yerden ısıtma izleri, bazı evlerin sunduğu konforu gösterir. Arkeolojik kazı ve koruma çalışmaları, parçalanmış süslemelerin bir araya getirilmesini de kapsar. Bugün koruyucu bir çatı, bu hassas kalıntıların korunmasına yardımcı olur. Ziyaret koşullarını ve erişimi önceden resmî kaynaklardan kontrol etmek gerekir.",
      coordinateSource: "https://turkisharchaeonews.net/object/terrace-houses-ephesus",
      sources: [
        { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/terrace-houses-ephesus" },
        { title: "World Archaeology · Yamaç Ev 2", url: "https://www.world-archaeology.com/features/ephesus-4/" },
        { title: "UNESCO · Efes", url: "https://whc.unesco.org/en/list/1018/" },
      ],
    },
    {
      id: "odeon", title: "Odeon / Bouleuterion", audio: "/audio/efes-odeon.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/The_Odeon_at_Ephesus_01.jpg/960px-The_Odeon_at_Ephesus_01.jpg", alt: "Efes Odeon yapısı ve oturma sıraları", source: "https://commons.wikimedia.org/wiki/File:The_Odeon_at_Ephesus_01.jpg", author: "Mehveuuum", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
      lat: 37.9369, lng: 27.34495,
      description: "Devlet Agorası’nın kuzeyindeki bu küçük tiyatro biçimli yapı, Odeon ya da Bouleuterion olarak bilinir. Bouleuterion, kent meclisinin toplandığı yer anlamına gelir. Yapının toplantıların yanı sıra gösteriler için de kullanılmış olabileceği düşünülür. Taş oturma sıraları, orkestra alanı ve sahne yapısı küçük bir tiyatroyu andırır. İkinci yüzyılda Vedius Antoninus ve ailesinin yapıyla bağlantılı olduğu yazıtlardan bilinir; ancak daha önce de bir meclis binasının bulunduğuna ilişkin kanıtlar vardır. Bu nedenle bugünkü kalıntıları, tek bir tarihte doğmuş değişmez bir yapı olarak değil, zaman içinde yenilenmiş bir kamusal mekân olarak düşünmek daha doğru olur.",
      coordinateSource: "https://www.wikidata.org/wiki/Q56633101",
      sources: [
        { title: "Ancient Theatres · Odeon", url: "https://ancienttheatrescom.wpcomstaging.com/theatre/ephesus-odeum/" },
        { title: "Ephesus.net · Odeon", url: "https://www.ephesus.net/ancient-city/" },
        { title: "Turkish Archaeological News · kuzey yapıları", url: "https://turkisharchaeonews.net/object/public-buildings-north-state-agora-ephesus" },
      ],
    },
    {
      id: "ticaret-agorasi", title: "Ticaret Agorası", audio: "/audio/efes-ticaret-agorasi.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/The_Commercial_Agora_%2813975446283%29.jpg/960px-The_Commercial_Agora_%2813975446283%29.jpg", alt: "Efes Ticaret Agorası", source: "https://commons.wikimedia.org/wiki/File:The_Commercial_Agora_(13975446283).jpg", author: "Erik Cleves Kristensen", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/" },
      lat: 37.94002, lng: 27.34065,
      description: "Ticaret Agorası, Efes’in antik limanına yakın bir pazar alanıydı. Kareye yakın planı nedeniyle Tetragonos Agora adıyla da bilinir. Alanın geçmişi Helenistik döneme uzanır; Augustus dönemindeki genişleme ve sonraki yenilemeler görünümünü değiştirmiştir. Açık avlunun çevresindeki sütunlu galerilerin arkasında dükkânlar ve çalışma alanları bulunuyordu. Kapılar, pazar yerini kentin sokaklarına bağlardı. Yakındaki Celsus Kütüphanesi ile Mazaeus ve Mithridates Kapısı, bu bölgenin antik kent dokusundaki yerini anlamaya yardımcı olur. Haritadaki işaret bütün agoranın sınırını değil, alanı temsil eden yaklaşık bir noktayı gösterir.",
      coordinateSource: "https://turkisharchaeonews.net/object/commercial-agora-ephesus",
      sources: [
        { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/commercial-agora-ephesus" },
        { title: "Bakanlık ve ÖAI · alan tabelası", url: "https://www.hmdb.org/m.asp?m=84363" },
        { title: "Ephesus.net", url: "https://www.ephesus.net/ancient-city/" },
      ],
    },
    {
      id: "mazaeus-mithridates", title: "Mazaeus ve Mithridates Kapısı", audio: "/audio/efes-mazaeus-kapisi.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/16.1_Mazeus-Mithridates_Gate_in_Ephesus.JPG/960px-16.1_Mazeus-Mithridates_Gate_in_Ephesus.JPG", alt: "Efes Mazaeus ve Mithridates Kapısı", source: "https://commons.wikimedia.org/wiki/File:16.1_Mazeus-Mithridates_Gate_in_Ephesus.JPG", author: "José Luiz Bernardes Ribeiro", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
      lat: 37.939261, lng: 27.341019,
      description: "Mazaeus ve Mithridates Kapısı, Celsus Kütüphanesi’nin yanında, Ticaret Agorası’nın güney girişinde yer alır. Üç kemerli anıtın üzerindeki yazıtlar, kapının Mazaeus ve Mithridates adlı azat edilmiş kişiler tarafından Augustus ve ailesi onuruna yaptırıldığını anlatır. Yazıttaki unvanlar, yapıyı milattan önce dördüncü ve üçüncü yıllar arasına tarihlendirmeye yardımcı olur. Kapı antik dönemde agoranın düzenlemesiyle ilişkilendirilmiş, yirminci yüzyılda yeniden ayağa kaldırılmıştır. Kitabeler, yalnızca mimariyi değil, kentin toplumsal ilişkilerini anlamak için de önemli birer kaynaktır.",
      coordinateSource: "https://turkisharchaeonews.net/object/gate-mazaeus-and-mithridates-ephesus",
      sources: [
        { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/gate-mazaeus-and-mithridates-ephesus" },
        { title: "Efes Dostları Derneği · restorasyon", url: "https://www.ephesos.at/en/completed-projects" },
        { title: "Ephesus.net", url: "https://www.ephesus.net/ancient-city/" },
      ],
    },
    {
      id: "memmius", title: "Memmius Anıtı", audio: "/audio/efes-memmius.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Memmius_monument_%28Ephesus%29_Turkey.jpg/960px-Memmius_monument_%28Ephesus%29_Turkey.jpg", alt: "Memmius Anıtı", source: "https://commons.wikimedia.org/wiki/File:Memmius_monument_(Ephesus)_Turkey.jpg", author: "Ashokmehta72", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
      lat: 37.937251, lng: 27.34333,
      description: "Kuretler Caddesi yakınındaki Memmius Anıtı, Roma döneminin onurlandırma anıtlarından biridir. Kaynaklar, Gaius Memmius’un anıtı ailesiyle ilişkili olarak yaptırdığını ve Roma diktatörü Sulla’nın onun büyükbabası olduğunu aktarır. Kalıntılarda mimari parçalar ve figürlü bezemeler görülebilir. Anıtın ilk görünüşüne ilişkin rekonstrüksiyonlar yorum içerir; bugün görülen düzenlemeyi, yapının antik dönemdeki kesin görünümü olarak kabul etmemek gerekir. Yakınındaki Hydreion ise suyla ilişkili, ayrı bir yapıdır. Bu nokta iki kalıntının birbirine yakın olduğu bölgeyi yaklaşık olarak gösterir.",
      coordinateSource: "https://turkisharchaeonews.net/object/hydreion-and-memmius-monument-ephesus",
      sources: [
        { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/hydreion-and-memmius-monument-ephesus" },
        { title: "Madain Project", url: "https://madainproject.com/archaeological_site_of_ephesus" },
        { title: "ÖAI · araştırma serisi, FiE 7 bibliyografisi", url: "https://www.oeaw.ac.at/en/oeai/publishing/series/forschungen-in-ephesos" },
      ],
    },
    {
      id: "skolastika", title: "Skolastika Hamamları", audio: "/audio/efes-skolastika.mp3",
      image: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/11.2_Scholastikia_Baths_in_Ephesus.JPG/960px-11.2_Scholastikia_Baths_in_Ephesus.JPG", alt: "Skolastika Hamamları kalıntıları", source: "https://commons.wikimedia.org/wiki/File:11.2_Scholastikia_Baths_in_Ephesus.JPG", author: "José Luiz Bernardes Ribeiro", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
      lat: 37.938727, lng: 27.342042,
      description: "Kuretler Caddesi yakınındaki Skolastika Hamamları, Roma kentinde yıkanmanın yanı sıra dinlenme ve toplumsal buluşma için kullanılan bir yapı kompleksiydi. Kaynaklar yapının erken Roma döneminde kurulduğunu ve geç antik dönemde Skolastika adlı bir kadın tarafından yenilendiğini aktarır. Hamam planında soyunma, soğuk, ılık ve sıcak bölümler bulunuyordu. Zeminin altındaki ısıtma düzeni, sıcak mekânların nasıl çalıştığını anlamamıza yardımcı olur. Kalıntılar farklı dönemlerin müdahalelerini birlikte yansıtır; bugün görülen duvarların tümü aynı tarihte yapılmış değildir. Yakın çevredeki latrina, yani ortak tuvalet yapısı, ayrı bir kamusal kullanım alanıdır.",
      coordinateSource: "https://turkisharchaeonews.net/object/scholastica-baths-ephesus",
      sources: [
        { title: "Turkish Archaeological News", url: "https://turkisharchaeonews.net/object/scholastica-baths-ephesus" },
        { title: "Madain Project", url: "https://madainproject.com/archaeological_site_of_ephesus" },
        { title: "Ephesus.net", url: "https://www.ephesus.net/ancient-city/" },
      ],
    },
  ],
}];

export function audioDiscoveryForPlace(placeId: string): AudioDiscoveryTour | null {
  return AUDIO_DISCOVERY_TOURS.find((tour) => tour.placeId === placeId) ?? null;
}
