// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement, Fragment } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { usePanelAccess } from "./usePanelAccess";

interface PanelProps {
  open: boolean;
  onClose: () => void;
  modal?: boolean;
}

function Panel({ open, onClose, modal = false }: PanelProps) {
  const ref = usePanelAccess(open, onClose, modal);
  return createElement(
    Fragment,
    null,
    createElement("button", { type: "button" }, "Dış"),
    createElement(
      "div",
      { ref },
      createElement("button", { type: "button" }, "İlk"),
      createElement("input", { "aria-label": "Orta alan" }),
      createElement("button", { type: "button" }, "Son"),
    ),
  );
}

function keyDown(key: string, shiftKey = false): void {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }));
  });
}

beforeAll(() => {
  // jsdom layout hesaplamaz; modal odak tuzağının offsetParent filtresi için
  // bağlı öğeleri görünür kabul eden kararlı bir karşılık gerekir.
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get(this: HTMLElement) {
      return this === document.body ? null : document.body;
    },
  });
});

afterEach(() => {
  cleanup();
});

describe("usePanelAccess", () => {
  it("kapalıyken odak çalmaz ve Escape dinleyicisi kurmaz", () => {
    const onClose = vi.fn();
    render(createElement(Panel, { open: false, onClose }));

    keyDown("Escape");

    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it("açılınca ilk kontrole odaklanır, en güncel onClose ile Escape kapatır", async () => {
    const firstClose = vi.fn();
    const latestClose = vi.fn();
    const view = render(createElement(Panel, { open: false, onClose: firstClose }));
    const outside = screen.getByRole("button", { name: "Dış" });
    outside.focus();

    view.rerender(createElement(Panel, { open: true, onClose: firstClose }));
    const first = screen.getByRole("button", { name: "İlk" });
    await waitFor(() => expect(document.activeElement).toBe(first));

    view.rerender(createElement(Panel, { open: true, onClose: latestClose }));
    keyDown("Escape");

    expect(firstClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledTimes(1);
  });

  it("modal modunda Tab ve Shift+Tab odağı panel içinde çevirir", async () => {
    render(createElement(Panel, { open: true, onClose: vi.fn(), modal: true }));
    const first = screen.getByRole("button", { name: "İlk" });
    const last = screen.getByRole("button", { name: "Son" });
    await waitFor(() => expect(document.activeElement).toBe(first));

    last.focus();
    keyDown("Tab");
    expect(document.activeElement).toBe(first);

    keyDown("Tab", true);
    expect(document.activeElement).toBe(last);
  });

  it("modal olmadığında Tab tuzağı kurmaz", async () => {
    render(createElement(Panel, { open: true, onClose: vi.fn(), modal: false }));
    const first = screen.getByRole("button", { name: "İlk" });
    const last = screen.getByRole("button", { name: "Son" });
    await waitFor(() => expect(document.activeElement).toBe(first));

    last.focus();
    keyDown("Tab");

    expect(document.activeElement).toBe(last);
  });

  it("kapanınca odağı panelden önceki öğeye geri verir", async () => {
    const view = render(createElement(Panel, { open: false, onClose: vi.fn() }));
    const outside = screen.getByRole("button", { name: "Dış" });
    outside.focus();

    view.rerender(createElement(Panel, { open: true, onClose: vi.fn() }));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "İlk" })),
    );

    view.rerender(createElement(Panel, { open: false, onClose: vi.fn() }));
    expect(document.activeElement).toBe(outside);
  });
});
