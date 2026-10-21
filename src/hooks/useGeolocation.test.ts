// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatAccuracy, useGeolocation } from "./useGeolocation";

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

class FakePermissionStatus extends EventTarget {
  name = "geolocation" as PermissionName;
  onchange: ((this: PermissionStatus, event: Event) => unknown) | null = null;

  constructor(public state: PermissionState) {
    super();
  }

  setState(state: PermissionState): void {
    this.state = state;
    this.dispatchEvent(new Event("change"));
  }
}

let permissionStatus: FakePermissionStatus;
let currentSuccess: SuccessCallback | undefined;
let currentError: ErrorCallback | undefined;
let watchSuccess: SuccessCallback | undefined;
let watchError: ErrorCallback | undefined;

const getCurrentPosition = vi.fn((success: SuccessCallback, error: ErrorCallback) => {
  currentSuccess = success;
  currentError = error;
});
const watchPosition = vi.fn((success: SuccessCallback, error: ErrorCallback) => {
  watchSuccess = success;
  watchError = error;
  return 77;
});
const clearWatch = vi.fn();
const permissionQuery = vi.fn(async () => permissionStatus as unknown as PermissionStatus);

function installNavigator(state: PermissionState = "prompt"): void {
  permissionStatus = new FakePermissionStatus(state);
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition, watchPosition, clearWatch },
  });
  Object.defineProperty(window.navigator, "permissions", {
    configurable: true,
    value: { query: permissionQuery },
  });
}

function position(lat: number, lng: number, accuracy: number, timestamp = 1234): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp,
  } as GeolocationPosition;
}

