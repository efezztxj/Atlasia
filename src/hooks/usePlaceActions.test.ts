// @vitest-environment jsdom
/**
 * F2-1b davranış kilidi — yer gezinme ve yer CRUD.
 *
 * Kilitlenen sözler: seçim yan panelleri kapatır, döngü listede sarar, arama
 * "yer değil" sonucunda yalnız haritayı konumlandırır, misafir kayda çağrılır,
 * silme onaysız çalışmaz ve hata Türkçe mesajla `false` döner.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaceCrud, usePlaceNavigation } from "./usePlaceActions";
import type { Place, ViewState } from "../types";

const mocks = vi.hoisted(() => ({
  requestConfirm: vi.fn(),
  placeCreated: vi.fn(),
  placeDeleteErrorMessage: vi.fn(),
}));
vi.mock("../components/ConfirmDialog", () => ({ requestConfirm: mocks.requestConfirm }));
vi.mock("../lib/analytics", () => ({ analytics: { placeCreated: mocks.placeCreated } }));
vi.mock("../lib/firestoreValue", () => ({ placeDeleteErrorMessage: mocks.placeDeleteErrorMessage }));

const place = (over: Partial<Place> = {}): Place => ({
  id: "p1", title: "Kordon", region: "İzmir", category: "sahil",
  lng: 27.1, lat: 38.4, note: "gün batımı", author: "Efe", kind: "user",
  ...over,
} as Place);

/** Testte her setter ayrı sayılabilsin diye spy üretiyoruz. */
const spySetters = () => ({
  setActiveId: vi.fn(),
  setSpin: vi.fn(),
  setHeroCompact: vi.fn(),
  setLocationLabel: vi.fn(),
  setPanelOpen: vi.fn(),
  setStoryPlace: vi.fn(),
  setStreetPlace: vi.fn(),
  setAtlasOpen: vi.fn(),
  setDrawerOpen: vi.fn(),
  setFeedOpen: vi.fn(),
  setRecordsOpen: vi.fn(),
  setCategory: vi.fn(),
  setFeaturedIdx: vi.fn(),
  setToast: vi.fn(),
  setAddMode: vi.fn(),
  setDraft: vi.fn(),
});

const mapHandle = () => ({
  flyTo: vi.fn(), fitBox: vi.fn(), reset: vi.fn(), showMe: vi.fn(),
  clearMe: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), pulseAt: vi.fn(),
  fitCoords: vi.fn(), drawRoute: vi.fn(), clearRoute: vi.fn(),
});

const navSetup = (allPlaces: Place[], visiblePlaces: Place[], current: Place | null = null) => {
  const s = spySetters();
  const map = mapHandle();
  const mapRef = { current: map } as never;
  const { result } = renderHook(() => usePlaceNavigation({
    allPlaces, visiblePlaces, current, mapRef,
    setActiveId: s.setActiveId, setSpin: s.setSpin, setHeroCompact: s.setHeroCompact,
    setLocationLabel: s.setLocationLabel, setPanelOpen: s.setPanelOpen,
    setStoryPlace: s.setStoryPlace, setStreetPlace: s.setStreetPlace,
    setAtlasOpen: s.setAtlasOpen, setDrawerOpen: s.setDrawerOpen, setFeedOpen: s.setFeedOpen,
    setRecordsOpen: s.setRecordsOpen, setCategory: s.setCategory, setFeaturedIdx: s.setFeaturedIdx,
  }));
  return { result, s, map };
};

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.requestConfirm.mockResolvedValue(true);
  mocks.placeDeleteErrorMessage.mockReturnValue("İzin silinemedi.");
});

