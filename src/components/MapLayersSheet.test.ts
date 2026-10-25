// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapLayersSheet from "./MapLayersSheet";

/**
 * Denetim K-03: mobil Katmanlar sayfası.
 * Üç anahtar (yer adları, 3B arazi, hava katmanı) `role="switch"` olarak
 * çalışır; hava katmanı durumu dürüst metinle gösterilir.
 */
const renderSheet = (overrides: Partial<Parameters<typeof MapLayersSheet>[0]> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
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

  it("üç katman anahtarını ve sıfırla düğmesini gösterir", () => {
    renderSheet();
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(3);
    expect(switches[0].getAttribute("aria-checked")).toBe("true");
    expect(switches[2].getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("button", { name: /Görünümü sıfırla/ })).toBeTruthy();
  });

  it("anahtarlar ve sıfırla doğru geri çağrıları tetikler", () => {
    const props = renderSheet();
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[1]);
    fireEvent.click(switches[2]);
    fireEvent.click(screen.getByRole("button", { name: /Görünümü sıfırla/ }));
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
