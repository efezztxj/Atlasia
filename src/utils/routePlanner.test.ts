import { describe, expect, it } from "vitest";
import type { Place, RouteBrief } from "../types";
import {
  briefHours,
  nearbyPlaces,
  planRoute,
  reorderRoute,
  surpriseBrief,
  validPlace,
} from "./routePlanner";
import { decodePolyline } from "./polyline";

const origin = { lat: 38.42, lng: 27.14 };

function place(
  id: string,
  lat: number,
  lng: number,
  overrides: Partial<Place> = {},
): Place {
  return {
    id,
    title: `Yer ${id}`,
    region: "İzmir",
    category: "nature",
    lat,
    lng,
    note: "Doğrulanabilir ve yeterince uzun bir keşif notu.",
    author: "Atlasia",
    kind: "guide",
    ...overrides,
  };
}

const brief: RouteBrief = {
  duration: "half",
  tempo: "Dengeli",
  interests: ["Doğa"],
  transport: "walking",
  budget: "Orta",
  vibe: "Keşifçi",
  start: "pick",
  rain: "flex",
};

describe("routePlanner", () => {
  it("validates coordinates and minimum content", () => {
    expect(validPlace(place("valid", 38.421, 27.141))).toBe(true);
    expect(validPlace(place("bad-lat", 91, 27.141))).toBe(false);
    expect(validPlace(place("short", 38.421, 27.141, { note: "kısa" }))).toBe(false);
    expect(validPlace(place("title", 38.421, 27.141, { title: " " }))).toBe(false);
  });

  it("keeps community discoveries ahead of guide places, then sorts by distance", () => {
    const guideNear = place("guide-near", 38.4205, 27.1405);
    const guideFar = place("guide-far", 38.425, 27.145);
    const community = place("community", 38.423, 27.143, {
      kind: "user",
      author: "Gezgin",
      authorUid: "member-1",
    });

    expect(nearbyPlaces([guideFar, guideNear, community], origin, 5).map((item) => item.id))
      .toEqual(["community", "guide-near", "guide-far"]);
  });

  it("builds a bounded route from nearby valid places and excludes distant entries", () => {
    const candidates = [
      place("one", 38.421, 27.141),
      place("two", 38.422, 27.142, { category: "photo" }),
      place("three", 38.423, 27.143, { category: "history" }),
      place("far-away", 40.0, 29.0),
    ];

    const route = planRoute(candidates, origin, brief, "Hava değerlendirmesi esnek bırakıldı.");
    const stops = route.days.flatMap((day) => day.stops);

    expect(stops.length).toBeGreaterThan(0);
    expect(stops.length).toBeLessThanOrEqual(4);
    expect(stops.map((stop) => stop.pinId)).not.toContain("far-away");
    expect(route.origin).toEqual(origin);
    expect(route.totalDistanceKm).toBeGreaterThanOrEqual(0);
    expect(route.days.every((day) => decodePolyline(day.polyline).length === day.stops.length + 1)).toBe(true);
  });

  it("recalculates order, duration and geometry after a stop is moved", () => {
    const route = planRoute(
      [
        place("one", 38.421, 27.141, { category: "photo" }),
        place("two", 38.422, 27.142, { category: "photo" }),
        place("three", 38.423, 27.143, { category: "photo" }),
      ],
      origin,
      { ...brief, duration: "day" },
      null,
    );
    const before = route.days[0].stops.map((stop) => stop.pinId);
    expect(before).toHaveLength(3);

    const reordered = reorderRoute(route, 0, 0, 2);
    const after = reordered.days[0].stops;

    expect(after.map((stop) => stop.pinId)).toEqual([before[1], before[2], before[0]]);
    expect(after.map((stop) => stop.order)).toEqual([1, 2, 3]);
    expect(after.every((stop) => stop.aiReason.includes("Sıralamayı sen düzenledin"))).toBe(true);
    expect(decodePolyline(reordered.days[0].polyline)).toHaveLength(4);
  });

  it("rejects invalid reorder indexes without mutating or corrupting the route", () => {
    const route = planRoute(
      [place("one", 38.421, 27.141), place("two", 38.422, 27.142)],
      origin,
      brief,
      null,
    );
    const originalStops = route.days[0].stops;

    expect(reorderRoute(route, 0, -1, 0)).toBe(route);
    expect(reorderRoute(route, 0, 0, 99)).toBe(route);
    expect(reorderRoute(route, 99, 0, 0)).toBe(route);
    expect(reorderRoute(route, 0.5, 0, 1)).toBe(route);
    expect(route.days[0].stops).toBe(originalStops);
    expect(route.days[0].stops.every((stop) => Boolean(stop.pinId))).toBe(true);
  });

  it("clamps custom duration and exposes a stable surprise brief", () => {
    expect(briefHours({ ...brief, duration: "custom", customHours: 0 })).toBe(1);
    expect(briefHours({ ...brief, duration: "custom", customHours: 99 })).toBe(24);
    expect(surpriseBrief()).toMatchObject({
      duration: "custom",
      customHours: 2,
      tempo: "Rahat",
      transport: "walking",
    });
  });
});
