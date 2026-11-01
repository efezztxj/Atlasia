// @vitest-environment jsdom
/**
 * F2-1c davranış kilidi — konum akışı.
 *
 * Kilitlenen sözler: ilk düzeltme **bir kez** duyurulur, düzeltme kaybolunca
 * işaret silinir, ters ad çözümlemesi 250 m'den az harekette tekrar çalışmaz,
 * temizleme etiketi "Dünya"ya çeker.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocationFlow } from "./useLocationFlow";
import type { GeoFix, GeoStatus } from "./useGeolocation";

const geoApi = vi.hoisted(() => ({ reverseName: vi.fn() }));
vi.mock("../utils/geo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/geo")>();
  return { ...actual, reverseName: geoApi.reverseName };
});

const fix = (over: Partial<GeoFix> = {}): GeoFix => ({ lng: 27.1, lat: 38.4, accuracy: 12, timestamp: 1, ...over });

type FakeGeo = {
  fix: GeoFix | null;
  status: GeoStatus;
  supported: boolean;
  secure: boolean;
  permission: string;
  request: () => void;
  clear: () => void;
};

const makeGeo = (over: Partial<FakeGeo> = {}): FakeGeo => ({
  fix: null, status: "idle", supported: true, secure: true, permission: "prompt",
  request: vi.fn(), clear: vi.fn(), ...over,
});

const mapHandle = () => ({
  showMe: vi.fn(), clearMe: vi.fn(), flyTo: vi.fn(), fitBox: vi.fn(), reset: vi.fn(),
});

const setup = (geo: FakeGeo, preciseLabel: string | null = null) => {
  const map = mapHandle();
  const setters = {
    setPreciseLabel: vi.fn(),
    setLocationLabel: vi.fn(),
    setToast: vi.fn(),
    setSpin: vi.fn(),
    setActiveId: vi.fn(),
    setProfileOpen: vi.fn(),
  };
  const openSettings = vi.fn();
  const closeSettings = vi.fn();
  const hook = renderHook(({ g }) => useLocationFlow({
    geo: g as never, mapRef: { current: map } as never, preciseLabel,
    ...setters, openSettings, closeSettings,
  }), { initialProps: { g: geo } });
  return { ...hook, map, setters, openSettings, closeSettings };
};

beforeEach(() => {
  geoApi.reverseName.mockReset();
  geoApi.reverseName.mockResolvedValue("Kordon");
});

describe("useLocationFlow — düzeltme (fix) yaşam döngüsü", () => {
  it("düzeltme yokken işaret silinir ve etiket temizlenir", () => {
    const { map, setters } = setup(makeGeo());
    expect(map.clearMe).toHaveBeenCalled();
    expect(setters.setPreciseLabel).toHaveBeenCalledWith(null);
  });

  it("ilk düzeltme haritaya çizilir, tek kez duyurulur", () => {
    const { map, setters, rerender } = setup(makeGeo());
    map.showMe.mockClear();

    rerender({ g: makeGeo({ fix: fix({ accuracy: 8 }), status: "ready" }) });
    expect(map.showMe).toHaveBeenCalledWith(27.1, 38.4, 8, true);
    expect(setters.setSpin).toHaveBeenCalledWith(false);
    expect(setters.setActiveId).toHaveBeenCalledWith(null);
    expect(setters.setToast).toHaveBeenCalledWith(expect.stringContaining("Konumun bulundu"));

    setters.setToast.mockClear();
    rerender({ g: makeGeo({ fix: fix({ lng: 27.1005, lat: 38.4005 }), status: "ready" }) });
    expect(map.showMe).toHaveBeenLastCalledWith(27.1005, 38.4005, 12, false);
    expect(setters.setToast).not.toHaveBeenCalledWith(expect.stringContaining("Konumun bulundu"));
  });

  it("düzeltme kaybolursa işaret kaldırılır (konum izni kapatıldı)", () => {
    const { map, setters, rerender } = setup(makeGeo({ fix: fix(), status: "ready" }));
    setters.setPreciseLabel.mockClear();
    map.clearMe.mockClear();

    rerender({ g: makeGeo({ fix: null, status: "denied" }) });
    expect(map.clearMe).toHaveBeenCalled();
    expect(setters.setPreciseLabel).toHaveBeenCalledWith(null);
  });
});

describe("useLocationFlow — ters ad çözümlemesi", () => {
  it("ilk düzeltmede ad çözülür ve etikete yazılır", async () => {
    const { setters } = setup(makeGeo({ fix: fix(), status: "ready" }));
    await waitFor(() => expect(setters.setPreciseLabel).toHaveBeenCalledWith("Kordon"));
    expect(setters.setLocationLabel).toHaveBeenCalledWith("Kordon");
  });

  it("250 m'den az harekette ikinci kez çözülmez", async () => {
    const { rerender } = setup(makeGeo({ fix: fix(), status: "ready" }));
    await waitFor(() => expect(geoApi.reverseName).toHaveBeenCalledTimes(1));

    // ~5 m kayma: eşik altında
    rerender({ g: makeGeo({ fix: fix({ lng: 27.10005, lat: 38.40005 }), status: "ready" }) });
    await Promise.resolve();
    expect(geoApi.reverseName).toHaveBeenCalledTimes(1);
  });
});

describe("useLocationFlow — izin ve hata mesajları", () => {
  it("zaman aşımı ve kullanılamaz durumları kullanıcıya söylenir", () => {
    const timeout = setup(makeGeo());
    timeout.rerender({ g: makeGeo({ status: "timeout" }) });
    expect(timeout.setters.setToast).toHaveBeenCalledWith("Konum zaman aşımına uğradı, tekrar dene.");

    const unavailable = setup(makeGeo());
    unavailable.rerender({ g: makeGeo({ status: "unavailable" }) });
    expect(unavailable.setters.setToast).toHaveBeenCalledWith("Konum şu an alınamıyor.");
  });

  it("handleAllowLocation: bilgi verir ve izin ister", () => {
    const geo = makeGeo();
    const { result } = setup(geo);
    act(() => result.current.handleAllowLocation());
    expect(geo.request).toHaveBeenCalled();
    expect(geo.request).toHaveBeenCalledTimes(1);
  });

  it("handleShowLocation: düzeltme yoksa hiçbir şey yapmaz", () => {
    const { result, closeSettings } = setup(makeGeo());
    act(() => result.current.handleShowLocation());
    expect(closeSettings).not.toHaveBeenCalled();
  });

  it("handleShowLocation: düzeltme varsa uçar ve ayarları kapatır", () => {
    const { result, map, closeSettings, setters } = setup(makeGeo({ fix: fix() }), "Kordon");
    act(() => result.current.handleShowLocation());
    expect(map.showMe).toHaveBeenCalledWith(27.1, 38.4, 12, true);
    expect(setters.setLocationLabel).toHaveBeenCalledWith("Kordon");
    expect(closeSettings).toHaveBeenCalled();
    expect(setters.setProfileOpen).toHaveBeenCalledWith(false);
  });

  it("handleClearLocation: izni temizler, etiketi Dünya yapar", () => {
    const geo = makeGeo({ fix: fix() });
    const { result, map, setters } = setup(geo);
    act(() => result.current.handleClearLocation());
    expect(geo.clear).toHaveBeenCalled();
    expect(setters.setPreciseLabel).toHaveBeenCalledWith(null);
    expect(setters.setLocationLabel).toHaveBeenCalledWith("Dünya");
    expect(map.clearMe).toHaveBeenCalled();
    expect(setters.setToast).toHaveBeenCalledWith("Konum işareti kaldırıldı.");
  });

  it("precise: etiket yoksa 'Tam konumun' der", () => {
    const { result } = setup(makeGeo({ fix: fix() }));
    expect(result.current.precise).toMatchObject({ label: "Tam konumun", lng: 27.1, lat: 38.4 });
  });
});
