import { afterEach, describe, expect, it, vi } from "vitest";
import { storageGet, storageRemove, storageSet } from "./storage";

// Vitest node ortamında window yoktur: gerçek depolama denemesi hata verir ve
// modülün bellek yedeği devreye girer. Gerçek yol sahte Storage ile ayrıca
// doğrulanır; sahte window her testten sonra temizlenir.

function makeStorage(fail = false) {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => {
      if (fail) throw new Error("kota");
      return map.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (fail) throw new Error("kota");
      map.set(k, v);
    },
    removeItem: (k: string) => {
      if (fail) throw new Error("kota");
      map.delete(k);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage — çökmesiz depolama sarmalı", () => {
  it("window/depolama yokken bellek yedeğiyle yazar, okur, siler", () => {
    expect(storageGet("a")).toBeNull();
    expect(storageSet("a", "1")).toBe(false); // gerçek yazma olmadı ama yedek tutuldu
    expect(storageGet("a")).toBe("1");
    expect(storageRemove("a")).toBe(false);
    expect(storageGet("a")).toBeNull();
  });

  it("local ve session kapsamları birbirine karışmaz", () => {
    storageSet("k", "yerel", "local");
    storageSet("k", "oturum", "session");
    expect(storageGet("k", "local")).toBe("yerel");
    expect(storageGet("k", "session")).toBe("oturum");
    expect(storageGet("k")).toBe("yerel"); // varsayılan kapsam local
    storageRemove("k", "session");
    expect(storageGet("k", "session")).toBeNull();
    expect(storageGet("k", "local")).toBe("yerel");
  });

  it("gerçek depolama çalışıyorsa onu kullanır ve başarı döner", () => {
    vi.stubGlobal("window", { localStorage: makeStorage(), sessionStorage: makeStorage() });
    expect(storageSet("g", "x")).toBe(true);
    expect(storageGet("g")).toBe("x");
    expect(storageRemove("g")).toBe(true);
    expect(storageGet("g")).toBeNull();
  });

  it("kota hatasında çökmez, false döner ve yedek değeri korur", () => {
    vi.stubGlobal("window", { localStorage: makeStorage(true), sessionStorage: makeStorage(true) });
    expect(storageSet("kota", "deger")).toBe(false);
    expect(storageGet("kota")).toBe("deger"); // bellek yedeğinden
    expect(storageRemove("kota")).toBe(false);
    expect(storageGet("kota")).toBeNull();
  });
});
