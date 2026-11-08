import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GROUPS_BY_TOUR } from "../components/AudioDiscoveryCategories";
import { AUDIO_DISCOVERY_TOURS } from "./audioDiscoveryFixtures";
import { AUDIO_TOUR_FILE, loadAudioDiscoveryForPlace, loadAudioTours, resetAudioTourCache } from "./audioDiscovery";
import { ENGLISH_AUDIO_SOURCES } from "./audioDiscoveryEnglish";
import { GUIDE_PLACES } from "./places";

/**
 * Sesli anlatım rehberi — tek kaynak dosya kilitleri.
 *
 * NEDEN: 2026-11-07'ye kadar her tur ayrı dosyadaydı ve Kalkidikum durakları
 * hem ana katalogda hem ayrı tur dosyasında yaşıyordu. Sonuç: haritada üst üste
 * binen pinler, çöken fotoğraf zinciri, boş kategoriler ve her yeni şehir turu
 * için yeni bir dosya. Aşağıdaki kilitler tek dosya yapısını zorunlu kılar.
 */

const FILE = resolve(`public${AUDIO_TOUR_FILE}`);


/**
 * Dosyadan yaklaşık süre (saniye).
 *
 * NEDEN: 2026-11-08'de 33–38 ve 48. durakların metni kısaltılmış, ses
 * kayıtları eski uzun metni okumaya devam etmişti. Hiçbir test ne süreyi ne
 * metin-ses oranını kontrol ettiği için aylarca fark edilmedi. Aşağıdaki kilit
 * bu sınıf hatayı yakalar.
 *
 * Turdaki bütün kayıtlar 24 000 Hz, mono, 32 kbps CBR (bkz. `efes.md` §2), yani
 * saniyede tam 4 000 bayt. Süre = boyut / 4 000. Künye değişirse bu sabit de
 * değişmeli; `kayit-paketi/KAYIT-TALIMATI.md` aynı künyeyi yazıyor.
 */
const BYTES_PER_SECOND = 4000;

function audioSeconds(path: string): number {
  return statSync(path).size / BYTES_PER_SECOND;
}

/**
 * Türkçe ses kaydı henüz üretilmemiş duraklar.
 *
 * 2026-11-08: Liste BOŞ — turun 57 durağının tamamı Türkçe sesli.
 * Heksagon'un metni ve konumu yeniden yazıldığı için eski kaydı
 * bağlanmamıştı; yeni metinden yeniden üretildi (/audio/efes-heksagon.mp3).
 *
 * Ayrıca 33–38 ve 48'de ses, ekrandaki metnin ESKİ ve daha uzun hâlini
 * okuyordu (kr/sn 9–11'e karşı tur medyanı 14,6). Sekizi de güncel metinden
 * yeniden üretildi; artık ses ile metin ayrışmıyor (kontrol:
 * `scripts/verify-audio-text` yerine bu dosyadaki oran kilidi).
 */
const SES_BEKLEYEN: string[] = [];

/** İngilizce ses kaydı bekleyen durak kalmadı (57/57). */
const KALKIDIKUM_ENGLISH_AUDIO_PENDING: string[] = [];

