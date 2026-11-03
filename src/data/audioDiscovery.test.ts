import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIO_DISCOVERY_TOURS, audioDiscoveryForPlace } from "./audioDiscovery";
import { GUIDE_PLACES } from "./places";

describe("sesli keşif içeriği yayın kontrolleri", () => {
  it("turlar uygulamadaki benzersiz yerlere bağlanır", () => {
    expect(new Set(AUDIO_DISCOVERY_TOURS.map((tour) => tour.id)).size).toBe(AUDIO_DISCOVERY_TOURS.length);
    expect(new Set(AUDIO_DISCOVERY_TOURS.map((tour) => tour.placeId)).size).toBe(AUDIO_DISCOVERY_TOURS.length);
    for (const tour of AUDIO_DISCOVERY_TOURS) {
      expect(GUIDE_PLACES.some((place) => place.id === tour.placeId)).toBe(true);
      expect(audioDiscoveryForPlace(tour.placeId)).toBe(tour);
      expect(tour.stops.length).toBeGreaterThan(0);
      expect(new Set(tour.stops.map((stop) => stop.id)).size).toBe(tour.stops.length);
    }
    expect(audioDiscoveryForPlace("bilinmeyen-yer")).toBeNull();
  });

  it("her durakta koordinat, bağımsız kaynaklar, lisanslı görsel ve mevcut ses bulunur", () => {
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
      expect(stop.image?.alt.trim()).toBeTruthy();
      expect(stop.image?.author.trim()).toBeTruthy();
      expect(stop.image?.license.trim()).toBeTruthy();
      for (const url of [stop.image?.url, stop.image?.source, stop.image?.licenseUrl]) {
        expect(url && new URL(url).protocol).toBe("https:");
      }
    }
  });
});
