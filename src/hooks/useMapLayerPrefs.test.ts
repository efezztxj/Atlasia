// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAP_STYLE_KEY, initialMapStyle, useMapLayerPrefs } from "./useMapLayerPrefs";

/**
 * F1-1 davranış kilidi: Explorer'dan kancaya taşınan harita katmanı durumu
 * **birebir aynı** davranmalı. Buradaki her test taşınmadan önceki davranışın
 * sözleşmesidir (depo anahtarı, olay adları, varsayılanlar, yan etki zamanı).
 */

const WEATHER_MODE_EVENT = "atlasia:weather-mode";
const WEATHER_TOGGLE_EVENT = "atlasia:weather-toggle";

function captureEvents(name: string) {
  const received: unknown[] = [];
  const handler = (event: Event) => received.push((event as CustomEvent<unknown>).detail);
  window.addEventListener(name, handler);
  return { received, stop: () => window.removeEventListener(name, handler) };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("harita katmanı tercihleri — taşınan davranış aynı", () => {
  it("varsayılanlar: uydu stili, etiket/kabartma açık, hava kapalı, katmanlar kapalı", () => {
    const { result } = renderHook(() => useMapLayerPrefs());

    expect(result.current.baseMap).toBe("satellite");
    expect(result.current.labels).toBe(true);
    expect(result.current.terrain).toBe(true);
    expect(result.current.spin).toBe(true);
    expect(result.current.heroCompact).toBe(false);
    expect(result.current.weather).toBe(false);
    expect(result.current.weatherStatus).toBe("empty");
    expect(result.current.weatherMode).toBe("wind");
    expect(result.current.weatherHour).toBe(0);
    expect(result.current.layersOpen).toBe(false);
  });

  it("kayıtlı harita stilini okur; geçersiz değer uyduya düşer", () => {
    window.localStorage.setItem(MAP_STYLE_KEY, "dark");
    expect(initialMapStyle()).toBe("dark");

    window.localStorage.setItem(MAP_STYLE_KEY, "carto");
    expect(initialMapStyle()).toBe("satellite");
  });

  it("stil değişikliği cihazda saklanır (giriş gerektirmez)", () => {
    const { result } = renderHook(() => useMapLayerPrefs());

    act(() => result.current.setBaseMap("street"));

    expect(window.localStorage.getItem(MAP_STYLE_KEY)).toBe("street");
  });

  it("hava anahtarı olayı doğru sırada yayınlar: durum 'loading' iken açılır", () => {
    const events = captureEvents(WEATHER_TOGGLE_EVENT);
    const { result } = renderHook(() => useMapLayerPrefs());

    act(() => result.current.toggleWeather());

    expect(result.current.weather).toBe(true);
    expect(result.current.weatherStatus).toBe("loading");
    expect(events.received).toEqual([true]);

    act(() => result.current.toggleWeather());

    expect(result.current.weather).toBe(false);
    expect(result.current.weatherStatus).toBe("empty");
    expect(events.received).toEqual([true, false]);
    events.stop();
  });

  it("ölçüm/saat değişimi `atlasia:weather-mode` olayını taşır", () => {
    const events = captureEvents(WEATHER_MODE_EVENT);
    const { result } = renderHook(() => useMapLayerPrefs());

    act(() => result.current.setWeatherMode("rain"));
    act(() => result.current.setWeatherHour(6));

    // İlk olay bağlanma anında yayınlanır (taşınmadan önceki davranış da böyleydi:
    // `MapView` geç açılsa da ölçümü/saati kaçırmasın).
    expect(events.received).toEqual([
      { mode: "wind", hour: 0 },
      { mode: "rain", hour: 0 },
      { mode: "rain", hour: 6 },
    ]);
    events.stop();
  });

  it("dış olaylar dinlenir: parça yüklenemezse hava kapanır, durum bildirilir", () => {
    const { result } = renderHook(() => useMapLayerPrefs());

    act(() => result.current.toggleWeather());
    expect(result.current.weather).toBe(true);

    act(() => {
      window.dispatchEvent(new CustomEvent("atlasia:weather-unavailable"));
    });
    expect(result.current.weather).toBe(false);

    act(() => {
      window.dispatchEvent(new CustomEvent("atlasia:weather-status", { detail: "error" }));
    });
    expect(result.current.weatherStatus).toBe("error");
  });

  it("kanca kalkınca dinleyiciler sökülür (sızıntı yok)", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useMapLayerPrefs());

    unmount();

    const removed = remove.mock.calls.map((call) => call[0]);
    expect(removed).toContain("atlasia:weather-unavailable");
    expect(removed).toContain("atlasia:weather-status");
    remove.mockRestore();
  });
});