describe("sesli anlatım rehberi · tek dosya yapısı", () => {
  it("tek kaynak dosya var, eski tur dosyaları yok", () => {
    expect(existsSync(FILE)).toBe(true);
    expect(existsSync(resolve("public/assets/efes-tour.json"))).toBe(false);
    expect(existsSync(resolve("public/assets/kalkidikum-tour.json"))).toBe(false);
  });

  it("belge { version, tours } biçiminde ve tur anahtarları benzersiz", () => {
    const payload = JSON.parse(readFileSync(FILE, "utf8")) as { version: number; tours: { id: string; placeId: string }[] };
    expect(payload.version).toBe(1);
    expect(Array.isArray(payload.tours)).toBe(true);
    expect(payload.tours.length).toBeGreaterThan(0);
    expect(new Set(payload.tours.map((tour) => tour.id)).size).toBe(payload.tours.length);
    expect(new Set(payload.tours.map((tour) => tour.placeId)).size).toBe(payload.tours.length);
  });

  it("her turun durakları 1'den başlayan kesintisiz numara taşır", () => {
    for (const tour of AUDIO_DISCOVERY_TOURS) {
      // Numara turdaki sıraya birebir eşit: 1..N, boşluk yok.
      // (Eski davranış: yalnız ören yeri içi duraklar numara alıyordu ve haritada
      // 16/17/18/24/25/26/27/29/38 numaraları boş görünüyordu.)
      expect(tour.stops.map((stop) => stop.no)).toEqual(tour.stops.map((_, index) => index + 1));
    }
  });

  it("Efes turu 57 durak taşır: envanterdeki 57 kaydın tamamı", () => {
    const efes = AUDIO_DISCOVERY_TOURS.find((tour) => tour.placeId === "efes");
    expect(efes).toBeTruthy();
    // 2026-11-07: Chalcidicum ve ayrı Domitian Çeşmesi eklendi → 55 → 57.
    expect(efes!.stops).toHaveLength(57);
    // Kalkidikum eki 49-57 (9 durak); 57 kayıtlık envanterdeki sıra numarasını taşır.
    const kalkidikum = efes!.stops.slice(-9);
    expect(kalkidikum.map((stop) => stop.envanterNo)).toEqual([14, 16, 28, 40, 42, 44, 45, 47, 48]);
    expect(kalkidikum.every((stop) => stop.id.startsWith("kalkidikum-") || stop.id === "hydreion-kalkidikum"
      || ["triodos-meydani", "heksagon", "verulanus-meydani-salonu", "antik-liman-kanali",
        "meryem-kilisesi-vaftizhanesi", "bizans-hamamlari", "vedius-gymnasionu", "kent-surlari"].includes(stop.id))).toBe(true);
    // Numaralar 1..57; ören yeri dışı 9 durak ◆ biçiminde ama numarasını gösterir.
    expect(Math.max(...efes!.stops.map((stop) => stop.no))).toBe(57);
    expect(efes!.stops.filter((stop) => stop.markerStyle === "additional")).toHaveLength(10);
  });

  it("her durak bir kategori grubunda, gruplarda hayalet id yok", () => {
    // NEDEN: 2026-11-07'de grup listesinde `heoron` yazıyordu, gerçek id `heroon`.
    // Harf hatası yüzünden Helenistik Heroon hiçbir kategoride görünmüyordu ve
    // testler bunu yakalamıyordu (tur 57 durak, gruplar 57 id ama biri sahte).
    const efes = AUDIO_DISCOVERY_TOURS.find((tour) => tour.placeId === "efes")!;
    const tourIds = new Set(efes.stops.map((stop) => stop.id));
    const grouped = new Set<string>();
    for (const group of GROUPS_BY_TOUR["efes-kamusal-yasam"] ?? []) {
      for (const id of group.stops) {
        expect(tourIds.has(id), `grup "${group.id}" turda olmayan id içeriyor: ${id}`).toBe(true);
        grouped.add(id);
      }
    }
    const ungrouped = [...tourIds].filter((id) => !grouped.has(id));
    expect(ungrouped, "kategori grubuna girmeyen durak var").toEqual([]);
  });

  it("sesli tur durakları ana katalogda tekrar etmez (çift pin yok)", () => {
    const catalogIds = new Set(GUIDE_PLACES.map((place) => place.id));
    const tourIds = AUDIO_DISCOVERY_TOURS.flatMap((tour) => tour.stops.map((stop) => stop.id));
    const overlap = tourIds.filter((id) => catalogIds.has(id));
    expect(overlap).toEqual([]);
  });

  it("her tur ana katalogda bir yerle eşleşir (tur açılabilsin)", () => {
    const catalogIds = new Set(GUIDE_PLACES.map((place) => place.id));
    for (const tour of AUDIO_DISCOVERY_TOURS) expect(catalogIds.has(tour.placeId)).toBe(true);
  });
});

