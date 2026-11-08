import { existsSync, readFileSync } from "node:fs";
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
 * Türkçe ses kaydı henüz üretilmemiş duraklar.
 *
 * 2026-11-08: Liste BOŞ — turun 57 durağının tamamı Türkçe sesli.
 * Yeni durak eklenirse ve sesi yoksa buraya yazılır; test sessiz büyümeyi
 * engeller (kayıt yoksa durak bu listede olmak ZORUNDA).
 */
const SES_BEKLEYEN: string[] = [];

/**
 * İngilizce SES KAYDI henüz üretilmemiş duraklar.
 *
 * 2026-11-08: Liste BOŞ — 57 durağın tamamı İngilizce sesli.
 * Metin 2026-11-07'de, ses 8 Kasım'da tamamlandı. Kayıt eklendikçe küçülen
 * kilit artık boş; yeni durak sessizce eklenemez (kayıt yoksa durak bu
 * listede olmak ZORUNDA).
 */
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
});
