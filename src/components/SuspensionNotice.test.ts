// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SuspensionNotice from "./SuspensionNotice";

/**
 * Askıya alma ekranı: gerekçe ve bitiş görünür, çıkış çalışır.
 * Bu ekran bir *istemci* engeli; asıl yaptırım sunucu kurallarında.
 */
const ban = (overrides: Partial<Parameters<typeof SuspensionNotice>[0]["ban"]> = {}) => ({
  uid: "spammer",
  reason: "Tekrarlanan spam ve hakaret.",
  reportId: "r1",
  createdAt: Date.now(),
  createdBy: "mod-1",
  ...overrides,
});

describe("SuspensionNotice", () => {
  afterEach(() => cleanup());

  it("gerekçeyi ve kalıcı süreyi gösterir", () => {
    render(createElement(SuspensionNotice, { ban: ban(), onSignOut: () => {} }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Tekrarlanan spam ve hakaret.")).toBeTruthy();
    expect(screen.getByText(/Kalıcı/)).toBeTruthy();
  });

  it("süreli bantta bitiş tarihini yazar", () => {
    render(createElement(SuspensionNotice, { ban: ban({ expiresAt: Date.now() + 86400000 }), onSignOut: () => {} }));
    expect(screen.queryByText(/Kalıcı/)).toBeNull();
  });

  it("çıkış düğmesi geri çağrıyı tetikler", () => {
    const onSignOut = vi.fn();
    render(createElement(SuspensionNotice, { ban: ban(), onSignOut }));
    fireEvent.click(screen.getByRole("button", { name: /Çıkış yap/ }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
