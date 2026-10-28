// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasTrack } from "../types";
import { decodePolyline } from "../utils/polyline";

const h = vi.hoisted(() => ({
  createTrack: vi.fn(async (_uid: string, _track: AtlasTrack) => undefined),
  reverseName: vi.fn(async (_lat: number, _lng: number) => "Konak · Türkiye" as string | null),
}));

vi.mock("../lib/routeData", () => ({
  createTrack: h.createTrack,
}));
vi.mock("../utils/geo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/geo")>();
  return { ...actual, reverseName: h.reverseName };
});

import { useTrackRecorder, type FinishedTrack } from "./useTrackRecorder";

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

const BASE = 1_700_000_000_000;
let watchSuccess: SuccessCallback | undefined;
let watchError: ErrorCallback | undefined;
const watchPosition = vi.fn((success: SuccessCallback, error: ErrorCallback) => {
  watchSuccess = success;
  watchError = error;
  return 55;
});
const clearWatch = vi.fn();

function installGeolocation(): void {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { watchPosition, clearWatch },
  });
}

function position(lat: number, lng: number, accuracy: number, timestamp: number): GeolocationPosition {
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
    message: "sahte hata",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

function feed(lat: number, lng: number, accuracy: number, timestamp: number): void {
  act(() => watchSuccess?.(position(lat, lng, accuracy, timestamp)));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE);
  watchSuccess = undefined;
  watchError = undefined;
  watchPosition.mockClear();
  clearWatch.mockClear();
  h.createTrack.mockReset().mockResolvedValue(undefined);
  h.reverseName.mockReset().mockResolvedValue("Konak · Türkiye");
  installGeolocation();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(window.navigator, "geolocation");
});