describe("usePlaceNavigation", () => {
  it("focusPlace: seçer, döndürmeyi durdurur, etiketi bölgeye çeker ve uçar", () => {
    const { result, s, map } = navSetup([], []);
    result.current.focusPlace(place(), 12);
    expect(s.setActiveId).toHaveBeenCalledWith("p1");
    expect(s.setSpin).toHaveBeenCalledWith(false);
    expect(s.setLocationLabel).toHaveBeenCalledWith("İzmir");
    expect(map.flyTo).toHaveBeenCalledWith(27.1, 38.4, 12);
  });

  it("handleSelect: bilinmeyen kimlik hiçbir şeyi değiştirmez", () => {
    const { result, s } = navSetup([place()], [place()]);
    result.current.handleSelect("yok");
    expect(s.setPanelOpen).not.toHaveBeenCalled();
    expect(s.setStoryPlace).not.toHaveBeenCalled();
  });

  it("handleSelect: bulunca panel açılır, yan paneller kapanır", () => {
    const { result, s } = navSetup([place()], [place()]);
    result.current.handleSelect("p1");
    expect(s.setPanelOpen).toHaveBeenCalledWith(true);
    expect(s.setStoryPlace).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }));
    expect(s.setStreetPlace).toHaveBeenCalledWith(null);
    expect(s.setAtlasOpen).toHaveBeenCalledWith(false);
    expect(s.setDrawerOpen).toHaveBeenCalledWith(false);
    expect(s.setFeedOpen).toHaveBeenCalledWith(false);
    expect(s.setRecordsOpen).toHaveBeenCalledWith(false);
  });

  it("handleCategory: kategori + seçim sıfırlama + şerit başa", () => {
    const { result, s } = navSetup([], []);
    result.current.handleCategory("kafe" as never);
    expect(s.setCategory).toHaveBeenCalledWith("kafe");
    expect(s.setActiveId).toHaveBeenCalledWith(null);
    expect(s.setFeaturedIdx).toHaveBeenCalledWith(0);
  });

  it("handleCycle: boş listede hiçbir şey yapmaz, dolu listede sarar", () => {
    const empty = navSetup([], []);
    empty.result.current.handleCycle(1);
    expect(empty.s.setFeaturedIdx).not.toHaveBeenCalled();

    const list = [place({ id: "a" }), place({ id: "b" }), place({ id: "c" })];
    const { result, s } = navSetup(list, list, list[2]);
    result.current.handleCycle(1);           // son → başa
    expect(s.setFeaturedIdx).toHaveBeenLastCalledWith(0);
    result.current.handleCycle(-1);          // son → bir önceki
    expect(s.setFeaturedIdx).toHaveBeenLastCalledWith(1);
  });

  it("handleSearchPick: yer sonucu panel açar, bbox sonucu haritayı sığdırır", () => {
    const { result, s, map } = navSetup([], []);
    result.current.handleSearchPick({ place: place(), label: "Kordon", lng: 27, lat: 38 } as never);
    expect(s.setPanelOpen).toHaveBeenCalledWith(true);
    expect(s.setCategory).toHaveBeenCalledWith(null);

    map.flyTo.mockClear();
    result.current.handleSearchPick({ label: "İzmir", lng: 27, lat: 38, bbox: [26, 37, 28, 39] } as never);
    expect(map.fitBox).toHaveBeenCalledWith([26, 37, 28, 39]);
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(s.setLocationLabel).toHaveBeenCalledWith("İzmir");
  });

  it("handleReset: dünya görünümüne döner", () => {
    const { result, s, map } = navSetup([], []);
    result.current.handleReset();
    expect(s.setSpin).toHaveBeenCalledWith(true);
    expect(s.setHeroCompact).toHaveBeenCalledWith(false);
    expect(s.setLocationLabel).toHaveBeenCalledWith("Dünya");
    expect(map.reset).toHaveBeenCalled();
  });

  it("handleFeedGoTo: uçar ve dar ekranda akışı kapatır", () => {
    const { result, s, map } = navSetup([], []);
    const original = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 500, configurable: true });
    result.current.handleFeedGoTo(27, 38, "Kordon");
    expect(map.flyTo).toHaveBeenCalledWith(27, 38, 9);
    expect(s.setFeedOpen).toHaveBeenCalledWith(false);
    Object.defineProperty(window, "innerWidth", { value: original, configurable: true });
  });
});

const crudSetup = (over: Record<string, unknown> = {}) => {
  const s = spySetters();
  const addPlace = vi.fn().mockResolvedValue(place({ id: "new" }));
  const removePlace = vi.fn().mockResolvedValue(undefined);
  const focusPlace = vi.fn();
  const askAccount = vi.fn();
  const closePanels = vi.fn();
  const canManagePlace = vi.fn().mockReturnValue(true);
  const view = { zoom: 3, lng: 0, lat: 0 } as ViewState;
  const args = {
    draft: { lng: 27, lat: 38 }, setDraft: s.setDraft, activeId: "p1", guest: false, cloudAccount: true,
    view, addPlace, removePlace, canManagePlace, askAccount, closePanels, focusPlace, setToast: s.setToast,
    setAddMode: s.setAddMode, setActiveId: s.setActiveId, setCategory: s.setCategory,
    setFeaturedIdx: s.setFeaturedIdx, setPanelOpen: s.setPanelOpen, setDrawerOpen: s.setDrawerOpen,
    setStoryPlace: s.setStoryPlace, setStreetPlace: s.setStreetPlace, setSpin: s.setSpin,
    ...over,
  };
  const { result } = renderHook(() => usePlaceCrud(args as never));
  return { result, s, addPlace, removePlace, focusPlace, askAccount, closePanels, canManagePlace };
};

