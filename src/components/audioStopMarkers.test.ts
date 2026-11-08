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
import { addAudioStopMarkers } from "./audioStopMarkers";
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

  it("aynı koordinatı paylaşan duraklar üst üste basmaz, veriyi değiştirmez", () => {
    made.length = 0;
    const stops = AUDIO_DISCOVERY_TOURS[0].stops;
    addAudioStopMarkers({} as Map, stops, 0, vi.fn());
    // Veri değişmez: durak koordinatları olduğu gibi kalır.
    const shared = stops.filter((stop) => stop.sharedWith?.length);
    expect(shared.length).toBeGreaterThan(0);
    for (const stop of shared) {
      const index = stops.indexOf(stop);
      const [lng, lat] = made[index].point!;
      // Pin görsel olarak kaydırılır (birkaç metre) ama aynı yapıyı işaret eder.
      const meters = Math.hypot((lat - stop.lat) * 111320, (lng - stop.lng) * 111320 * Math.cos((stop.lat * Math.PI) / 180));
      expect(meters).toBeLessThan(40);
    }
    // Paylaşılan gruptaki pinler birbirinden ayrı konumda.
    // Not: burada `Map` adı maplibre-gl'in Map tipiyle çakışıyor; düz nesne kullanılır.
    const groups: Record<string, number[]> = {};
    for (const stop of stops) {
      const key = `${stop.lat},${stop.lng}`;
      const index = stops.indexOf(stop);
      groups[key] = [...(groups[key] ?? []), index];
    }
    for (const indexes of Object.values(groups)) {
      if (indexes.length < 2) continue;
      const points = indexes.map((index) => made[index].point!);
      for (let a = 0; a < points.length; a += 1) {
        for (let b = a + 1; b < points.length; b += 1) {
          expect(points[a]).not.toEqual(points[b]);
        }
      }
    }
  });
});