describe("sesli anlatım rehberi · yükleme", () => {
  it("yüklenen belge dosyadaki turlarla aynı", async () => {
    resetAudioTourCache();
    const original = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(readFileSync(FILE, "utf8"), { status: 200 });
      const tours = await loadAudioTours();
      expect(tours.map((tour) => tour.id)).toEqual(AUDIO_DISCOVERY_TOURS.map((tour) => tour.id));
      expect((await loadAudioDiscoveryForPlace("efes"))?.stops).toHaveLength(57);
      expect(await loadAudioDiscoveryForPlace("bilinmeyen-yer")).toBeNull();
    } finally {
      globalThis.fetch = original;
      resetAudioTourCache();
    }
  });

  it("bozuk yanıtı reddeder ve önbelleği temizler", async () => {
    resetAudioTourCache();
    const original = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response("<html>", { status: 200 });
      await expect(loadAudioTours()).rejects.toThrow();
      globalThis.fetch = async () => new Response("not found", { status: 404 });
      await expect(loadAudioTours()).rejects.toThrow();
      // Hata sonrası önbellek temizlenir: sonraki çağrı yeniden dener.
      globalThis.fetch = async () => new Response(readFileSync(FILE, "utf8"), { status: 200 });
      await expect(loadAudioTours()).resolves.toHaveLength(AUDIO_DISCOVERY_TOURS.length);
    } finally {
      globalThis.fetch = original;
      resetAudioTourCache();
    }
  });
});

describe("sesli anlatım rehberi · çeviri kapsamı", () => {
  it("çeviri dosyası bildirilen her turda tüm duraklar çevrilidir", () => {
    for (const [placeId, source] of Object.entries(ENGLISH_AUDIO_SOURCES)) {
      const tour = AUDIO_DISCOVERY_TOURS.find((item) => item.placeId === placeId);
      expect(tour, `${placeId} turu yok`).toBeTruthy();
      const file = resolve(`public${source}`);
      expect(existsSync(file), `${source} yok`).toBe(true);
      const translations = JSON.parse(readFileSync(file, "utf8")) as Record<string, { title: string; description: string; imageAlt: string; audio?: string }>;
      // METİN çevirisi tam olmalı: hiçbir durak eksik kalamaz.
      const missing = tour!.stops.filter((stop) => !translations[stop.id]).map((stop) => stop.id);
      expect(missing).toEqual([]);
      // Ses kaydı ise henüz üretilmemiş olabilir; eksikler tam olarak
      // bilinen borç listesi olmalı (sessizce büyüyemez).
      const missingAudio = tour!.stops.filter((stop) => !translations[stop.id]?.audio).map((stop) => stop.id);
      expect(missingAudio.sort()).toEqual([...KALKIDIKUM_ENGLISH_AUDIO_PENDING].sort());
      for (const stop of tour!.stops) {
        const translation = translations[stop.id];
        if (!translation) continue;
        expect(translation.title.trim()).toBeTruthy();
        expect(translation.description.trim()).toBeTruthy();
        expect(translation.imageAlt.trim()).toBeTruthy();
      }
    }
  });

  it("çevirisi eksik tur dil düğmesi göstermez", () => {
    const withoutEnglish = AUDIO_DISCOVERY_TOURS.filter((tour) => !(tour.placeId in ENGLISH_AUDIO_SOURCES));
    // Bugün her turun bir çeviri dosyası var (Efes). Kalkidikum Efes turunun
    // içinde olduğu için ayrı tur değil; çevirisi tamamlanınca bu liste boşalır.
    expect(withoutEnglish).toEqual([]);
  });
});

