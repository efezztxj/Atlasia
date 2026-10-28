// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "./AppErrorBoundary";
import * as telemetryModule from "../lib/telemetry";

function BrokenChild(): never {
  throw new Error("Harita katmanı çöktü");
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("M-48 · AppErrorBoundary (kök çökme koruması ve PII-siz telemetri)", () => {
  it("sağlıklı alt ağacı olduğu gibi render eder", () => {
    render(createElement(AppErrorBoundary, null, createElement("p", null, "Harita hazır")));
    expect(screen.getByText("Harita hazır")).toBeTruthy();
  });

  it("çökme anında kurtarma ekranı gösterir, PII yığını göndermeden captureError çağırır ve axe temizdir", async () => {
    const captureError = vi.spyOn(telemetryModule.getTelemetry(), "captureError");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(createElement(AppErrorBoundary, null, createElement(BrokenChild)));

    expect(screen.getByRole("heading", { name: "Harita bu kez yüklenemedi" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Yeniden yükle/ })).toBeTruthy();
    expect(captureError).toHaveBeenCalledTimes(1);
    expect(captureError.mock.calls[0]?.[1]).toEqual({
      source: "AppErrorBoundary",
      boundary: "root",
    });

    const audit = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(audit.violations).toEqual([]);
  });
});
