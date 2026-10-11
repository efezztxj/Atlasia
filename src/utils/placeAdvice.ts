import type { Place } from "../types";
import { normalize } from "./text";

const ALIASES: Record<string, string[]> = { kyoto: ["kyoto", "fushimi", "inari"], kapadokya: ["kapadokya", "goreme"], galata: ["galata", "istanbul"], efes: ["efes", "ephesus"], pamukkale: ["pamukkale"], machu: ["machu picchu", "cusco"], petra: ["petra"], banff: ["banff", "moraine"], chefchaouen: ["chefchaouen", "safsa"], santorini: ["santorini", "oia"], girne: ["girne", "kyrenia"], moda: ["moda", "kadikoy"], likya: ["likya", "faralya"], lofoten: ["lofoten"], karpaz: ["karpaz"], napoli: ["napoli", "naples"], venedik: ["venedik", "venice"], skogafoss: ["skogafoss"], gobeklitepe: ["gobeklitepe"] };

export function namedPlace(query: string, places: Place[]) {
  const value = normalize(query);
  return places.find((place) => (ALIASES[place.id] ?? [normalize(place.title)]).some((alias) => value.includes(alias)));
}

export function advice(place: Place) {
  const specific: Record<string, { access: string; caution: string; timing: string; cost: string }> = {
    kyoto: { access: "JR Inari veya Keihan Fushimi-Inari istasyonundan yürüyüş.", caution: "Torii yolları ve dağ patikalarında basamaklar var; yağmurda taşlar kayabilir.", timing: "Sabah erken, giriş çevresinde gün ortasına göre genellikle daha sakin.", cost: "Tapınak alanı genel olarak ücretsiz; özel alan ve güncel kuralları resmî kaynaktan kontrol et." },
    petra: { access: "Wadi Musa ziyaretçi merkezinden Siq boyunca yürüyüş.", caution: "Uzun yürüyüş ve açık güneş için su, şapka ve rahat ayakkabı al.", timing: "Sabah girişinde daha serin bir yürüyüş; güncel açılış saatini kontrol et.", cost: "Bilet gerekir. Ücreti ve Jordan Pass şartlarını resmî bilet sayfasından doğrula." },
    kapadokya: { access: "Göreme merkezinden vadilere yürüyüş; uzak vadiler için yerel ulaşım.", caution: "Balon kalkışları rüzgâra bağlıdır; uçurum kenarlarından uzak dur.", timing: "Balonlar için gün doğumu çevresi, vadi fotoğrafları için yumuşak akşam ışığı.", cost: "Balon turu ücretli; izin verilen seyir noktalarından manzara izlemek alternatif olabilir." },
    banff: { access: "Moraine Lake'e ulaşımda mevsimsel servis ve rezervasyon şartlarını Parks Canada'dan kontrol et.", caution: "Dağ havası değişkendir; yaban hayatına yaklaşma ve patikada kal.", timing: "Gölün yol ve servis açılışları mevsime bağlıdır.", cost: "Park ve ulaşım ücretleri olabilir. Güncel rezervasyon ve ücretleri doğrula." },
    navagio: { access: "Tekne seferleri ve kıyıya erişim kısıtları değişebilir; yerel duyuruları kontrol et.", caution: "Kaya düşmesi ve erişim yasağı riskleri nedeniyle güncel kısıtları kontrol etmeden koy veya seyir alanına girme.", timing: "Hava ve erişim koşulları ziyaret saatinden daha önemli.", cost: "Tekne ve tur ücretleri değişir; fiyata dahil olanları önceden sor." },
  };
  return specific[place.id] ?? { access: "Konum bağlantısından ulaşımı kontrol et; açık alanlarda yalnızca izin verilen güzergâhlarda ilerle.", caution: ["nature", "camp", "routes"].includes(place.category) ? "Hava değişimi, patika zemini ve telefon kapsamasını hesaba kat. Su ve uygun ayakkabı al." : "Güncel erişim kurallarını kontrol et; ücretli hizmetlerde fiyatı önceden sor.", timing: "Işık ve kalabalık tercihlerine göre erken veya geç saatleri değerlendir; açılış saatleri doğrulanmadı.", cost: "Ücret doğrulanmadı. Resmî bilet veya yerel işletme bilgisini kontrol et." };
}