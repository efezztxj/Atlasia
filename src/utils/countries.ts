/**
 * Atlasia — dünya ülke sınırları (ayrı GeoJSON katmanı).
 * Veri: public/data/countries-110m.geojson (Natural Earth 1:110m, public domain;
 * kaynak ve dönüşüm: data/source/world-atlas/README.md).
 * Bu modül Esri overlay'ine bağımlı değildir.
 */
import type maplibregl from "maplibre-gl";
import { KKTC_NAME } from "../data/regions";

export const COUNTRIES_URL = "/data/countries-110m.geojson";

export interface CountrySelection {
  key: string;
  name: string;
}

/** Natural Earth'te ISO kodsuz kuzey Kıbrıs poligonu; mevcut KKTC etiketiyle aynı yer. */
const KKTC_KEY = "x-n-cyprus";

export function countryDisplayName(c: CountrySelection): string {
  return c.key === KKTC_KEY ? KKTC_NAME : c.name;
}

export type CountryCollection = maplibregl.GeoJSONSourceSpecification["data"];

let cached: Promise<CountryCollection> | null = null;

/** Veriyi bir kez indirir; hata olursa önbelleği temizler ki sonraki çağrı yeniden denesin. */
export function loadCountries(): Promise<CountryCollection> {
  if (!cached) {
    cached = fetch(COUNTRIES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`ülke verisi HTTP ${res.status}`);
        return res.json() as Promise<CountryCollection>;
      })
      .catch((error) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}
