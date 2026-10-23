import { describe, expect, it } from "vitest";
import { parseShortcutTab, SHORTCUT_PARAM, stripShortcutParam } from "./appShortcut";

describe("manifest kısayolu (?tab=)", () => {
  it("üç kısayolu da tanır", () => {
    expect(parseShortcutTab("?tab=kesfet")).toBe("explore");
    expect(parseShortcutTab("?tab=iz-birak")).toBe("add");
    expect(parseShortcutTab("?tab=profil")).toBe("profile");
  });

  it("değer yoksa ya da tanınmıyorsa null döner", () => {
    expect(parseShortcutTab("")).toBeNull();
    expect(parseShortcutTab("?route=abc")).toBeNull();
    expect(parseShortcutTab("?tab=bilinmeyen")).toBeNull();
  });

  it("büyük harf ve boşluk toleranslı", () => {
    expect(parseShortcutTab("?tab=%20KESFET%20")).toBe("explore");
    expect(parseShortcutTab("?tab=%20PROFIL%20")).toBe("profile");
  });

  it("parametre adresi kirletmeden silinir, diğer parametreler korunur", () => {
    const href = "https://atlasia.pages.dev/?tab=profil&route=r-1#grup=x.123456";
    const cleaned = stripShortcutParam(href);
    expect(cleaned).toBe("/?route=r-1#grup=x.123456");
    expect(cleaned).not.toContain(SHORTCUT_PARAM);
  });

  it("parametre yokken adres aynı kalır", () => {
    expect(stripShortcutParam("https://atlasia.pages.dev/?route=r-1")).toBe("/?route=r-1");
  });
});
