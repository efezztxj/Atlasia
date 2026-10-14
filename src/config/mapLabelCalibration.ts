export type MapLabelTheme = "dark" | "light";
export type MapLabelBaseMap = "satellite" | "dark" | "street" | "topographic";

export interface MapStyleLayer {
  readonly id: string;
  readonly type: string;
  readonly layout?: Readonly<Record<string, unknown>>;
  readonly paint?: Readonly<Record<string, unknown>>;
  readonly minzoom?: number;
  readonly [key: string]: unknown;
}

export interface MapLabelCalibrationOptions {
  theme: MapLabelTheme;
  baseMap: MapLabelBaseMap;
}

export interface MapLabelPaint {
  "text-color": string;
  "text-halo-color": string;
  "text-halo-width": number;
  "text-halo-blur": number;
}

const TURKISH_FIRST_TEXT_FIELD = [
  "coalesce",
  ["get", "name:tr"],
  ["get", "name:latin"],
  ["get", "name_en"],
  ["get", "name"],
] as const;

const PLACE_MIN_ZOOM: Readonly<Record<string, number>> = {
  place_state: 4.5,
  place_town: 5.5,
  place_village: 7,
  place_other: 7.5,
  place_suburb: 10,
};

const COUNTRY_TEXT_SIZE: Readonly<Record<string, readonly unknown[]>> = {
  place_country_other: ["interpolate", ["linear"], ["zoom"], 0, 9, 1, 10],
  place_country_minor: ["interpolate", ["linear"], ["zoom"], 0, 10, 6, 12],
  place_country_major: ["interpolate", ["exponential", 1.4], ["zoom"], 0, 11, 3, 12, 4, 14],
};

// MapLibre symbol collision placement follows style order. Keep the snapshot's
// city rank split, but place broad geography first so countries win over states,
// and states win over cities when labels compete for the same screen space.
const PLACE_COLLISION_ORDER = [
  "place_country_major",
  "place_country_minor",
  "place_country_other",
  "place_state",
  "place_city",
  "place_city_large",
  "place_town",
  "place_village",
  "place_other",
  "place_suburb",
] as const;

const PLACE_COLLISION_PRIORITY: ReadonlyMap<string, number> = new Map(
  PLACE_COLLISION_ORDER.map((id, index) => [id, index]),
);

const LABEL_PALETTES = {
  dark: {
    text: "#d6e7e1",
    water: "#a9dce5",
    halo: "rgba(1, 15, 12, 0.9)",
    regularHaloWidth: 1,
    countryHaloWidth: 1.35,
    haloBlur: 0.25,
  },
  light: {
    text: "#25322f",
    water: "#275f69",
    halo: "rgba(250, 248, 240, 0.94)",
    regularHaloWidth: 1.25,
    countryHaloWidth: 1.5,
    haloBlur: 0.35,
  },
  // TASK-020's satellite overlay contract remains byte-for-value equivalent.
  satellite: {
    text: "#d6e7e1",
    water: "#a9dce5",
    halo: "rgba(1, 15, 12, 0.9)",
    regularHaloWidth: 1.25,
    countryHaloWidth: 1.6,
    haloBlur: 0.35,
  },
} as const;

function isTextSymbolLayer(layer: MapStyleLayer) {
  return layer.type === "symbol" && !layer.id.includes("oneway");
}

function usesLocalizedName(layerId: string) {
  return layerId.startsWith("place_") || layerId === "water_name" || layerId === "highway_name_other";
}

function labelPalette({ theme, baseMap }: MapLabelCalibrationOptions) {
  return baseMap === "satellite" ? LABEL_PALETTES.satellite : LABEL_PALETTES[theme];
}

export function mapLabelPaint(
  layerId: string,
  options: MapLabelCalibrationOptions,
): MapLabelPaint | null {
  if (layerId.includes("oneway")) return null;

  const palette = labelPalette(options);
  const country = layerId.startsWith("place_country");
  return {
    "text-color": layerId === "water_name" ? palette.water : palette.text,
    "text-halo-color": palette.halo,
    "text-halo-width": country ? palette.countryHaloWidth : palette.regularHaloWidth,
    "text-halo-blur": palette.haloBlur,
  };
}

function calibrateLayer(layer: MapStyleLayer, options: MapLabelCalibrationOptions): MapStyleLayer {
  const calibrated: Record<string, unknown> = {
    ...layer,
    layout: { ...(layer.layout ?? {}) },
    paint: { ...(layer.paint ?? {}) },
  };

  const minzoom = PLACE_MIN_ZOOM[layer.id];
  if (minzoom !== undefined) calibrated.minzoom = minzoom;

  if (!isTextSymbolLayer(layer)) return calibrated as MapStyleLayer;

  const layout = calibrated.layout as Record<string, unknown>;
  if (usesLocalizedName(layer.id)) layout["text-field"] = TURKISH_FIRST_TEXT_FIELD;

  if (layer.id.startsWith("place_")) {
    layout["text-allow-overlap"] = false;
    layout["text-ignore-placement"] = false;
  }

  const countryTextSize = COUNTRY_TEXT_SIZE[layer.id];
  if (countryTextSize) layout["text-size"] = countryTextSize;

  calibrated.paint = {
    ...(calibrated.paint as Record<string, unknown>),
    ...mapLabelPaint(layer.id, options),
  };
  return calibrated as MapStyleLayer;
}

function prioritizePlaceLabels(layers: MapStyleLayer[]) {
  const sortedPlaceLayers = layers
    .filter((layer) => PLACE_COLLISION_PRIORITY.has(layer.id))
    .sort(
      (left, right) =>
        (PLACE_COLLISION_PRIORITY.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (PLACE_COLLISION_PRIORITY.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );

  if (!sortedPlaceLayers.length) return layers;

  const result: MapStyleLayer[] = [];
  let inserted = false;
  for (const layer of layers) {
    if (!PLACE_COLLISION_PRIORITY.has(layer.id)) {
      result.push(layer);
      continue;
    }
    if (!inserted) {
      result.push(...sortedPlaceLayers);
      inserted = true;
    }
  }
  return result;
}

/**
 * Derive calibrated label layers without mutating the pinned OpenFreeMap JSON.
 * All tile/source/filter data remains inherited from the verified snapshot.
 */
export function calibrateMapLabelLayers(
  layers: readonly MapStyleLayer[],
  options: MapLabelCalibrationOptions,
): MapStyleLayer[] {
  return prioritizePlaceLabels(layers.map((layer) => calibrateLayer(layer, options)));
}
