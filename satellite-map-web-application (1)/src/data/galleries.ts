const p = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200`;

const commons = (name: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=1200`;

export const GALLERIES: Record<string, string[]> = {
  kyoto: [29537651, 38150327, 38150322, 38150395, 38150365, 29537657, 18848721, 7107625].map(p),
  santorini: [37908296, 30734677, 38710745, 38020589, 9742463, 13900615].map(p),
  machu: [37885473, 17030795, 36459302, 29964216, 10549835, 7342973].map(p),
  kapadokya: [27260270, 6173322, 23439090, 30370450, 8321314, 5533202].map(p),
  petra: [19845411, 15998100, 15998107, 11195787, 15997971].map(p),
  chefchaouen: [18487344, 5472518, 18767571, 5472527, 13591966].map(p),
  banff: [18292197, 18515005, 7361394, 6249812, 33730307].map(p),
  positano: [19900429, 36366053, 12464291, 17807444, 19143175].map(p),
  efes: [15123091, 15271623, 15123232, 14474360, 20755097].map(p),
  pamukkale: [5319469, 11117440, 27906058, 27870245, 29800608].map(p),
  kaputas: [9620824, 9620825, 24960709, 18961675, 30756886].map(p),
  galata: [33086973, 18822672, 37226341, 14900605, 10989757].map(p),
  gaziantep: [37805691, 37061322, 37061338, 34391573, 37805690].map(p),
  gobeklitepe: [31028144, 31028120, 31028156, 33426413, 31028138].map(p),
  likya: [37920784, 8321576, 28668664].map(p),
  kackar: [36362559, 36111973, 8323011, 39123882].map(p),
  moda: [31711063, 31711070, 29721631, 36831668, 36799202].map(p),
  navagio: [32937277, 274060, 6477679, 6477614, 15183546].map(p),
  napoli: [38152123, 37724023, 18762051, 38499299, 36817240, 34380267].map(p),
  venedik: [36687114, 18781088, 29487687, 35909665, 39444238].map(p),
  camino: [35490133, 11324085, 38018485, 39896733].map(p),
  skogafoss: [28134867, 4813808, 3379776, 12697910, 9999092].map(p),
  lofoten: [19139425, 12166188, 38658942, 38264067, 36025439, 19405839].map(p),
  aral: [36612746, 36446923, 36612749, 36429276, 36429289].map(p),
  girne: [10534187, 12861106, 14909610, 13109732].map(p),
  "buyuk-han": [p(25649220), ...[
    "Aisle of Büyük Han, Nicosia.jpg",
    "Avlu Büyük Han Lefkosa.jpg",
    "Büyük Han Cyprus (41914047980).jpg",
    "Büyük Han view from the gate.jpg",
  ].map(commons)],
  salamis: [
    "Columns in Roman gymnasium, Salamis, Northern Cyprus.jpg",
    "Columns in Roman gymnasium, Salamis, Northern Cyprus 05.jpg",
    "Marble pool at NE corner of the Gymnasium's portico surrounded by headless statues dating back to the 2nd century AD (Trajanic-Hadrianic), Salamis, Northern Cyprus (22722929255).jpg",
  ].map(commons),
  karpaz: [
    "Golden Beach, Karpaz, Northern Cyprus.jpg",
    "Golden Beach (31641992844).jpg",
    "Golden Beach (31673899723).jpg",
    "Golden Beach (31673917423).jpg",
    "Golden Beach (32363857171).jpg",
  ].map(commons),
};

