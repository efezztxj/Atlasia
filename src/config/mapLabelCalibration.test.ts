import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import openFreeMapDarkStyle from "../data/openFreeMapDarkStyle.json";
import {
  calibrateMapLabelLayers,
  mapLabelPaint,
  type MapStyleLayer,
} from "./mapLabelCalibration";

const stylePath = fileURLToPath(new URL("../data/openFreeMapDarkStyle.json", import.meta.url));
const mapViewPath = fileURLToPath(new URL("../components/MapView.tsx", import.meta.url));
const appPath = fileURLToPath(new URL("../components/Explorer.tsx", import.meta.url));
const styleBytes = readFileSync(stylePath);
const snapshotLayers = openFreeMapDarkStyle.layers as unknown as readonly MapStyleLayer[];

function calibrated(theme: "dark" | "light", baseMap: "dark" | "satellite" = "dark") {
  return calibrateMapLabelLayers(snapshotLayers, { theme, baseMap });
}

function byId(layers: readonly MapStyleLayer[], id: string) {
  const layer = layers.find((candidate) => candidate.id === id);
  expect(layer, `${id} layer should exist`).toBeDefined();
  return layer!;
}

function layout(layer: MapStyleLayer) {
  return layer.layout as Record<string, unknown>;
}

describe("map label calibration", () => {
  it("keeps the pinned snapshot byte-identical while deriving fresh layer objects", () => {
    const before = JSON.stringify(snapshotLayers);
    const result = calibrated("dark");

    expect(createHash("sha256").update(styleBytes).digest("hex")).toBe(
      "4ba4a1990dc5e1b72b38483dfbb92ffdd945bcc13e9f1235466dae900bc51631",
    );
    expect(JSON.stringify(snapshotLayers)).toBe(before);
    expect(result).not.toBe(snapshotLayers);
    expect(byId(result, "place_state")).not.toBe(byId(snapshotLayers, "place_state"));
  });

  it("applies the zoom budget without flattening the existing city rank hierarchy", () => {
    const result = calibrated("dark");

    expect(byId(result, "place_state").minzoom).toBe(4.5);
    expect(byId(result, "place_town").minzoom).toBe(5.5);
    expect(byId(result, "place_village").minzoom).toBe(7);
    expect(byId(result, "place_other").minzoom).toBe(7.5);
    expect(byId(result, "place_suburb").minzoom).toBe(10);

    for (const id of ["place_city", "place_city_large"] as const) {
      const source = byId(snapshotLayers, id);
      const layer = byId(result, id);
      expect(layer.minzoom).toBeUndefined();
      expect(layer.maxzoom).toEqual(source.maxzoom);
      expect(layer.filter).toEqual(source.filter);
    }
    expect(layout(byId(result, "place_city"))["text-size"]).toBe(10);
    expect(layout(byId(result, "place_city_large"))["text-size"]).toBe(14);
  });

  it("sets restrained country sizes, Turkish-first names, and collision priority", () => {
    const result = calibrated("dark");

    expect(layout(byId(result, "place_country_other"))["text-size"]).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      9,
      1,
      10,
    ]);
    expect(layout(byId(result, "place_country_minor"))["text-size"]).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      10,
      6,
      12,
    ]);
    expect(layout(byId(result, "place_country_major"))["text-size"]).toEqual([
      "interpolate",
      ["exponential", 1.4],
      ["zoom"],
      0,
      11,
      3,
      12,
      4,
      14,
    ]);

    expect(layout(byId(result, "place_country_major"))["text-field"]).toEqual([
      "coalesce",
      ["get", "name:tr"],
      ["get", "name:latin"],
      ["get", "name_en"],
      ["get", "name"],
    ]);

    const ids = result.map((layer) => layer.id);
    expect(ids).toHaveLength(snapshotLayers.length);
    expect(new Set(ids)).toEqual(new Set(snapshotLayers.map((layer) => layer.id)));
    expect(ids.indexOf("place_country_major")).toBeLessThan(ids.indexOf("place_state"));
    expect(ids.indexOf("place_state")).toBeLessThan(ids.indexOf("place_city"));
    expect(ids.indexOf("place_city")).toBeLessThan(ids.indexOf("place_city_large"));

    for (const id of ["place_country_major", "place_state", "place_city_large", "place_city"]) {
      expect(layout(byId(result, id))["text-allow-overlap"]).toBe(false);
      expect(layout(byId(result, id))["text-ignore-placement"]).toBe(false);
    }
  });

  it("uses theme-aware vector contrast while preserving the satellite overlay contract", () => {
    expect(mapLabelPaint("place_city", { theme: "dark", baseMap: "dark" })).toEqual({
      "text-color": "#d6e7e1",
      "text-halo-color": "rgba(1, 15, 12, 0.9)",
      "text-halo-width": 1,
      "text-halo-blur": 0.25,
    });
    expect(mapLabelPaint("place_city", { theme: "light", baseMap: "dark" })).toEqual({
      "text-color": "#25322f",
      "text-halo-color": "rgba(250, 248, 240, 0.94)",
      "text-halo-width": 1.25,
      "text-halo-blur": 0.35,
    });
    expect(mapLabelPaint("place_city", { theme: "midnight", baseMap: "dark" })).toEqual({
      "text-color": "#f3ead3",
      "text-halo-color": "rgba(3, 14, 26, 0.92)",
      "text-halo-width": 1.1,
      "text-halo-blur": 0.3,
    });

    const satelliteDark = mapLabelPaint("place_country_major", {
      theme: "dark",
      baseMap: "satellite",
    });
    const satelliteLight = mapLabelPaint("place_country_major", {
      theme: "light",
      baseMap: "satellite",
    });
    expect(satelliteLight).toEqual(satelliteDark);
    expect(satelliteDark).toEqual({
      "text-color": "#d6e7e1",
      "text-halo-color": "rgba(1, 15, 12, 0.9)",
      "text-halo-width": 1.6,
      "text-halo-blur": 0.35,
    });
    expect(mapLabelPaint("road_oneway", { theme: "light", baseMap: "dark" })).toBeNull();
  });

  it("wires live theme changes through App and MapView without reloading the style", () => {
    const appSource = readFileSync(appPath, "utf8");
    const mapViewSource = readFileSync(mapViewPath, "utf8");

    expect(appSource).toContain("theme={theme}");
    expect(mapViewSource).toContain("calibrateMapLabelLayers");
    expect(mapViewSource).toContain("mapLabelPaint");
    expect(mapViewSource).toContain("[baseMap, showLabels, ready, theme]");
    expect(mapViewSource).not.toContain("setStyle(buildStyle");
  });
});
