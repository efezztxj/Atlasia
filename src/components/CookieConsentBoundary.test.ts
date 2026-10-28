// @vitest-environment jsdom
import { createElement, lazy, Suspense, useEffect, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CookieConsentBoundary from "./CookieConsentBoundary";
import { COOKIE_PREFERENCES_EVENT } from "../lib/cookieConsent";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function RecoveredConsent() {
  const [openedViaEvent, setOpenedViaEvent] = useState(false);
  useEffect(() => {
    const handler = () => setOpenedViaEvent(true);
    window.addEventListener(COOKIE_PREFERENCES_EVENT, handler);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, handler);
  }, []);
  return createElement(
    "div",
    { "data-testid": "recovered-consent" },
    openedViaEvent ? "Çerez tercihleri açık" : "Çerez bandı hazır",
  );
}

describe("CookieConsentBoundary (T7/T18 tembel parça dayanıklılığı)", () => {
  it("tembel parça indirilemezse uygulamayı düşürmez ve Tekrar dene ile taze parçayı yükler", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    let attempts = 0;
    const load = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("ChunkLoadError");
      return { default: RecoveredConsent };
    });

    const InitialBrokenLazy = lazy(load);

    render(
      createElement(
        "div",
        null,
        createElement("main", { "data-testid": "app-shell" }, "Ana uygulama açık"),
        createElement(
          CookieConsentBoundary,
          { load },
          createElement(Suspense, { fallback: null }, createElement(InitialBrokenLazy)),
        ),
      ),
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Çerez tercihleri yüklenemedi");
    expect(screen.getByTestId("app-shell").textContent).toBe("Ana uygulama açık");
    expect(warnSpy).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));

    await waitFor(() => {
      expect(screen.getByTestId("recovered-consent").textContent).toBe("Çerez tercihleri açık");
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("parça başarısızken footer 'Çerez tercihleri' olayı tetiklenirse otomatik yeniden dener", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    let attempts = 0;
    const load = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("Offline");
      return { default: RecoveredConsent };
    });
    const InitialBrokenLazy = lazy(load);

    render(
      createElement(
        CookieConsentBoundary,
        { load },
        createElement(Suspense, { fallback: null }, createElement(InitialBrokenLazy)),
      ),
    );

    await screen.findByRole("alert");
    fireEvent(window, new Event(COOKIE_PREFERENCES_EVENT));

    await waitFor(() => {
      expect(screen.getByTestId("recovered-consent").textContent).toBe("Çerez tercihleri açık");
    });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
