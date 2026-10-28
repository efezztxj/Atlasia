// @vitest-environment jsdom
import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LandingPage from "./LandingPage";

describe("landing CTA hiyerarşisi (T8)", () => {
  it("tek bir birincil CTA'yı öne çıkarır; diğer başlangıç yolları ikincil kalır", () => {
    const onStart = vi.fn();
    render(createElement(LandingPage, { onStart }));

    const primary = screen.getByRole("button", { name: /Dünyayı keşfet/i });
    const ctas = screen.getAllByRole("button").filter((button) => button.hasAttribute("data-cta-level"));

    expect(ctas.filter((button) => button.getAttribute("data-cta-level") === "primary")).toEqual([primary]);
    expect(primary.className).toContain("bg-[#f3c870]");
    expect(ctas.filter((button) => button.getAttribute("data-cta-level") === "secondary")).toHaveLength(2);
    expect(ctas.filter((button) => button.getAttribute("data-cta-level") === "tertiary")).toHaveLength(1);
  });

  it("tüm CTA seviyeleri aynı keşif başlangıç akışını açar", () => {
    const onStart = vi.fn();
    render(createElement(LandingPage, { onStart }));

    screen.getAllByRole("button").filter((button) => button.hasAttribute("data-cta-level")).forEach((button) => fireEvent.click(button));

    expect(onStart).toHaveBeenCalledTimes(4);
  });
});
