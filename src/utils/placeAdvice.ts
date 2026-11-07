import type { Place } from "../types";
import { normalize } from "./text";

const ALIASES: Record<string, string[]> = {
  kyoto: ["kyoto", "fushimi", "inari"],
  kapadokya: ["kapadokya", "goreme"],
  galata: ["galata", "istanbul"],
  efes: ["efes", "ephesus"],
  pamukkale: ["pamukkale"],
  machu: ["machu picchu", "cusco"],
  petra: ["petra"],
  banff: ["banff", "moraine"],
  chefchaouen: ["chefchaouen", "safsa"],
  santorini: ["santorini", "oia"],
  girne: ["girne", "kyrenia"],
  moda: ["moda", "kadikoy"],
  likya: ["likya", "faralya"],
  lofoten: ["lofoten"],
  karpaz: ["karpaz"],
  napoli: ["napoli", "naples"],
  venedik: ["venedik", "venice"],
  skogafoss: ["skogafoss"],
  gobeklitepe: ["gobeklitepe"],
  kaputas: ["kaputas"],
  gaziantep: ["gaziantep"],
  kackar: ["kackar"],
  navagio: ["navagio", "shipwreck"],
  camino: ["camino", "santiago"],
  aral: ["moynak", "aral golu"],
  "buyuk-han": ["buyuk han"],
  salamis: ["salamis"],
  positano: ["positano"],
};

export function namedPlace(query: string, places: Place[]) {
  const value = normalize(query);
  return places.find((place) => (ALIASES[place.id] ?? [normalize(place.title)]).some((alias) => value.includes(alias)));
}

export interface PlaceAdvice {
  access: string;
  caution: string;
  timing: string;
  cost: string;
}

export interface PlaceSource {
  kind: "wikipedia" | "wikidata";
  /** Kaynak etiketi; ör. "Vikipedi · Efes". */
  name: string;
  /** Madde adı ya da Wikidata öğe kimliği. */
  title: string;
  url: string;
  license: "CC BY-SA 4.0" | "CC0";
  lang: "tr" | "en" | "-";
  /** Kaynağın okunduğu gün (ISO 8601). */
  accessed: string;
}

/**
 * Doğrulanamayan alanlar bu tam ifadeyle bırakılır. Serbest metin içinde
 * "doğrulanmadı" geçmesi kural değildir; alan ya doğrulanmış metindir ya da
 * yalnız bu işarettir. Test bunu kilitler.
 */
export const UNVERIFIED = "Doğrulanmadı.";

/** Bir tavsiye alanının üst sınırı: kart içinde kısa kalsın. */
export const ADVICE_FIELD_MAX_CHARS = 240;

const ACCESSED = "2026-10-22";

const wikipedia = (
  lang: "tr" | "en",
  title: string,
  url: string,
): PlaceSource => ({
  kind: "wikipedia",
  name: `Vikipedi · ${title}`,
  title,
  url,
  license: "CC BY-SA 4.0",
  lang,
  accessed: ACCESSED,
});

const wikidata = (id: string): PlaceSource => ({
  kind: "wikidata",
  name: "Wikidata",
  title: id,
  url: `https://www.wikidata.org/wiki/${id}`,
  license: "CC0",
  lang: "-",
  accessed: ACCESSED,
});

/**
 * Rehber yerlerinin "Gitmeden bil" metinleri.
 *
 * Kaynak politikası: metinler Vikipedi maddeleri ve Wikidata öğelerindeki
 * bilgilerden kendi cümlelerimizle yazılır; kaynaktan cümle kopyalanmaz.
 * Doğrulanamayan alan UNVERIFIED olarak kalır, tahmin yazılmaz.
 * URL listesi docs/icerik/yer-kaynaklari.md içinde tutulur ve testle eşlenir.
 */
