import { describe, expect, it } from "vitest";
import { GALLERIES } from "../data/galleries";
import type { Place } from "../types";
import { getPlacePhotos, photoSource } from "./placePhotos";

function place(overrides: Partial<Place>): Place {
  return {
    id: "galerisiz-yer",
    title: "Test",
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

describe("getPlacePhotos — foto kaynak sıralaması ve benzersizleştirme", () => {
  it("sıra: photo → gallery → küratörlü galeri → image; boş değerler atlanır", () => {
    const photos = getPlacePhotos(place({
      photo: "https://x.example/kapak.jpg",
      gallery: ["https://x.example/g1.jpg", "https://x.example/g2.jpg"],
      image: "https://x.example/son.jpg",
    }));
    expect(photos).toEqual([
      "https://x.example/kapak.jpg",
      "https://x.example/g1.jpg",
      "https://x.example/g2.jpg",
      "https://x.example/son.jpg",
    ]);
  });

  it("aynı URL tekilleştirilir; aynı Pexels foto numarası farklı URL'de de tekilldir", () => {
    const photos = getPlacePhotos(place({
      photo: "https://images.pexels.com/photos/123/a.jpg?w=400",
      gallery: [
        "https://images.pexels.com/photos/123/a.jpg?w=800",
        "https://images.pexels.com/photos/456/b.jpg",
        "https://images.pexels.com/photos/456/b.jpg",
      ],
    }));
    expect(photos).toEqual([
      "https://images.pexels.com/photos/123/a.jpg?w=400",
      "https://images.pexels.com/photos/456/b.jpg",
    ]);
  });

  it("küratörlü galerisi olan yerde GALLERIES zincire katılır; tavan 10 fotoğraf", () => {
    expect(GALLERIES.kyoto?.length).toBeGreaterThan(0);
    const photos = getPlacePhotos(place({
      id: "kyoto",
      gallery: Array.from({ length: 12 }, (_, i) => `https://x.example/t${i}.jpg`),
    }));
    expect(photos).toHaveLength(10);
    expect(photos[0]).toBe("https://x.example/t0.jpg");
  });

  it("fotoğrafı olmayan yerde boş liste döner", () => {
    expect(getPlacePhotos(place({}))).toEqual([]);
  });
});

describe("photoSource — kaynak atıf etiketi", () => {
  it("Pexels bağlantısını foto sayfasına çevirir", () => {
    expect(photoSource("https://images.pexels.com/photos/789/x.jpg")).toEqual({
      label: "Pexels · fotoğrafçı bilgisi",
      href: "https://www.pexels.com/photo/789/",
    });
  });

  it("Wikimedia Special:FilePath adresini dosya/lisans sayfasına çevirir", () => {
    const source = photoSource("https://commons.wikimedia.org/wiki/Special:FilePath/Ephesus%20Library.jpg?width=800");
    expect(source.label).toContain("Wikimedia Commons");
    expect(source.href).toBe("https://commons.wikimedia.org/wiki/File:Ephesus%20Library.jpg");
  });

  it("tanınmayan kaynağı bağlantısız gezgin fotoğrafı sayar", () => {
    expect(photoSource("data:image/jpeg;base64,AAAA")).toEqual({ label: "Gezgin fotoğrafı", href: null });
  });
});
