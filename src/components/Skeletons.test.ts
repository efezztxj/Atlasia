// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FeedSkeleton, GallerySkeleton, SearchListSkeleton } from "./Skeletons";

afterEach(cleanup);

describe("Skeletons · M-19 yükleme iskeletleri", () => {
  it("feed iskeleti tek bir durum bildirir, kutuları ekran okuyucudan saklar", () => {
    const { container } = render(createElement(FeedSkeleton, { count: 2 }));

    const status = screen.getByRole("status");
    expect(status).toHaveProperty("dataset.skeleton", "feed");
    expect(status.textContent).toContain("Gönderiler yükleniyor");
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(2);
  });

  it("arama iskeleti sonuç satırlarının yerini tutar", () => {
    const { container } = render(createElement(SearchListSkeleton, { count: 3 }));
    expect(screen.getByRole("status").textContent).toContain("Arama sonuçları yükleniyor");
    // Her satır: ikon + iki metin bloğu.
    expect(container.querySelectorAll(".skeleton").length).toBe(9);
  });

  it("galeri iskeleti fotoğraf yer tutucusudur", () => {
    render(createElement(GallerySkeleton));
    const status = screen.getByRole("status");
    expect(status).toHaveProperty("dataset.skeleton", "gallery");
    expect(status.textContent).toContain("Fotoğraflar yükleniyor");
  });

  it("hiçbir iskelet kutunun kendisi okunmaz (aria-hidden)", () => {
    const { container } = render(createElement(FeedSkeleton, { count: 1 }));
    for (const box of container.querySelectorAll(".skeleton")) {
      expect(box.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
