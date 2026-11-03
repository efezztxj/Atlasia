// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import BottomPanel from "./BottomPanel";
import MapAttribution from "./MapAttribution";
import { GUIDE_PLACES } from "../data/places";

vi.mock("../hooks/useCollections", () => ({ useCollections: () => ({ savePlace: vi.fn(), isSaved: () => false }) }));
afterEach(cleanup);

it("kaynakları daraltılmış keşif kartının hemen altına yerleştirir", () => {
  render(createElement(BottomPanel, {
    open: false, onToggle: vi.fn(), category: null, onCategory: vi.fn(), current: undefined,
    isActive: false, locationLabel: "Dünya", nearby: 0, total: 0, onShow: vi.fn(), onCycle: vi.fn(),
    canDelete: () => false, onDelete: vi.fn(), onAdd: vi.fn(), shifted: false, onOpenFeed: vi.fn(), accuracy: null, locating: false,
    attribution: createElement(MapAttribution, { baseMap: "dark", showLabels: true, terrainEnabled: false }),
  }));
  const card = screen.getByRole("region", { name: "Daraltılmış keşif önerisi" });
  const credits = screen.getByRole("contentinfo", { name: "Harita kaynakları" });
  expect(card.contains(credits)).toBe(false);
  expect(credits.parentElement?.previousElementSibling).toBe(card);
  expect(screen.getByRole("link", { name: "OpenStreetMap katkıcıları" })).toBeTruthy();
});


it("açık Efes keşfinde kaynaklı kısa tarih bilgisi sunar", () => {
  const efes = GUIDE_PLACES.find((place) => place.id === "efes");
  expect(efes).toBeDefined();
  render(createElement(BottomPanel, {
    open: true, onToggle: vi.fn(), category: null, onCategory: vi.fn(), current: efes,
    isActive: false, locationLabel: "Dünya", nearby: 0, total: 0, onShow: vi.fn(), onCycle: vi.fn(),
    canDelete: () => false, onDelete: vi.fn(), onAdd: vi.fn(), shifted: false, onOpenFeed: vi.fn(), accuracy: null, locating: false,
  }));
  expect(screen.getByText(/Helenistik ve Roma dönemlerinden/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "UNESCO" }).getAttribute("href")).toBe("https://whc.unesco.org/en/list/1018/");
});
