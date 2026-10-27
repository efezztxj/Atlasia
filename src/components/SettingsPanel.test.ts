// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_PREFERENCES_EVENT,
  expireCookie,
  saveEssentialCookieConsent,
} from "../lib/cookieConsent";
import { storageRemove } from "../utils/storage";
import { SettingsContent, type SettingsContentProps } from "./SettingsPanel";

function resetConsent() {
  expireCookie(COOKIE_CONSENT_NAME, false);
  storageRemove(COOKIE_CONSENT_STORAGE_KEY);
}

beforeEach(resetConsent);
afterEach(() => {
  cleanup();
  resetConsent();
});

function makeProps(overrides: Partial<SettingsContentProps> = {}): SettingsContentProps {
  return {
    theme: "dark",
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
    ...overrides,
  };
}

describe("SettingsContent", () => {
  it("tema, uygulama ve konum ayarlarını gösterir; harita altlığı ve gösterimi Katmanlar kısayoluna taşındı", () => {
    render(createElement(SettingsContent, makeProps()));

    for (const heading of ["Görünüm", "Erişilebilirlik", "Çevrimdışı harita", "Uygulama", "Konum ve gizlilik"]) {
      expect(screen.getByText(heading)).toBeTruthy();
    }
    expect(screen.queryByText("Harita altlığı")).toBeNull();
    expect(screen.queryByText("Harita gösterimi")).toBeNull();
    expect(document.getElementById("location-settings")).toBeTruthy();
    expect(document.getElementById("accessibility-title")).toBeTruthy();
  });

  it("erişilebilirlik anahtarları ve yazı boyutu seçimi çalışır", () => {
    render(createElement(SettingsContent, makeProps()));

    const motion = screen.getByRole("switch", { name: "Hareketi azalt" });
    expect(motion.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(motion);
    expect(motion.getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.dataset.motion).toBe("reduced");

    const contrast = screen.getByRole("switch", { name: "Yüksek kontrast" });
    fireEvent.click(contrast);
    expect(contrast.getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.dataset.contrast).toBe("high");

    fireEvent.click(screen.getByRole("button", { name: "Büyük" }));
    expect(document.documentElement.dataset.textScale).toBe("large");
    expect(screen.getByRole("button", { name: "Büyük" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("tema anahtarlarını doğru işleyicilere bağlar", () => {
    const props = makeProps();
    render(createElement(SettingsContent, props));

    fireEvent.click(screen.getByRole("button", { name: "Açık" }));
    fireEvent.click(screen.getByRole("button", { name: "Gece" }));

    expect(props.onTheme).toHaveBeenCalledWith("light");
    expect(props.onTheme).toHaveBeenCalledWith("midnight");
  });

  it("Çerez ve depolama satırı durumu gösterir, tercih olayını gönderir ve kayıt sonrası güncellenir", () => {
    render(createElement(SettingsContent, makeProps()));

    expect(screen.getByText("Çerez ve depolama")).toBeTruthy();
    expect(screen.getByText(/Henüz seçim kaydedilmedi/)).toBeTruthy();

    const onOpenPreferences = vi.fn();
    window.addEventListener(COOKIE_PREFERENCES_EVENT, onOpenPreferences);
    fireEvent.click(screen.getByRole("button", { name: "Tercihleri aç" }));
    window.removeEventListener(COOKIE_PREFERENCES_EVENT, onOpenPreferences);
    expect(onOpenPreferences).toHaveBeenCalledOnce();

    act(() => {
      saveEssentialCookieConsent(new Date("2026-10-25T10:00:00.000Z"));
    });
    expect(screen.getByText(/Yalnız zorunlu · Kaydedildi:/)).toBeTruthy();
    expect(screen.getByText(/2026/)).toBeTruthy();
  });
});
