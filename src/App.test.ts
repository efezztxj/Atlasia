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
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { analytics } from "./lib/analytics";
import App from "./App";

// Huni kablolaması (T2): analytics çağrılarını gözlemlemek için modül mock'lanır.
const tracked = vi.hoisted(() => [] as Array<{ name: string; props?: Record<string, unknown> }>);
vi.mock("./lib/analytics", () => {
  const record = (name: string) => (props?: Record<string, unknown>) => { tracked.push({ name, props }); };
  return {
    analytics: {
      appOpen: record("app_open"),
      sessionStart: record("session_start"),
      ctaClick: record("cta_click"),
      mapOpen: record("map_open"),
      signupStart: record("signup_start"),
      signupComplete: record("signup_complete"),
      signIn: record("sign_in"),
      firstRouteCreated: record("first_route_created"),
      audioGuideStart: record("audio_guide_start"),
      consentChoice: record("consent_choice"),
    },
  };
});

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

// Testler arası DOM sızmasın: her test kendi landing'ini kurar.
afterEach(() => cleanup());

describe("App kapısı", () => {
  it("oturumsuz ilk açılışta landing'i çizer ve boot ekranında takılmaz", async () => {
    render(createElement(App));

    await waitFor(() => expect(screen.getByRole("button", { name: /Dünyayı keşfet/i })).toBeTruthy());
    // T14: sayfadaki tek h1 slogandır; `atlasia.` dekoratif bir wordmark (aria-hidden).
    expect(screen.getByRole("heading", { level: 1, name: /Dünyayı merakınla keşfet/i })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole("status", { name: "Harita hazırlanıyor" })).toBeNull();
  });

  it("hero CTA'sı cta_click{placement:'hero'} gönderir (T2 kablolaması)", async () => {
    tracked.length = 0;
    render(createElement(App));
    const hero = await screen.findByRole("button", { name: /Dünyayı keşfet/i });
    fireEvent.click(hero);

    const cta = tracked.filter((entry) => entry.name === "cta_click");
    expect(cta).toHaveLength(1);
    expect(cta[0].props).toEqual({ placement: "hero", signedIn: false });
  });

  it("üst menü ve alt bilgi CTA'ları kendi yerleşim adlarını taşır", async () => {
    // Her CTA giriş ekranını açtığı için (T4'e kadar) her biri ayrı kurulumda denenir.
    for (const [index, placement] of [[0, "header"], [-1, "footer"]] as const) {
      cleanup();
      tracked.length = 0;
      render(createElement(App));
      const starts = await screen.findAllByRole("button", { name: /Keşfe başla/i });
      expect(starts.length).toBeGreaterThanOrEqual(2);
      fireEvent.click(starts.at(index)!);
      const sent = tracked.filter((entry) => entry.name === "cta_click").map((entry) => entry.props?.placement);
      expect(sent).toEqual([placement]);
    }
  });

  it("landing açılışında harita ya da kayıt olayı ateşlenmez (huni sırası)", async () => {
    tracked.length = 0;
    render(createElement(App));
    await screen.findByRole("button", { name: /Dünyayı keşfet/i });
    expect(tracked.some((entry) => ["map_open", "signup_start", "signup_complete"].includes(entry.name))).toBe(false);
    // Mock'un gerçekten bağlı olduğunu kanıtla: aynı örnek üzerinden yazınca kayıt düşüyor.
    analytics.ctaClick({ placement: "footer", signedIn: false });
    expect(tracked.at(-1)).toMatchObject({ name: "cta_click" });
  });
});
