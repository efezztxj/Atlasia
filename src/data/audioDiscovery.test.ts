import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIO_DISCOVERY_TOURS } from "./audioDiscoveryFixtures";
import { loadAudioDiscoveryForPlace, supportsAudioDiscovery } from "./audioDiscovery";
import { GUIDE_PLACES } from "./places";

describe("sesli keşif içeriği yayın kontrolleri", () => {
  it("turlar uygulamadaki benzersiz yerlere bağlanır", () => {
    expect(new Set(AUDIO_DISCOVERY_TOURS.map((tour) => tour.id)).size).toBe(AUDIO_DISCOVERY_TOURS.length);
    expect(new Set(AUDIO_DISCOVERY_TOURS.map((tour) => tour.placeId)).size).toBe(AUDIO_DISCOVERY_TOURS.length);
    for (const tour of AUDIO_DISCOVERY_TOURS) {
      expect(GUIDE_PLACES.some((place) => place.id === tour.placeId)).toBe(true);
      expect(supportsAudioDiscovery(tour.placeId)).toBe(true);
      expect(tour.stops.length).toBeGreaterThan(0);
      expect(new Set(tour.stops.map((stop) => stop.id)).size).toBe(tour.stops.length);
    }
    expect(supportsAudioDiscovery("bilinmeyen-yer")).toBe(false);
  });

  it("yalnız desteklenen turu yükler ve hatalı yanıtı reddeder", async () => {
    const original = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(JSON.stringify(AUDIO_DISCOVERY_TOURS), { status: 200 });
      expect((await loadAudioDiscoveryForPlace("efes"))?.stops).toHaveLength(AUDIO_DISCOVERY_TOURS[0].stops.length);
      expect(await loadAudioDiscoveryForPlace("bilinmeyen-yer")).toBeNull();
      globalThis.fetch = async () => new Response("<html>", { status: 200 });
      await expect(loadAudioDiscoveryForPlace("efes")).rejects.toThrow();
      globalThis.fetch = async () => new Response("not found", { status: 404 });
      await expect(loadAudioDiscoveryForPlace("efes")).rejects.toThrow();
    } finally { globalThis.fetch = original; }
  });

  it("her durakta İngilizce anlatım ve mevcut ses dosyası bulunur", () => {
    const english = JSON.parse(readFileSync(resolve("public/audio/efes-en.json"), "utf8")) as Record<string, { title: string; description: string; imageAlt: string; audio: string }>;
    for (const stop of AUDIO_DISCOVERY_TOURS.flatMap((tour) => tour.stops)) {
      const translation = english[stop.id];
      expect(translation?.title.trim()).toBeTruthy();
      expect(translation?.description.trim()).toBeTruthy();
      expect(translation?.imageAlt.trim()).toBeTruthy();
      expect(translation?.audio).toMatch(/^\/audio\/[\w-]+\.mp3$/);
      expect(existsSync(resolve("public", translation.audio.slice(1)))).toBe(true);
    }
  });

  it("duraklarda koordinat, kaynaklar ve ses; varsa lisanslı görsel bulunur", () => {
    for (const tour of AUDIO_DISCOVERY_TOURS) for (const stop of tour.stops) {
      expect(stop.title.trim()).not.toBe("");
      expect(stop.description.trim()).not.toBe("");
      expect(Number.isFinite(stop.lat) && Math.abs(stop.lat) <= 90).toBe(true);
      expect(Number.isFinite(stop.lng) && Math.abs(stop.lng) <= 180).toBe(true);
      expect(new URL(stop.coordinateSource).protocol).toBe("https:");
      expect(new Set(stop.sources.map((source) => new URL(source.url).hostname.replace(/^www\./, ""))).size).toBeGreaterThanOrEqual(2);
      for (const source of stop.sources) {
        expect(source.title.trim()).not.toBe("");
        expect(new URL(source.url).protocol).toBe("https:");
      }
      expect(stop.audio).toMatch(/^\/audio\/[\w-]+\.mp3$/);
      expect(existsSync(resolve("public", stop.audio!.slice(1)))).toBe(true);
      if (stop.image) {
        expect(stop.image.alt.trim()).toBeTruthy();
        expect(stop.image.author.trim()).toBeTruthy();
        expect(stop.image.license.trim()).toBeTruthy();
        if (stop.image.url.startsWith("/")) {
          expect(existsSync(resolve("public", stop.image.url.slice(1)))).toBe(true);
        } else {
          expect(new URL(stop.image.url).protocol).toBe("https:");
        }
        for (const url of [stop.image.source, stop.image.licenseUrl]) {
          expect(new URL(url).protocol).toBe("https:");
        }
      } else {
        throw new Error(`${stop.id}: görsel eksik`);
      }
    }
  });
});