export const PLACE_ADVICE: Record<string, PlaceAdvice> = {
  efes: {
    access:
      "İzmir'in Selçuk ilçesinin yaklaşık 3 km güneybatısında; Selçuk üzerinden karayoluyla ulaşılır. Güncel giriş kapısı ve servis bilgisini resmî kaynaktan doğrula.",
    caution:
      "Açık alanda yürüyüş ağırlıklı bir ziyaret; su, şapka ve kaymayan ayakkabı al. Kalıntılara dokunma, işaretli güzergâhta kal.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  kapadokya: {
    access:
      "Nevşehir'in Göreme ve Uçhisar çevresindeki vadilere Nevşehir üzerinden karayoluyla ulaşılır; toplu taşıma için güncel bilgiyi kontrol et.",
    caution:
      "Vadi tabanlarında zemin gevşek olabilir; işaretli patikadan ayrılma. Balon uçuşları rüzgâra bağlı olduğu için iptal ihtimalini planla.",
    timing: "Balon uçuşları gün doğumunda yapılıyor; vadi yürüyüşleri için gün ışığı saatlerini seç.",
    cost: UNVERIFIED,
  },
  pamukkale: {
    access:
      "Denizli'de, Pamukkale beldesinde; travertenler ile Hierapolis antik kenti aynı ziyaret alanında yer alıyor.",
    caution:
      "Travertenler ıslakken kaygan; işaretli hattan ilerle ve ayakkabılarını koyabileceğin bir çanta getir. Havuzların dışına taşma.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  kaputas: {
    access:
      "Kaş ile Kalkan arasındaki D400 karayolu üzerinde; plaja karayolundan 187 basamaklı merdivenle inilir.",
    caution:
      "Merdiven iniş ve çıkışta yorucu; su ve zaman planla. Yüzmeden önce cankurtaran ve akıntı bilgisini yerel kaynaktan kontrol et.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  galata: {
    access: "Beyoğlu'nda, Haliç'in kuzey yakasında; Karaköy ve Galata Köprüsü tarafından yürüyerek ulaşılır.",
    caution:
      "Yokuşlu sokaklarda yaya ve araç trafiği var; kaymayan ayakkabı giy ve kalabalıkta çantana dikkat et.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  gaziantep: {
    access:
      "Gaziantep il merkezinde, Şahinbey ilçesindeki Bakırcılar Çarşısı; şehir içinden yürüyüş ve toplu taşımayla ulaşılır.",
    caution:
      "Kapalı çarşıda dar geçitler olabilir; değerli eşyalara dikkat et, alışverişte fiyatı önceden sor.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  gobeklitepe: {
    access:
      "Şanlıurfa merkezinin 18 km kuzeydoğusunda, Haliliye'ye bağlı Örencik köyü yakınında; şehirden karayoluyla ulaşılır.",
    caution:
      "Açık alanda gölge sınırlı olabilir; su, şapka ve güneş koruması al. Dikilitaşlara ve kazı alanına dokunma.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  likya: {
    access:
      "Fethiye'den Antalya yönüne uzanan işaretli uzun yürüyüş rotasının Fethiye kesiminde; Faralya'ya ulaşım için yerel yol bilgisini kontrol et.",
    caution:
      "Uzun mesafeli patika; su, harita ve hava koşullarına uygun ekipman al. Rotanın tamamı haftalar sürebilir, kendi bölümünü planla.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  kackar: {
    access:
      "Rize'nin Çamlıhemşin ilçesi sınırlarında; millî parkın büyük bölümü burada, küçük bir bölümü Artvin'in Yusufeli ilçesinde.",
    caution:
      "Zirveler 3.500 m'nin üzerinde; yükseklik ve hızlı hava değişimi için katmanlı giyim, harita ve yeterli su al. Teknik rotalara rehbersiz girme.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  moda: {
    access:
      "Kadıköy merkezi ile Kurbağalıdere arasındaki yarımadada; Kadıköy'den yürüyerek veya şehir içi ulaşımla gidilir.",
    caution:
      "Sahil hattında yaya ve bisiklet trafiği var; yürürken şeritlere dikkat et. Yüzmeden önce cankurtaran ve akıntı bilgisini yerel kaynaktan kontrol et.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  santorini: {
    access:
      "Ege Denizi'nde, Yunanistan ana karasının yaklaşık 200 km güneydoğusunda; adaya deniz ve hava yoluyla ulaşılır, güncel seferleri kontrol et.",
    caution:
      "Kaldera kenarındaki patikalar dik ve güneşli; su, şapka ve kaymayan ayakkabı al. Uçurum kenarında işaretli yoldan ayrılma.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  navagio: {
    access:
      "Zakynthos'un kuzeybatı kıyısındaki koya ulaşım deniz yoluyla; tekneler kıyıya yaklaşıyor, iniş izni güncel duyuruya bağlı.",
    caution:
      "Kaya düşmesi nedeniyle 2018 ve 2022'de koy kapatıldı; yüzme ve kıyıya iniş yasağı olabilir. Gitmeden resmî duyuruyu kontrol et.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  napoli: {
    access:
      "Campania bölgesinin başkenti; tren, hava yolu ve liman bağlantılarıyla ulaşılır. Güncel sefer bilgisini kontrol et.",
    caution:
      "Kalabalık meydan ve sokaklarda yankesiciliğe karşı dikkatli ol; resmî taksi ve toplu taşıma kullan.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  venedik: {
    access:
      "Kuzeydoğu İtalya'da lagün üzerindeki şehir; tren ve karayoluyla ulaşılır, kanallar arasında yürüyüş ve vapur gerekir.",
    caution:
      "Acqua alta dönemlerinde meydanlar ve alt sokaklar su altında kalabiliyor; yüksek tabanlı ayakkabı al ve gelgit uyarısını kontrol et.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  camino: {
    access:
      "Galiçya'daki Santiago de Compostela Katedrali'ne yönelen hac yolları ağının son noktası; farklı başlangıç noktalarından gelen rotalar var.",
    caution:
      "Uzun yürüyüşlerde ayak bakımı, su ve hava koruması önemli; bölümüne göre konaklamayı önceden planla.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  skogafoss: {
    access: "Güney İzlanda'da, Skógar köyü yakınında; şelalenin tabanına kısa bir yürüyüşle ulaşılır.",
    caution:
      "Şelalenin püskürtüsü ıslatır ve zemin kaygan olur; yağmurluk giy, kayalıklara tırmanma.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  lofoten: {
    access:
      "Nordland ilçesindeki takımada; iki kasabası Svolvær ve Leknes. Adalara karayolu ve feribot bağlantılarıyla ulaşılır, güncel seferi kontrol et.",
    caution:
      "Hava hızlı değişir; rüzgâr ve yağışa uygun katmanlı giyim al. Kışın buzlanma ve kutup gecesi karanlığına hazırlıklı ol.",
    timing: "Kuzey ışıkları kışın kutup gecesi döneminde izleniyor.",
    cost: UNVERIFIED,
  },
  machu: {
    access:
      "Peru'nun Cusco bölgesinde, Urubamba vadisi üzerindeki dağ sırtında; bölgeye tren ve karayoluyla ulaşılır, güncel seferi kontrol et.",
    caution: "Dağlık arazide basamaklar var; yürüyüşü yavaş tut, su al ve güneşten korun.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  kyoto: {
    access:
      "Kyoto'nun Fushimi semtinde; JR Inari ve Keihan Fushimi-Inari istasyonlarından yürüyüşle ulaşılır.",
    caution:
      "Torii kapılarının altından geçen dağ patikası 4 km ve yaklaşık 2 saat; basamaklar için rahat ayakkabı ve su al.",
    timing: "Tapınak 24 saat açık; ana yaklaşım ve ana salon gece de aydınlatılıyor.",
    cost: "Tapınağa giriş ücretsiz; ana salon ve patikalar için bilet gerekmiyor.",
  },
  aral: {
    access:
      "Karakalpakistan'ın kuzeyindeki Moynak, eski bir Aral Gölü limanı; göl çekildiği için bugün sudan yaklaşık 150 km uzakta.",
    caution:
      "Çöl ve tuzlu toprak; su, güneş koruması ve toz maskesi al. Enkazlara tırmanma, çevredeki izleri bozma.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  girne: {
    access:
      "Kıbrıs'ın kuzey kıyısındaki liman kenti; Lefkoşa ve Gazimağusa ile karayolu bağlantısı var, güncel seferi kontrol et.",
    caution:
      "Liman ve kale çevresinde taş zemin ile sur basamakları var; kaymayan ayakkabı giy ve gölgede mola ver.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  "buyuk-han": {
    access: "Lefkoşa'nın kuzey kesiminde, Asmaaltı Meydanı yakınında; Surlariçi'nde yürüyerek ulaşılır.",
    caution:
      "Tarihî taş avlu ve merdivenler kaygan olabilir; atölye ve kafelerin önünü kapatmadan ilerle.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  salamis: {
    access:
      "Gazimağusa'nın yaklaşık 6 km kuzeyinde, Pedieos nehrinin ağzında; şehirden karayoluyla ulaşılır.",
    caution:
      "Açık ören yeri; gölge sınırlı olabilir, su ve güneş koruması al. Sütunlara ve taşlara tırmanma.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  karpaz: {
    access: "Kıbrıs'ın kuzeydoğu ucuna uzanan yarımada; Dipkarpaz üzerinden karayoluyla ulaşılır.",
    caution:
      "Altınkum deniz kaplumbağalarının yuvalama alanı; işaretli yuvalara dokunma, kumsalda kamp yapma.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  petra: {
    access:
      "Ürdün'ün güneyinde, Ma'an ilinde; ziyaretçi merkezinden Siq kanyonu boyunca yürüyerek antik kente girilir.",
    caution:
      "Uzun yürüyüş ve güneş; su, şapka ve rahat ayakkabı al. Kayalık patikalarda işaretli yoldan ayrılma.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  chefchaouen: {
    access:
      "Fas'ın kuzeybatısındaki küçük şehir; dağlık bölgede kurulu. Şehre karayoluyla ulaşılır, güncel servis bilgisini kontrol et.",
    caution:
      "Dar ve merdivenli sokaklar; kaymayan ayakkabı giy, fotoğraf çekerken yerel yaşamı rahatsız etme.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  banff: {
    access:
      "Banff Millî Parkı'nda, Lake Louise köyünün 14 km dışında, On Zirve Vadisi'nde; göl kenarına araç erişimi mevsime göre kısıtlanabiliyor, güncel kuralı Parks Canada'dan doğrula.",
    caution:
      "Dağ havası değişken; katmanlı giyim ve su al, yaban hayatına mesafe bırak. Göl buzul beslemeli ve soğuk.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
  positano: {
    access:
      "Amalfi Kıyısı'nda, Salerno iline bağlı komün; sahildeki yerleşime karayolu ve deniz bağlantısıyla ulaşılır, güncel seferi kontrol et.",
    caution:
      "Dik yamaçtaki merdivenli sokaklar için rahat ayakkabı giy; yürüyüş süresini ve sıcak havayı hesaba kat.",
    timing: UNVERIFIED,
    cost: UNVERIFIED,
  },
};

/**
 * Yer başına kaynak listesi. Sıra: Vikipedi maddeleri, sonra Wikidata öğeleri.
 * Wikidata kimlikleri Vikipedi maddelerinin bağlı olduğu öğelerdir.
 */
export const PLACE_SOURCES: Record<string, PlaceSource[]> = {
  efes: [
    wikipedia("tr", "Efes", "https://tr.wikipedia.org/wiki/Efes"),
    wikipedia("en", "Ephesus", "https://en.wikipedia.org/wiki/Ephesus"),
    wikidata("Q47611"),
  ],
  kapadokya: [
    wikipedia("tr", "Kapadokya", "https://tr.wikipedia.org/wiki/Kapadokya"),
    wikipedia("en", "Cappadocia", "https://en.wikipedia.org/wiki/Cappadocia"),
    wikidata("Q217265"),
  ],
  pamukkale: [
    wikipedia("tr", "Pamukkale", "https://tr.wikipedia.org/wiki/Pamukkale"),
    wikipedia("en", "Pamukkale", "https://en.wikipedia.org/wiki/Pamukkale"),
    wikidata("Q105893254"),
  ],
  kaputas: [
    wikipedia("tr", "Kaputaş Plajı", "https://tr.wikipedia.org/wiki/Kaputa%C5%9F_Plaj%C4%B1"),
    wikidata("Q284093"),
  ],
  galata: [
    wikipedia("tr", "Galata", "https://tr.wikipedia.org/wiki/Galata"),
    wikipedia("en", "Galata Tower", "https://en.wikipedia.org/wiki/Galata_Tower"),
    wikidata("Q501817"),
  ],
  gaziantep: [
    wikipedia("tr", "Gaziantep", "https://tr.wikipedia.org/wiki/Gaziantep"),
    wikipedia(
      "tr",
      "Bakırcılar Çarşısı",
      "https://tr.wikipedia.org/wiki/Bak%C4%B1rc%C4%B1lar_%C3%87ar%C5%9F%C4%B1s%C4%B1",
    ),
    wikidata("Q93338"),
    wikidata("Q6007327"),
  ],
  gobeklitepe: [
    wikipedia("tr", "Göbeklitepe", "https://tr.wikipedia.org/wiki/G%C3%B6beklitepe"),
    wikipedia("en", "Göbekli Tepe", "https://en.wikipedia.org/wiki/G%C3%B6bekli_Tepe"),
    wikidata("Q214944"),
  ],
  likya: [
    wikipedia("tr", "Likya Yolu", "https://tr.wikipedia.org/wiki/Likya_Yolu"),
    wikipedia("en", "Lycian Way", "https://en.wikipedia.org/wiki/Lycian_Way"),
    wikidata("Q1731039"),
  ],
  kackar: [
    wikipedia("tr", "Kaçkar Dağları", "https://tr.wikipedia.org/wiki/Ka%C3%A7kar_Da%C4%9Flar%C4%B1"),
    wikidata("Q975280"),
  ],
  moda: [
    wikipedia("tr", "Moda, Kadıköy", "https://tr.wikipedia.org/wiki/Moda,_Kad%C4%B1k%C3%B6y"),
    wikipedia("en", "Moda, Kadıköy", "https://en.wikipedia.org/wiki/Moda,_Kad%C4%B1k%C3%B6y"),
    wikidata("Q2700998"),
  ],
  santorini: [
    wikipedia("tr", "Santorini", "https://tr.wikipedia.org/wiki/Santorini"),
    wikipedia("en", "Santorini", "https://en.wikipedia.org/wiki/Santorini"),
    wikidata("Q129296"),
  ],
  navagio: [
    wikipedia("en", "Navagio Beach", "https://en.wikipedia.org/wiki/Navagio_Beach"),
    wikidata("Q2460851"),
  ],
  napoli: [
    wikipedia("tr", "Napoli", "https://tr.wikipedia.org/wiki/Napoli"),
    wikidata("Q2634"),
  ],
  venedik: [
    wikipedia("tr", "Venedik", "https://tr.wikipedia.org/wiki/Venedik"),
    wikipedia("en", "Acqua alta", "https://en.wikipedia.org/wiki/Acqua_alta"),
    wikidata("Q641"),
  ],
  camino: [
    wikipedia("tr", "Camino de Santiago", "https://tr.wikipedia.org/wiki/Camino_de_Santiago"),
    wikidata("Q41150"),
  ],
  skogafoss: [
    wikipedia("en", "Skógafoss", "https://en.wikipedia.org/wiki/Sk%C3%B3gafoss"),
    wikidata("Q1130718"),
  ],
  lofoten: [
    wikipedia("tr", "Lofoten", "https://tr.wikipedia.org/wiki/Lofoten"),
    wikipedia("en", "Lofoten", "https://en.wikipedia.org/wiki/Lofoten"),
    wikidata("Q186822"),
  ],
  machu: [
    wikipedia("tr", "Machu Picchu", "https://tr.wikipedia.org/wiki/Machu_Picchu"),
    wikidata("Q676203"),
  ],
  kyoto: [
    wikipedia("en", "Fushimi Inari-taisha", "https://en.wikipedia.org/wiki/Fushimi_Inari-taisha"),
    wikidata("Q714828"),
  ],
  aral: [
    wikipedia("tr", "Moynak", "https://tr.wikipedia.org/wiki/Moynak"),
    wikipedia("en", "Moynaq", "https://en.wikipedia.org/wiki/Moynaq"),
    wikidata("Q750989"),
  ],
  girne: [
    wikipedia("tr", "Girne", "https://tr.wikipedia.org/wiki/Girne"),
    wikipedia("tr", "Girne Kalesi", "https://tr.wikipedia.org/wiki/Girne_Kalesi"),
    wikidata("Q206760"),
  ],
  "buyuk-han": [
    wikipedia("tr", "Büyük Han", "https://tr.wikipedia.org/wiki/B%C3%BCy%C3%BCk_Han"),
    wikipedia("en", "Büyük Han", "https://en.wikipedia.org/wiki/B%C3%BCy%C3%BCk_Han"),
    wikidata("Q2332172"),
  ],
  salamis: [
    wikipedia("en", "Salamis, Cyprus", "https://en.wikipedia.org/wiki/Salamis,_Cyprus"),
    wikidata("Q767089"),
  ],
  karpaz: [
    wikipedia("tr", "Karpaz Yarımadası", "https://tr.wikipedia.org/wiki/Karpaz_Yar%C4%B1madas%C4%B1"),
    wikipedia("en", "Golden Beach, Cyprus", "https://en.wikipedia.org/wiki/Golden_Beach,_Cyprus"),
    wikidata("Q1418724"),
    wikidata("Q106241437"),
  ],
  petra: [
    wikipedia("tr", "Petra", "https://tr.wikipedia.org/wiki/Petra"),
    wikipedia("en", "Petra", "https://en.wikipedia.org/wiki/Petra"),
    wikidata("Q5788"),
  ],
  chefchaouen: [
    wikipedia("tr", "Şafşavan", "https://tr.wikipedia.org/wiki/%C5%9Eaf%C5%9Favan"),
    wikidata("Q676778"),
  ],
  banff: [
    wikipedia("en", "Moraine Lake", "https://en.wikipedia.org/wiki/Moraine_Lake"),
    wikidata("Q1072342"),
  ],
  positano: [
    wikipedia("tr", "Positano", "https://tr.wikipedia.org/wiki/Positano"),
    wikidata("Q81345"),
  ],
};

/** Rehber yerine ait kaynaklar; bilinmeyen yerlerde boş liste. */
export function placeSources(placeId: string) {
  return PLACE_SOURCES[placeId] ?? [];
}

export function advice(place: Place) {
  return (
    PLACE_ADVICE[place.id] ?? {
      access:
        "Konum bağlantısından ulaşımı kontrol et; açık alanlarda yalnızca izin verilen güzergâhlarda ilerle.",
      caution: ["nature", "camp", "routes"].includes(place.category)
        ? "Hava değişimi, patika zemini ve telefon kapsamasını hesaba kat. Su ve uygun ayakkabı al."
        : "Güncel erişim kurallarını kontrol et; ücretli hizmetlerde fiyatı önceden sor.",
      timing:
        "Işık ve kalabalık tercihlerine göre erken veya geç saatleri değerlendir; açılış saatleri doğrulanmadı.",
      cost: "Ücret doğrulanmadı. Resmî bilet veya yerel işletme bilgisini kontrol et.",
    }
  );
}
