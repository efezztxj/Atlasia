// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown) => void>();
  const map = {
    on: vi.fn((name: string, callback: (event: unknown) => void) => { handlers.set(name, callback); }),
    off: vi.fn(), once: vi.fn(), isStyleLoaded: vi.fn(() => false),
    getCenter: vi.fn(() => ({ lat: 30, lng: 30 })), getZoom: vi.fn(() => 2),
    getBounds: vi.fn(() => ({ getWest: () => 0, getSouth: () => 0, getEast: () => 1, getNorth: () => 1 })),
    remove: vi.fn(), resize: vi.fn(), triggerRepaint: vi.fn(), refreshTiles: vi.fn(),
  };
  return { handlers, map };
});
vi.mock("maplibre-gl", () => ({ setWorkerUrl: vi.fn(), Map: vi.fn(function () { return mocks.map; }) }));
vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url", () => ({ default: "/worker.js" }));
import MapView from "./MapView";

const props = { places: [], activeId: null, onSelect: vi.fn(), addMode: false, onMapClick: vi.fn(), showLabels: true, terrainEnabled: false, baseMap: "dark" as const, theme: "light" as const, spin: false, onUserInteract: vi.fn(), onViewChange: vi.fn() };
beforeEach(() => {
  mocks.handlers.clear();
  mocks.map.refreshTiles.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Harita kaynak hata bildirimi", () => {
  it("ilgili altlık hatasını gösterir, ilgisiz kaynaklarda göstermez ve yeniden dener", () => {
    render(createElement(MapView, props));
    act(() => mocks.handlers.get("error")?.({ sourceId: "terrain" }));
    expect(screen.queryByText(/Haritanın bazı bölümleri yüklenemedi/)).toBeNull();
    act(() => mocks.handlers.get("error")?.({ sourceId: "openfreemap-openmaptiles" }));
    expect(screen.getByRole("status").textContent).toContain("Haritanın bazı bölümleri yüklenemedi");
    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(mocks.map.refreshTiles).toHaveBeenCalledWith("openfreemap-openmaptiles");
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("altlık değişince önceki kaynağın uyarısını kaldırır", () => {
    const view = render(createElement(MapView, props));
    act(() => mocks.handlers.get("error")?.({ sourceId: "openfreemap-openmaptiles" }));
    view.rerender(createElement(MapView, { ...props, baseMap: "street" }));
    expect(screen.queryByRole("status")).toBeNull();
    act(() => mocks.handlers.get("error")?.({ sourceId: "street" }));
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
