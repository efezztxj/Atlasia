import { describe, expect, it } from "vitest";
import { normalize } from "./text";

describe("normalize — Türkçe arama normalizasyonu", () => {
  it("büyük harfleri ve Türkçe diakritikleri sadeleştirir", () => {
    expect(normalize("İSTANBUL")).toBe("istanbul");
    expect(normalize("Göbeklitepe")).toBe("gobeklitepe");
    expect(normalize("Şanlıurfa")).toBe("sanliurfa");
    expect(normalize("Kütahya Çanakkale")).toBe("kutahya canakkale");
    expect(normalize("GIRNE")).toBe("girne");
  });

  it("noktasız i ve noktalı İ aynı köke iner", () => {
    expect(normalize("Iğdır")).toBe("igdir");
    expect(normalize("IĞDIR")).toBe("igdir");
    expect(normalize("ığdır")).toBe("igdir");
  });

  it("ASCII metni yalnızca küçük harfe indirir; boşluğu ve sayıyı korur", () => {
    expect(normalize("Ephesus Road 34")).toBe("ephesus road 34");
    expect(normalize("")).toBe("");
  });

  it("NFD ile ayrılmış birleşik işaretleri de temizler", () => {
    // "é" tek karakter yerine e + birleştirici keskin vurgu (U+0301)
    expect(normalize("Café")).toBe("cafe");
  });
});
