// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapLayersSheet from "./MapLayersSheet";

/**
 * Denetim K-03 & 2026-10-27 kararı: masaüstü ve mobil Katmanlar sayfası.
 * Harita altlığı (Uydu, Karanlık, Sokak, Topoğrafik) ve üç katman anahtarı
 * (yer adları, 3B arazi, hava katmanı) burada toplanır; hava katmanı durumu
 * dürüst metinle gösterilir.
 */
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
    weather: false,
    onToggleWeather: vi.fn(),
    weatherStatus: "empty" as const,
    onReset: vi.fn(),
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
      weather: false,
      onToggleWeather: () => {},
      weatherStatus: "empty",
      onReset: () => {},
    }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("harita altlığı seçeneklerini, üç katman anahtarını ve sıfırla düğmesini gösterir", () => {
    renderSheet({ baseMap: "satellite" });
    expect(screen.getByText("Harita altlığı")).toBeTruthy();
    expect(screen.getByText("Harita gösterimi")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Uydu/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Sokak/ }).getAttribute("aria-pressed")).toBe("false");
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(3);
    expect(switches[0].getAttribute("aria-checked")).toBe("true");
    expect(switches[2].getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("button", { name: /Görünümü sıfırla/ })).toBeTruthy();
  });

  it("altlık seçimi, anahtarlar ve sıfırla doğru geri çağrıları tetikler", () => {
    const props = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Sokak/ }));
    fireEvent.click(screen.getByRole("button", { name: /Topoğrafik/ }));
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    fireEvent.click(switches[1]);
    fireEvent.click(switches[2]);
    fireEvent.click(screen.getByRole("button", { name: /Görünümü sıfırla/ }));
    expect(props.onBaseMap).toHaveBeenCalledWith("street");
    expect(props.onBaseMap).toHaveBeenCalledWith("topographic");
    expect(props.onToggleLabels).toHaveBeenCalledTimes(1);
    expect(props.onToggleTerrain).toHaveBeenCalledTimes(1);
    expect(props.onToggleWeather).toHaveBeenCalledTimes(1);
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it("hava katmanı açıkken Windy ölçeğini ve veri durumunu gösterir", () => {
    renderSheet({ weather: true, weatherStatus: "ready" });
    expect(screen.getByText(/Rüzgâr akışı açık/)).toBeTruthy();
    expect(screen.getByText(/km\/sa/)).toBeTruthy();
  });

  it("veri yokken uydurmaz, dürüst mesaj verir", () => {
    renderSheet({ weather: true, weatherStatus: "error" });
    expect(screen.getByText(/şu an alınamıyor/)).toBeTruthy();
  });
});
