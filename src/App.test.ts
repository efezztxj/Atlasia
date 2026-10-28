// @vitest-environment jsdom
/**
 * Giriş kapısı duman testi (M-03b).
 *
 * NEDEN VAR: uygulama kabuğu ikiye ayrıldı (App.tsx = kapı + tanıtım,
 * Explorer.tsx = harita/paneller, lazy). Bu ayrım iki şekilde sessizce
 * bozulabilir:
 *   1) `Explorer` yine statik import edilir → tanıtım yolculuğuna Firestore
 *      döner (bunu scripts/bundle-budget.mjs yakalar),
 *   2) kapı hiç render etmez / yanlış dalı açar → kullanıcı boş ekran görür
 *      (bunu bu dosya yakalar).
 */
import { createElement } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  state: { user: null as null | Record<string, unknown>, checking: false },
}));

vi.mock("./contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
  useAuth: () => ({ ...h.state, logout: vi.fn() }),
}));
vi.mock("./hooks/useInstallApp", () => ({
  useInstallApp: () => ({ canInstall: false, installed: false, install: vi.fn(), prompt: null }),
}));
// Explorer lazy yüklenir; testte ağır grafiği (maplibre, firestore) çekmemek
// için yerine işaret koyuyoruz. Amaç kapının doğru dalı açması.
vi.mock("./Explorer", () => ({ default: () => createElement("div", null, "EXPLORER-YUKLENDI") }));

import App from "./App";

afterEach(cleanup);

describe("giriş kapısı (App)", () => {
  it("oturum çözülürken yükleme ekranı gösterir", () => {
    h.state = { user: null, checking: true };

    render(createElement(App));

    expect(screen.getByText(/atlasia/)).toBeTruthy();
  });

  it("oturum yokken tanıtım sayfası açılır", () => {
    h.state = { user: null, checking: false };

    render(createElement(App));

    // Tanıtım sayfasının birincil eylemi
    expect(screen.getAllByText(/Dünyayı keşfet/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("EXPLORER-YUKLENDI")).toBeNull();
  });

  it("giriş yapmış kullanıcıda Explorer lazy parçayı yükler", async () => {
    h.state = { user: { uid: "u1", displayName: "Efe", backend: "device" }, checking: false };

    render(createElement(App));

    // Suspense önce yükleme durumunu gösterebilir; sonra parça gelir.
    await act(async () => { await Promise.resolve(); });
    expect(await screen.findByText("EXPLORER-YUKLENDI")).toBeTruthy();
  });

  it("e-posta doğrulaması bekleyen kullanıcıya Explorer açılmaz", () => {
    h.state = {
      user: { uid: "u1", displayName: "Efe", backend: "device", requiresEmailVerification: true },
      checking: false,
    };

    render(createElement(App));

    expect(screen.queryByText("EXPLORER-YUKLENDI")).toBeNull();
  });

  it("profili eksik kullanıcıya Explorer açılmaz", () => {
    h.state = { user: { uid: "u1", displayName: "  ", backend: "device" }, checking: false };

    render(createElement(App));

    expect(screen.queryByText("EXPLORER-YUKLENDI")).toBeNull();
  });
});
