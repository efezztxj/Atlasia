import { describe, expect, it } from "vitest";
import { mediaUrl } from "./api";

describe("mediaUrl — fotoğraf yolu çözümleyici", () => {
  it("verilen adresi değiştirmeden döner", () => {
    expect(mediaUrl("https://images.pexels.com/photos/1/x.jpg")).toBe("https://images.pexels.com/photos/1/x.jpg");
    expect(mediaUrl("data:image/jpeg;base64,AAAA")).toBe("data:image/jpeg;base64,AAAA");
    expect(mediaUrl("/images/yerel.jpg")).toBe("/images/yerel.jpg");
  });

  it("yok veya boş adresi undefined yapar (boş img src'den kaçınır)", () => {
    expect(mediaUrl()).toBeUndefined();
    expect(mediaUrl(undefined)).toBeUndefined();
    expect(mediaUrl("")).toBeUndefined();
  });
});
