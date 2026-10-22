// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapControls from "./MapControls";

afterEach(cleanup);

function makeProps() {
  return {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onReset: vi.fn(),
    onLocate: vi.fn(),
    onToggleLabels: vi.fn(),
    onToggleTerrain: vi.fn(),
    labels: true,
    terrain: false,
  };
}

describe("MapControls", () => {
  it("mobil katman menüsü kapalıyken ayar satırlarını göstermez", () => {
    render(createElement(MapControls, makeProps()));

    expect(screen.queryByRole("switch", { name: /Yer adları/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Katmanlar" }).length).toBe(1);
  });

  it("katman menüsünü açar, anahtarları doğru işleyicilere bağlar", () => {
    const props = makeProps();
    render(createElement(MapControls, props));

    fireEvent.click(screen.getByRole("button", { name: "Katmanlar" }));

    const labels = screen.getByRole("switch", { name: /Yer adları/ });
    expect(labels.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(labels);
    expect(props.onToggleLabels).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("switch", { name: /3B arazi/ }));
    expect(props.onToggleTerrain).toHaveBeenCalledOnce();
  });

  it("Escape katman menüsünü kapatır", () => {
    render(createElement(MapControls, makeProps()));

    fireEvent.click(screen.getByRole("button", { name: "Katmanlar" }));
    expect(screen.getByRole("switch", { name: /Yer adları/ })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("switch", { name: /Yer adları/ })).toBeNull();
  });

  it("menüdeki sıfırlama harita görünümünü sıfırlar ve menüyü kapatır", () => {
    const props = makeProps();
    render(createElement(MapControls, props));

    fireEvent.click(screen.getByRole("button", { name: "Katmanlar" }));
    // Masaüstü sütununda da aynı adlı düğme var; menüdekini (sonuncu) seç.
    const resets = screen.getAllByRole("button", { name: /Görünümü sıfırla/ });
    fireEvent.click(resets[resets.length - 1]);

    expect(props.onReset).toHaveBeenCalledOnce();
    expect(screen.queryByRole("switch", { name: /Yer adları/ })).toBeNull();
  });
});
