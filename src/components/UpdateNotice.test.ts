// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UpdateNotice from "./UpdateNotice";
import * as swHook from "../hooks/useServiceWorkerUpdate";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("M-48 · UpdateNotice (servis çalışanı yeni sürüm bildirimi)", () => {
  it("güncelleme hazır değilken görünmez", () => {
    vi.spyOn(swHook, "useServiceWorkerUpdate").mockReturnValue({
      ready: false,
      applying: false,
      apply: vi.fn(),
    });
    const { container } = render(createElement(UpdateNotice));
    expect(container.firstChild).toBeNull();
  });

  it("yeni sürüm hazır olduğunda Yenile ve Kapat eylemlerini çalıştırır ve axe temizdir", async () => {
    const apply = vi.fn();
    vi.spyOn(swHook, "useServiceWorkerUpdate").mockReturnValue({
      ready: true,
      applying: false,
      apply,
    });

    const { container } = render(createElement(UpdateNotice));
    expect(screen.getByRole("status").textContent).toContain("Yeni sürüm hazır");

    const audit = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(audit.violations).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Yenile" }));
    expect(apply).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Güncelleme bildirimini kapat" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
