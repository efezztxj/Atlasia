// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DataErrorBar from "./DataErrorBar";

afterEach(cleanup);

describe("DataErrorBar · M-18 kalıcı veri hatası şeridi", () => {
  it("veri hatasında durumu ve yeniden deneme düğmesini gösterir", () => {
    const onRetry = vi.fn();
    render(createElement(DataErrorBar, { kind: "remote", onRetry }));

    const bar = screen.getByRole("status");
    expect(bar).toHaveProperty("dataset.kind", "remote");
    expect(bar.textContent).toContain("Canlı veriler yüklenemedi");
    // Yerel kopyaya düşüldüğü açıkça söylenir (sessiz düşüş yok).
    expect(bar.textContent).toContain("Son kopya gösteriliyor");

    fireEvent.click(screen.getByRole("button", { name: /Yeniden dene/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("deneme sürerken düğme kilitlenir ve ikinci istek üretmez", () => {
    const onRetry = vi.fn();
    render(createElement(DataErrorBar, { kind: "remote", retrying: true, onRetry }));

    const button = screen.getByRole("button", { name: /Deneniyor/ });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("yapılandırma eksikliğinde yeniden deneme sunmaz (denenecek bir şey yok)", () => {
    render(createElement(DataErrorBar, { kind: "config" }));

    const bar = screen.getByRole("status");
    expect(bar).toHaveProperty("dataset.kind", "config");
    expect(bar.textContent).toContain("Bulut yapılandırması eksik");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("Toast gibi kaybolmaz: kendi kendine kapanan zamanlayıcı kurmaz", () => {
    vi.useFakeTimers();
    try {
      render(createElement(DataErrorBar, { kind: "remote", onRetry: () => undefined }));
      vi.advanceTimersByTime(60_000);
      expect(screen.getByRole("status")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
