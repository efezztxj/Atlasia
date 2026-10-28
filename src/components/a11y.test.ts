// @vitest-environment jsdom
/**
 * Erişilebilirlik kapısı (M-46).
 *
 * NEDEN VAR: elle yazılan `aria-*` testleri yalnız "yazdığımız şeyi" doğrular;
 * axe, unuttuğumuz kuralı yakalar (etiketsiz alan, düşük kontrast hariç olmak
 * üzere ad/rol/değer hataları, `lang` eksikliği, sıra dışı başlık düzeyleri…).
 *
 * KURAL: yeni ihlal _eklenmez_; ihlal listesi sabittir ve aşağıdaki
 * gerekçelerle sınırlıdır. Yeni bir ihlal çıkarsa test kırılır → ya kod
 * düzeltilir ya da buraya gerekçesiyle eklenir (sessizce büyüyemez).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { act, cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    backend: "device",
    user: null,
    checking: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));
vi.mock("../lib/auth", () => ({
  authConfigured: false,
  authErrorMessage: (error: unknown) => String(error),
  getAtlasAuth: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInSocial: vi.fn(),
}));
vi.mock("../lib/passwordSecurity", () => ({
  checkPwnedPassword: vi.fn(async () => ({ status: "unavailable" })),
  estimatePasswordStrength: () => ({ score: 0, label: "" }),
}));
vi.mock("../lib/deviceAccounts", () => ({ resetDevicePassword: vi.fn() }));

import AccountAccess from "./AccountAccess";
import LandingPage from "./LandingPage";

/** axe, jsdom'da hesaplayamadığı için kapatılan kurallar (gerekçeli). */
const DISABLED_RULES = {
  // Renk kontrastı gerçek boyama ister; jsdom layout yapmaz. Bu iş
  // src/utils/contrast.ts + contrast.test.ts ile ayrıca ölçülüyor.
  "color-contrast": { enabled: false },
};

async function violationsOf(element: HTMLElement): Promise<string[]> {
  const results = await axe.run(element, { rules: DISABLED_RULES });
  return results.violations.map((violation) => `${violation.id} (${violation.nodes.length}) — ${violation.help}`);
}

afterEach(cleanup);

describe("erişilebilirlik: tanıtım sayfası", () => {
  it("axe ihlali yok", async () => {
    const { container } = render(createElement(LandingPage, { onStart: () => {} }));

    expect(await violationsOf(container)).toEqual([]);
  });

  it("tek bir birincil başlık (h1) ve mantıklı başlık sırası var", () => {
    const { container } = render(createElement(LandingPage, { onStart: () => {} }));
    const headings = [...container.querySelectorAll("h1, h2, h3")].map((node) => node.tagName);

    expect(headings.filter((tag) => tag === "H1")).toHaveLength(1);
    // h1'den sonra h3'e atlanmaz: her h3'ün önünde bir h2 bulunur.
    const firstH3 = headings.indexOf("H3");
    if (firstH3 !== -1) expect(headings.slice(0, firstH3)).toContain("H2");
  });

  it("bütün düğmelerin erişilebilir adı var (yalnız ikon düğmesi yok)", () => {
    const { container } = render(createElement(LandingPage, { onStart: () => {} }));

    for (const button of container.querySelectorAll("button")) {
      const name = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
      expect(name.length, `adsız düğme: ${button.outerHTML.slice(0, 90)}`).toBeGreaterThan(0);
    }
  });
});

describe("erişilebilirlik: giriş ekranı", () => {
  it("axe ihlali yok", async () => {
    const { container } = render(createElement(AccountAccess));

    expect(await violationsOf(container)).toEqual([]);
  });

  it("her form alanı bir etikete bağlı", () => {
    const { container } = render(createElement(AccountAccess));
    const fields = [...container.querySelectorAll("input, select, textarea")];

    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      const id = field.getAttribute("id");
      const labelled = field.getAttribute("aria-label") ||
        (id ? container.querySelector(`label[for="${id}"]`) : null) ||
        field.closest("label");
      expect(labelled, `etiketsiz alan: ${field.outerHTML.slice(0, 90)}`).toBeTruthy();
    }
  });
});

describe("erişilebilirlik: sayfa kabuğu", () => {
  it("index.html dil bildirir ve görünüm ayarları vardır", () => {
    const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");

    expect(html).toMatch(/<html[^>]+lang="tr"/);
    expect(html).toContain('name="viewport"');
    // Zoom engellenmez (WCAG 1.4.4).
    expect(html).not.toMatch(/user-scalable\s*=\s*no/);
    expect(html).not.toMatch(/maximum-scale\s*=\s*1(?!\d)/);
  });
});

describe("axe bağlı ve gerçekten çalışıyor", () => {
  it("kasıtlı ihlali yakalar (kapı boş yere yeşil değil)", async () => {
    const { container } = render(
      createElement("div", null, createElement("img", { src: "/x.png" }), createElement("button", { type: "button" })),
    );

    await act(async () => {});
    const violations = await violationsOf(container);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join(" ")).toMatch(/image-alt|button-name/);
  });
});
