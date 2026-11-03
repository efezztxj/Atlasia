// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { AUDIO_DISCOVERY_TOURS } from "../data/audioDiscovery";

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
    markers.remove();
    for (const marker of made) expect(marker.remove).toHaveBeenCalledOnce();
  });
});
