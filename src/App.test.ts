// @vitest-environment jsdom
/**
 * App kapısı duman testi (T11).
 *
 * NEDEN VAR: `App.tsx` ince kapıya indirildi; landing'in hiçbir ağır parçayı
 * (harita, Firebase) beklemeden çizildiğini gerçek render ile doğrular.
 * Bulut kapısı mock'lanır: CI'da ortam değişkenleri dolu olsa bile test cihaz
 * hesabı yolunda kalır, ağa çıkmaz.
 */
import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/firebaseConfig", () => ({
  firebaseConfigured: false,
  isCloudReady: false,
  firebaseConfigSummary: { apiKey: false, authDomain: "(missing)", projectId: "(missing)", messagingSenderId: true, appId: true },
}));

beforeAll(() => {
  // jsdom `matchMedia` sağlamaz; kurulum ipucu onu ilk render'da okur.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe("App kapısı", () => {
  it("oturumsuz ilk açılışta landing'i çizer ve boot ekranında takılmaz", async () => {
    render(createElement(App));

    await waitFor(() => expect(screen.getByRole("button", { name: /Dünyayı keşfet/i })).toBeTruthy());
    expect(screen.getByRole("heading", { level: 1, name: /atlasia/i })).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Harita hazırlanıyor" })).toBeNull();
  });
});
