// @vitest-environment jsdom
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Place } from "../types";
import * as siteTours from "../data/siteTours";
import NearbyAudioGuide from "./NearbyAudioGuide";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const STANDALONE_GUIDE_PLACE: Place = {
  id: "guide-standalone-1",
  title: "Nemrut Dağı Zirvesi",
  region: "Adıyaman",
  category: "history",
  lng: 38.7408,
  lat: 37.9806,
  note: "Kommagene Krallığı tümülüsü ve dev heykeller.",
  author: "Atlasia",
  kind: "guide",
};

describe("NearbyAudioGuide — M-25 / G6 temsilî tur etiketi", () => {
  it("isRealPath === false olan site turu durağında açık 'Temsilî tur' uyarısı gösterir", () => {
    // Efes 1. durak: Magnesia Kapısı (37.9365, 27.3435)
    act(() => {
      root.render(
        createElement(NearbyAudioGuide, {
          location: { lat: 37.9365, lng: 27.3435, accuracy: 8 },
          places: [],
          onOpenPlace: () => {},
        }),
      );
    });

    expect(container.textContent).toContain("Magnesia Kapısı (Giriş Kapısı)");
    const note = container.querySelector('[role="note"]');
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain("Temsilî tur");
    expect(note?.textContent).toContain("Efes Antik Kenti — 3 Saatlik Klasik Tur (1/10. durak)");
    expect(note?.textContent).toContain("saha patikası doğrulanmadı");
  });

  it("site turu dışındaki tekil rehber noktasında 'Temsilî tur' etiketi göstermez", () => {
    act(() => {
      root.render(
        createElement(NearbyAudioGuide, {
          location: { lat: 37.9806, lng: 38.7408, accuracy: 8 },
          places: [STANDALONE_GUIDE_PLACE],
          onOpenPlace: () => {},
        }),
      );
    });

    expect(container.textContent).toContain("Nemrut Dağı Zirvesi");
    expect(container.querySelector('[role="note"]')).toBeNull();
    expect(container.textContent).not.toContain("Temsilî tur");
  });

  it("saha patikası doğrulanmış bir turda (isRealPath === true) uyarıyı gizler", () => {
    vi.spyOn(siteTours, "isRealPath").mockReturnValue(true);

    act(() => {
      root.render(
        createElement(NearbyAudioGuide, {
          location: { lat: 37.9365, lng: 27.3435, accuracy: 8 },
          places: [],
          onOpenPlace: () => {},
        }),
      );
    });

    expect(container.textContent).toContain("Magnesia Kapısı (Giriş Kapısı)");
    expect(container.querySelector('[role="note"]')).toBeNull();
    expect(container.textContent).not.toContain("Temsilî tur");
  });
});
