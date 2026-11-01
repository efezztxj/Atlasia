// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePanelStack, type PanelStack } from "./usePanelStack";

/**
 * F1-2 davranış kilidi. Kancaya taşınan 14 panel bayrağının sözleşmesi:
 * varsayılanlar, `closeAllPanels` istisnası ("kapalı panel kaybolmaz") ve
 * `discoverySpace` titreme filtresi.
 */

const PANEL_FLAGS: Array<keyof PanelStack> = [
  "drawerOpen",
  "feedOpen",
  "atlasOpen",
  "recordsOpen",
  "trackRecorderOpen",
  "profileOpen",
  "myPlacesOpen",
  "notificationsOpen",
  "reportsOpen",
  "adminOpen",
  "searchOpen",
  "settingsOpen",
];

afterEach(() => cleanup());

describe("panel yığını — taşınan davranış aynı", () => {
  it("varsayılanlar: masaüstünde alt panel açık, paneller kapalı", () => {
    const { result } = renderHook(() => usePanelStack());

    // jsdom varsayılan genişliği 1024 px → masaüstü kabul edilir.
    expect(result.current.panelOpen).toBe(true);
    expect(result.current.discoverySpace).toBe(0);
    for (const flag of PANEL_FLAGS) expect(result.current[flag]).toBe(false);
  });

  it("closeAllPanels tüm panelleri kapatır ama alt keşif panelini KAPATMAZ", () => {
    const { result } = renderHook(() => usePanelStack());

    act(() => {
      result.current.setDrawerOpen(true);
      result.current.setFeedOpen(true);
      result.current.setAtlasOpen(true);
      result.current.setRecordsOpen(true);
      result.current.setTrackRecorderOpen(true);
      result.current.setProfileOpen(true);
      result.current.setMyPlacesOpen(true);
      result.current.setNotificationsOpen(true);
      result.current.setReportsOpen(true);
      result.current.setAdminOpen(true);
      result.current.setSearchOpen(true);
      result.current.setSettingsOpen(true);
    });

    act(() => result.current.closeAllPanels());

    for (const flag of PANEL_FLAGS) expect(result.current[flag]).toBe(false);
    // Ürün kararı (AGENTS.md): "kapalı panel masaüstünde ve mobilde tamamen kaybolmaz".
    expect(result.current.panelOpen).toBe(true);
  });

  it("discoverySpace 1 px altındaki titremeleri yutar, büyük değişimi uygular", () => {
    const { result } = renderHook(() => usePanelStack());

    act(() => result.current.handleDiscoverySpaceChange(120));
    expect(result.current.discoverySpace).toBe(120);

    act(() => result.current.handleDiscoverySpaceChange(120.4));
    expect(result.current.discoverySpace).toBe(120);

    act(() => result.current.handleDiscoverySpaceChange(96));
    expect(result.current.discoverySpace).toBe(96);

    // Panel kapandığında ham setter sıfırlar (Explorer `dockVisible` efekti).
    act(() => result.current.setDiscoverySpace(0));
    expect(result.current.discoverySpace).toBe(0);
  });
});
