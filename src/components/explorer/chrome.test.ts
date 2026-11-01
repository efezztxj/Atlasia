// @vitest-environment jsdom
/**
 * F1-6 (adım 1) sözleşmesi — `Explorer`'dan çıkarılan krom parçaları.
 *
 * Bu parçalar iş mantığı taşımaz; kilitlenmesi gereken şey **ürün kararları**:
 * sekme sırası/etiketleri, "Tam konumum" düğmesinin konum yokken ayarlara
 * gitmesi, hata şeridinin iki ayrı geri çağrısı ve atıf metni.
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataErrorBanner, AddModeBanner, ToastBanner, MobileSearchSheet } from "./OverlayPanels";
import { MobileTabBar, WalkFab } from "./DockChrome";
import { MapSurfaceHints } from "./MapCanvas";

afterEach(() => cleanup());

describe("DataErrorBanner", () => {
  it("iki düğme iki ayrı geri çağrıyı tetikler", () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(createElement(DataErrorBanner, { onRetry, onDismiss }));

    expect(screen.getByRole("alert").textContent).toContain("Canlı veriler yüklenemedi");
    fireEvent.click(screen.getByText("Yeniden dene"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText("Canlı veri uyarısını kapat"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("AddModeBanner", () => {
  it("'Tam konumum' ve 'İptal' ayrı geri çağrılara gider", () => {
    const onUseHere = vi.fn();
    const onCancel = vi.fn();
    render(createElement(AddModeBanner, { onUseHere, onCancel }));

    expect(screen.getByText("Keşfini bırakmak istediğin noktaya dokun")).toBeTruthy();
    fireEvent.click(screen.getByText("Tam konumum"));
    expect(onUseHere).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("İptal"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("ToastBanner", () => {
  it("mesajı duyurur (role=status)", () => {
    render(createElement(ToastBanner, { toast: "İz kaydedildi" }));
    expect(screen.getByRole("status").textContent).toBe("İz kaydedildi");
  });
});

describe("MobileSearchSheet", () => {
  it("kapat düğmesi geri çağrıyı tetikler", () => {
    const onClose = vi.fn();
    render(createElement(MobileSearchSheet, { places: [], onPick: vi.fn(), onClose, onOpenFilters: vi.fn() }));
    // Sayfada SearchBox'ın kendi temizleme düğmesi de olabilir; ilk eşleşme
    // karartma katmanıdır (sheet'in arkasındaki tam ekran düğme).
    const closers = screen.getAllByLabelText("Aramayı kapat");
    fireEvent.click(closers[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("MobileTabBar", () => {
  const props = () => ({
    mobileTab: "Keşfet",
    addMode: false,
    onExplore: vi.fn(),
    onCommunity: vi.fn(),
    onAdd: vi.fn(),
    onProfile: vi.fn(),
    onMyPlaces: vi.fn(),
  });

  it("sekme sırası ürün kararıyla sabit: Keşfet · Topluluk · (+) · Profil · İzlerim", () => {
    render(createElement(MobileTabBar, props()));
    const labels = screen.getAllByRole("button")
      .map((node) => node.textContent?.trim() || node.getAttribute("aria-label") || "");
    expect(labels).toEqual(["Keşfet", "Topluluk", "Haritaya yeni keşif ekle", "Profil", "İzlerim"]);
  });

  it("etkin sekme aria-current=page ile işaretlenir, diğerleri işaretsiz", () => {
    render(createElement(MobileTabBar, props()));
    const current = screen.getAllByRole("button").filter((node) => node.getAttribute("aria-current") === "page");
    expect(current.map((node) => node.textContent?.trim())).toEqual(["Keşfet"]);
  });

  it("ekleme modunda ortadaki düğme 'çık' anlamına döner", () => {
    render(createElement(MobileTabBar, { ...props(), addMode: true }));
    const add = screen.getByLabelText("Ekleme modundan çık");
    expect(add.getAttribute("aria-pressed")).toBe("true");
  });

  it("her sekme kendi geri çağrısını çağırır", () => {
    const p = props();
    render(createElement(MobileTabBar, p));
    fireEvent.click(screen.getByText("Topluluk"));
    fireEvent.click(screen.getByLabelText("Haritaya yeni keşif ekle"));
    fireEvent.click(screen.getByText("Profil"));
    fireEvent.click(screen.getByText("İzlerim"));
    expect(p.onCommunity).toHaveBeenCalledTimes(1);
    expect(p.onAdd).toHaveBeenCalledTimes(1);
    expect(p.onProfile).toHaveBeenCalledTimes(1);
    expect(p.onMyPlaces).toHaveBeenCalledTimes(1);
    expect(p.onExplore).not.toHaveBeenCalled();
  });
});

describe("WalkFab", () => {
  it("panel açıkken telefonda gizlenir", () => {
    const { rerender } = render(createElement(WalkFab, { panelOpen: false, onClick: vi.fn() }));
    expect(screen.getByLabelText("Yürüyüş kaydını aç").className).not.toContain("max-md:hidden");
    rerender(createElement(WalkFab, { panelOpen: true, onClick: vi.fn() }));
    expect(screen.getByLabelText("Yürüyüş kaydını aç").className).toContain("max-md:hidden");
  });
});

describe("MapSurfaceHints", () => {
  it("atıf satırı lisans sahiplerini adıyla anar", () => {
    render(createElement(MapSurfaceHints, { precise: null, onClearLocation: vi.fn() }));
    const attribution = screen.getByRole("contentinfo").textContent ?? "";
    for (const owner of ["Esri", "OpenFreeMap", "OpenMapTiles", "OpenStreetMap", "AWS Terrain Tiles"]) {
      expect(attribution).toContain(owner);
    }
  });

  it("konum yoksa temizleme düğmesi çizilmez, varsa çizilir", () => {
    const onClearLocation = vi.fn();
    const { rerender } = render(createElement(MapSurfaceHints, { precise: null, onClearLocation }));
    expect(screen.queryByTitle("Konum işaretini kaldır")).toBeNull();

    rerender(createElement(MapSurfaceHints, {
      precise: { label: "Kordon", lng: 27.1, lat: 38.4, accuracy: 12 },
      onClearLocation,
    }));
    const button = screen.getByTitle("Konum işaretini kaldır");
    expect(button.textContent).toContain("Kordon");
    fireEvent.click(button);
    expect(onClearLocation).toHaveBeenCalledTimes(1);
  });
});
