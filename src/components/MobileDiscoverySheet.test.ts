// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Place } from "../types";
import MobileDiscoverySheet from "./MobileDiscoverySheet";

const savePlace = vi.fn();
vi.mock("../hooks/useCollections", () => ({
  useCollections: () => ({ savePlace, isSaved: () => false }),
}));



afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const place: Place = {
  id: "p1",
  title: "Efes Antik Kenti",
  note: "Mermer sokaklar ve Celsus kütüphanesi.",
  lng: 27.34,
  lat: 37.94,
  category: "history",
  region: "Selçuk, İzmir",
  author: "Atlasia rehberi",
  kind: "guide",
} as Place;

function makeProps() {
  return {
    open: true,
    onToggle: vi.fn(),
    category: null,
    onCategory: vi.fn(),
    current: place,
    isActive: false,
    total: 28,
    onShow: vi.fn(),
    onCycle: vi.fn(),
    canDelete: () => false,
    onDelete: vi.fn(),
    onAdd: vi.fn(),
    locationLabel: "İzmir",
    nearby: 3,
  };
}

describe("MobileDiscoverySheet", () => {
  it("kapalıyken ince (peek) kart gösterir, kategori ızgarasını açmaz", () => {
    render(createElement(MobileDiscoverySheet, { ...makeProps(), open: false }));

    expect(screen.getByText("Bir sonraki güzel tesadüfün")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Tarih/ })).toBeNull();
    expect(screen.getByText(/28 iz/)).toBeTruthy();
  });

  it("kapalı kart dokunulunca açılma isteği gönderir", () => {
    const props = { ...makeProps(), open: false };
    render(createElement(MobileDiscoverySheet, props));

    const handle = screen.getByRole("button", { name: "Keşif panelini aç" });
    fireEvent.pointerDown(handle, { clientY: 400, pointerType: "touch" });
    fireEvent.pointerUp(handle, { clientY: 400, pointerType: "touch" });

    expect(props.onToggle).toHaveBeenCalledOnce();
  });

  it("açıkken kategori ve yer kartını gösterir, eylemleri bağlar", () => {
    const props = makeProps();
    render(createElement(MobileDiscoverySheet, props));

    expect(screen.getByRole("button", { name: /Tarih/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Tarih/ }));
    expect(props.onCategory).toHaveBeenCalledWith("history");

    fireEvent.click(screen.getByRole("button", { name: /Haritada gör/ }));
    expect(props.onShow).toHaveBeenCalledWith(place);

    fireEvent.click(screen.getByRole("button", { name: "Yeri kaydet" }));
    expect(savePlace).toHaveBeenCalledWith(place);

    fireEvent.click(screen.getByRole("button", { name: "Sonraki keşif yerini göster" }));
    expect(props.onCycle).toHaveBeenCalledWith(1);
  });

  it("klavye ile kademe değiştirir (erişilebilir sürükleme alternatifi)", () => {
    const props = makeProps();
    render(createElement(MobileDiscoverySheet, props));

    fireEvent.keyDown(screen.getByRole("button", { name: /Keşif panelini/ }), { key: "ArrowDown" });
    expect(props.onToggle).toHaveBeenCalledOnce();
  });
});
