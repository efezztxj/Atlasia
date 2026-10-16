import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface OpenFreeMapStyle {
  version: number;
  glyphs: string;
  sprite: string;
  sources: Record<string, unknown>;
  layers: Array<{ id: string; type: string }>;
}

const sourcePath = fileURLToPath(new URL("../components/MapView.tsx", import.meta.url));
const appPath = fileURLToPath(new URL("../App.tsx", import.meta.url));
const stylePath = fileURLToPath(new URL("../data/openFreeMapDarkStyle.json", import.meta.url));
const headersPath = fileURLToPath(new URL("../../public/_headers", import.meta.url));

const mapSource = readFileSync(sourcePath, "utf8");
const appSource = readFileSync(appPath, "utf8");
const styleBytes = readFileSync(stylePath);
const style = JSON.parse(styleBytes.toString("utf8")) as OpenFreeMapStyle;
const headers = readFileSync(headersPath, "utf8");
const serializedStyle = JSON.stringify(style);

describe("keyless dark map source", () => {
  it("pins the verified OpenFreeMap dark style snapshot without credentials", () => {
    expect(createHash("sha256").update(styleBytes).digest("hex")).toBe(
      "4ba4a1990dc5e1b72b38483dfbb92ffdd945bcc13e9f1235466dae900bc51631",
    );
    expect(style.version).toBe(8);
    expect(Object.keys(style.sources).sort()).toEqual(["ne2_shaded", "openmaptiles"]);
    expect(style.layers).toHaveLength(47);
    expect(new Set(style.layers.map((layer) => layer.id)).size).toBe(style.layers.length);
    expect(style.glyphs).toBe("https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf");
    expect(style.sprite).toBe("https://tiles.openfreemap.org/sprites/ofm_f384/ofm");
    expect(serializedStyle).toContain("https://tiles.openfreemap.org/planet");
    expect(serializedStyle).not.toMatch(/(?:api[_-]?key|access[_-]?token|[?&](?:key|token)=)/i);
  });

  it("removes the watermarked CARTO raster while retaining MapLibre's same-origin worker", () => {
    expect(mapSource).not.toContain("cartocdn.com");
    expect(mapSource).not.toContain("dark_nolabels");
    expect(mapSource).toContain('import openFreeMapDarkStyle from "../data/openFreeMapDarkStyle.json"');
    expect(mapSource).toContain("maplibregl.setWorkerUrl(maplibreWorkerUrl)");
    expect(mapSource).toContain('const OPEN_FREE_MAP_LAYER_PREFIX = "openfreemap-dark-"');
  });

  it("keeps label switching explicit for dark and satellite without changing the other basemaps", () => {
    expect(mapSource).toContain('return labels && (baseMap === "dark" || baseMap === "satellite")');
    expect(mapSource).toContain('for (const layer of ["satellite", "street", "topographic"] as const)');
    expect(mapSource).toContain('export type BaseMapStyle = "satellite" | "dark" | "street" | "topographic"');
  });

  it("shows the required attribution and narrows CSP to the new tile origin", () => {
    expect(mapSource).toContain("OpenFreeMap © OpenMapTiles · OpenStreetMap contributors");
    expect(appSource).toContain("Harita © Esri, OpenFreeMap, OpenMapTiles ve OpenStreetMap katkıcıları");
    expect(appSource).not.toContain("Esri, CARTO");
    expect(headers).toContain("https://tiles.openfreemap.org");
    expect(headers).not.toContain("cartocdn.com");
    expect(headers).not.toContain("demotiles.maplibre.org");
  });
});
