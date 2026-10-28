// @vitest-environment jsdom
/**
 * T13–T16 kilidi — landing erişilebilirlik turu.
 *
 * T13 mobil menü (768 px altında erişim, Escape, odak tuzağı, odak iadesi)
 * T14 skip-link + tutarlı `:focus-visible`
 * T15 `prefers-reduced-motion` altında animasyon/geçiş yok
 * T16 tek H1, hiyerarşi atlaması yok, marka yazısı dekoratif
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LandingPage from "../components/LandingPage";

const css = readFileSync("src/index.css", "utf8");

afterEach(() => cleanup());

function renderLanding() {
  const onStart = vi.fn();
  render(createElement(LandingPage, { onStart }));
  return { onStart };
}

describe("T13 · mobil menü", () => {
  it("hamburger düğmesi aria-expanded/aria-controls taşır ve paneli açar", async () => {
    renderLanding();
    const button = screen.getByRole("button", { name: "Menü" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe("landing-menu");

    fireEvent.click(button);
    const panel = await screen.findByRole("dialog", { name: "Site menüsü" });
    expect(panel.id).toBe("landing-menu");
    expect(screen.getByRole("button", { name: "Menüyü kapat" })).toBeTruthy();
    // 390 px'te üç bağlantı da erişilebilir (masaüstü nav gizli olsa da panelde var).
    const menu = within(panel);
    // İki gezinme hedefi bağlantı; "Gizlilik" yasal metni iletişim kutusunda
    // açtığı için düğme (ana dalın sözleşmesi) — ikisi de menüden erişilebilir.
    for (const label of ["Keşfet", "Nasıl çalışır?"]) {
      expect(menu.getByRole("link", { name: label })).toBeTruthy();
    }
    expect(menu.getByRole("button", { name: "Gizlilik" })).toBeTruthy();
  });

  it("açılınca odak panele girer, Escape kapatır ve odak düğmeye döner", async () => {
    renderLanding();
    const button = screen.getByRole("button", { name: "Menü" });
    fireEvent.click(button);
    const panel = await screen.findByRole("dialog", { name: "Site menüsü" });

    await waitFor(() => {
      expect(panel.contains(document.activeElement)).toBe(true);
      expect(document.activeElement?.tagName).toBe("A");
    });

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Site menüsü" })).toBeNull());
    expect(document.activeElement).toBe(button);
  });

  it("Tab panelin dışına kaçmaz (odak tuzağı)", async () => {
    renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "Menü" }));
    const panel = await screen.findByRole("dialog", { name: "Site menüsü" });
    const focusables = panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    const last = focusables[focusables.length - 1];
    last.focus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(focusables[0]);
  });
});

describe("T14 · klavye", () => {
  it("sayfanın ilk odağı 'İçeriğe geç' bağlantısı ve hedefi odaklanabilir", () => {
    renderLanding();
    const skip = screen.getByRole("link", { name: "İçeriğe geç" });
    expect(skip.getAttribute("href")).toBe("#kesfet");
    const target = document.getElementById("kesfet");
    expect(target).not.toBeNull();
    expect(target?.getAttribute("tabindex")).toBe("-1");
    // Kaynak sırası: skip-link, main'den önce.
    const main = document.querySelector("main");
    expect(skip.compareDocumentPosition(main!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("global :focus-visible halkası zaten var ve yalnız bir kez tanımlı", () => {
    // Denetim bulgusu: T14'ün odak halkası repoda 2026-10-24'ten beri var
    // (`outline: 3px solid var(--color-sun)`); bu turda kopya tanım eklenmedi.
    const definitions = css.match(/^:focus-visible \{/gm) ?? [];
    expect(definitions).toHaveLength(1);
    expect(css).toContain("outline: 3px solid var(--color-sun)");
  });
});

describe("T15 · hareket azaltma", () => {
  it("reduced-motion bloğu animasyon, geçiş ve yumuşak kaydırmayı kapatır; tek blok", () => {
    const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]);
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block).toContain("animation-duration: 0.01ms");
    expect(block).toContain("transition-duration: 0.01ms");
    // Denetim bulgusu: `scroll-behavior` eksikti; landing'deki `scroll-smooth`
    // tercihi yok sayılıyordu. Bu turda eklendi.
    expect(block).toContain("scroll-behavior: auto");
    expect(block).toContain("!important");
  });
});

describe("T16 · semantik", () => {
  it("tek H1 var ve vaadi taşıyor", () => {
    renderLanding();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toMatch(/Dünyayı\s+merakınla\s+keşfet/);
  });

  it("hiyerarşi atlaması yok: h1 → h2 → h3", () => {
    renderLanding();
    const levels = screen.getAllByRole("heading").map((node) => Number(node.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1);
      expect(levels[index]).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(levels)).toEqual(new Set([1, 2, 3]));
  });

  it("marka yazısı dekoratif: ekran okuyucuya iki kez 'atlasia' okunmuyor", () => {
    renderLanding();
    const decorative = document.querySelector('div[aria-hidden="true"]');
    expect(decorative?.textContent).toBe("atlasia.");
  });
});
