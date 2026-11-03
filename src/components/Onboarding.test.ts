// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Onboarding from "./Onboarding";

afterEach(cleanup);

describe("İlk kullanımda açık beklentiler", () => {
  it("misafire hesap ve konum gereksinimlerini söyler; izin vermeden harita seçilebilir", () => {
    const onClose = vi.fn();
    const onNearby = vi.fn();
    render(createElement(Onboarding, { guest: true, onClose, onNearby, onRoute: vi.fn(), onLeave: vi.fn() }));
    expect(screen.getByText(/rota oluşturmak için hesap açman/).textContent).toContain("giriş yapman");
    expect(screen.getByText(/konum izni istenir/)).toBeTruthy();
    expect(screen.getByText(/konum izni vermeden haritaya/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Önce haritaya bakayım" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onNearby).not.toHaveBeenCalled();
  });

  it("yakınındaki izleri seçmek yalnız ilgili eylemi çağırır", () => {
    const onNearby = vi.fn();
    const onRoute = vi.fn();
    render(createElement(Onboarding, { onClose: vi.fn(), onNearby, onRoute, onLeave: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: /Yakınımdaki izleri göster/ }));
    expect(onNearby).toHaveBeenCalledOnce();
    expect(onRoute).not.toHaveBeenCalled();
    expect(screen.queryByText(/Misafir olarak geziyorsun/)).toBeNull();
  });
});
