import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GUIDE_PLACES } from "../data/places";
import type { Place } from "../types";
import {
  ADVICE_FIELD_MAX_CHARS,
  PLACE_ADVICE,
  PLACE_SOURCES,
  UNVERIFIED,
  advice,
  namedPlace,
} from "./placeAdvice";

const FIELDS = ["access", "caution", "timing", "cost"] as const;
const SOURCES_DOC = "docs/icerik/yer-kaynaklari.md";
const sourcesDoc = readFileSync(SOURCES_DOC, "utf8");

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

  it("sonradan eklenen yerler de alias ile bulunur", () => {
    const extended = [
      place({ id: "kaputas", title: "Kaputaş Plajı" }),
      place({ id: "buyuk-han", title: "Büyük Han" }),
      place({ id: "salamis", title: "Salamis Antik Kenti" }),
      place({ id: "pozitano", title: "Başka Yer" }),
    ];
    expect(namedPlace("Kaputaş'a nasıl inilir?", extended)?.id).toBe("kaputas");
    expect(namedPlace("Büyük Han kahve", extended)?.id).toBe("buyuk-han");
    expect(namedPlace("Salamis harabeleri", extended)?.id).toBe("salamis");
    expect(namedPlace("Pozitano nerede", extended)).toBeUndefined();
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

describe("rehber yerleri — metin eksiksizliği", () => {
  it("tavsiye ve kaynak tabloları rehberdeki yerlerin tamamını kapsar", () => {
    const ids = GUIDE_PLACES.map((item) => item.id).sort();
    expect(Object.keys(PLACE_ADVICE).sort()).toEqual(ids);
    expect(Object.keys(PLACE_SOURCES).sort()).toEqual(ids);
  });

  it("dört alan da dolu; her alan ya doğrulanmış metin ya tam olarak 'Doğrulanmadı.'", () => {
    for (const guidePlace of GUIDE_PLACES) {
      const entry = PLACE_ADVICE[guidePlace.id];
      for (const field of FIELDS) {
        const value = entry[field];
        const label = `${guidePlace.id}.${field}`;
        expect(value.trim(), `${label} boş`).not.toBe("");
        if (value === UNVERIFIED) continue;
        expect(value.length, `${label} çok kısa`).toBeGreaterThanOrEqual(20);
        expect(value.length, `${label} çok uzun`).toBeLessThanOrEqual(ADVICE_FIELD_MAX_CHARS);
        expect(value, `${label} doğrulanmamış ibare taşıyor`).not.toContain("doğrulanmadı");
        expect(value, `${label} bağlantı/kod içeriyor`).not.toMatch(/https?:|<[^>]+>|TODO|lorem/i);
        expect(value.trim().endsWith("."), `${label} cümle sonu yok`).toBe(true);
      }
    }
  });

  it("her yerde ulaşım ve dikkat alanı doğrulanmış metindir", () => {
    for (const guidePlace of GUIDE_PLACES) {
      expect(PLACE_ADVICE[guidePlace.id].access, `${guidePlace.id}.access`).not.toBe(UNVERIFIED);
      expect(PLACE_ADVICE[guidePlace.id].caution, `${guidePlace.id}.caution`).not.toBe(UNVERIFIED);
    }
  });

  it("farklı yerler aynı kalıp cümleyi paylaşmaz", () => {
    for (const field of ["access", "caution"] as const) {
      const values = GUIDE_PLACES.map((item) => PLACE_ADVICE[item.id][field]);
      expect(new Set(values).size, `${field} metinleri tekrar ediyor`).toBe(values.length);
    }
  });

  it("advice() rehber yerinde tablodaki metni döner", () => {
    for (const guidePlace of GUIDE_PLACES) {
      expect(advice(guidePlace)).toEqual(PLACE_ADVICE[guidePlace.id]);
    }
  });
});

describe("kaynaklar — Vikipedi ve Wikidata bağı", () => {
  it("her yerin en az bir Vikipedi ve bir Wikidata kaynağı var", () => {
    for (const guidePlace of GUIDE_PLACES) {
      const sources = PLACE_SOURCES[guidePlace.id];
      expect(sources.length, `${guidePlace.id} kaynaksız`).toBeGreaterThanOrEqual(2);
      expect(sources.some((source) => source.kind === "wikipedia"), `${guidePlace.id} Vikipedi`).toBe(true);
      expect(sources.some((source) => source.kind === "wikidata"), `${guidePlace.id} Wikidata`).toBe(true);
    }
  });

  it("kaynak URL, lisans ve dil alanları tutarlı", () => {
    for (const guidePlace of GUIDE_PLACES) {
      for (const source of PLACE_SOURCES[guidePlace.id]) {
        expect(source.title.trim()).not.toBe("");
        if (source.kind === "wikipedia") {
          expect(source.url).toMatch(/^https:\/\/(tr|en)\.wikipedia\.org\/wiki\/[^\s]+$/);
          expect(source.license).toBe("CC BY-SA 4.0");
          expect(source.name).toBe(`Vikipedi · ${source.title}`);
          expect(source.lang).toBe(source.url.startsWith("https://tr.wikipedia.org/") ? "tr" : "en");
        } else {
          expect(source.url).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/);
          expect(source.license).toBe("CC0");
          expect(source.name).toBe("Wikidata");
          expect(source.lang).toBe("-");
          expect(source.url.endsWith(source.title)).toBe(true);
        }
        expect(source.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("aynı yerin kaynak URL'leri benzersizdir", () => {
    for (const guidePlace of GUIDE_PLACES) {
      const urls = PLACE_SOURCES[guidePlace.id].map((source) => source.url);
      expect(new Set(urls).size, `${guidePlace.id} mükerrer kaynak`).toBe(urls.length);
    }
  });

  it("kaynak dokümanı her yeri, başlığı ve URL'yi listeler", () => {
    for (const guidePlace of GUIDE_PLACES) {
      expect(sourcesDoc, `${guidePlace.id} dokümanda yok`).toContain(`\`${guidePlace.id}\``);
      expect(sourcesDoc, `${guidePlace.title} dokümanda yok`).toContain(guidePlace.title);
      for (const source of PLACE_SOURCES[guidePlace.id]) {
        expect(sourcesDoc, `${source.url} dokümanda yok`).toContain(source.url);
      }
    }
    expect(sourcesDoc).toContain("CC BY-SA 4.0");
    expect(sourcesDoc).toContain("CC0");
    const rows = sourcesDoc.split("\n").filter((line) => /^\| `[^`]+` \|/.test(line));
    expect(rows.length).toBe(GUIDE_PLACES.length);
  });
});
