// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Drawer from "./Drawer";

afterEach(cleanup);

it("keşif menüsünden harita ve görünüm ayarlarını kaldırır", () => {
  render(createElement(Drawer, {
    open: true, onClose: vi.fn(), places: [], category: null, onCategory: vi.fn(), onPick: vi.fn(),
    isMine: () => false, onAdd: vi.fn(), onRecords: vi.fn(),
  }));
  expect(screen.getByRole("button", { name: /Kayıtlarım/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Konum" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Yer adları" })).toBeNull();
  expect(screen.queryByRole("button", { name: "3B arazi" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Görünüm ve tema ayarları/ })).toBeNull();
});

it("menü açıkken harita kaynak bağlantısını menüde tutar", () => {
  render(createElement(Drawer, {
    open: true, onClose: vi.fn(), places: [], category: null, onCategory: vi.fn(), onPick: vi.fn(),
    isMine: () => false, onAdd: vi.fn(), onRecords: vi.fn(),
    attribution: createElement("a", { href: "https://www.openstreetmap.org/copyright" }, "Harita kaynakları"),
  }));
  const credit = screen.getByRole("link", { name: "Harita kaynakları" });
  expect(credit.closest("aside")).toBeTruthy();
  expect(credit.getAttribute("href")).toBe("https://www.openstreetmap.org/copyright");
});
