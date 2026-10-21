// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasRoute, RouteVisibility } from "../types";

const h = vi.hoisted(() => ({
  publishRoute: vi.fn(
    async (_route: AtlasRoute, _visibility: RouteVisibility, _shareConsent: boolean) => undefined,
  ),
  fetchWeatherSeries: vi.fn(),
}));

vi.mock("../hooks/useCollections", () => ({
  useCollections: () => ({ publishRoute: h.publishRoute }),
}));

vi.mock("../utils/weather", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/weather")>();
  // Saf değerlendirme gerçek; yalnız ağ çağrısı sahtedir (test ağı yok).
  return { ...actual, fetchWeatherSeries: h.fetchWeatherSeries };
});

import RouteEditor from "./RouteEditor";

const route = (id = "route-editor-1"): AtlasRoute => ({
  id,
  routeTitle: "Kordon turu",
  routeSummary: "Kısa özet",
  totalDurationHours: 2,
  totalDistanceKm: 3,
  transport: "walking",
  vibe: "sakin",
  days: [
    {
      dayNumber: 1,
      title: "Gün 1",
      summary: "",
      stops: [
        {
          order: 1,
          name: "Başlangıç",
          type: "other",
          lat: 38.42,
          lng: 27.14,
          startTime: "10:00",
          endTime: "10:30",
          durationMinutes: 30,
          description: "",
          aiReason: "",
          tips: [],
          isCommunityPin: false,
          pinId: null,
          category: "Genel",
          imageUrl: null,
        },
      ],
      polyline: "",
    },
  ],
  weatherNote: null,
  alternatives: [],
  createdAt: 1_760_000_000_000,
});

function renderEditor(value: AtlasRoute) {
  const onSaved = vi.fn();
  const utils = render(
    createElement(RouteEditor, { route: value, onClose: () => undefined, onSaved }),
  );
  return { ...utils, onSaved };
}

beforeEach(() => {
  h.publishRoute.mockClear();
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(async () => undefined) },
  });
});

afterEach(() => {
  cleanup();
});

describe("RouteEditor paylaşım onayı (shareConsent)", () => {
  it("private görünürlükte onay kutusu gösterilmez; kayıt onaysız geçer", async () => {
    const { onSaved } = renderEditor(route());
    expect(screen.queryByRole("checkbox", { name: "Paylaşım onayı" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Özel kaydet/ }));
    await waitFor(() => expect(h.publishRoute).toHaveBeenCalledTimes(1));
    expect(h.publishRoute.mock.calls[0][1]).toBe("private");
    expect(h.publishRoute.mock.calls[0][2]).toBe(false);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("public seçilince kutu işaretsiz gelir; değer aynen kapıya taşınır", async () => {
    renderEditor(route());
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[2]); // Herkese açık

    const consent = screen.getByRole("checkbox", { name: "Paylaşım onayı" }) as HTMLInputElement;
    expect(consent.checked).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /Yayınla/ }));
    await waitFor(() => expect(h.publishRoute).toHaveBeenCalledTimes(1));
    // Onay uydurulmaz: işaretsiz kutu false olarak geçer (red kapı katmanında sınanır).
    expect(h.publishRoute.mock.calls[0][2]).toBe(false);

    fireEvent.click(consent);
    expect(consent.checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Yayınla/ }));
    await waitFor(() => expect(h.publishRoute).toHaveBeenCalledTimes(2));
    expect(h.publishRoute.mock.calls[1][2]).toBe(true);
  });

  it("rota değişince onay sıfırlanır", () => {
    const { rerender } = renderEditor(route());
    fireEvent.click(screen.getAllByRole("radio")[2]);
    const consent = screen.getByRole("checkbox", { name: "Paylaşım onayı" }) as HTMLInputElement;
    fireEvent.click(consent);
    expect(consent.checked).toBe(true);

    rerender(
      createElement(RouteEditor, {
        route: route("route-editor-2"),
        onClose: () => undefined,
        onSaved: () => undefined,
      }),
    );
    fireEvent.click(screen.getAllByRole("radio")[2]);
    const next = screen.getByRole("checkbox", { name: "Paylaşım onayı" }) as HTMLInputElement;
    expect(next.checked).toBe(false);
  });

  it("hesapsız bağlantı onaysız üretilmez; onayla ?r=v1 bağlantısı görünür", async () => {
    renderEditor(route());
    fireEvent.click(screen.getAllByRole("radio")[1]); // Bağlantısı olanlar

    fireEvent.click(screen.getByRole("button", { name: /Bağlantıyı oluştur/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("onay ister"));
    expect(screen.queryByLabelText("Hesapsız paylaşım bağlantısı")).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "Paylaşım onayı" }));
    fireEvent.click(screen.getByRole("button", { name: /Bağlantıyı oluştur/ }));
    const input = (await screen.findByLabelText("Hesapsız paylaşım bağlantısı")) as HTMLInputElement;
    expect(input.value).toContain("/?r=v1.");
    // Sunucu yayını yapılmadı: bağlantı yolu publish'i çağırmaz.
    expect(h.publishRoute).not.toHaveBeenCalled();
  });
});

describe("RouteEditor hava riski (Adım 15)", () => {
  const hour = (time: string, extra: Record<string, number> = {}) => ({
    time,
    temperature: 21,
    precipitationMm: 0,
    precipitationProbability: 0,
    weatherCode: 0,
    windSpeedKmh: 6,
    windGustKmh: 9,
    ...extra,
  });

  beforeEach(() => {
    h.fetchWeatherSeries.mockReset();
  });

  it("fırtınalı günde uyarı rozeti + neden görünür", async () => {
    h.fetchWeatherSeries.mockResolvedValue({
      "gun-0-nokta-0": [hour("2030-01-05T10:00", { weatherCode: 95 })],
    });
    renderEditor(route());
    fireEvent.click(screen.getByRole("button", { name: /Hava riskini denetle/ }));
    expect(await screen.findByText(/Kötü hava uyarısı/)).toBeTruthy();
    expect(screen.getByText(/fırtına/)).toBeTruthy();
  });

  it("veri yoksa 'bilinmiyor' rozeti çıkar; 'risk yok' sanılmaz", async () => {
    h.fetchWeatherSeries.mockResolvedValue({});
    renderEditor(route());
    fireEvent.click(screen.getByRole("button", { name: /Hava riskini denetle/ }));
    expect(await screen.findByText(/Hava durumu bilinmiyor/)).toBeTruthy();
    expect(screen.queryByText(/Belirgin risk yok/)).toBeNull();
  });

  it("ağ hatasında tahmin uydurulmaz; hata açıkça söylenir", async () => {
    h.fetchWeatherSeries.mockRejectedValue(new Error("Hava durumu servisine ulaşılamadı. Bağlantını kontrol edip tekrar dene."));
    renderEditor(route());
    fireEvent.click(screen.getByRole("button", { name: /Hava riskini denetle/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("bilinmiyor"));
    expect(screen.queryByText(/Belirgin risk yok/)).toBeNull();
  });

  it("sakin tahminde 'belirgin risk yok' rozeti çıkar", async () => {
    h.fetchWeatherSeries.mockResolvedValue({
      "gun-0-nokta-0": [hour("2030-01-05T10:00")],
    });
    renderEditor(route());
    fireEvent.click(screen.getByRole("button", { name: /Hava riskini denetle/ }));
    expect(await screen.findByText(/Belirgin risk yok/)).toBeTruthy();
  });
});
