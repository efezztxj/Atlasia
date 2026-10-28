// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasTrack } from "../types";

const h = vi.hoisted(() => ({
  createTrack: vi.fn(async (_uid: string, _track: AtlasTrack) => undefined),
  reverseName: vi.fn(async (_lat: number, _lng: number) => "Konak · Türkiye" as string | null),
}));

vi.mock("../lib/routeData", () => ({ createTrack: h.createTrack }));
vi.mock("../utils/geo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/geo")>();
  return { ...actual, reverseName: h.reverseName };
});
// Panel artık SDK'sız kapıyı okuyor (A3); mock da gerçek bağımlılığı hedeflemeli.
vi.mock("../lib/firebaseConfig", () => ({ firebaseConfigured: true, isCloudReady: true }));

import TrackRecorderPanel from "./TrackRecorderPanel";

const BASE = 1_700_000_000_000;
type SuccessCallback = (position: GeolocationPosition) => void;
let watchSuccess: SuccessCallback | undefined;

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

function feed(lat: number, lng: number, accuracy: number, timestamp: number): void {
  act(() => watchSuccess?.(position(lat, lng, accuracy, timestamp)));
}

function renderPanel(cloudAccount = true) {
  const onFinished = vi.fn();
  const onPreview = vi.fn();
  render(createElement(TrackRecorderPanel, {
    uid: "u1",
    cloudAccount,
    onClose: () => undefined,
    onPreview,
    onFinished,
  }));
  return { onFinished, onPreview };
}

async function recordWalking(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: /Kaydı başlat/ }));
  feed(38.42, 27.14, 5, BASE);
  feed(38.42, 27.14, 15, BASE + 180_000);
  feed(38.42, 27.15, 10, BASE + 480_000);
}

beforeEach(() => {
  watchSuccess = undefined;
  h.createTrack.mockClear();
  h.reverseName.mockClear();
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: {
      watchPosition: (success: SuccessCallback) => {
        watchSuccess = success;
        return 77;
      },
      clearWatch: () => undefined,
    },
  });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window.navigator, "geolocation");
});

describe("TrackRecorderPanel · onaylı kaydet akışı", () => {
  it("Bitir createTrack ÇAĞIRMAZ; taslak ve önizleme gösterir", async () => {
    const { onPreview } = renderPanel();
    await recordWalking();

    fireEvent.click(screen.getByRole("button", { name: /^Bitir$/ }));

    await waitFor(() => expect(screen.getByText(/Kayıt bitti · taslak/)).toBeTruthy());
    expect(h.createTrack).not.toHaveBeenCalled();
    // Taslak önizlemesi haritaya çizilir (yazma değil, yalnız önizleme).
    await waitFor(() => expect(onPreview).toHaveBeenCalled());
    expect(screen.getByText(/1 durak/)).toBeTruthy();
    expect(screen.getByText(/hiçbir yere yazılmaz/i)).toBeTruthy();
    expect(document.querySelector('[data-atlasia-ribbon="ready"]')).toBeTruthy();
    // Kaydetme düğmesi yalnız açık eylem olarak duruyor, kendiliğinden çalışmıyor.
    expect(screen.getByRole("button", { name: /Hesabıma kaydet/ })).toBeTruthy();
  });

  it("Hesabıma kaydet createTrack'i tam bir kez çağırır ve taslağı rotaya devreder", async () => {
    const { onFinished } = renderPanel();
    await recordWalking();
    fireEvent.click(screen.getByRole("button", { name: /^Bitir$/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Hesabıma kaydet/ })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /Hesabıma kaydet/ }));

    await waitFor(() => expect(h.createTrack).toHaveBeenCalledTimes(1));
    expect(h.createTrack.mock.calls[0][0]).toBe("u1");
    expect(h.createTrack.mock.calls[0][1]).toMatchObject({ authorUid: "u1", distanceKm: 0.87 });
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    expect(onFinished.mock.calls[0][0].id).toMatch(/^track-/);
    expect(onFinished.mock.calls[0][1].routeTitle).toBe("Kayıtlı yürüyüş");
    expect(screen.getByRole("status").textContent).toContain("İz hesabına özel olarak kaydedildi");
  });

  it("cihaz hesabında kaydet düğmesi YOK; nedeni yazılı", () => {
    renderPanel(false);

    expect(screen.queryByRole("button", { name: /Hesabıma kaydet/ })).toBeNull();
    expect(screen.getByRole("note").textContent).toContain("Cihaz hesabındasın");
    expect(screen.getByRole("button", { name: /Kaydı başlat/ })).toHaveProperty("disabled", true);
  });

  it("Vazgeç taslağı atar, önizlemeyi temizler ve yazma yapmaz", async () => {
    const { onPreview, onFinished } = renderPanel();
    await recordWalking();
    fireEvent.click(screen.getByRole("button", { name: /^Bitir$/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Taslağı at" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Taslağı at" }));

    expect(screen.queryByText(/Kayıt bitti · taslak/)).toBeNull();
    expect(onPreview).toHaveBeenLastCalledWith([]);
    expect(h.createTrack).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("kaydetme hatası görünür kalır, taslak ekranda durur", async () => {
    h.createTrack.mockRejectedValueOnce(new Error("Buluta kaydetme izni reddedildi."));
    const { onFinished } = renderPanel();
    await recordWalking();
    fireEvent.click(screen.getByRole("button", { name: /^Bitir$/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Hesabıma kaydet/ })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /Hesabıma kaydet/ }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("reddedildi"));
    expect(screen.getByText(/Kayıt bitti · taslak/)).toBeTruthy();
    expect(onFinished).not.toHaveBeenCalled();
  });
});
