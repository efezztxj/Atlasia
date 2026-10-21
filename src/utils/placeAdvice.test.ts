import { describe, expect, it } from "vitest";
import type { Place } from "../types";
import { advice, namedPlace } from "./placeAdvice";

function place(overrides: Partial<Place>): Place {
  return {
    id: "test-yeri",
    title: "Test Yeri",
    region: "Ege",
    category: "history",
    lng: 27,
    lat: 38,
    note: "not",
    author: "rehber",
    kind: "guide",
    ...overrides,
  };
}

describe("namedPlace — sorguda yer ismi bulma", () => {
  const places = [
    place({ id: "kyoto", title: "Kyoto Fushimi Inari" }),
    place({ id: "efes", title: "Efes Antik Kenti" }),
    place({ id: "ozel-yer", title: "Saklı Vadi" }),
  ];

  it("bilinen alias'larla eşleşir (Türkçe normalizasyonlu)", () => {
    expect(namedPlace("Fushimi tapınağına nasıl gidilir?", places)?.id).toBe("kyoto");
    expect(namedPlace("EPHESUS turu var mı", places)?.id).toBe("efes");
    expect(namedPlace("efes'e gitmek istiyoruz", places)?.id).toBe("efes");
  });

  it("alias yoksa yerin başlığıyla eşleşir", () => {
    expect(namedPlace("SAKLI VADİ güzel mi", places)?.id).toBe("ozel-yer");
  });

  it("hiçbir alias tutmazsa undefined döner", () => {
    expect(namedPlace("rastgele bir şeyler", places)).toBeUndefined();
    expect(namedPlace("", places)).toBeUndefined();
  });
});

describe("advice — yere özel/ genel ziyaret rehberi", () => {
  it("özel tavsiyesi olan yerde onu döner", () => {
    const result = advice(place({ id: "kyoto" }));
    expect(result.access).toContain("Inari");
    expect(result.caution).toContain("Torii");
  });

  it("doğa/kamp/rota kategorisinde saha uyarısı kalıbını kullanır", () => {
    const result = advice(place({ id: "bilinmeyen", category: "nature" }));
    expect(result.caution).toContain("telefon kapsamasını");
    expect(result.cost).toContain("Ücret doğrulanmadı");
  });

  it("diğer kategorilerde ücret/erişim uyarısı kalıbını kullanır", () => {
    const result = advice(place({ id: "bilinmeyen", category: "cities" }));
    expect(result.caution).toContain("fiyatı önceden sor");
    expect(result.timing).toContain("doğrulanmadı");
  });
});
