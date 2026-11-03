// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapLayersSheet from "./MapLayersSheet";

const renderSheet = (overrides: Partial<Parameters<typeof MapLayersSheet>[0]> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
    baseMap: "satellite" as const,
    onBaseMap: vi.fn(),
    labels: true,
    onToggleLabels: vi.fn(),
    terrain: true,
    onToggleTerrain: vi.fn(),







    onReset: vi.fn(),
    onOpenLocation: vi.fn(),
    onOpenAppearance: vi.fn(),
    locationReady: false,
    ...overrides,
  };
  render(createElement(MapLayersSheet, props));
  return props;
};

describe("MapLayersSheet", () => {
  afterEach(() => cleanup());

  it("kapalıyken hiçbir şey çizmez", () => {
    render(createElement(MapLayersSheet, {
      open: false,
      onClose: () => {},
      baseMap: "satellite",
      onBaseMap: () => {},
      labels: true,
      onToggleLabels: () => {},
      terrain: true,
      onToggleTerrain: () => {},







      onReset: () => {},
      onOpenLocation: () => {},
      onOpenAppearance: () => {},
      locationReady: false,
    }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("harita altlığı seçeneklerini, iki katman anahtarını ve sıfırla düğmesini gösterir", () => {
    renderSheet({ baseMap: "satellite" });
    expect(screen.getByText("Harita altlığı")).toBeTruthy();
    expect(screen.getByText("Harita gösterimi")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Konum ayarları" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Uydu/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Sokak/ }).getAttribute("aria-pressed")).toBe("false");
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);
    expect(switches[0].getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByText("Hava katmanı")).toBeNull();
    expect(screen.getByRole("button", { name: /Görünümü sıfırla/ })).toBeTruthy();
  });

  it("altlık seçimi, anahtarlar ve sıfırla doğru geri çağrıları tetikler", () => {
    const props = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Sokak/ }));
    fireEvent.click(screen.getByRole("button", { name: /Topoğrafik/ }));
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    fireEvent.click(switches[1]);
    fireEvent.click(screen.getByRole("button", { name: /Görünümü sıfırla/ }));
    fireEvent.click(screen.getByRole("button", { name: "Konum ayarları" }));
    fireEvent.click(screen.getByRole("button", { name: "Görünüm ve tema ayarları" }));
    expect(props.onBaseMap).toHaveBeenCalledWith("street");
    expect(props.onBaseMap).toHaveBeenCalledWith("topographic");
    expect(props.onToggleLabels).toHaveBeenCalledTimes(1);
    expect(props.onToggleTerrain).toHaveBeenCalledTimes(1);
    expect(props.onReset).toHaveBeenCalledTimes(1);
    expect(props.onOpenLocation).toHaveBeenCalledTimes(1);
    expect(props.onOpenAppearance).toHaveBeenCalledTimes(1);
  });

});
