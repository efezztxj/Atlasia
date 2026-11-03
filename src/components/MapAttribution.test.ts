// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MapAttribution from "./MapAttribution";

afterEach(cleanup);

describe("Harita kaynak atıfları", () => {
  it("OpenFreeMap karanlık katmanında OSM ve OpenMapTiles bağlantılarını gösterir", () => {
    render(createElement(MapAttribution, { baseMap: "dark", showLabels: false, terrainEnabled: false }));
    expect(screen.getByRole("link", { name: "OpenStreetMap katkıcıları" }).getAttribute("href")).toBe("https://www.openstreetmap.org/copyright");
    expect(screen.getByRole("link", { name: "OpenMapTiles" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Esri" })).toBeNull();
    expect(screen.getByRole("contentinfo", { name: "Harita kaynakları" }).className).not.toContain("absolute");
  });
  it("uydu ve açık etiketlerde her iki kaynağı gösterir", () => {
    render(createElement(MapAttribution, { baseMap: "satellite", showLabels: true, terrainEnabled: true }));
    expect(screen.getByRole("link", { name: "Esri" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "OpenStreetMap katkıcıları" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "AWS Terrain Tiles" })).toBeTruthy();
  });
  it("sokak katmanında kullanılmayan OpenFreeMap atfını eklemez", () => {
    render(createElement(MapAttribution, { baseMap: "street", showLabels: true, terrainEnabled: false }));
    expect(screen.getByRole("link", { name: "Esri" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "OpenFreeMap" })).toBeNull();
  });
});
