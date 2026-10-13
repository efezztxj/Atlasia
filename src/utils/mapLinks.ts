import type { TransportMode } from "../types";

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface GoogleRouteLink {
  url: string;
  pointCount: number;
}

export const GOOGLE_MOBILE_MAX_WAYPOINTS = 3;
export const GOOGLE_DESKTOP_MAX_WAYPOINTS = 9;
export const MAP_URL_MAX_LENGTH = 2048;

const GOOGLE_TRAVEL_MODES: Record<TransportMode, string> = {
  walking: "walking",
  cycling: "bicycling",
  driving: "driving",
  transit: "transit",
};

const YANDEX_ROUTE_TYPES: Record<TransportMode, string> = {
  walking: "pd",
  cycling: "bc",
  driving: "auto",
  transit: "mt",
};

const APPLE_DIRECTION_FLAGS: Partial<Record<TransportMode, string>> = {
  walking: "w",
  driving: "d",
  transit: "r",
};

export function isValidMapPoint(point: MapPoint): boolean {
  return Number.isFinite(point.lat)
    && Number.isFinite(point.lng)
    && point.lat >= -90
    && point.lat <= 90
    && point.lng >= -180
    && point.lng <= 180;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function formatPoint(point: MapPoint): string {
  return `${formatNumber(point.lat)},${formatNumber(point.lng)}`;
}

function normalizeRoutePoints(points: MapPoint[]): MapPoint[] | null {
  if (points.some((point) => !isValidMapPoint(point))) return null;

  return points.filter((point, index) => (
    index === 0 || formatPoint(point) !== formatPoint(points[index - 1])
  ));
}

function googleDirectionsUrl(points: MapPoint[], transport?: TransportMode): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", formatPoint(points.at(-1)!));
  if (transport) url.searchParams.set("travelmode", GOOGLE_TRAVEL_MODES[transport]);

  if (points.length > 1) url.searchParams.set("origin", formatPoint(points[0]));
  if (points.length > 2) {
    url.searchParams.set("waypoints", points.slice(1, -1).map(formatPoint).join("|"));
  }

  return url.toString();
}

export function googleWaypointLimitForDevice(userAgent: string, maxTouchPoints = 0): number {
  const mobileUserAgent = /Android|iPhone|iPad|iPod|IEMobile|Mobile|Opera Mini/i.test(userAgent);
  const ipadWithDesktopUserAgent = /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
  return mobileUserAgent || ipadWithDesktopUserAgent
    ? GOOGLE_MOBILE_MAX_WAYPOINTS
    : GOOGLE_DESKTOP_MAX_WAYPOINTS;
}

export function buildGoogleRouteLinks(
  points: MapPoint[],
  transport: TransportMode,
  maxWaypoints = GOOGLE_MOBILE_MAX_WAYPOINTS,
): GoogleRouteLink[] {
  const normalized = normalizeRoutePoints(points);
  if (!normalized?.length) return [];
  if (normalized.length === 1) {
    return [{ url: googleDirectionsUrl(normalized, transport), pointCount: 1 }];
  }

  const requestedWaypointLimit = Number.isFinite(maxWaypoints)
    ? Math.floor(maxWaypoints)
    : GOOGLE_MOBILE_MAX_WAYPOINTS;
  const safeWaypointLimit = Math.max(
    0,
    Math.min(GOOGLE_DESKTOP_MAX_WAYPOINTS, requestedWaypointLimit),
  );
  const pointsPerLink = safeWaypointLimit + 2;
  const links: GoogleRouteLink[] = [];

  for (let start = 0; start < normalized.length - 1;) {
    const end = Math.min(start + pointsPerLink - 1, normalized.length - 1);
    const segment = normalized.slice(start, end + 1);
    const url = googleDirectionsUrl(segment, transport);
    if (url.length > MAP_URL_MAX_LENGTH) return [];
    links.push({ url, pointCount: segment.length });
    start = end;
  }

  return links;
}

export function buildGooglePlaceDirectionsUrl(point: MapPoint): string | null {
  if (!isValidMapPoint(point)) return null;
  return googleDirectionsUrl([point]);
}

export function buildYandexRouteUrl(points: MapPoint[], transport: TransportMode): string | null {
  const normalized = normalizeRoutePoints(points);
  if (!normalized?.length) return null;

  const routePoints = normalized.length === 1
    ? `~${formatPoint(normalized[0])}`
    : normalized.map(formatPoint).join("~");
  const url = new URL("https://yandex.com/maps/");
  url.searchParams.set("rtext", routePoints);
  url.searchParams.set("rtt", YANDEX_ROUTE_TYPES[transport]);
  const value = url.toString();
  return value.length <= MAP_URL_MAX_LENGTH ? value : null;
}

export function buildYandexPlaceDirectionsUrl(point: MapPoint): string | null {
  return buildYandexRouteUrl([point], "driving");
}

export function buildAppleDirectionsUrl(point: MapPoint, transport: TransportMode): string | null {
  if (!isValidMapPoint(point)) return null;

  const url = new URL("https://maps.apple.com/");
  url.searchParams.set("daddr", formatPoint(point));
  const directionFlag = APPLE_DIRECTION_FLAGS[transport];
  if (directionFlag) url.searchParams.set("dirflg", directionFlag);
  return url.toString();
}
