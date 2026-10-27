// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncementBanner, WarningNotice } from "./ModerationNotices";

/**
 * Uyarı bildirimi ve duyuru şeridi: kullanıcı yüzündeki iki ayrıcalıklı
 * moderasyon çıktısı. Uyarı "Anladım" ile okundu işaretlenir; duyuru
 * kapatma bilgisi üst bileşende (cihazda) saklanır.
 */
describe("WarningNotice", () => {
  afterEach(() => cleanup());

  it("gerekçeyi gösterir ve onay geri çağrısını tetikler", () => {
    const onAcknowledge = vi.fn();
    render(createElement(WarningNotice, {
      warning: { id: "w1", uid: "u1", reason: "Küfürlü yorumların tekrarı.", reportId: "r1", createdBy: "mod-1", createdAt: Date.now(), read: false },
      onAcknowledge,
    }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Küfürlü yorumların tekrarı.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Anladım" }));
    expect(onAcknowledge).toHaveBeenCalledWith("w1");
  });
});

describe("AnnouncementBanner", () => {
  afterEach(() => cleanup());

  it("duyuruyu gösterir ve kapatma kimliğini iletir", () => {
    const onDismiss = vi.fn();
    render(createElement(AnnouncementBanner, {
      announcement: { id: "ann1", title: "Bakım", body: "Bu gece kısa bakım var.", createdBy: "mod-1", createdAt: Date.now() },
      onDismiss,
    }));
    expect(screen.getByText("Bakım")).toBeTruthy();
    expect(screen.getByText("Bu gece kısa bakım var.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Duyuruyu kapat" }));
    expect(onDismiss).toHaveBeenCalledWith("ann1");
  });
});