export const STORIES: Record<string, string> = {
  kyoto:
    "Fushimi Inari Taisha, 8. yüzyıldan beri Inari'ye — pirinç, bereket ve işin kami'sine — adanmış. Binlerce kırmızı torii, adak olarak işyerleri ve aileler tarafından dikildi; her kapının üzerinde bağışçının adı yazılı. Senbontorii tüneli dağın eteklerinden başlar, tepeye çıktıkça kalabalık incelir. Tilki heykelleri (kitsune) Inari'nin elçisidir; ağızlarındaki anahtar, tahıl ambarının kilididir. Gece lambaları yanınca kırmızı, yosun ve sessizlik aynı koridorda durur.",
  santorini:
    "Oia, kalderanın kuzey dudakta kurulmuş. 1956 depreminden sonra evler yeniden badanalandı; kubbeler Ege'nin mavisini içeri almak için boyandı. Gün batımı kalabalığı kaleden izlenir ama asıl ışık, sokakların arasına sızan son turuncu dilimdedir. Ada bir volkanın kenarıdır; altındaki su, çökmüş kraterin doldurduğu bir çanak.",
  machu:
    "Machu Picchu 15. yüzyılda Pachacuti döneminde tarım terasları ve tapınaklarla kuruldu. İspanyol kayıtlarında adı geçmez; 1911'de Hiram Bingham vadideki tarlalardan yukarı çıktığında sisin içinden taşlar belirdi. Intihuatana kayası güneşi bağlamak için yontulmuş olabilir. Huayna Picchu'nun ardındaki sis çekilince şehir, tarım ve boşluk aynı anda görünür.",
  kapadokya:
    "Peri bacaları, volkan küllerinin rüzgâr ve yağmurla oyulmasıyla oluştu. Kapadokya'daki yeraltı şehirleri ve kaya kiliseleri, erken Hıristiyan topluluklarının sığındığı oyuklardır. Göreme'de sabah balonları vadinin üstüne dizilir; yerde kalanlar Aşk Vadisi sırtından aynı gökyüzünü bedava izler.",
  petra:
    "Petra, Nebatilerin kırmızı kumtaşına oyduğu ticaret kentiydi. El-Hazine (Al-Khazneh) aslında bir kral mezarıdır; Siq adlı dar kanyondan sonra birden açılır. 19. yüzyılda Avrupa'da 'kayıp şehir' diye anlatıldı. Gece mumlarla Hazine'nin önü aydınlatılır; taş, ateşin rengine döner.",
  chefchaouen:
    "Chefchaouen 1471'de Rif dağlarında kuruldu. Mavi badana, 20. yüzyılda Yahudi mahallesinden yayıldığı söylenir — gökyüzünü hatırlatmak, serinlik, ya da sadece boyanın ucuzluğu. Dar merdivenler, kiremit ve asılı çamaşır aynı maviye biner. Sabah erken, tur otobüsü gelmeden sokak kendi sesini duyar.",
  banff:
    "Moraine Gölü, On Zirve Vadisi'nin dibinde buzul sütüyle turkuazdır. Banff, 1885'te Kanada'nın ilk milli parkı oldu. Gölün kıyısındaki kayalık 'Rockpile' sabahın ilk ışığında dolar; öğleden sonra rüzgâr suyu matlaştırır.",
  positano:
    "Positano, Amalfi kıyısında kayaya yapışmış evlerle bilinir. Ortaçağda denizcilik kasabasıydı; 20. yüzyılda yazarlar ve ressamlar merdivenli sokaklara yerleşti. Renkli cepheler denizi işaret eder; limandan yukarı çıkmak, her katta başka bir teras demektir.",
  efes:
    "Efes, Artemis tapınağı ve Celsus Kütüphanesi ile Roma Anadolu'sunun büyük limanıydı. Menderes'in alüvyonu denizi uzaklaştırınca kent küçüldü. Mermer cadde, öğleden önce boşken taşın damarları okunur.",
  pamukkale:
    "Pamukkale'nin beyaz terasları, kireçli suyun yüzyıllarca taşı dökmesiyle oluştu. Hierapolis aynı yamaçta; antik havuz hâlâ ılık. Gün batımında travertenler pembeye döner.",
  galata:
    "Galata Kulesi Cenevizlilerin 14. yüzyıl gözetleme kulesiydi. Haliç'e bakan taş, Karaköy'ün gürültüsünden bir kat yukarıdadır. Hezarfen'in uçuş efsanesi kuleye yapışmıştır; gerçek olsun ya da olmasın, rüzgâr aynı yerden eser.",
};
