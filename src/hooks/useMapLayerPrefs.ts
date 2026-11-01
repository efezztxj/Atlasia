/**
 * Atlasia — harita katmanı tercihleri (F1-1).
 *
 * NEDEN VAR: `Explorer.tsx` 1.796 satır / 58 `useState` idi (`moduleSize.test.ts`
 * borç defteri). Bu kanca harita katmanıyla ilgili **10 durumu** ve ona bağlı
 * **üç davranışı** tek yere taşır: harita stili kalıcılığı, hava katmanı
 * olayları (`atlasia:weather-*`) ve hava anahtarı.
 *
 * DAVRANIŞ SÖZLEŞMESİ (F1'in kabul kriteri): taşınan kod **birebir** aynı
 * davranır — aynı olay adları, aynı depo anahtarı, aynı varsayılanlar, aynı
 * yan etki zamanlaması. Kanca yalnız sahiplik değiştirir, davranış değiştirmez.
 */
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { BaseMapStyle } from "../components/MapView";
import type { WeatherMode, WeatherStatus } from "../utils/mapWeather";
import { storageGet, storageSet } from "../utils/storage";

/** Harita stili tercihi cihazda tutulur (giriş gerektirmez, cihaz hesabında da çalışır). */
export const MAP_STYLE_KEY = "atlasia.mapStyle.v1";

export function initialMapStyle(): BaseMapStyle {
  const saved = storageGet(MAP_STYLE_KEY);
  return saved === "dark" || saved === "street" || saved === "topographic" ? saved : "satellite";
}

export interface MapLayerPrefs {
  /** Altlık harita stili; `MapView` `baseMap` prop'uyla alır. */
  baseMap: BaseMapStyle;
  setBaseMap: Dispatch<SetStateAction<BaseMapStyle>>;
  /** Yer adları katmanı. */
  labels: boolean;
  setLabels: Dispatch<SetStateAction<boolean>>;
  /** Kabartma (terrain) katmanı. */
  terrain: boolean;
  setTerrain: Dispatch<SetStateAction<boolean>>;
  /** Açılıştaki küre animasyonu; ilk kullanıcı etkileşiminde kapanır. */
  spin: boolean;
  setSpin: Dispatch<SetStateAction<boolean>>;
  /** Mobilde hero kartının daraltılmış hâli. */
  heroCompact: boolean;
  setHeroCompact: Dispatch<SetStateAction<boolean>>;
  /** Hava katmanı açık mı. */
  weather: boolean;
  setWeather: Dispatch<SetStateAction<boolean>>;
  /** Hava katmanının veri durumu (Katmanlar sayfasında dürüstçe gösterilir). */
  weatherStatus: WeatherStatus;
  setWeatherStatus: Dispatch<SetStateAction<WeatherStatus>>;
  /** Hava ölçümü (rüzgâr/sıcaklık/yağış) ve tahmin saati. */
  weatherMode: WeatherMode;
  setWeatherMode: Dispatch<SetStateAction<WeatherMode>>;
  weatherHour: number;
  setWeatherHour: Dispatch<SetStateAction<number>>;
  /** Katmanlar sayfası açık mı (mobilde hava katmanına tek erişim yolu). */
  layersOpen: boolean;
  setLayersOpen: Dispatch<SetStateAction<boolean>>;
  toggleWeather: () => void;
}

export function useMapLayerPrefs(): MapLayerPrefs {
  const [spin, setSpin] = useState(true);
  const [heroCompact, setHeroCompact] = useState(false);
  const [labels, setLabels] = useState(true);
  const [terrain, setTerrain] = useState(true);
  // Hava katmanı tek kaynaktan yönetilir: Katmanlar sayfası + sağ ray düğmesi.
  const [weather, setWeather] = useState(false);
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>("empty");
  // Hava katmanının ölçümü ve tahmin saati: Katmanlar sayfasından seçilir,
  // MapView'a `atlasia:weather-mode` olayıyla taşınır (katman geç açılsa da uygulanır).
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("wind");
  const [weatherHour, setWeatherHour] = useState(0);
  const [layersOpen, setLayersOpen] = useState(false);
  const [baseMap, setBaseMap] = useState<BaseMapStyle>(initialMapStyle);

  useEffect(() => { storageSet(MAP_STYLE_KEY, baseMap); }, [baseMap]);

  // Hava katmanı: parça yüklenemezse anahtar kapanır; veri durumu Katmanlar
  // sayfasında dürüstçe gösterilir (Windy benzeri katman, utils/mapWeather.ts).
  useEffect(() => {
    const unavailable = () => setWeather(false);
    const status = (event: Event) => {
      const detail = (event as CustomEvent<WeatherStatus>).detail;
      if (detail) setWeatherStatus(detail);
    };
    window.addEventListener("atlasia:weather-unavailable", unavailable);
    window.addEventListener("atlasia:weather-status", status);
    return () => {
      window.removeEventListener("atlasia:weather-unavailable", unavailable);
      window.removeEventListener("atlasia:weather-status", status);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("atlasia:weather-mode", {
      detail: { mode: weatherMode, hour: weatherHour },
    }));
  }, [weatherMode, weatherHour]);

  // NOT: Olay, durum güncelleyicisinin İÇİNDE gönderiliyor. Bu bilinçli olarak
  // korundu (F1 davranış değişmezliği): `MapView` katmanı geç açılsa da aynı
  // sırada aynı olayı alır. Davranışı değiştirmek ayrı bir iştir.
  const toggleWeather = useCallback(() => {
    setWeather((current) => {
      const next = !current;
      setWeatherStatus(next ? "loading" : "empty");
      window.dispatchEvent(new CustomEvent("atlasia:weather-toggle", { detail: next }));
      return next;
    });
  }, []);

  return {
    baseMap, setBaseMap,
    labels, setLabels,
    terrain, setTerrain,
    spin, setSpin,
    heroCompact, setHeroCompact,
    weather, setWeather,
    weatherStatus, setWeatherStatus,
    weatherMode, setWeatherMode,
    weatherHour, setWeatherHour,
    layersOpen, setLayersOpen,
    toggleWeather,
  };
}
