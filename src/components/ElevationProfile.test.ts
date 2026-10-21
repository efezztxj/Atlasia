// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RouteLeg } from "../types";
import type { ElevationProfileData, TerrainSampler } from "../utils/elevation";
import ElevationProfile from "./ElevationProfile";

const leg: RouteLeg = {
  id: "bacak-1",
  coords: [[27.14, 38.42], [27.16, 38.423]],
  mode: "walking",
  distanceKm: 0,
  durationMinutes: 0,
};

/** Doğrusal rampa: doğuya gittikçe yükselir. */
const ramp: TerrainSampler = {
  queryTerrainElevation: ([lng]) => Math.round((lng - 27.14) * 100000),
};

const unknownProfile: ElevationProfileData = {
  samples: [],
  totalAscentM: 0,
  maxSlopePercent: 0,
  totalDistanceKm: 1.7,
  naismithMinutes: 0,
  source: "unknown",
  reliable: false,
  unsampledPoints: 5,
};

afterEach(() => {
  cleanup();
});

describe("ElevationProfile", () => {
  it("DEM örnekleyici varsa profili çizer: tırmanış ve eğim görünür", () => {
    render(createElement(ElevationProfile, { legs: [leg], terrain: ramp }));
    expect(screen.getByRole("img", { name: /Yükseklik profili/ })).toBeTruthy();
    expect(screen.getByText(/Toplam tırmanış/)).toBeTruthy();
    expect(screen.queryByText(/yükseklik verisi yok/i)).toBeNull();
  });

  it("DEM yoksa sahte çizgi yerine 'yükseklik verisi yok' der (P17)", () => {
    render(createElement(ElevationProfile, { legs: [leg] }));
    expect(screen.getByLabelText(/Yükseklik verisi yok/)).toBeTruthy();
    expect(screen.getByText(/gösterilmiyor/)).toBeTruthy();
    expect(screen.queryByRole("img", { name: /Yükseklik profili:/ })).toBeNull();
  });

  it("hazır profil (profileData) senkron hesabı atlar; bilinmiyor durumu aynen gösterilir", () => {
    render(createElement(ElevationProfile, { profileData: unknownProfile }));
    expect(screen.getByText(/Rota uzunluğu 1.7 km/)).toBeTruthy();
    expect(screen.queryByText(/Toplam tırmanış/)).toBeNull();
  });

  it("geometri hiç yoksa hesaplanamadı der, çizgi çizmez", () => {
    render(createElement(ElevationProfile, {}));
    expect(screen.getByLabelText(/Yükseklik profili yok/)).toBeTruthy();
    expect(screen.getByText(/hesaplanamadı/)).toBeTruthy();
  });
});
