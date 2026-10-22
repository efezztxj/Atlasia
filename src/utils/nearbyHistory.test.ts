import { describe, expect, it } from "vitest";
import type { Place } from "../types";
import { NEARBY_HISTORY_MAX, formatDistance, pickNearby } from "./nearbyHistory";

const base = { region: "", category: "history", note: "" } as const;
const at = (id: string, title: string, lat: number, lng: number, extra: Partial<Place> = {}): Place =>
  ({ ...base, id, title, lat, lng, ...extra }) as Place;

describe("pickNearby (P14)", () => {
  const origin = at("o", "Saat Kulesi", 38.4189, 27.1287);

  it("yerin kendisini (id veya aynı ad) listeden çıkarır", () => {
    const list = [at("o", "Saat Kulesi", 38.4189, 27.1287), at("osm-1", "saat kulesi", 38.419, 27.1288), at("osm-2", "Kemeraltı", 38.42, 27.13)];
    expect(pickNearby(origin, list).map((n) => n.place.id)).toEqual(["osm-2"]);
  });

  it("kaynaklı tarihçesi olanlar önce, sonra yakından uzağa", () => {
    const source = { name: "Wikipedia", title: "X", url: "https://tr.wikipedia.org/wiki/X", license: "CC BY-SA 4.0", lang: "tr" as const };
    const list = [at("near", "Yakın", 38.419, 27.129), at("far", "Uzak", 38.425, 27.135, { historySource: source }), at("mid", "Orta", 38.421, 27.131)];
    expect(pickNearby(origin, list).map((n) => n.place.id)).toEqual(["far", "near", "mid"]);
  });

  it("en çok sabit sayıda öğe döner", () => {
    const list = Array.from({ length: 20 }, (_, i) => at(`p${i}`, `Yer ${i}`, 38.42 + i / 1000, 27.13));
    expect(pickNearby(origin, list)).toHaveLength(NEARBY_HISTORY_MAX);
  });
});

describe("formatDistance", () => {
  it("1 km altını 10 m'ye yuvarlar, üstünü km gösterir", () => {
    expect(formatDistance(0.004)).toBe("10 m");
    expect(formatDistance(0.347)).toBe("350 m");
    expect(formatDistance(1.26)).toBe("1.3 km");
  });
});
