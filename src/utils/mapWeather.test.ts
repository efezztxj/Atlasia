import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchWindField = vi.fn();
vi.mock("./windField", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./windField")>();
  return { ...actual, fetchWindField: (...args: unknown[]) => fetchWindField(...args) };
});

import { advanceLngLat, createWeatherLayer, paletteIndex, particleBudget, windColor } from "./mapWeather";

/**
 * Denetim 2026-10-25: Windy benzeri hava katmanı.
 * Saf yardımcılar doğrudan, tuval yaşam döngüsü MapLibre'siz sahte haritayla test edilir.
 */

const FIELD = {
  bounds: { west: 26, south: 38, east: 28, north: 39 },
  rows: 1,
  columns: 1,
  at: 0,
  points: [{ lat: 38.5, lng: 27, u: 8, v: 0, speed: 8 }],
};

interface FakeCtx {
  setTransform: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  createRadialGradient: ReturnType<typeof vi.fn>;
}

function makeCtx(): FakeCtx {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
}

function setup() {
  const canvases: Array<{ className: string; removed: boolean; ctx: FakeCtx }> = [];
  const appended: unknown[] = [];
  const host = {
    clientWidth: 800,
    clientHeight: 600,
    appendChild: vi.fn((node: unknown) => { appended.push(node); }),
  };
  const handlers = new Map<string, () => void>();
  const map = {
    on: vi.fn((event: string, fn: () => void) => handlers.set(event, fn)),
    off: vi.fn((event: string) => handlers.delete(event)),
    getCanvasContainer: () => host,
    getBounds: () => ({ getWest: () => 26, getSouth: () => 38, getEast: () => 28, getNorth: () => 39 }),
    getZoom: () => 6,
    project: ([lng, lat]: [number, number]) => ({ x: (lng - 26) * 400, y: (39 - lat) * 600 }),
    unproject: ([x, y]: [number, number]) => ({ lng: 26 + x / 400, lat: 39 - y / 600 }),
  };

  const createElement = vi.fn(() => {
    const ctx = makeCtx();
    const entry = { className: "", removed: false, ctx };
    canvases.push(entry);
    const canvas = {
      get className() { return entry.className; },
      set className(value: string) { entry.className = value; },
      style: {} as Record<string, string>,
      width: 0,
      height: 0,
      getContext: () => ctx,
      remove: () => { entry.removed = true; },
    };
    return canvas as unknown as HTMLCanvasElement;
  });

  const events: Array<{ type: string; detail?: unknown }> = [];
  vi.stubGlobal("document", { hidden: false, createElement });
  vi.stubGlobal("window", {
    devicePixelRatio: 2,
    matchMedia: () => ({ matches: false }),
    dispatchEvent: (event: { type: string; detail?: unknown }) => { events.push(event); return true; },
  });
  vi.stubGlobal("CustomEvent", class {
    type: string;
    detail?: unknown;
    constructor(type: string, init?: { detail?: unknown }) { this.type = type; this.detail = init?.detail; }
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());

  const layer = createWeatherLayer(map as never);
  return { layer, map, host, canvases, events, handlers, appended };
}

const flush = async () => { await vi.advanceTimersByTimeAsync(600); };

beforeEach(() => {
  vi.useFakeTimers();
  fetchWindField.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("hava katmanı yardımcıları", () => {
  it("hız rengi Windy paletine göre bantlanır", () => {
    expect(windColor(0)).toBe("#5b6fd6");
    expect(windColor(4)).toBe("#3fa0d9");   // 14,4 km/sa
    expect(windColor(7)).toBe("#35c98a");   // 25 km/sa
    expect(windColor(30)).toBe("#8b3fa8");  // 108 km/sa
    expect(paletteIndex(0)).toBe(0);
    expect(paletteIndex(30)).toBe(6);
  });

  it("parçacık bütçesi alanla artar ama 350–1500 aralığında kalır", () => {
    expect(particleBudget(100, 100)).toBe(350);
    expect(particleBudget(1440, 900)).toBe(1440);
    expect(particleBudget(4000, 3000)).toBe(1500);
  });

  it("parçacık doğu rüzgârında doğuya, kuzey rüzgârında kuzeye gider", () => {
    const east = advanceLngLat(27, 38.5, { u: 8, v: 0, speed: 8 }, 6, 0.05);
    expect(east.lng).toBeGreaterThan(27);
    expect(east.lat).toBeCloseTo(38.5, 6);
    const north = advanceLngLat(27, 38.5, { u: 0, v: 8, speed: 8 }, 6, 0.05);
    expect(north.lat).toBeGreaterThan(38.5);
    expect(north.lng).toBeCloseTo(27, 6);
  });

  it("durgun hava parçacığı yerinde bırakır; kutup enlemi sınırlanır", () => {
    expect(advanceLngLat(27, 38.5, { u: 0, v: 0, speed: 0 }, 6, 0.05)).toEqual({ lng: 27, lat: 38.5 });
    const pole = advanceLngLat(0, 85, { u: 0, v: 40, speed: 40 }, 2, 0.1);
    expect(pole.lat).toBeLessThanOrEqual(85);
  });
});

describe("hava katmanı yaşam döngüsü", () => {
  it("etkinleşince iki tuval ekler, veriyi çeker ve 'ready' bildirir", async () => {
    fetchWindField.mockResolvedValue(FIELD);
    const { layer, host, events } = setup();
    layer.setEnabled(true);
    await flush();

    expect(host.appendChild).toHaveBeenCalledTimes(2);
    expect(fetchWindField).toHaveBeenCalledWith(
      { west: 26, south: 38, east: 28, north: 39 },
      expect.any(Function),
      expect.any(Number),
      expect.anything(),
    );
    expect(events.at(-1)).toEqual({ type: "atlasia:weather-status", detail: "ready" });
    layer.destroy();
  });

  it("veri yoksa 'empty', ağ hatasında 'error' bildirir ve çökmez", async () => {
    fetchWindField.mockResolvedValueOnce(null);
    const first = setup();
    first.layer.setEnabled(true);
    await flush();
    expect(first.events.at(-1)?.detail).toBe("empty");
    first.layer.destroy();

    fetchWindField.mockRejectedValueOnce(new Error("offline"));
    const second = setup();
    second.layer.setEnabled(true);
    await flush();
    expect(second.events.at(-1)?.detail).toBe("error");
    second.layer.destroy();
  });

  it("kapatılınca tuvalleri kaldırır ve harita dinleyicilerini bırakır", async () => {
    fetchWindField.mockResolvedValue(FIELD);
    const { layer, canvases, map } = setup();
    layer.setEnabled(true);
    await flush();
    expect(map.on).toHaveBeenCalledWith("moveend", expect.any(Function));

    layer.setEnabled(false);
    expect(canvases.every((canvas) => canvas.removed)).toBe(true);
    expect(map.off).toHaveBeenCalledWith("moveend", expect.any(Function));
    expect(cancelAnimationFrame).toBeDefined();
  });

  it("destroy sonrası tekrar etkinleştirme tuval eklemez", async () => {
    fetchWindField.mockResolvedValue(FIELD);
    const { layer, host } = setup();
    layer.destroy();
    layer.setEnabled(true);
    await flush();
    expect(host.appendChild).not.toHaveBeenCalled();
  });
});