describe("useTrackRecorder", () => {
  it("geolocation yoksa Türkçe hata ile error durumuna geçer", () => {
    Reflect.deleteProperty(window.navigator, "geolocation");
    const { result } = renderHook(() => useTrackRecorder("u1"));

    act(() => result.current.start());

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Bu tarayıcı konum kaydını desteklemiyor.");
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it("kayıt sırasında saniyede bir süre/mesafe/nokta ve preview günceller; geçersiz noktaları eler", () => {
    const onPreview = vi.fn();
    const { result } = renderHook(() => useTrackRecorder("u1", onPreview));

    act(() => result.current.start());
    act(() => result.current.start());
    expect(watchPosition).toHaveBeenCalledTimes(1);
    // K-12: timeout zorunlu; sinyal hiç gelmezse tarayıcı TIMEOUT hatası üretmeli.
    expect(watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30_000,
    });
    expect(result.current.status).toBe("recording");

    feed(38.42, 27.14, 5, BASE);
    feed(91, 27.14, 5, BASE + 1);
    feed(38.42, 181, 5, BASE + 2);
    feed(38.42, 27.14, -1, BASE + 3);
    feed(38.42, 27.14, 15, BASE + 180_000);
    // 870 m / 5 dk ≈ 10 km/h: gerçekçi yürüyüş. (P17 öncesi 10 sn idi = 313 km/h;
    // P17 sıçrama filtresi bunu haklı olarak GPS sıçraması sayıp atar.)
    feed(38.42, 27.15, 10, BASE + 480_000);

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.elapsedSeconds).toBe(1);
    expect(result.current.pointCount).toBe(3);
    expect(result.current.distanceKm).toBeCloseTo(0.87, 2);
    expect(onPreview).toHaveBeenLastCalledWith([
      [27.14, 38.42],
      [27.15, 38.42],
    ]);
  });

  it("önizleme callback'i değişirse interval en güncel callback'i kullanır", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb }: { cb: (coords: [number, number][]) => void }) => useTrackRecorder("u1", cb),
      { initialProps: { cb: first } },
    );
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);

    rerender({ cb: second });
    act(() => vi.advanceTimersByTime(1000));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith([[27.14, 38.42]]);
  });

  it("finish tam çözünürlükten durak, sadeleştirilmiş polyline ve taslak rota üretir; buluta YAZMAZ", async () => {
    const { result } = renderHook(() => useTrackRecorder("u1"));
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);
    feed(38.42, 27.14, 15, BASE + 180_000);
    // 870 m / 5 dk ≈ 10 km/h: gerçekçi yürüyüş. (P17 öncesi 10 sn idi = 313 km/h;
    // P17 sıçrama filtresi bunu haklı olarak GPS sıçraması sayıp atar.)
    feed(38.42, 27.15, 10, BASE + 480_000);

    let finished: FinishedTrack | undefined;
    await act(async () => {
      finished = await result.current.finish();
    });

    expect(result.current.status).toBe("idle");
    // P17-Tur2: "Bitir" yalnız taslak üretir. Yazma açık "Hesabıma kaydet" eylemiyle olur.
    expect(h.createTrack).not.toHaveBeenCalled();
    expect(finished?.track).toMatchObject({
      authorUid: "u1",
      startedAt: BASE,
      endedAt: BASE + 480_000,
      distanceKm: 0.87,
      accuracy: { sampleCount: 3, meanMeters: 10, maxMeters: 15 },
    });
    expect(finished?.track.id).toMatch(/^track-/);
    // İki köşeli sadeleşmiş çizgide durağın aralığı ilk köşeye iner.
    expect(finished?.track.stops).toEqual([
      {
        startedAt: BASE,
        endedAt: BASE + 180_000,
        lat: 38.42,
        lng: 27.14,
        pointCount: 2,
        startPointIndex: 0,
        endPointIndex: 0,
      },
    ]);
    expect(decodePolyline(finished!.track.polyline)).toEqual([
      [27.14, 38.42],
      [27.15, 38.42],
    ]);

    expect(h.reverseName).toHaveBeenCalledWith(38.42, 27.14);
    expect(finished?.route).toMatchObject({
      id: `route-${finished!.track.id.replace(/^track-/, "")}`,
      routeTitle: "Kayıtlı yürüyüş",
      totalDurationHours: 0.1,
      totalDistanceKm: 0.87,
      transport: "walking",
      origin: { lat: 38.42, lng: 27.14 },
    });
    expect(finished?.route.days[0].stops[0]).toMatchObject({
      name: "Konak · Türkiye",
      durationMinutes: 3,
      category: "Kayıtlı iz",
    });
    expect(finished?.route.days[0].stops[0].startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(clearWatch).toHaveBeenCalledWith(55);
  });

  it("ölçüm yokken finish kayıt denemeden hata verir; idle iken de reddeder", async () => {
    const { result } = renderHook(() => useTrackRecorder("u1"));

    let idleError: unknown;
    await act(async () => {
      idleError = await result.current.finish().catch((error: unknown) => error);
    });
    expect(idleError).toEqual(new Error("Etkin bir yürüyüş kaydı yok."));
    expect(result.current.status).toBe("idle");

    act(() => result.current.start());
    let emptyError: unknown;
    await act(async () => {
      emptyError = await result.current.finish().catch((error: unknown) => error);
    });
    expect(emptyError).toEqual(
      new Error("Henüz konum ölçümü alınmadı. Biraz bekleyip tekrar bitir."),
    );
    expect(result.current.status).toBe("error");
    expect(h.createTrack).not.toHaveBeenCalled();
  });

  it("tek GPS sıçraması (P17) çizgi ve mesafeye girmez; kayıt sürer", async () => {
    const { result } = renderHook(() => useTrackRecorder("u1"));
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);
    feed(38.4245, 27.14, 5, BASE + 30_000); // 500 m / 30 sn = 60 km/h → sıçrama
    feed(38.4202, 27.1405, 5, BASE + 60_000);
    feed(38.4204, 27.141, 5, BASE + 90_000);

    let finished: FinishedTrack | undefined;
    await act(async () => {
      finished = await result.current.finish();
    });

    expect(finished?.track.accuracy.sampleCount).toBe(3);
    expect(finished?.track.distanceKm).toBeLessThan(0.15);
    expect(decodePolyline(finished!.track.polyline).some(([, lat]) => lat > 38.424)).toBe(false);
    expect(finished?.stats.maxDeviationM).toBeLessThanOrEqual(7);
  });

  it("save bulut reddini aynen yüzeye çıkarır; taslak üretimi (finish) bundan etkilenmez", async () => {
    const { result } = renderHook(() => useTrackRecorder("cihaz-u"));
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);

    let draft: FinishedTrack | undefined;
    await act(async () => {
      draft = await result.current.finish();
    });
    expect(draft).toBeDefined();
    expect(h.createTrack).not.toHaveBeenCalled();

    h.createTrack.mockRejectedValueOnce(new Error("Buluta kaydetme izni reddedildi."));
    let failure: unknown;
    await act(async () => {
      failure = await result.current.save(draft!.track).catch((error: unknown) => error);
    });

    expect(failure).toEqual(new Error("Buluta kaydetme izni reddedildi."));
    expect(h.createTrack).toHaveBeenCalledTimes(1);
  });

  it("konum hatalarını Türkçeleştirir; nokta yoksa kaydı kapatır, varsa sürdürür", () => {
    const denied = renderHook(() => useTrackRecorder("u1"));
    act(() => denied.result.current.start());
    act(() => watchError?.(geoError(1)));
    expect(denied.result.current).toMatchObject({
      status: "error",
      error: "Konum izni verilmedi; kaydı başlatmak için izni aç.",
    });
    expect(clearWatch).toHaveBeenCalledWith(55);
    denied.unmount();
    clearWatch.mockClear();

    const running = renderHook(() => useTrackRecorder("u1"));
    act(() => running.result.current.start());
    feed(38.42, 27.14, 5, BASE);
    act(() => watchError?.(geoError(3)));

    expect(running.result.current.status).toBe("recording");
    expect(running.result.current.error).toBe(
      "Konum ölçümü zaman aşımına uğradı. Kaydı sürdürmek için ekranı açık tut.",
    );
    expect(clearWatch).not.toHaveBeenCalled();
  });

  it("discard tüm sayaçları ve preview'i sıfırlar; eski watch callback'i işlemez", () => {
    const onPreview = vi.fn();
    const { result } = renderHook(() => useTrackRecorder("u1", onPreview));
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.pointCount).toBe(1);

    act(() => result.current.discard());

    expect(result.current).toMatchObject({
      status: "idle",
      elapsedSeconds: 0,
      distanceKm: 0,
      pointCount: 0,
      error: null,
    });
    expect(onPreview).toHaveBeenLastCalledWith([]);
    expect(clearWatch).toHaveBeenCalledWith(55);

    feed(38.42, 27.15, 5, BASE + 1000);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.pointCount).toBe(0);
  });

  it("save yalnız açık çağrıda createTrack yapar ve kural ön denetimini uygular", async () => {
    const { result } = renderHook(() => useTrackRecorder("u1"));
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);
    feed(38.42, 27.14, 15, BASE + 180_000);
    feed(38.42, 27.15, 10, BASE + 480_000);

    let finished: FinishedTrack | undefined;
    await act(async () => {
      finished = await result.current.finish();
    });
    expect(h.createTrack).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.save(finished!.track);
    });
    expect(h.createTrack).toHaveBeenCalledTimes(1);
    expect(h.createTrack).toHaveBeenCalledWith("u1", finished!.track);

    // Kural ön denetimi: geçersiz iz yazılmaya çalışılmaz, Türkçe hata yüzeye çıkar.
    let violation: unknown;
    await act(async () => {
      violation = await result.current
        .save({ ...finished!.track, endedAt: finished!.track.startedAt - 1 })
        .catch((error: unknown) => error);
    });
    expect(violation).toEqual(new Error("İz bitişi başlangıcından önce."));
    expect(h.createTrack).toHaveBeenCalledTimes(1);
  });

  it("ad çözümlemesi ağ hatası verse de taslak açılır, adlar boş kalır", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    h.reverseName.mockRejectedValue(new Error("ağ yok"));
    const { result } = renderHook(() => useTrackRecorder("u1"));
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);
    feed(38.42, 27.14, 15, BASE + 180_000);
    feed(38.42, 27.15, 10, BASE + 480_000);

    let finished: FinishedTrack | undefined;
    await act(async () => {
      finished = await result.current.finish();
    });

    expect(result.current.status).toBe("idle");
    expect(h.createTrack).not.toHaveBeenCalled();
    expect(finished?.track.stops).toHaveLength(1);
    expect(finished?.route.days[0].stops[0].name).toBe("Durak 1");
    expect(warn).toHaveBeenCalledWith(
      "[Atlasia] Durak adı çözümlenemedi, ad boş bırakıldı:",
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it("kayıt sırasında durum finishing olur, taslak hazır olunca idle'a döner", async () => {
    const { result } = renderHook(() => useTrackRecorder("u1"));
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);

    let pending: Promise<FinishedTrack> | undefined;
    act(() => {
      pending = result.current.finish();
    });
    expect(result.current.status).toBe("finishing");

    await act(async () => {
      await pending;
    });
    expect(result.current.status).toBe("idle");
  });

  it("unmount watch ve interval'i temizler", () => {
    const onPreview = vi.fn();
    const { result, unmount } = renderHook(() => useTrackRecorder("u1", onPreview));
    act(() => result.current.start());
    feed(38.42, 27.14, 5, BASE);

    unmount();
    act(() => vi.advanceTimersByTime(3000));

    expect(clearWatch).toHaveBeenCalledWith(55);
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("M-26: kayıt başladığında Screen Wake Lock alır, sekme görünür olunca yeniler, bitiş/vazgeçişte serbest bırakır", async () => {
    let releaseHandler: (() => void) | undefined;
    let released = false;
    const release = vi.fn(async () => {
      released = true;
      releaseHandler?.();
    });
    const request = vi.fn(async () => {
      released = false;
      return {
        get released() {
          return released;
        },
        release,
        addEventListener: (_type: "release", cb: () => void) => {
          releaseHandler = cb;
        },
      };
    });
    Object.defineProperty(window.navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });

    try {
      const { result } = renderHook(() => useTrackRecorder("u1"));
      await act(async () => {
        result.current.start();
      });

      expect(request).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledWith("screen");
      expect(result.current.wakeLockActive).toBe(true);

      // Tarayıcı arka planda Wake Lock'u düşürürse sekme görünür olunca yeniden alınır
      act(() => {
        released = true;
        releaseHandler?.();
      });
      expect(result.current.wakeLockActive).toBe(false);

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(request).toHaveBeenCalledTimes(2);
      expect(result.current.wakeLockActive).toBe(true);

      await act(async () => {
        result.current.discard();
      });
      expect(release).toHaveBeenCalledTimes(1);
      expect(result.current.wakeLockActive).toBe(false);
    } finally {
      Reflect.deleteProperty(window.navigator, "wakeLock");
    }
  });

  it("M-26: Wake Lock reddedilse bile GPS kaydı kesintisiz devam eder", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const request = vi.fn(async () => {
      throw new Error("NotAllowedError: Low Power Mode");
    });
    Object.defineProperty(window.navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });

    try {
      const { result } = renderHook(() => useTrackRecorder("u1"));
      await act(async () => {
        result.current.start();
      });

      expect(result.current.status).toBe("recording");
      expect(result.current.wakeLockActive).toBe(false);
      expect(watchPosition).toHaveBeenCalledTimes(1);
    } finally {
      infoSpy.mockRestore();
      Reflect.deleteProperty(window.navigator, "wakeLock");
    }
  });
});
