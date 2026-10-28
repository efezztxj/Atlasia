// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DataStatusBanner from "./DataStatusBanner";

afterEach(cleanup);

describe("DataStatusBanner · M-18 kalıcı veri durumu", () => {
  it("canlı veri hatasında mesajı gösterir ve yeniden dener", () => {
    const onRetry = vi.fn();
    render(createElement(DataStatusBanner, { kind: "remote", onRetry, onDismiss: () => {} }));

    const banner = screen.getByRole("status");
    expect(banner).toHaveProperty("dataset.kind", "remote");
    expect(banner.textContent).toContain("Canlı veriler yüklenemedi");

    fireEvent.click(screen.getByRole("button", { name: /Yeniden dene/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("yapılandırma yoksa uyarır ama 'Yeniden dene' sunmaz (denenecek şey yok)", () => {
    render(createElement(DataStatusBanner, { kind: "config", onDismiss: () => {} }));

    const banner = screen.getByRole("status");
    expect(banner).toHaveProperty("dataset.kind", "config");
    expect(banner.textContent).toContain("Bulut yapılandırması yok");
    expect(screen.queryByRole("button", { name: /Yeniden dene/ })).toBeNull();
  });

  it("kapatma düğmesi türe özgü etiket taşır ve çalışır", () => {
    const onDismiss = vi.fn();
    render(createElement(DataStatusBanner, { kind: "config", onDismiss }));

    fireEvent.click(screen.getByRole("button", { name: "Yapılandırma bilgisini kapat" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("kalıcıdır: alert değil status, ve kendi kendine kapanmaz", () => {
    vi.useFakeTimers();
    try {
      render(createElement(DataStatusBanner, { kind: "remote", onRetry: () => {}, onDismiss: () => {} }));
      // `alert` ekran okuyucuda akan okumayı keser; kalıcı durum için `status` doğru.
      expect(screen.getByRole("status")).toBeTruthy();
      expect(screen.queryByRole("alert")).toBeNull();
      vi.advanceTimersByTime(60_000);
      expect(screen.getByRole("status")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
