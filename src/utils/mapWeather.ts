import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { debounce, fetchWeatherGrid, weatherIcon } from "./weatherLayer";

export interface WeatherLayerHandle {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

type MarkerCtor = new (options: { element: HTMLElement; anchor: "center" }) => MapLibreMarker;

/**
 * Harita üstü hava etiketleri (3×3 grid). MapView bunu ilk açılışta tembel yükler.
 * - Üst üste binen yenilemelerde yalnız en sonuncusu çizer.
 * - Geçici hata katmanı kapatmaz; etiket gösterilir, sonraki kaydırmada yeniden denenir.
 */
export function createWeatherLayer(map: MapLibreMap, Marker: MarkerCtor): WeatherLayerHandle {
  let enabled = false;
  let run = 0;
  let markers: MapLibreMarker[] = [];
  const clear = () => { markers.forEach((marker) => marker.remove()); markers = []; };
  const label = (text: string, lng: number, lat: number, title?: string) => {
    const element = document.createElement("div");
    element.className = "rounded-full border border-white/20 bg-[#071f1a]/90 px-2 py-1 text-xs font-semibold text-white shadow-lg";
    element.textContent = text;
    if (title) element.title = title;
    markers.push(new Marker({ element, anchor: "center" }).setLngLat([lng, lat]).addTo(map));
  };
  const refresh = debounce(async () => {
    if (!enabled) return;
    const current = ++run;
    try {
      const bounds = map.getBounds();
      const cells = await fetchWeatherGrid({ west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() });
      if (current !== run || !enabled) return;
      clear();
      if (!cells.length) throw new Error("Hava verisi yok.");
      for (const cell of cells) {
        label(`${weatherIcon(cell.weatherCode)} ${Math.round(cell.temperature)}°`, cell.lng, cell.lat, `${cell.precipitationMm} mm yağış`);
      }
    } catch {
      if (current !== run || !enabled) return;
      clear();
      const center = map.getCenter();
      label("Hava verisi şu an alınamıyor", center.lng, center.lat);
    }
  }, 450);
  map.on("moveend", refresh);
  return {
    setEnabled(next) {
      enabled = next;
      if (enabled) refresh();
      else { run += 1; refresh.cancel(); clear(); }
    },
    destroy() {
      enabled = false;
      run += 1;
      map.off("moveend", refresh);
      refresh.cancel();
      clear();
    },
  };
}
