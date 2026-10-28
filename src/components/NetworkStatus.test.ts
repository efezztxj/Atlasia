// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NetworkStatus from "./NetworkStatus";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("M-48 · NetworkStatus (çevrimdışı ve captive-portal algısı)", () => {
  it("çevrimiçi ve /index.html yoklaması başarılıyken şerit göstermez", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));

    const { container } = render(createElement(NetworkStatus));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(container.firstChild).toBeNull();
  });

  it("çevrimdışı olunca uyarı şeridi açar ve axe ihlali üretmez", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { container } = render(createElement(NetworkStatus));

    expect(screen.getByRole("status").textContent).toContain("Çevrimdışısın");
    const audit = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(audit.violations).toEqual([]);
  });

  it("navigator.onLine true olsa bile captive portal / başarısız yoklamada bağlantı doğrulanamadı uyarısı verir", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("DNS hatası"));

    render(createElement(NetworkStatus));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("Bağlantı doğrulanamadı");
    });

    // Tekrar online olayı ve başarılı yoklama geldiğinde şerit kapanır.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    act(() => {
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
