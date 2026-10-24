// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createReport = vi.hoisted(() => vi.fn());
vi.mock("../lib/moderation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/moderation")>();
  return { ...actual, createReport };
});

import ReportDialog from "./ReportDialog";

/**
 * Denetim K-08 kilidi: başarılı gönderimden sonra kurulan 900 ms'lik kapanış
 * zamanlayıcısı unmount'ta iptal edilir; kapanmış pencerenin zamanlayıcısı
 * ebeveyne ikinci bir `onClose` göndermez.
 */
describe("ReportDialog", () => {
  beforeEach(() => {
    createReport.mockReset();
    createReport.mockResolvedValue("report-1");
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("gönderim sonrası unmount edilirse onClose tekrar çağrılmaz", async () => {
    const onClose = vi.fn();
    const onReported = vi.fn();
    const { unmount } = render(createElement(ReportDialog, {
      targetType: "post",
      targetId: "p1",
      reporterUid: "u1",
      onClose,
      onReported,
    }));

    fireEvent.click(screen.getByRole("button", { name: /Gönder/ }));
    // Bildirim yazımı çözülene kadar bekle (mikro görev turu).
    await vi.waitFor(() => expect(createReport).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(screen.getByRole("status")).toBeTruthy());

    unmount();
    vi.advanceTimersByTime(5_000);

    expect(onClose).not.toHaveBeenCalled();
    expect(onReported).not.toHaveBeenCalled();
  });
});
