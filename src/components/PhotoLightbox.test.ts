// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PhotoLightbox from "./PhotoLightbox";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("fotoğraf tam ekran", () => {
  const photo = { url: "/images/efes/prytaneion.jpg", alt: "Prytaneion kalıntıları", credit: "Elelicht · CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:X.jpg" };

  it("görseli kırpmadan gösterir ve atfı bağlantılı verir", () => {
    render(createElement(PhotoLightbox, { photo, onClose: vi.fn() }));
    const dialog = screen.getByRole("dialog", { name: "Fotoğraf, tam ekran" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const img = screen.getByRole("img", { name: "Prytaneion kalıntıları" }) as HTMLImageElement;
    // object-contain: tam ekranda fotoğraf kırpılmaz.
    expect(img.className).toContain("object-contain");
    expect(screen.getByRole("link", { name: "Elelicht · CC BY-SA 3.0" }).getAttribute("href")).toBe(photo.source);
  });

  it("kapat düğmesi, görsele dokunma ve Escape kapatır", () => {
    const onClose = vi.fn();
    const view = render(createElement(PhotoLightbox, { photo, onClose }));
    fireEvent.click(screen.getByRole("button", { name: "Tam ekrandan çık" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    // Görsel alanı da kapatır (tam ekranda dışına dokunma karşılığı).
    fireEvent.click(screen.getByRole("button", { name: "Fotoğraf alanına dokunarak tam ekrandan çık" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
    view.unmount();
  });

  it("açılınca kapat düğmesine odaklanır ve arka plan kaydırmasını kilitler", () => {
    render(createElement(PhotoLightbox, { photo, onClose: vi.fn() }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Tam ekrandan çık" }));
    expect(document.body.style.overflow).toBe("hidden");
    cleanup();
    // Kapanınca kaydırma geri açılır; aksi hâlde harita donmuş kalırdı.
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("Escape haritanın kendi kapatma davranışına sızmaz", () => {
    const onClose = vi.fn();
    const outer = vi.fn();
    window.addEventListener("keydown", outer);
    render(createElement(PhotoLightbox, { photo, onClose }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    window.removeEventListener("keydown", outer);
  });
});
