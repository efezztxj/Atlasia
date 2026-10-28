// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { createElement } from "react";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import ConfirmDialogHost, { requestConfirm } from "./ConfirmDialog";

beforeAll(() => {
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

describe("M-33 · ConfirmDialog ve yerel confirm() yasağı", () => {
  it("requestConfirm erişilebilir alertdialog açar, onay ve iptal sözünü doğru çözer ve axe temizdir", async () => {
    const { container } = render(createElement(ConfirmDialogHost));

    let outcome: boolean | null = null;
    await act(async () => {
      void requestConfirm({
        title: "İzi sil",
        message: "Efes Antik Tiyatro izini silmek istiyor musun?",
        confirmLabel: "Sil",
      }).then((accepted) => {
        outcome = accepted;
      });
    });

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("İzi sil")).toBeTruthy();
    expect(screen.getByText("Efes Antik Tiyatro izini silmek istiyor istiyor musun?".replace("istiyor istiyor", "istiyor"))).toBeTruthy();

    const audit = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(audit.violations).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    await act(async () => {});
    expect(outcome).toBe(true);
    expect(screen.queryByRole("alertdialog")).toBeNull();

    // İkinci çağrı: Escape ile iptal → false döner.
    let secondOutcome: boolean | null = null;
    await act(async () => {
      void requestConfirm("Bu hikâyeyi silmek istiyor musun?").then((accepted) => {
        secondOutcome = accepted;
      });
    });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await act(async () => {});
    expect(secondOutcome).toBe(false);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("src/components içinde tarayıcı yerel confirm() veya window.confirm() çağrısı kalmamıştır", () => {
    const dir = "src/components";
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".tsx") || file === "ConfirmDialog.tsx") continue;
      const source = readFileSync(join(dir, file), "utf8").replace(
        /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
        "",
      );
      expect(source, `${file} içinde window.confirm kullanılmış`).not.toMatch(/\bwindow\.confirm\s*\(/);
      // AccountAccess içindeki Firebase PhoneAuth `pendingPhone.current!.confirm(code)` hariç
      // çıplak `confirm(...)` çağrısı yasaktır.
      const stripped = source.replace(/\.confirm\s*\(/g, ".methodConfirm(");
      expect(stripped, `${file} içinde yerel confirm() kullanılmış`).not.toMatch(/\bconfirm\s*\(/);
    }
  });
});