function geoError(code: number): GeolocationPositionError {
  return {
    code,
    message: "sahte konum hatası",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

async function renderGeo() {
  const view = renderHook(() => useGeolocation());
  await act(async () => undefined);
  return view;
}

beforeEach(() => {
  currentSuccess = undefined;
  currentError = undefined;
  watchSuccess = undefined;
  watchError = undefined;
  getCurrentPosition.mockClear();
  watchPosition.mockClear();
  clearWatch.mockClear();
  permissionQuery.mockClear();
  installNavigator();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(window.navigator, "geolocation");
  Reflect.deleteProperty(window.navigator, "permissions");
});

describe("formatAccuracy", () => {
  it("metre/km eşiklerini Türkçe ondalık virgülle biçimler", () => {
    expect(formatAccuracy(Number.NaN)).toBe("");
    expect(formatAccuracy(0)).toBe("±0 m");
    expect(formatAccuracy(12.4)).toBe("±12 m");
    expect(formatAccuracy(999.6)).toBe("±1000 m");
    expect(formatAccuracy(1000)).toBe("±1,0 km");
    expect(formatAccuracy(1449)).toBe("±1,4 km");
  });
});

describe("useGeolocation", () => {
  it("geolocation yoksa destek yok der ve request sessizce no-op olur", async () => {
    Reflect.deleteProperty(window.navigator, "geolocation");
    Object.defineProperty(window.navigator, "permissions", { configurable: true, value: undefined });

    const { result } = await renderGeo();
    act(() => result.current.request());

    expect(result.current.supported).toBe(false);
    expect(result.current.secure).toBe(true);
    expect(result.current.status).toBe("idle");
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("izin durumunu Permissions API'den senkronlar; denied ayrıca status'a yansır", async () => {
    installNavigator("denied");

    const { result } = await renderGeo();

    expect(permissionQuery).toHaveBeenCalledWith({ name: "geolocation" });
    expect(result.current.permission).toBe("denied");
    expect(result.current.status).toBe("denied");
    expect(result.current.fix).toBeNull();
  });

  it("20 m ve altı ilk ölçümde watch açmadan ready olur", async () => {
    const { result } = await renderGeo();

    act(() => result.current.request());
    expect(result.current.status).toBe("locating");
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );

    act(() => currentSuccess?.(position(38.42, 27.14, 12, 999)));

    expect(result.current.status).toBe("ready");
    expect(result.current.permission).toBe("granted");
    expect(result.current.fix).toEqual({ lat: 38.42, lng: 27.14, accuracy: 12, timestamp: 999 });
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it("geçersiz ilk ölçüm fix yazmaz ama geçerli ölçüm için refining/watch başlatır", async () => {
    const { result } = await renderGeo();
    act(() => result.current.request());

    act(() => currentSuccess?.(position(Number.NaN, 27.14, 10)));

    expect(result.current.fix).toBeNull();
    expect(result.current.status).toBe("refining");
    expect(watchPosition).toHaveBeenCalledTimes(1);

    act(() => watchSuccess?.(position(38.42, 27.14, 12, 999)));
    expect(result.current.status).toBe("ready");
    expect(result.current.fix).toEqual({ lat: 38.42, lng: 27.14, accuracy: 12, timestamp: 999 });
    expect(clearWatch).toHaveBeenCalledWith(77);
  });

  it("kaba ölçümde refining açar; daha kötü ölçüm fix'i bozmaz, iyisi günceller", async () => {
    const { result } = await renderGeo();
    act(() => result.current.request());
    act(() => currentSuccess?.(position(38.42, 27.14, 100, 100)));

    expect(result.current.status).toBe("refining");
    expect(result.current.fix?.accuracy).toBe(100);
    expect(watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 18_000 },
    );

    act(() => watchSuccess?.(position(39, 28, 150, 200)));
    expect(result.current.fix).toMatchObject({ lat: 38.42, lng: 27.14, accuracy: 100 });

    act(() => watchSuccess?.(position(38.43, 27.15, 50, 300)));
    expect(result.current.fix).toMatchObject({ lat: 38.43, lng: 27.15, accuracy: 50 });
    expect(result.current.status).toBe("refining");

    act(() => watchSuccess?.(position(38.44, 27.16, 20, 400)));
    expect(result.current.status).toBe("ready");
    expect(result.current.fix?.accuracy).toBe(20);
    expect(clearWatch).toHaveBeenCalledWith(77);
  });

  it("18 saniyelik hassaslaştırma penceresi dolunca mevcut fix ile ready olur", async () => {
    vi.useFakeTimers();
    const { result } = await renderGeo();
    act(() => result.current.request());
    act(() => currentSuccess?.(position(38.42, 27.14, 80, 100)));
    expect(result.current.status).toBe("refining");

    act(() => vi.advanceTimersByTime(18_000));

    expect(result.current.status).toBe("ready");
    expect(result.current.fix?.accuracy).toBe(80);
    expect(clearWatch).toHaveBeenCalledWith(77);
  });

  it("ilk ölçüm hatalarını denied/timeout/unavailable olarak ayırır", async () => {
    const denied = await renderGeo();
    act(() => denied.result.current.request());
    act(() => currentError?.(geoError(1)));
    expect(denied.result.current).toMatchObject({ status: "denied", permission: "denied", fix: null });
    denied.unmount();

    const timeout = await renderGeo();
    act(() => timeout.result.current.request());
    act(() => currentError?.(geoError(3)));
    expect(timeout.result.current.status).toBe("timeout");
    timeout.unmount();

    const unavailable = await renderGeo();
    act(() => unavailable.result.current.request());
    act(() => currentError?.(geoError(2)));
    expect(unavailable.result.current.status).toBe("unavailable");
  });

  it("fix varken watch hatası konumu koruyup ready durumuna döner", async () => {
    const { result } = await renderGeo();
    act(() => result.current.request());
    act(() => currentSuccess?.(position(38.42, 27.14, 90, 100)));

    act(() => watchError?.(geoError(2)));

    expect(result.current.status).toBe("ready");
    expect(result.current.fix?.accuracy).toBe(90);
    expect(clearWatch).toHaveBeenCalledWith(77);
  });

  it("stop eski callback'leri geçersiz kılar; clear fix'i ve durumu sıfırlar", async () => {
    const { result } = await renderGeo();
    act(() => result.current.request());
    act(() => currentSuccess?.(position(38.42, 27.14, 90, 100)));

    act(() => result.current.stop());
    expect(result.current.status).toBe("ready");
    expect(clearWatch).toHaveBeenCalledWith(77);

    act(() => watchSuccess?.(position(40, 30, 1, 200)));
    expect(result.current.fix).toMatchObject({ lat: 38.42, lng: 27.14, accuracy: 90 });

    act(() => result.current.clear());
    expect(result.current.fix).toBeNull();
    expect(result.current.status).toBe("idle");
  });

  it("izin sonradan denied olursa fix düşer; tekrar granted olursa denied durumu idle'a döner", async () => {
    installNavigator("granted");
    const { result } = await renderGeo();
    act(() => result.current.request());
    act(() => currentSuccess?.(position(38.42, 27.14, 10, 100)));
    expect(result.current.status).toBe("ready");

    act(() => permissionStatus.setState("denied"));
    expect(result.current).toMatchObject({ permission: "denied", status: "denied", fix: null });

    act(() => permissionStatus.setState("granted"));
    expect(result.current).toMatchObject({ permission: "granted", status: "idle", fix: null });
  });

  it("unmount watch/timer ve permission dinleyicisini temizler", async () => {
    const removeSpy = vi.spyOn(permissionStatus, "removeEventListener");
    const { result, unmount } = await renderGeo();
    act(() => result.current.request());
    act(() => currentSuccess?.(position(38.42, 27.14, 90, 100)));

    unmount();

    expect(clearWatch).toHaveBeenCalledWith(77);
    expect(removeSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
