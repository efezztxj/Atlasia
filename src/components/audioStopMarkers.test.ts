// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { AUDIO_DISCOVERY_TOURS } from "../data/audioDiscoveryFixtures";

const made = vi.hoisted(() => [] as { options: { element: HTMLElement; anchor: string }; point?: number[]; offset?: number[]; remove: () => void }[]);
vi.mock("maplibre-gl", () => ({
  Marker: class {
    entry: (typeof made)[number];
    constructor(options: (typeof made)[number]["options"]) { this.entry = { options, remove: vi.fn() }; made.push(this.entry); }
    setLngLat(point: number[]) { this.entry.point = point; return this; }
    setOffset(offset: number[]) { this.entry.offset = offset; return this; }
    addTo() { return this; }
    remove() { this.entry.remove(); }
  },
}));
import { addAudioStopMarkers, computeSpiderOffsets } from "./audioStopMarkers";
import type { Map as MaplibreMap } from "maplibre-gl";

describe("sesli keşif pinleri", () => {
  it("ucu koordinata bağlı, numaralı ve seçilebilir pinleri temizler", () => {
    made.length = 0;
    const stops = AUDIO_DISCOVERY_TOURS[0].stops;
    const onSelect = vi.fn();
    const markers = addAudioStopMarkers({} as MaplibreMap, stops, 0, onSelect);
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
    expect(outside.options.element.querySelector("text")?.textContent).toBe("◆");
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
});

describe("çakışan pin halkaları", () => {
  it("tekil pinlere dokunmaz, çakışanları halkaya açar", () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 4 }, { x: 22, y: 0 }, { x: 400, y: 400 }, { x: 900, y: 100 }];
    const offsets = computeSpiderOffsets(points);
    expect(offsets[3]).toEqual({ dx: 0, dy: 0 });
    expect(offsets[4]).toEqual({ dx: 0, dy: 0 });
    const ring = offsets.slice(0, 3);
    for (const offset of ring) expect(Math.hypot(offset.dx, offset.dy)).toBeGreaterThan(50);
    expect(new Set(ring.map((offset) => `${offset.dx},${offset.dy}`)).size).toBe(3);
  });
  it("15 pinli yığını iki halkaya dağıtır", () => {
    const offsets = computeSpiderOffsets(Array.from({ length: 15 }, () => ({ x: 5, y: 5 })));
    const radii = offsets.map((offset) => Math.round(Math.hypot(offset.dx, offset.dy)));
    expect(radii.filter((radius) => Math.abs(radius - 64) <= 1)).toHaveLength(8);
    expect(radii.filter((radius) => Math.abs(radius - 112) <= 1)).toHaveLength(7);
  });
  it("zincirleme yakınlığı tek grup sayar", () => {
    const offsets = computeSpiderOffsets([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }]);
    expect(offsets.every((offset) => Math.hypot(offset.dx, offset.dy) > 0)).toBe(true);
  });
  it("harita görünümü değişince halkaları yeniden hesaplar, kaldırınca dinleyicileri bırakır", () => {
    made.length = 0;
    const stops = AUDIO_DISCOVERY_TOURS[0].stops.slice(0, 4);
    const crowded = [{ x: 100, y: 100 }, { x: 104, y: 102 }, { x: 600, y: 600 }, { x: 604, y: 602 }];
    const pixelFor: Record<number, { x: number; y: number }> = {};
    stops.forEach((stop, index) => { pixelFor[stop.lng] = crowded[index]; });
    const handlers = new Map<string, () => void>();
    const map = {
      project: (lngLat: number[]) => pixelFor[lngLat[0]],
      on: (type: string, fn: () => void) => { handlers.set(type, fn); },
      off: (type: string) => { handlers.delete(type); },
    } as unknown as MaplibreMap;
    const markers = addAudioStopMarkers(map, stops, 0, vi.fn());
    expect(handlers.has("moveend")).toBe(true);
    for (const index of [0, 1, 2, 3]) expect(made[index].offset).not.toEqual([0, 0]);
    stops.forEach((stop, index) => { pixelFor[stop.lng] = { x: index * 300, y: index * 200 }; });
    handlers.get("moveend")!();
    for (const index of [0, 1, 2, 3]) expect(made[index].offset).toEqual([0, 0]);
    markers.remove();
    expect(handlers.size).toBe(0);
    for (const marker of made) expect(marker.remove).toHaveBeenCalledOnce();
  });
});
