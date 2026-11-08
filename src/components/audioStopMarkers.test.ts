// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { AUDIO_DISCOVERY_TOURS } from "../data/audioDiscoveryFixtures";

const made = vi.hoisted(() => [] as { options: { element: HTMLElement; anchor: string }; point?: number[]; remove: () => void }[]);
vi.mock("maplibre-gl", () => ({
  Marker: class {
    entry: (typeof made)[number];
    constructor(options: (typeof made)[number]["options"]) { this.entry = { options, remove: vi.fn() }; made.push(this.entry); }
    setLngLat(point: number[]) { this.entry.point = point; return this; }
    addTo() { return this; }
    remove() { this.entry.remove(); }
  },
}));
import { addAudioStopMarkers, groupOverlappingStops } from "./audioStopMarkers";
import type { Map } from "maplibre-gl";

describe("sesli keşif pinleri", () => {
  it("ucu koordinata bağlı, numaralı ve seçilebilir pinleri temizler", () => {
    made.length = 0;
    const stops = AUDIO_DISCOVERY_TOURS[0].stops;
    const onSelect = vi.fn();
    const markers = addAudioStopMarkers({} as Map, stops, 0, onSelect);
    expect(made).toHaveLength(stops.length);
    expect(made[0].options.anchor).toBe("bottom");
    expect(made[0].point).toEqual([stops[0].lng, stops[0].lat]);
    expect(made[0].options.element.getAttribute("aria-pressed")).toBe("true");
    expect(made[1].options.element.getAttribute("aria-pressed")).toBe("false");
    expect(made[0].options.element.querySelector("path")?.getAttribute("fill")).toBe("#eab54f");
    made[1].options.element.click();
    expect(onSelect).toHaveBeenCalledWith(1);
    document.body.append(made[1].options.element);
    made[1].options.element.focus();
    markers.update(1);
    expect(document.activeElement).toBe(made[1].options.element);
    expect(made[1].options.element.getAttribute("aria-pressed")).toBe("true");
    expect(made[0].options.element.getAttribute("aria-pressed")).toBe("false");
    made[1].options.element.remove();
    const outsideIndex = stops.findIndex((stop) => stop.id === "artemision");
    const outside = made[outsideIndex];
    expect(outside.options.anchor).toBe("center");
    // Ören yeri dışı durak ◆ biçimini korur ama artık numarasını da gösterir
    // (numaralar 1..N kesintisiz; eskiden ◆'lar numara tüketmediği için
    // haritada 16/17/18/24/25/26/27/29/38 numaraları boş görünüyordu).
    expect(outside.options.element.querySelector("text")?.textContent).toBe(String(stops[outsideIndex].no));
    expect(outside.options.element.getAttribute("aria-label")).toContain("Ören yeri dışı");
    expect(outside.options.element.querySelector("path")?.getAttribute("fill")).toBe("#704b87");
    outside.options.element.click();
    expect(onSelect).toHaveBeenCalledWith(outsideIndex);
    markers.update(outsideIndex);
    expect(outside.options.element.getAttribute("aria-pressed")).toBe("true");
    expect(outside.options.element.querySelector("path")?.getAttribute("stroke")).toBe("#eab54f");
    for (const id of ["meryem-kilisesi", "efes-stadyumu"]) {
      expect(made[stops.findIndex((stop) => stop.id === id)].options.anchor).toBe("bottom");
    }
    markers.remove();
    for (const marker of made) expect(marker.remove).toHaveBeenCalledOnce();
  });

  it("birbirine 20 m'den yakın duraklar (45–47) üst üste basmaz, veriyi değiştirmez", () => {
    made.length = 0;
    const stops = AUDIO_DISCOVERY_TOURS[0].stops;
    addAudioStopMarkers({} as Map, stops, 0, vi.fn());
    const meters = (a: number[], b: number[]) => Math.hypot((a[1] - b[1]) * 111320, (a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180));

    // 2026-11-08: 45 Chalcidicum, 46 Pollio ve 47 Domitian Çeşmesi 4–8 m
    // aralıkla duruyor; eski kod yalnız BİREBİR aynı koordinatı kaydırdığı için
    // üç pin tek bir leke gibi görünüyordu. Eşik artık 20 m.
    const clusters = groupOverlappingStops(stops);
    const near = clusters.find((members) => [45, 46, 47].every((no) => members.some((index) => stops[index].no === no)));
    expect(near, "45–47 tek kümede olmalı").toBeTruthy();
    const trio = [45, 46, 47].map((no) => made[stops.findIndex((stop) => stop.no === no)]);
    for (let a = 0; a < trio.length; a += 1) {
      for (let b = a + 1; b < trio.length; b += 1) {
        // Pin görsel olarak ayrılır ama aynı yapıyı işaret eder (≤40 m sapma).
        expect(meters(trio[a].point!, trio[b].point!)).toBeGreaterThan(14);
      }
      const stop = stops[stops.findIndex((item) => item.no === [45, 46, 47][a])];
      expect(meters(trio[a].point!, [stop.lng, stop.lat])).toBeLessThanOrEqual(40);
    }

    // Küme dışındaki durakların pini koordinatın tam üstünde kalır (veri değişmez).
    const lonely = stops.findIndex((stop) => stop.id === "meryem-kilisesi");
    expect(clusters.find((members) => members.includes(lonely))).toHaveLength(1);
    expect(made[lonely].point).toEqual([stops[lonely].lng, stops[lonely].lat]);

    // Hiçbir iki pin aynı noktaya basmaz.
    const points = made.map((marker) => marker.point!);
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        expect(points[a]).not.toEqual(points[b]);
      }
    }
  });

  it("yaklaşık konumlu durak ekran okuyucuya da yaklaşık olduğunu söyler", () => {
    made.length = 0;
    const stops = AUDIO_DISCOVERY_TOURS[0].stops;
    addAudioStopMarkers({} as Map, stops, 0, vi.fn());
    const approximate = stops.filter((stop) => stop.coordinateAccuracy === "approximate");
    expect(approximate.map((stop) => stop.no)).toEqual([51, 52, 53, 57]);
    for (const stop of approximate) {
      const index = stops.indexOf(stop);
      expect(made[index].options.element.getAttribute("aria-label")).toContain("yaklaşık konum");
    }
    const exact = stops.findIndex((stop) => stop.id === "meryem-kilisesi");
    expect(made[exact].options.element.getAttribute("aria-label")).not.toContain("yaklaşık konum");
  });
});
