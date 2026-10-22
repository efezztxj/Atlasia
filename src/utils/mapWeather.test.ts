import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchWeatherGrid = vi.fn();
vi.mock("./weatherLayer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./weatherLayer")>();
  return { ...actual, fetchWeatherGrid: (...args: unknown[]) => fetchWeatherGrid(...args) };
});

import { createWeatherLayer } from "./mapWeather";

/** Denetim 2026-10-22 (P16): hava katmanı — MapLibre'siz sahte harita ile. */
class FakeElement {
  className = "";
  textContent = "";
  title = "";
}

function setup() {
  const handlers = new Map<string, () => void>();
  const added: Array<{ text: string; lngLat: [number, number]; removed: boolean }> = [];
  const map = {
    on: vi.fn((event: string, fn: () => void) => handlers.set(event, fn)),
    off: vi.fn((event: string) => handlers.delete(event)),
    getBounds: () => ({ getWest: () => 26, getSouth: () => 38, getEast: () => 28, getNorth: () => 39 }),
    getCenter: () => ({ lng: 27, lat: 38.5 }),
  };
  class Marker {
    private entry: { text: string; lngLat: [number, number]; removed: boolean };
    constructor({ element }: { element: FakeElement }) {
      this.entry = { text: element.textContent, lngLat: [0, 0], removed: false };
    }
    setLngLat(lngLat: [number, number]) { this.entry.lngLat = lngLat; return this; }
    addTo() { added.push(this.entry); return this; }
    remove() { this.entry.removed = true; }
  }
  const layer = createWeatherLayer(map as never, Marker as never);
  const visible = () => added.filter((entry) => !entry.removed).map((entry) => entry.text);
  return { layer, map, handlers, visible };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", { createElement: () => new FakeElement() });
  fetchWeatherGrid.mockReset();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const flush = async () => { await vi.advanceTimersByTimeAsync(500); };

describe("createWeatherLayer", () => {
  it("kapalıyken ağa gitmez; açılınca hücre başına etiket çizer", async () => {
    fetchWeatherGrid.mockResolvedValue([{ lat: 38.5, lng: 27, temperature: 21.6, precipitationMm: 0, weatherCode: 0 }]);
    const { layer, handlers, visible } = setup();
    handlers.get("moveend")?.();
    await flush();
    expect(fetchWeatherGrid).not.toHaveBeenCalled();
    layer.setEnabled(true);
    await flush();
    expect(fetchWeatherGrid).toHaveBeenCalledWith({ west: 26, south: 38, east: 28, north: 39 });
    expect(visible()).toHaveLength(1);
    expect(visible()[0]).toContain("22°");
  });

  it("ağ hatasında katman kapanmaz; dürüst hata etiketi gösterir", async () => {
    fetchWeatherGrid.mockRejectedValue(new Error("offline"));
    const { layer, visible } = setup();
    layer.setEnabled(true);
    await flush();
    expect(visible()).toEqual(["Hava verisi şu an alınamıyor"]);
  });

  it("boş yanıt da hata etiketi olarak gösterilir (sessiz boşluk yok)", async () => {
    fetchWeatherGrid.mockResolvedValue([]);
    const { layer, visible } = setup();
    layer.setEnabled(true);
    await flush();
    expect(visible()).toEqual(["Hava verisi şu an alınamıyor"]);
  });

  it("kapatılınca etiketler silinir ve geç gelen yanıt çizilmez", async () => {
    let resolve: (cells: unknown[]) => void = () => undefined;
    fetchWeatherGrid.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { layer, visible } = setup();
    layer.setEnabled(true);
    await flush();
    layer.setEnabled(false);
    resolve([{ lat: 1, lng: 1, temperature: 10, precipitationMm: 1, weatherCode: 61 }]);
    await flush();
    expect(visible()).toEqual([]);
  });

  it("destroy dinleyiciyi kaldırır", () => {
    const { layer, map } = setup();
    layer.destroy();
    expect(map.off).toHaveBeenCalledWith("moveend", expect.any(Function));
  });
});