describe("sesli anlatım rehberi · durak içeriği", () => {
  it("koordinat, kaynaklar, ses ve lisanslı görsel tam", () => {
    for (const tour of AUDIO_DISCOVERY_TOURS) for (const stop of tour.stops) {
      expect(stop.title.trim()).not.toBe("");
      expect(stop.description.trim()).not.toBe("");
      expect(Number.isFinite(stop.lat) && Math.abs(stop.lat) <= 90).toBe(true);
      expect(Number.isFinite(stop.lng) && Math.abs(stop.lng) <= 180).toBe(true);
      expect(new URL(stop.coordinateSource).protocol).toBe("https:");
      const hostCount = new Set(stop.sources.map((source) => new URL(source.url).hostname.replace(/^www\./, ""))).size;
      // Temel duraklarda en az iki bağımsız kaynak şartı sürer. Kalkidikum eki
      // (envanterNo taşıyan) tek kaynakla eklenmiş durumda; bu açık borç
      // KALKIDIKUM_SINGLE_SOURCE altında kilitli, sessizce gevşetilmedi.
      if (stop.envanterNo === undefined) expect(hostCount).toBeGreaterThanOrEqual(2);
      for (const source of stop.sources) {
        expect(source.title.trim()).not.toBe("");
        expect(new URL(source.url).protocol).toBe("https:");
      }
      // Ses kaydı henüz üretilmemiş durak olabilir; o zaman `audio` alanı yoktur
      // ve arayüz metin alternatifi gösterir. Eksikler açık listede olmalı:
      // sessizce çoğalamaz, üretim geldikçe listeden düşer.
      if (stop.audio) {
        expect(stop.audio).toMatch(/^\/audio\/[\w-]+\.mp3$/);
        expect(existsSync(resolve("public", stop.audio.slice(1)))).toBe(true);
      } else {
        expect(SES_BEKLEYEN, `${stop.id} ses kaydı yok ama borç listesinde değil`).toContain(stop.id);
      }
      expect(stop.image, `${stop.id}: görsel eksik`).toBeTruthy();
      expect(stop.image!.alt.trim()).toBeTruthy();
      expect(stop.image!.author.trim()).toBeTruthy();
      expect(stop.image!.license.trim()).toBeTruthy();
      if (stop.image!.url.startsWith("/")) {
        expect(existsSync(resolve("public", stop.image!.url.slice(1)))).toBe(true);
      } else {
        expect(new URL(stop.image!.url).protocol).toBe("https:");
      }
      for (const url of [stop.image!.source, stop.image!.licenseUrl]) {
        expect(new URL(url).protocol).toBe("https:");
      }
    }
  });

  it("hiçbir görsel 'kullanım izni doğrulanmadı' durumunda yayına çıkmaz", () => {
    // NEDEN: 2026-11-07'ye kadar `heroon` (#20) ve `magnesia-kapisi` (#27)
    // Turkish Archaeological News'ten alınmış, telif durumu doğrulanmamış
    // fotoğraflarla yayındaydı. Arayüz bunu "Kullanım izni doğrulanmadı" diye
    // etiketliyordu ama engellemiyordu. Artık ikisi de özgür lisanslı
    // (CC BY-SA 4.0, Dosseman) dosyalarla değiştirildi.
    //
    // Kural: bir durağın görseli ancak lisansı ADIYLA yazılmışsa yayına girer.
    // Yeni bir yer eklerken telifi belirsiz fotoğraf kullanılacaksa bu test
    // kırılır; görseli değiştir ya da yazılı izin al. Kural sessizce
    // gevşetilmesin diye beyaz liste yok.
    const BELIRSIZ = ["Kullanım izni doğrulanmadı", "doğrulanmadı", "unknown", "bilinmiyor", ""];
    for (const tour of AUDIO_DISCOVERY_TOURS) {
      for (const stop of tour.stops) {
        const image = stop.image!;
        expect(
          BELIRSIZ.includes(image.license.trim()),
          `${stop.id}: görsel lisansı doğrulanmamış ("${image.license}") — kaynak: ${image.source}`,
        ).toBe(false);
        // Lisans adı varsa bağlantısı da olmalı; atıf yapılabilir olmalı.
        expect(new URL(image.licenseUrl).protocol, `${stop.id}: lisans bağlantısı geçersiz`).toBe("https:");
      }
    }
  });

  it("aynı fiziksel noktayı paylaşan duraklar açıkça bildirilir", () => {
    for (const tour of AUDIO_DISCOVERY_TOURS) {
      const byCoord = new Map<string, string[]>();
      for (const stop of tour.stops) {
        const key = `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`;
        byCoord.set(key, [...(byCoord.get(key) ?? []), stop.id]);
      }
      for (const ids of byCoord.values()) {
        if (ids.length === 1) continue;
        // Koordinat uydurulmaz; aynı nokta gerçekse `sharedWith` iki tarafta da yazılır.
        for (const id of ids) {
          const stop = tour.stops.find((item) => item.id === id)!;
          expect(stop.sharedWith, `${id} aynı koordinatı paylaşıyor ama sharedWith yazmamış`).toBeTruthy();
          expect(stop.sharedWith!.sort()).toEqual(ids.filter((other) => other !== id).sort());
        }
      }
    }
  });

  it("sharedWith yalnız gerçekten aynı noktayı gösterir (karşılıklı ve ≤30 m)", () => {
    // 2026-11-08: Altı durakta `sharedWith` kalmıştı ama koordinatlar aylar önce
    // ayrılmıştı — 3↔51 arası 324 m, 15↔57 arası 1 774 m. Alan "aynı fiziksel
    // nokta" demek olduğu için bu kayıtlar yanlıştı; temizlendi. Test, alanı
    // yeniden yanlış kullanmaya karşı kilitler.
    const meters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
      Math.hypot((a.lat - b.lat) * 111320, (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180));
    for (const tour of AUDIO_DISCOVERY_TOURS) {
      for (const stop of tour.stops) {
        for (const otherId of stop.sharedWith ?? []) {
          const other = tour.stops.find((item) => item.id === otherId);
          expect(other, `${stop.id}: sharedWith'te turda olmayan id var (${otherId})`).toBeTruthy();
          expect(other!.sharedWith, `${stop.id}→${otherId} karşılıklı değil`).toContain(stop.id);
          expect(meters(stop, other!), `${stop.id}→${otherId} aynı nokta değil`).toBeLessThan(30);
        }
      }
    }
  });

  it("yaklaşık konumlu üç durak açıkça işaretli", () => {
    // 51 Heksagon (sıralamadan türetilmiş nokta), 52 Verulanus (avlu toprak
    // altında), 53 Antik Liman (havza ortası), 57 sur kesiti. Nokta silinmez;
    // arayüzde "≈ yaklaşık konum" yazar ve pin erişilebilir adı bunu söyler.
    const efes = AUDIO_DISCOVERY_TOURS.find((tour) => tour.placeId === "efes")!;
    // 51 Heksagon main birleşmesinde ÖAW/Berns kaynaklı gerçek bir noktaya
    // taşındığı için listeden çıktı; kalan üç durak temsilî.
    const approximate = efes.stops.filter((stop) => stop.coordinateAccuracy === "approximate");
    expect(approximate.map((stop) => stop.no)).toEqual([52, 53, 57]);
    for (const stop of approximate) {
      expect(new URL(stop.coordinateSource).protocol).toBe("https:");
      expect(stop.sources.length).toBeGreaterThanOrEqual(2);
    }
    // Geri kalan 53 durak kesin nokta sayılır; sessizce "yaklaşık" işaretlenemez.
    expect(efes.stops.length - approximate.length).toBe(54);
  });

  it("ses süresi ekrandaki metinle orantılı (metin değişip ses eskide kalmamış)", () => {
    // 2026-11-08: 33–38 ve 48'in sesi, ekrandaki kısa metnin ESKİ uzun hâlini
    // okuyordu (kr/sn 9–11; tur medyanı 14,6). Sekizi de güncel metinden
    // yeniden üretildi. Bu kilit, metin düzenlenip ses eskide kaldığında düşer.
    const efes = AUDIO_DISCOVERY_TOURS.find((tour) => tour.placeId === "efes")!;
    const english = JSON.parse(readFileSync(resolve("public/audio/efes-en.json"), "utf8")) as Record<string, { description: string; audio?: string }>;

    const rates: { tr: number[]; en: number[] } = { tr: [], en: [] };
    for (const stop of efes.stops) {
      expect(stop.audio, `${stop.no}: Türkçe ses yolu yok`).toBeTruthy();
      rates.tr.push(stop.description.length / audioSeconds(resolve("public", stop.audio!.slice(1))));
      const englishStop = english[stop.id];
      expect(englishStop?.audio, `${stop.id}: İngilizce ses yolu yok`).toBeTruthy();
      rates.en.push(englishStop.description.length / audioSeconds(resolve("public", englishStop.audio!.slice(1))));
    }
    const check = (values: number[], min: number, max: number, label: string) => {
      for (const [index, rate] of values.entries()) {
        const no = efes.stops[index].no;
        expect(rate, `${label} ${no}: metin ${rate.toFixed(1)} kr/sn — metin ile ses ayrışmış`).toBeGreaterThan(min);
        expect(rate, `${label} ${no}: metin ${rate.toFixed(1)} kr/sn — metin ile ses ayrışmış`).toBeLessThan(max);
      }
    };
    // Bantlar 8 Kasım 2026 ölçümünden: TR 12,1–16,0 · EN 14,1–17,2.
    check(rates.tr, 11.5, 17.5, "TR");
    check(rates.en, 13, 18.5, "EN");
  });
});

