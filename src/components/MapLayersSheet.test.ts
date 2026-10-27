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
    weatherMode: "wind" as const,
    onWeatherMode: vi.fn(),
    weatherHour: 0,
    onWeatherHour: vi.fn(),
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
      weatherMode: "wind",
      onWeatherMode: () => {},
      weatherHour: 0,
      onWeatherHour: () => {},
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

  it("üç ölçüm düğmesi sunar, seçili olanı işaretler", () => {
    renderSheet({ weather: true, weatherStatus: "ready", weatherMode: "rain" });
    const group = screen.getByRole("group", { name: /Hava katmanı ölçümü/ });
    expect(group).toBeTruthy();
    const rain = screen.getByRole("button", { name: /Yağış/ });
    expect(rain.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Rüzgâr/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("ölçüm seçimi geri çağrıyı tetikler", () => {
    const props = renderSheet({ weather: true, weatherStatus: "ready" });
    fireEvent.click(screen.getByRole("button", { name: /Sıcaklık/ }));
    expect(props.onWeatherMode).toHaveBeenCalledWith("temp");
  });

  it("rüzgâr modunda lejant km/sa, yağış modunda mm/sa gösterir", () => {
    renderSheet({ weather: true, weatherStatus: "ready" });
    expect(screen.getByText(/km\/sa/)).toBeTruthy();
    expect(screen.queryByText(/mm\/sa/)).toBeNull();
    cleanup();
    renderSheet({ weather: true, weatherStatus: "ready", weatherMode: "rain" });
    expect(screen.getByText(/mm\/sa/)).toBeTruthy();
  });

  it("rüzgârda saat dilimleyici yok; yağışta var ve değeri yazar", () => {
    renderSheet({ weather: true, weatherStatus: "ready" });
    expect(screen.queryByLabelText(/Tahmin saati/)).toBeNull();
    cleanup();
    renderSheet({ weather: true, weatherStatus: "ready", weatherMode: "rain", weatherHour: 3 });
    expect(screen.getByLabelText(/Tahmin saati/)).toBeTruthy();
    expect(screen.getByText("+3 sa")).toBeTruthy();
  });

  it("saat dilimleyici geri çağrıya sayı geçirir", () => {
    const props = renderSheet({ weather: true, weatherStatus: "ready", weatherMode: "temp" });
    fireEvent.change(screen.getByLabelText(/Tahmin saati/), { target: { value: "7" } });
    expect(props.onWeatherHour).toHaveBeenCalledWith(7);
  });

  it("yağış modunda rota işaretini açıklar, diğer modlarda açıklamaz", () => {
    renderSheet({ weather: true, weatherStatus: "ready", weatherMode: "rain" });
    expect(screen.getByText(/altın halkayla işaretlenir/)).toBeTruthy();
    cleanup();
    renderSheet({ weather: true, weatherStatus: "ready", weatherMode: "wind" });
    expect(screen.queryByText(/altın halkayla işaretlenir/)).toBeNull();
  });
});
