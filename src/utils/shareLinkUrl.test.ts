import { describe, expect, it } from "vitest";

import { SHARE_LINK_PARAM, buildRouteShareUrl, readShareTokenFromUrl } from "./shareLinkUrl";

describe("buildRouteShareUrl", () => {
  it("yükü fragment'a koyar (istek satırına ve Referer'a düşmez)", () => {
    const url = buildRouteShareUrl("https://atlasia.pages.dev", "v1.abc");

    expect(url).toBe(`https://atlasia.pages.dev/#${SHARE_LINK_PARAM}=v1.abc`);
    expect(new URL(url).search).toBe("");
    expect(new URL(url).hash).toBe("#r=v1.abc");
  });

  it("sondaki eğik çizgileri tekilleştirir", () => {
    expect(buildRouteShareUrl("https://atlasia.pages.dev///", "t")).toBe("https://atlasia.pages.dev/#r=t");
  });

  it("yayınlanmış rota bağlantısını (?route=) bozmaz", () => {
    const origin = "https://atlasia.pages.dev";

    expect(buildRouteShareUrl(origin, "x")).not.toContain("route=");
  });
});

describe("readShareTokenFromUrl", () => {
  it("fragment biçimini okur", () => {
    expect(readShareTokenFromUrl("https://atlasia.pages.dev/#r=v1.abc")).toBe("v1.abc");
  });

  it("eski sorgu biçimini geriye dönük okur", () => {
    expect(readShareTokenFromUrl("https://atlasia.pages.dev/?r=v1.eski")).toBe("v1.eski");
  });

  it("fragment varken sorgudaki eski değeri yok sayar", () => {
    expect(readShareTokenFromUrl("https://atlasia.pages.dev/?r=eski#r=yeni")).toBe("yeni");
  });

  it("parametre yoksa null döner", () => {
    expect(readShareTokenFromUrl("https://atlasia.pages.dev/uygulama/?tab=kesfet")).toBeNull();
  });

  it("çözülemeyen adreste patlamaz, null döner", () => {
    expect(readShareTokenFromUrl("bu bir url değil")).toBeNull();
  });

  it("gidiş-dönüş: yazılan bağlantıdan aynı jeton okunur", () => {
    const token = "v1.5f2b9c|2|41";

    expect(readShareTokenFromUrl(buildRouteShareUrl("https://atlasia.pages.dev", token))).toBe(token);
  });
});
