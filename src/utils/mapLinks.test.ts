import { describe, expect, it } from "vitest";
import type { TransportMode } from "../types";
import {
  buildAppleDirectionsUrl,
  buildGooglePlaceDirectionsUrl,
  buildGoogleRouteLinks,
  buildYandexRouteUrl,
  GOOGLE_DESKTOP_MAX_WAYPOINTS,
  GOOGLE_MOBILE_MAX_WAYPOINTS,
  googleWaypointLimitForDevice,
  isValidMapPoint,
  MAP_URL_MAX_LENGTH,
  type MapPoint,
} from "./mapLinks";

const points: MapPoint[] = [
  { lat: 38.4237, lng: 27.1428 },
  { lat: 38.432, lng: 27.144 },
  { lat: 38.441, lng: 27.153 },
  { lat: 38.45, lng: 27.162 },
  { lat: 38.459, lng: 27.171 },
  { lat: 38.468, lng: 27.18 },
  { lat: 38.477, lng: 27.189 },
];

function routeCoordinates(urlValue: string): string[] {
  const url = new URL(urlValue);
  const origin = url.searchParams.get("origin");
  const destination = url.searchParams.get("destination");
  const waypoints = url.searchParams.get("waypoints")?.split("|") ?? [];
  return [origin, ...waypoints, destination].filter((value): value is string => Boolean(value));
}

describe("map links", () => {
  it("validates geographic coordinate bounds", () => {
    expect(isValidMapPoint({ lat: 90, lng: -180 })).toBe(true);
    expect(isValidMapPoint({ lat: -90, lng: 180 })).toBe(true);
    expect(isValidMapPoint({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidMapPoint({ lat: 0, lng: Number.NaN })).toBe(false);
  });

  it("builds a current-location Google link for a single destination", () => {
    const value = buildGooglePlaceDirectionsUrl(points[0]);
    const url = new URL(value!);

    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("origin")).toBeNull();
    expect(url.searchParams.get("destination")).toBe("38.4237,27.1428");
    expect(url.searchParams.get("travelmode")).toBeNull();
  });

  it("keeps up to three mobile waypoints in one Google link", () => {
    const links = buildGoogleRouteLinks(points.slice(0, 5), "walking");

    expect(links).toHaveLength(1);
    expect(routeCoordinates(links[0].url)).toEqual([
      "38.4237,27.1428",
      "38.432,27.144",
      "38.441,27.153",
      "38.45,27.162",
      "38.459,27.171",
    ]);
    expect(new URL(links[0].url).searchParams.get("travelmode")).toBe("walking");
  });

  it("splits longer Google routes at the mobile limit without losing stop order", () => {
    const links = buildGoogleRouteLinks(points, "cycling", GOOGLE_MOBILE_MAX_WAYPOINTS);

    expect(links).toHaveLength(2);
    expect(links.every((link) => link.pointCount <= 5)).toBe(true);
    expect(new URL(links[0].url).searchParams.get("travelmode")).toBe("bicycling");

    const rebuilt = links.flatMap((link, index) => {
      const segment = routeCoordinates(link.url);
      return index === 0 ? segment : segment.slice(1);
    });
    expect(rebuilt).toEqual(points.map((point) => `${point.lat},${point.lng}`));
    expect(links.every((link) => link.url.length <= MAP_URL_MAX_LENGTH)).toBe(true);
  });

  it("keeps the same seven-stop route whole at the desktop limit", () => {
    const links = buildGoogleRouteLinks(points, "driving", GOOGLE_DESKTOP_MAX_WAYPOINTS);
    expect(links).toHaveLength(1);
    expect(links[0].pointCount).toBe(7);
  });

  it.each<[TransportMode, string]>([
    ["driving", "driving"],
    ["walking", "walking"],
    ["cycling", "bicycling"],
    ["transit", "transit"],
  ])("maps %s to the documented Google travel mode", (transport, travelMode) => {
    const [link] = buildGoogleRouteLinks(points.slice(0, 2), transport);
    expect(new URL(link.url).searchParams.get("travelmode")).toBe(travelMode);
  });

  it("falls back to the safe mobile limit when a waypoint limit is not finite", () => {
    expect(buildGoogleRouteLinks(points, "walking", Number.NaN)).toHaveLength(2);
  });

  it("removes only consecutive duplicate points so origin is not repeated", () => {
    const links = buildGoogleRouteLinks([points[0], points[0], points[1], points[0]], "transit");
    expect(routeCoordinates(links[0].url)).toEqual([
      "38.4237,27.1428",
      "38.432,27.144",
      "38.4237,27.1428",
    ]);
  });

  it("returns no external route when any coordinate is invalid", () => {
    expect(buildGooglePlaceDirectionsUrl({ lat: 200, lng: 0 })).toBeNull();
    expect(buildGoogleRouteLinks([points[0], { lat: 200, lng: 0 }], "walking")).toEqual([]);
    expect(buildYandexRouteUrl([points[0], { lat: 0, lng: Number.POSITIVE_INFINITY }], "walking")).toBeNull();
    expect(buildAppleDirectionsUrl({ lat: -91, lng: 0 }, "walking")).toBeNull();
  });

  it("uses the current location marker for a single Yandex destination", () => {
    const value = buildYandexRouteUrl([points[0]], "driving");
    const url = new URL(value!);
    expect(url.searchParams.get("rtext")).toBe("~38.4237,27.1428");
    expect(url.searchParams.get("rtt")).toBe("auto");
  });

  it.each<[TransportMode, string]>([
    ["driving", "auto"],
    ["walking", "pd"],
    ["cycling", "bc"],
    ["transit", "mt"],
  ])("maps %s to the documented Yandex route type", (transport, routeType) => {
    const value = buildYandexRouteUrl(points.slice(0, 3), transport);
    const url = new URL(value!);

    expect(url.searchParams.get("rtext")).toBe(
      "38.4237,27.1428~38.432,27.144~38.441,27.153",
    );
    expect(url.searchParams.get("rtt")).toBe(routeType);
  });

  it("maps documented Apple modes and leaves cycling for the user to choose", () => {
    expect(new URL(buildAppleDirectionsUrl(points[0], "walking")!).searchParams.get("dirflg")).toBe("w");
    expect(new URL(buildAppleDirectionsUrl(points[0], "driving")!).searchParams.get("dirflg")).toBe("d");
    expect(new URL(buildAppleDirectionsUrl(points[0], "transit")!).searchParams.get("dirflg")).toBe("r");
    expect(new URL(buildAppleDirectionsUrl(points[0], "cycling")!).searchParams.get("dirflg")).toBeNull();
  });

  it("selects the conservative mobile Google limit for phones and iPadOS", () => {
    expect(googleWaypointLimitForDevice("Mozilla/5.0 (Linux; Android 15; Mobile)")).toBe(3);
    expect(googleWaypointLimitForDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 5)).toBe(3);
    expect(googleWaypointLimitForDevice("Mozilla/5.0 (X11; Linux x86_64)")).toBe(9);
  });

  it("refuses an overlong Yandex URL instead of returning a silently truncated route", () => {
    const manyPoints = Array.from({ length: 400 }, (_, index) => ({
      lat: index / 1_000,
      lng: index / 1_000,
    }));
    expect(buildYandexRouteUrl(manyPoints, "walking")).toBeNull();
  });

  it("handles empty input without creating a broken URL", () => {
    expect(buildGoogleRouteLinks([], "walking")).toEqual([]);
    expect(buildYandexRouteUrl([], "walking")).toBeNull();
  });
});
