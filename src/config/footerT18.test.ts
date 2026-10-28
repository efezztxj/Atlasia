// @vitest-environment jsdom
/**
 * T18 — footer: dil bilgisi + yasal erişim + çerez tercihlerini geri alma.
 *
 * NEDEN VAR: 2026-10-28 denetiminde landing footer'ında yalnız üç yasal metin
 * vardı; çerez rızasını **geri alma** yolu sadece uygulama içi ayarlarda
 * kalıyordu (KVKK'da geri alma, verme kadar görünür olmalı). Dil iddiası da
 * hiçbir yerde yazmıyordu.
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LandingPage from "../components/LandingPage";
import { COOKIE_PREFERENCES_EVENT } from "../lib/cookieConsent";

afterEach(() => cleanup());

describe("T18 · footer yüzeyi", () => {
  it("üç yasal metin ve çerez tercihleri aynı nav'da", () => {
    render(createElement(LandingPage, { onStart: vi.fn() }));
    const nav = screen.getByRole("navigation", { name: "Yasal" });
    for (const label of ["Gizlilik", "KVKK aydınlatma", "Kullanım koşulları", "Çerez tercihleri"]) {
      expect(nav.textContent).toContain(label);
    }
  });

  it("çerez tercihleri düğmesi rıza panelini açar (olayı yayar)", () => {
    const onOpen = vi.fn();
    window.addEventListener(COOKIE_PREFERENCES_EVENT, onOpen);
    render(createElement(LandingPage, { onStart: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Çerez tercihleri" }));
    window.removeEventListener(COOKIE_PREFERENCES_EVENT, onOpen);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("site dili yazılı ve `lang` ile tutarlı", () => {
    render(createElement(LandingPage, { onStart: vi.fn() }));
    const line = screen.getByText(/Site dili: Türkçe \(tr\)/);
    expect(line.getAttribute("lang")).toBe("tr");
  });
});
