import { describe, expect, it } from "vitest";
import { decodePolyline, encodePolyline } from "./polyline";

describe("polyline helpers", () => {
  it("matches the canonical Google encoded polyline example", () => {
    const points: [number, number][] = [
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ];

    expect(encodePolyline(points)).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
  });

  it("round-trips coordinates at five-decimal precision", () => {
    const points: [number, number][] = [
      [27.13841, 38.42373],
      [27.14209, 38.42618],
      [27.15001, 38.43111],
    ];

    expect(decodePolyline(encodePolyline(points))).toEqual(points);
  });

  it("handles an empty route", () => {
    expect(encodePolyline([])).toBe("");
    expect(decodePolyline("")).toEqual([]);
  });
});