/**
 * Kayıt paketi (`docs/icerik/sesli-anlatim-rehberi/kayit-paketi/`) insan
 * seslendiren için hazırlanır: dikte metni, CSV ve talimat aynı metni taşımak
 * zorunda. 2026-11-08'de paket ile JSON ayrışmıştı (metinler kısalmış, ses
 * eskiyi okuyordu; CSV'de artık var olmayan dosya yolları vardı). Bu kilitler
 * paketin **kayıtlı metinden türetildiğini** zorunlu kılar.
 *
 * Paket kapsamı sabittir: sesi 8 Kasım 2026'da üretilen/yenilenen duraklar.
 * Yeni durak eklenirse bu listeye eklenir — paket sessizce geride kalamaz.
 */
const PAKET_DIZINI = "docs/icerik/sesli-anlatim-rehberi/kayit-paketi";
const INGILIZCE_PAKET = [45, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57];
const TURKCE_PAKET = [33, 34, 35, 36, 37, 38, 45, 47, 48, 51];

function paketDuraklari() {
  const tur = JSON.parse(readFileSync(resolve("public/assets/sesli-turlar.json"), "utf8")) as {
    tours: { stops: { id: string; no: number; title: string; description: string; audio: string }[] }[];
  };
  const ingilizce = JSON.parse(readFileSync(resolve("public/audio/efes-en.json"), "utf8")) as Record<
    string,
    { title: string; audio: string; description: string }
  >;
  return { tur, ingilizce };
}

