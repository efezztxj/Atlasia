// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WCAG_AA_NORMAL, alphaTextContrast, contrastRatio, parseHex } from "../utils/contrast";
import { storageRemove } from "../utils/storage";
import {
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
  consumePendingCookiePreferences,
  expireCookie,
  openCookiePreferences,
  readCookieConsent,
  readRawCookie,
  resetPendingCookiePreferencesForTests,
} from "../lib/cookieConsent";
import CookieConsent from "./CookieConsent";
import { SettingsContent } from "./SettingsPanel";

function resetConsentState() {
  expireCookie(COOKIE_CONSENT_NAME, false);
  storageRemove(COOKIE_CONSENT_STORAGE_KEY);
}

beforeEach(() => {
  resetConsentState();
  resetPendingCookiePreferencesForTests();
});
afterEach(() => {
  cleanup();
  resetConsentState();
  resetPendingCookiePreferencesForTests();
});

describe("CookieConsent", () => {
  it("ilk ziyarette dürüst bilgilendirme kartını gösterir; sahte kabul veya anahtar içermez", () => {
    render(createElement(CookieConsent));

    expect(screen.getByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yalnız zorunlularla devam et" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ayrıntılar" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Gizlilik açıklaması" })).toBeTruthy();

    expect(screen.queryByText(/Tümünü kabul et/i)).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Çerez tercihlerini kapat" })).toBeNull();
  });

  it("Ayrıntılar düğmesi kategorileri ve gerçek depolama envanterini açar", () => {
    render(createElement(CookieConsent));

    const detailsBtn = screen.getByRole("button", { name: "Ayrıntılar" });
    fireEvent.click(detailsBtn);

    expect(detailsBtn.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Zorunlu")).toBeTruthy();
    expect(screen.getByText("Her zaman açık")).toBeTruthy();
    expect(screen.getByText("Analitik")).toBeTruthy();
    expect(screen.getByText("Pazarlama")).toBeTruthy();
    expect(screen.getAllByText("Kullanılmıyor")).toHaveLength(2);
    expect(screen.getByText(/atlasia\.theme\.v1/)).toBeTruthy();
    expect(screen.getByText(/IndexedDB/)).toBeTruthy();
    expect(screen.getByText(/Google App Check/)).toBeTruthy();
  });

  it("seçim kaydedilince atlasia_consent çerezini yazar, kartı kapatır ve yenilemede tekrar göstermez", () => {
    const first = render(createElement(CookieConsent));
    fireEvent.click(screen.getByRole("button", { name: "Yalnız zorunlularla devam et" }));

    expect(screen.queryByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeNull();
    expect(readRawCookie()).toBeTruthy();
    expect(readCookieConsent()?.version).toBe(1);
    first.unmount();

    const reloaded = render(createElement(CookieConsent));
    expect(reloaded.container.firstChild).toBeNull();
  });

  it("kayıtlı kullanıcı Ayarlar'dan yeniden açtığında X ve Escape ile kapatabilir", () => {
    render(createElement(CookieConsent));
    fireEvent.click(screen.getByRole("button", { name: "Yalnız zorunlularla devam et" }));
    expect(screen.queryByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeNull();

    act(() => {
      openCookiePreferences();
    });
    expect(screen.getByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeTruthy();
    const closeBtn = screen.getByRole("button", { name: "Çerez tercihlerini kapat" });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeNull();

    act(() => {
      openCookiePreferences();
    });
    expect(screen.getByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeNull();
  });

  it("Gizlilik açıklaması düğmesi LegalNotice penceresini tembel yükler", async () => {
    render(createElement(CookieConsent));
    fireEvent.click(screen.getByRole("button", { name: "Gizlilik açıklaması" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Gizlilik Açıklaması" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Okudum" }));
    expect(screen.queryByRole("dialog", { name: "Gizlilik Açıklaması" })).toBeNull();
  });

  it("yerleşim: masaüstünde sağ alt kart, mobilde güvenli alanlı alt sayfa (T7)", () => {
    const source = readFileSync("src/components/CookieConsent.tsx", "utf8");
    // Hero CTA'sı ekranın solunda; kart masaüstünde sağ alt köşeye yaslanır ki
    // "Dünyayı keşfet" hiçbir masaüstü genişliğinde örtülmesin.
    expect(source).toContain("md:right-6");
    expect(source).toContain("md:inset-x-auto");
    expect(source).not.toContain("md:left-6");
    // Mobilde tam genişlikte alt sayfa + çentik/gesture çubuğu güvenli alanı.
    expect(source).toContain("inset-x-0");
    expect(source).toContain("pb-[calc(1rem+env(safe-area-inset-bottom))]");

    render(createElement(CookieConsent));
    const card = screen.getByRole("heading", { name: "Çerez ve cihaz depolaması" }).closest("section");
    expect(card).not.toBeNull();
    expect(card?.className).toContain("fixed");
    expect(card?.className).toContain("z-[90]");
  });

  it("panel yüklenmeden gelen 'çerez tercihleri' isteği kaybolmaz (tembel yükleme)", () => {
    // T7: panel artık `lazy()`. Kullanıcı, parça inerken footer'daki düğmeye
    // basarsa olay dinleyicisi henüz yok — istek bayrakta beklemeli.
    openCookiePreferences();
    expect(consumePendingCookiePreferences()).toBe(true);
    expect(consumePendingCookiePreferences()).toBe(false); // bir kez tüketilir

    // Aynı akışın kullanıcıya görünen hâli: istek → panel bağlanır → açılır.
    openCookiePreferences();
    render(createElement(CookieConsent));
    expect(screen.getByRole("button", { name: "Yalnız zorunlularla devam et" })).toBeTruthy();
    // Kayıtlı rıza yoksa ilk kart zaten açıktır; ayırt etmek için kapatıp
    // yeniden istek gönderiyoruz.
    fireEvent.click(screen.getByRole("button", { name: "Yalnız zorunlularla devam et" }));
    cleanup();
    openCookiePreferences();
    render(createElement(CookieConsent));
    expect(screen.getByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeTruthy();
  });

  it("main.tsx içinde NetworkStatus ve UpdateNotice yanında bağlıdır", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    // 2026-10-28: panel tembel yüklenir (ilk boya JS'i küçültmek için);
    // bağlama yeri ve davranışı aynı: uygulamanın üstünde, Suspense içinde.
    expect(main).toContain('const CookieConsent = lazy(() => import("./components/CookieConsent"))');
    expect(main).toContain("<CookieConsent />");
    expect(main).toContain("<NetworkStatus />");
    expect(main).toContain("<UpdateNotice />");
  });

  it("Ayarlar > Çerez ve depolama ile uçtan uca bağlanır ve hata üretmez", () => {
    const pageErrors: unknown[] = [];
    const onError = (event: ErrorEvent) => pageErrors.push(event.error ?? event.message);
    window.addEventListener("error", onError);

    render(
      createElement(
        "div",
        null,
        createElement(SettingsContent, {
          theme: "light",
          onTheme: vi.fn(),
          installApp: {
            installed: false,
            canPrompt: false,
            busy: false,
            ios: false,
            install: vi.fn(async () => false),
            downloadHtml: vi.fn(async () => undefined),
          },
          location: {
            supported: true,
            secure: true,
            permission: "prompt",
            status: "idle",
            fix: null,
            label: null,
          },
          onAllowLocation: vi.fn(),
          onShowLocation: vi.fn(),
          onClearLocation: vi.fn(),
          mapBounds: null,
        }),
        createElement(CookieConsent),
      ),
    );

    expect(screen.getByText(/Henüz seçim kaydedilmedi/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yalnız zorunlularla devam et" }));
    expect(screen.queryByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeNull();
    expect(screen.getByText(/Yalnız zorunlu · Kaydedildi:/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Tercihleri aç" }));
    expect(screen.getByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("heading", { name: "Çerez ve cihaz depolaması" })).toBeNull();

    window.removeEventListener("error", onError);
    expect(pageErrors).toHaveLength(0);
  });

  it("Açık, Koyu ve Gece temalarında tüm kart metinleri WCAG AA kontrastını geçer", () => {
    const palettes = [
      { name: "dark", ink2: "#04201b", ink3: "#072b24", mint: "#e4f5ea", sun: "#eab54f", leaf: "#5be0a6" },
      { name: "light", ink2: "#ffffff", ink3: "#f1f4f6", mint: "#12332b", sun: "#9a631c", leaf: "#167b59" },
      { name: "midnight", ink2: "#0a2438", ink3: "#10324e", mint: "#f3ead3", sun: "#d9a94f", leaf: "#79c7a3" },
    ];
    for (const p of palettes) {
      expect(contrastRatio(parseHex(p.mint), parseHex(p.ink2)), `${p.name} mint/ink2`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(alphaTextContrast(p.mint, p.ink2, 75), `${p.name} mint75/ink2`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(alphaTextContrast(p.mint, p.ink3, 75), `${p.name} mint75/ink3`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(alphaTextContrast(p.mint, p.ink3, 80), `${p.name} mint80/ink3`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(contrastRatio(parseHex(p.sun), parseHex(p.ink2)), `${p.name} sun/ink2`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(contrastRatio(parseHex(p.leaf), parseHex(p.ink2)), `${p.name} leaf/ink2`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
    expect(contrastRatio(parseHex("#10241a"), parseHex("#eab54f"))).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });
});