describe("usePlaceCrud", () => {
  it("startAdd: misafiri kayda çağırır, moda girmez", () => {
    const { result, s, askAccount } = crudSetup({ guest: true });
    result.current.startAdd();
    expect(askAccount).toHaveBeenCalledWith(expect.stringContaining("İz eklemek için"), "place");
    expect(s.setAddMode).not.toHaveBeenCalled();
  });

  it("startAdd: üyede panelleri kapatır, döndürmeyi durdurur, modu açar", () => {
    const { result, s, closePanels } = crudSetup();
    result.current.startAdd();
    expect(closePanels).toHaveBeenCalled();
    expect(s.setSpin).toHaveBeenCalledWith(false);
    expect(s.setDrawerOpen).toHaveBeenCalledWith(false);
    expect(s.setAddMode).toHaveBeenCalledWith(true);
  });

  it("handleMapClick: modu kapatır, taslağı yazar", () => {
    const { result, s } = crudSetup();
    result.current.handleMapClick(27.5, 38.5);
    expect(s.setAddMode).toHaveBeenCalledWith(false);
    expect(s.setDraft).toHaveBeenCalledWith({ lng: 27.5, lat: 38.5 });
  });

  it("handleSave: taslak yoksa sessizce döner", async () => {
    const { result, addPlace } = crudSetup({ draft: null });
    await result.current.handleSave({ title: "x", category: "kafe" as never, note: "", author: "", region: "İzmir" });
    expect(addPlace).not.toHaveBeenCalled();
  });

  it("handleSave: misafiri kayda çağırır", async () => {
    const { result, addPlace, askAccount } = crudSetup({ guest: true });
    await result.current.handleSave({ title: "x", category: "kafe" as never, note: "", author: "", region: "İzmir" });
    expect(askAccount).toHaveBeenCalledWith(expect.stringContaining("İz kaydetmek için"));
    expect(addPlace).not.toHaveBeenCalled();
  });

  it("handleSave: boş not/yazar için varsayılan metinleri koyar ve kaydı açar", async () => {
    const { result, addPlace, focusPlace, s } = crudSetup();
    await result.current.handleSave({ title: "Yeni iz", category: "kafe" as never, note: "", author: "", region: "İzmir" });

    expect(addPlace).toHaveBeenCalledWith(expect.objectContaining({
      title: "Yeni iz",
      lng: 27, lat: 38,
      note: "Bu keşif için henüz bir ipucu bırakılmadı.",
      author: "Gezgin",
    }));
    expect(s.setDraft).toHaveBeenCalledWith(null);
    expect(s.setPanelOpen).toHaveBeenCalledWith(true);
    // zoom 3 < 8 → 8'e yükseltilir
    expect(focusPlace).toHaveBeenCalledWith(expect.objectContaining({ id: "new" }), 8);
    expect(mocks.placeCreated).toHaveBeenCalledWith({ account: "cloud", category: "kafe", hasPhoto: false });
    expect(s.setToast).toHaveBeenCalledWith("İzin Atlasia haritasına eklendi.");
  });

  it("handleDelete: yönetilemeyen iz reddedilir", async () => {
    const { result, s, removePlace, canManagePlace } = crudSetup();
    canManagePlace.mockReturnValue(false);
    await expect(result.current.handleDelete(place())).resolves.toBe(false);
    expect(removePlace).not.toHaveBeenCalled();
    expect(s.setToast).toHaveBeenCalledWith("Yalnızca kendi izlerini silebilirsin.");
  });

  it("handleDelete: onay yoksa silmez", async () => {
    const { result, removePlace } = crudSetup();
    mocks.requestConfirm.mockResolvedValue(false);
    await expect(result.current.handleDelete(place())).resolves.toBe(false);
    expect(removePlace).not.toHaveBeenCalled();
  });

  it("handleDelete: onayla siler, açık kartları temizler", async () => {
    const { result, s, removePlace } = crudSetup();
    await expect(result.current.handleDelete(place())).resolves.toBe(true);
    expect(removePlace).toHaveBeenCalledWith("p1");
    expect(s.setActiveId).toHaveBeenCalledWith(null);   // activeId === p1
    expect(s.setFeaturedIdx).toHaveBeenCalledWith(0);
    expect(s.setToast).toHaveBeenCalledWith("İzin haritadan silindi.");
  });

  it("handleDelete: hata Türkçe mesajla döner, akış çökmez", async () => {
    const { result, removePlace, s } = crudSetup();
    removePlace.mockRejectedValue(new Error("boom"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(result.current.handleDelete(place())).resolves.toBe(false);
    expect(s.setToast).toHaveBeenCalledWith("İzin silinemedi.");
    error.mockRestore();
  });
});
