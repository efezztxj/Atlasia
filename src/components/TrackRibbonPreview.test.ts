import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TrackRibbonPreview from "./TrackRibbonPreview";

const render = (coords: [number, number][]) =>
  renderToStaticMarkup(createElement(TrackRibbonPreview, { coords }));

describe("TrackRibbonPreview", () => {
  it("taslak geometriyi ölçekli bir polyline olarak çizer", () => {
    const markup = render([
      [27.1, 38.4],
      [27.11, 38.41],
      [27.12, 38.4],
    ]);

    expect(markup).toContain('data-atlasia-ribbon="ready"');
    expect(markup).toContain('role="img"');
    expect(markup).toContain("Taslak iz önizlemesi: 3 nokta");
    expect(markup).toContain("<polyline");
    expect(markup.match(/<circle/g)).toHaveLength(2);
    // Navigasyon iddiası yok.
    expect(markup.toLowerCase()).not.toContain("navigasyon");
    expect(markup).not.toContain("yol tarifi");
  });

  it("aynı koordinatlar (tek nokta) ve boş liste için önizleme yerine açıklama gösterir", () => {
    const empty = render([]);
    expect(empty).toContain('data-atlasia-ribbon="empty"');
    expect(empty).toContain("Önizleme için yeterli ölçüm yok.");
    expect(empty).not.toContain("<polyline");

    const single = render([[27.1, 38.4]]);
    expect(single).toContain('data-atlasia-ribbon="empty"');
  });

  it("en-boy oranını korur: kare geometri kutuyu taşırmaz", () => {
    const markup = render([
      [27.1, 38.4],
      [27.2, 38.4],
      [27.2, 38.5],
      [27.1, 38.5],
    ]);
    const numbers = [...markup.matchAll(/(?:points|"cx"|"cy")="([^"]+)"/g)]
      .flatMap((match) => match[1].split(/[ ,]+/))
      .filter((value) => value !== "")
      .map(Number);
    expect(numbers.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
    const xs = numbers.filter((_, index) => index % 2 === 0);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    expect(Math.max(...xs)).toBeLessThanOrEqual(320);
    expect(Math.max(...ys)).toBeLessThanOrEqual(72);
  });
});
