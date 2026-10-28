// @vitest-environment jsdom
/**
 * T8 — onboarding / ilk rota akışı kilidi.
 *
 * Sözleşme:
 *  1. Karşılama paneli misafire "nerede hesap isteneceğini" önceden söyler;
 *     üyeye aynı uyarı gösterilmez (gereksiz sürtünme yok).
 *  2. Panel aktivasyona bağlı: cihazda rota oluşturulduysa bir daha açılmaz.
 *  3. Misafir "Rota oluştur" seçerse kayıt kapısı + T5 niyeti `route` çalışır.
 *  4. Her çıkış `onboarding_choice` olayı üretir (huni ölçülebilir).
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Onboarding from "../components/Onboarding";

const explorer = readFileSync("src/components/Explorer.tsx", "utf8");
const analyticsSource = readFileSync("src/lib/analytics.ts", "utf8");

afterEach(() => cleanup());

function renderPanel(guest: boolean) {
  const props = { onNearby: vi.fn(), onRoute: vi.fn(), onLeave: vi.fn(), onClose: vi.fn(), guest };
  render(createElement(Onboarding, props));
  return props;
}

describe("T8 · misafir/üye ayrımı", () => {
  it("misafire hesap uyarısını gösterir", () => {
    renderPanel(true);
    const note = screen.getByRole("note");
    expect(note.textContent).toContain("Misafir olarak geziyorsun");
    expect(note.textContent).toContain("hesap açman istenecek");
  });

  it("üyeye misafir uyarısını göstermez", () => {
    renderPanel(false);
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("üç seçenek her iki modda da durur", () => {
    renderPanel(true);
    for (const label of ["Yakınımdaki izleri göster", "Rota oluştur", "Bir iz bırak"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    cleanup();
    renderPanel(false);
    for (const label of ["Yakınımdaki izleri göster", "Rota oluştur", "Bir iz bırak"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("seçimler doğru geri çağrıya gider", () => {
    const props = renderPanel(false);
    fireEvent.click(screen.getByText("Rota oluştur"));
    expect(props.onRoute).toHaveBeenCalledTimes(1);
    expect(props.onLeave).not.toHaveBeenCalled();
  });
});

describe("T8 · Explorer bağlantısı", () => {
  it("misafir rotada kayıt kapısı ve `route` niyeti kullanır", () => {
    const block = explorer.slice(explorer.indexOf("<Onboarding"));
    expect(block).toContain('askAccount("Rota oluşturmak için bir hesap aç ya da giriş yap.", "route")');
  });

  it("panel aktivasyona bağlı: rota varsa açılmaz", () => {
    expect(explorer).toContain('!storageGet("atlasia.onboardingSeen") && !storageGet(FIRST_ROUTE_KEY)');
  });

  it("her çıkış `onboarding_choice` olayı üretir", () => {
    const block = explorer.slice(explorer.indexOf("<Onboarding"), explorer.indexOf("/>", explorer.indexOf("<Onboarding")));
    const choices = [...block.matchAll(/onboardingChoice\(\{ choice: "(\w+)"/g)].map((m) => m[1]);
    expect(choices.sort()).toEqual(["leave", "nearby", "route", "skip"]);
    expect(block).toContain("guest={guest}");
  });

  it("olay analitik kataloğunda kayıtlı", () => {
    expect(analyticsSource).toContain('"onboarding_choice"');
    expect(analyticsSource).toContain("onboardingChoice:");
  });
});
