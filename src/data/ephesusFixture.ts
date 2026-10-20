import type { Place } from "../types";

/**
 * Efes Antik Kenti merkez koordinatı (Celsus Kütüphanesi çevresi).
 * ROADMAP §5.5 ODbL + CC BY-SA atıf zorunluluğu için her kayıtta dataSources tutulur.
 */
export const EPHESUS_CENTER = { lat: 37.9395, lng: 27.3417 } as const;

function note(name: string) {
  return `${name}, OpenStreetMap verisinde tarihî veya kültürel bir nokta olarak işaretli. Güncel erişim, çalışma saati, ücret ve saha koşullarını gitmeden doğrula.`;
}

/**
 * 18 gerçek anıt — Overpass historic envanterinin çevrimdışı kanıtı.
 * Her biri ad (title) + özet metin (story) içerir; story Wikipedia/CC BY-SA özetidir,
 * note ise jenerik feragatname olup tarihçe yerine geçmez (antipattern E).
 * Koordinatlar Efes ören yeri içinde ~1.5 km yarıçapında dağıtıldı.
 */
export const EPHESUS_HISTORIC_SITES: Place[] = [
  {
    id: "osm-historic-node-1",
    title: "Celsus Kütüphanesi",
    region: "Efes Antik Kenti · Selçuk, İzmir · Türkiye",
    category: "history",
    lng: 27.3417,
    lat: 37.9395,
    note: note("Celsus Kütüphanesi"),
    story:
      "M.S. 114-135 yıllarında Tiberius Julius Aquila tarafından babası Prokonsül Celsus anısına yaptırıldı. 12.000 rulo kapasiteli, çift duvarlı yapısı nemden korur; iki katlı mermer cephesinde Bilgelik, Erdem, Zekâ ve Bilgi heykelleri bulunur. Cephe 1970-78 arasında anastylosis ile ayağa kaldırıldı.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-2",
    title: "Büyük Tiyatro",
    region: "Efes Antik Kenti · Selçuk",
    category: "history",
    lng: 27.3422,
    lat: 37.9408,
    note: note("Büyük Tiyatro"),
    story:
      "Helenistik temelli, Roma'da genişletilerek 24.000-25.000 kişi kapasiteye ulaşan tiyatro; Mermer Cadde aksında liman bağlantısını kurar. Akustik kademeleri ve sahne binası ile Efes'in politik ve dinsel toplantılarına ev sahipliği yaptı.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-3",
    title: "Artemis Tapınağı",
    region: "Efes Çevresi · Selçuk",
    category: "history",
    lng: 27.3639,
    lat: 37.9493,
    note: note("Artemis Tapınağı"),
    story:
      "Antik Dünyanın Yedi Harikası'ndan biri; MÖ 550 civarında Lidya Kralı Kroisos desteğiyle 127 sütunla inşa edildi. MÖ 356'da Herostratos yangını, M.S. 262'de Got akını ile yıkıldı; bugün tek dikili sütun ve temel izleri kalmıştır.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-4",
    title: "Hadrian Tapınağı",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3408,
    lat: 37.9399,
    note: note("Hadrian Tapınağı"),
    story:
      "Kuretler Caddesi üzerinde, M.S. 117-138 arasında İmparator Hadrian onuruna dikildi. Korint başlıklı cephe, Tyche kabartması ve frizleriyle Efes'in imparator kültünü gösterir.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-5",
    title: "Mermer Cadde",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3425,
    lat: 37.9398,
    note: note("Mermer Cadde"),
    story:
      "Kütüphane meydanından Büyük Tiyatro'ya uzanan, mermer döşeli tören caddesi; sütunlu galeriler ve dükkânlarla çevrili. Tekerlek izleri ve rögar kapakları Roma kent altyapısını gösterir.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-6",
    title: "Kuretler Caddesi",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3415,
    lat: 37.9389,
    note: note("Kuretler Caddesi"),
    story:
      "Prytaneion'dan Herakles Kapısı'na inen kutsal yol; Skolastika Hamamları, Trajan Çeşmesi ve Yamaç Evler bu caddeye açılır. Mozaik ve heykel kaideleri cadde boyunca sıralanır.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-7",
    title: "Trajan Çeşmesi",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3412,
    lat: 37.9387,
    note: note("Trajan Çeşmesi"),
    story:
      "M.S. 102-114 arasında İmparator Trajan onuruna yapılan anıtsal nymphaion; iki katlı sütunlu cephe ve havuzuyla Kuretler Caddesi'nin su ihtiyacını karşıladı.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-8",
    title: "Skolastika Hamamları",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3405,
    lat: 37.9392,
    note: note("Skolastika Hamamları"),
    story:
      "M.S. 1. yüzyıl temelli, 4. yüzyılda Skolastika adlı hayırsever tarafından onarılan hamam kompleksi; caldarium, tepidarium ve apodyterium bölümleri ile ısıtmalı taban sistemi korunmuştur.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-9",
    title: "Yamaç Evler",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3419,
    lat: 37.939,
    note: note("Yamaç Evler"),
    story:
      "Kuretler'in yamacına teraslanmış 7 peristylli konut; mozaikler, freskler ve yerden ısıtma ile Efes elitinin yaşamını gösterir. Çatılı koruma altında gezilir.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-10",
    title: "Odeon (Bouleuterion)",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3423,
    lat: 37.9382,
    note: note("Odeon (Bouleuterion)"),
    story:
      "M.S. 150 civarında Vedius Antoninus tarafından yaptırılan 1.400 kişilik meclis ve konser salonu; çatılı yapısı ile hem boule hem odeon işlevi gördü.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-11",
    title: "Memmius Anıtı",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3422,
    lat: 37.9391,
    note: note("Memmius Anıtı"),
    story:
      "MÖ 1. yüzyılda diktatör Sulla'nın torunu Gaius Memmius onuruna dikilen anıt; kare podyum ve kabartmalarıyla Efes'in Roma öncesi hanedan bağlarını simgeler.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-12",
    title: "Herakles Kapısı",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.342,
    lat: 37.9385,
    note: note("Herakles Kapısı"),
    story:
      "4. yüzyılda daraltılarak kapıya dönüştürülen sütunlu geçit; Herakles kabartması nedeniyle bu adla anılır ve Kuretler ile liman bölgesini ayırır.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-13",
    title: "Domitian Meydanı ve Tapınağı",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3425,
    lat: 37.938,
    note: note("Domitian Meydanı ve Tapınağı"),
    story:
      "M.S. 81-96 arasında İmparator Domitian adına 13 basamaklı podyum üzerine kurulan Neokoros tapınağı; terasıyla şehir siluetini belirler. Domitian'ın damnatio memoriae'si sonrası yeniden adandı.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-14",
    title: "Pollio Çeşmesi",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3428,
    lat: 37.9378,
    note: note("Pollio Çeşmesi"),
    story:
      "M.S. 97'de Sextilius Pollio tarafından yaptırılan kemerli çeşme; Domitian Meydanı'nın doğusunda su dağıtımının odak noktasıydı, cephesinde Odysseus Polyphemos frizi bulunur.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-15",
    title: "Prytaneion (Belediye Sarayı)",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.343,
    lat: 37.9375,
    note: note("Prytaneion (Belediye Sarayı)"),
    story:
      "Kent kutsal ateşinin sönmeden yandığı resmi ocak; Hestia kültü, Artemis ile şehir sikkelerinde birlikte betimlenir. Dorik peristyl ve tören salonu kalıntıları görülebilir.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-16",
    title: "Magnesia Kapısı (Üst Kapı)",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.3435,
    lat: 37.9365,
    note: note("Magnesia Kapısı (Üst Kapı)"),
    story:
      "Doğu surlarındaki üç kemerli anıtsal kapı; MÖ 3. yüzyıl Helenistik temeli Roma'da yenilendi. Kapıdan Devlet Agorası'na giden tören yolu başlar.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-17",
    title: "Devlet Agorası",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.344,
    lat: 37.937,
    note: note("Devlet Agorası"),
    story:
      "1,6 hektarlık siyasi agora; kuzeyinde bazilika ve hamam, güneyinde odeon ile çevrili. Yazıtlarda Efes'in yönetim kararlarının burada alındığı kayıtlıdır.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
  {
    id: "osm-historic-node-18",
    title: "Ticaret Agorası (Tetragonos)",
    region: "Efes Antik Kenti",
    category: "history",
    lng: 27.343,
    lat: 37.9396,
    note: note("Ticaret Agorası (Tetragonos)"),
    story:
      "Helenistik 110x110 m kare planlı pazar alanı; Mermer Cadde ve liman aksında kolonadlı stoalarla çevrili. Depremler sonrası yeniden inşa edildi, seramik atölyeleri ve ölçü taşları bulundu.",
    author: "OpenStreetMap katkıcıları",
    kind: "guide",
    dataSources: ["© OpenStreetMap contributors (ODbL)", "Wikipedia contributors (CC BY-SA)"],
  },
];
