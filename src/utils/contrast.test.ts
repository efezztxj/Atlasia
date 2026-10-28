import { describe, expect, it } from "vitest";

import {
  WCAG_AA_LARGE,
  WCAG_AA_NORMAL,
  alphaTextContrast,
  composite,
  contrastRatio,
  minimumAaOpacity,
  parseHex,
  relativeLuminance,
} from "./contrast";

describe("parseHex", () => {
  it("3 ve 6 haneli biçimleri okur", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("021512")).toEqual([2, 21, 18]);
  });

  it("geçersiz rengi sessizce kabul etmez", () => {
    expect(() => parseHex("#12345")).toThrow(TypeError);
    expect(() => parseHex("kırmızı")).toThrow(TypeError);
    expect(() => parseHex("")).toThrow(TypeError);
  });
});

describe("kontrast oranı (WCAG 2.2)", () => {
  it("siyah/beyaz bilinen 21:1 değerini verir", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
  });

  it("aynı renk 1:1'dir ve sıra sonucu değiştirmez", () => {
    const mint = parseHex("#e4f5ea");

    expect(contrastRatio(mint, mint)).toBeCloseTo(1, 10);
    expect(contrastRatio(mint, [2, 21, 18])).toBeCloseTo(contrastRatio([2, 21, 18], mint), 10);
  });

  it("luminance hesabı sınırlarda doğru", () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 10);
  });
});

describe("composite", () => {
  it("alfa 0 zemini, alfa 1 ön planı verir", () => {
    expect(composite([255, 255, 255], [0, 0, 0], 0)).toEqual([0, 0, 0]);
    expect(composite([255, 255, 255], [0, 0, 0], 1)).toEqual([255, 255, 255]);
  });

  it("alfa aralığını kırpar (0-1 dışı girdi patlamaz)", () => {
    expect(composite([255, 255, 255], [0, 0, 0], -3)).toEqual([0, 0, 0]);
    expect(composite([255, 255, 255], [0, 0, 0], 7)).toEqual([255, 255, 255]);
  });
});

describe("alphaTextContrast", () => {
  it("opaklık azaldıkça kontrast düşer", () => {
    const full = alphaTextContrast("#e4f5ea", "#021512", 100);
    const half = alphaTextContrast("#e4f5ea", "#021512", 50);
    const faint = alphaTextContrast("#e4f5ea", "#021512", 20);

    expect(full).toBeGreaterThan(half);
    expect(half).toBeGreaterThan(faint);
    expect(faint).toBeLessThan(WCAG_AA_NORMAL);
  });
});

describe("minimumAaOpacity", () => {
  it("açık metin/koyu zeminde AA'yı geçen en düşük 5'in katını verir", () => {
    const opacity = minimumAaOpacity("#e4f5ea", "#021512");

    expect(opacity).not.toBeNull();
    expect(opacity! % 5).toBe(0);
    expect(alphaTextContrast("#e4f5ea", "#021512", opacity!)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    // Bir adım aşağısı eşiğin altında kalmalı; yoksa fonksiyon gereğinden yüksek dönüyor.
    if (opacity! > 5) {
      expect(alphaTextContrast("#e4f5ea", "#021512", opacity! - 5)).toBeLessThan(WCAG_AA_NORMAL);
    }
  });

  it("büyük metin eşiğinde daha düşük opaklık yeter", () => {
    const normal = minimumAaOpacity("#e4f5ea", "#021512", WCAG_AA_NORMAL)!;
    const large = minimumAaOpacity("#e4f5ea", "#021512", WCAG_AA_LARGE)!;

    expect(large).toBeLessThanOrEqual(normal);
  });

  it("hiçbir opaklık yetmiyorsa null döner (sessizce yanlış sayı vermez)", () => {
    // Aynı renk metin ve zemin: hiçbir opaklıkta kontrast 1:1'in üzerine çıkmaz.
    expect(minimumAaOpacity("#021512", "#021512")).toBeNull();
  });
});
