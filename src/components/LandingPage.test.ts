// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./LandingPage";

afterEach(() => cleanup());

describe("landing CTA hiyerarşisi (T8)", () => {
  it("hero'da tek birincil CTA'yı gösterir; alt eylemler ikincil/üçüncül kalır", () => {
    render(createElement(LandingPage, { onStart: vi.fn() }));

    const primary = screen.getByRole("button", { name: /Dünyayı keşfet/i });
    expect(primary.getAttribute("data-cta-level")).toBe("primary");
    expect(primary.className).toContain("bg-[#f3c870]");
    expect(document.querySelectorAll('[data-cta-level="primary"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-cta-level="secondary"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-cta-level="tertiary"]')).toHaveLength(1);
  });

  it("mobil menü açıldığında kendi birincil keşif CTA'sını sunar", () => {
    render(createElement(LandingPage, { onStart: vi.fn() }));

    fireEvent.click(screen.getByRole("button", { name: "Menü" }));
    const menu = screen.getByRole("dialog", { name: "Site menüsü" });
    const menuCta = within(menu).getByRole("button", { name: /Keşfe başla/i });
    expect(menuCta.getAttribute("data-cta-level")).toBe("primary");
    expect(menuCta.className).toContain("bg-[#f3c870]");
  });

  it("yerleşim CTA'ları doğru kaynakla aynı başlangıç akışını açar", () => {
    const onStart = vi.fn();
    render(createElement(LandingPage, { onStart }));

    fireEvent.click(screen.getByRole("button", { name: /Dünyayı keşfet/i }));
    fireEvent.click(document.querySelector('[data-cta-level="secondary"]')!);
    fireEvent.click(screen.getByRole("button", { name: /Rotanı oluşturmaya başla/i }));
    fireEvent.click(document.querySelector('[data-cta-level="tertiary"]')!);

    fireEvent.click(screen.getByRole("button", { name: "Menü" }));
    const menu = screen.getByRole("dialog", { name: "Site menüsü" });
    fireEvent.click(within(menu).getByRole("button", { name: /Keşfe başla/i }));

    expect(onStart.mock.calls).toEqual([
      ["hero"],
      ["header"],
      ["how_it_works"],
      ["footer"],
      ["header"],
    ]);
  });
});