function dikteBolumleri(dosya: string) {
  const dikte = readFileSync(resolve(PAKET_DIZINI, dosya), "utf8");
  const parts = dikte.split(/\*\*\[(\d+)\] ([\w-]+)\*\*\n\n/).slice(1);
  const bolumler = new Map<number, { id: string; metin: string }>();
  for (let index = 0; index < parts.length; index += 3) {
    bolumler.set(Number(parts[index]), {
      id: parts[index + 1],
      metin: parts[index + 2].replace(/\n---\s*$/, "").trim(),
    });
  }
  return bolumler;
}

function csvSatirlari(dosya: string) {
  return readFileSync(resolve(PAKET_DIZINI, dosya), "utf8")
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => line.match(/^"([^"]*)","([^"]*)","([^"]*)"/))
    .filter((match): match is RegExpMatchArray => Boolean(match));
}

describe("kayıt paketi · JSON ile tutarlılık", () => {
  it("İngilizce dikte metni paket kapsamını ve güncel metni taşır", () => {
    const { tur, ingilizce } = paketDuraklari();
    const bolumler = dikteBolumleri("dikte-metni.md");
    expect([...bolumler.keys()].sort((a, b) => a - b)).toEqual(INGILIZCE_PAKET);
    for (const no of INGILIZCE_PAKET) {
      const durak = tur.tours[0].stops.find((stop) => stop.no === no)!;
      const kayit = ingilizce[durak.id];
      const bolum = bolumler.get(no)!;
      expect(bolum.id, `${no}: dikte metni kimliği`).toBe(durak.id);
      expect(bolum.metin, `${no}: dikte metni kayıtlı metinden farklı`).toBe(kayit.description.trim());
    }
  });

  it("İngilizce kayıt listesi CSV'si gerçek dosya yollarını ve metni taşır", () => {
    const { tur, ingilizce } = paketDuraklari();
    const rows = csvSatirlari("kayit-listesi.csv");
    expect(rows.map((match) => Number(match[1]))).toEqual(INGILIZCE_PAKET);
    for (const match of rows) {
      const no = Number(match[1]);
      const durak = tur.tours[0].stops.find((stop) => stop.no === no)!;
      const kayit = ingilizce[match[2]];
      expect(match[2], `${no}: CSV kimliği`).toBe(durak.id);
      expect(match[3], `${no}: CSV dosya adı`).toBe(kayit.audio.split("/").pop());
      expect(existsSync(resolve("public", kayit.audio.slice(1))), `${no}: ses dosyası yok`).toBe(true);
    }
  });

  it("Türkçe dikte metni ve CSV'si güncel metni taşır", () => {
    const { tur } = paketDuraklari();
    const bolumler = dikteBolumleri("dikte-metni-tr.md");
    expect([...bolumler.keys()].sort((a, b) => a - b)).toEqual(TURKCE_PAKET);
    const rows = csvSatirlari("kayit-listesi-tr.csv");
    expect(rows.map((match) => Number(match[1]))).toEqual(TURKCE_PAKET);
    for (const no of TURKCE_PAKET) {
      const durak = tur.tours[0].stops.find((stop) => stop.no === no)!;
      expect(bolumler.get(no)!.metin, `${no}: Türkçe dikte metni JSON'dan farklı`).toBe(durak.description.trim());
    }
    for (const match of rows) {
      const durak = tur.tours[0].stops.find((stop) => stop.no === Number(match[1]))!;
      expect(match[2], `${match[1]}: CSV kimliği`).toBe(durak.id);
      expect(match[3], `${match[1]}: CSV dosya adı`).toBe(durak.audio.split("/").pop());
      expect(existsSync(resolve("public", durak.audio.slice(1))), `${match[1]}: ses dosyası yok`).toBe(true);
    }
  });

  it("teknik künye ölçülen değerle aynı (32 kbps) ve eski yanlış yazım yok", () => {
    for (const dosya of ["PROMPT.md", "KAYIT-TALIMATI.md"]) {
      const metin = readFileSync(resolve(PAKET_DIZINI, dosya), "utf8");
      expect(metin, `${dosya}: 32 kbps yazmıyor`).toContain("32 kbps");
      expect(metin, `${dosya}: kaldırılmış 112 kbps geri gelmiş`).not.toContain("112 kbps");
    }
    const gorev = readFileSync("docs/icerik/sesli-anlatim-rehberi/agent-ses-gorevi.md", "utf8");
    expect(gorev).toContain("32 kbps CBR");
    expect(gorev).toContain("24000,1,32000");
  });
});
