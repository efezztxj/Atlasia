import type { AtlasTrackStop } from "../types";
import { haversineKm } from "./geo";

export interface TrackPoint {
  lng: number;
  lat: number;
  timestamp: number;
  accuracy: number;
}

export interface DwellState {
  candidate: { startedAt: number; lastAt: number; latTotal: number; lngTotal: number; count: number; accuracyTotal: number } | null;
  stops: AtlasTrackStop[];
}

const DWELL_MIN_MS = 3 * 60 * 1000;

function centerOf(candidate: NonNullable<DwellState["candidate"]>) {
  return { lat: candidate.latTotal / candidate.count, lng: candidate.lngTotal / candidate.count };
}

function finishDwell(state: DwellState): DwellState {
  const candidate = state.candidate;
  if (!candidate || candidate.lastAt - candidate.startedAt < DWELL_MIN_MS) return { candidate: null, stops: state.stops };
  const center = centerOf(candidate);
  return {
    candidate: null,
    stops: [...state.stops, {
      startedAt: candidate.startedAt,
      endedAt: candidate.lastAt,
      lat: center.lat,
      lng: center.lng,
      pointCount: candidate.count,
    }],
  };
}

/** Her watchPosition callback'inde çağrılır; dwell polyline sadeleştirmesinden önce saptanır. */
export function recordDwellPoint(state: DwellState, point: TrackPoint): DwellState {
  const candidate = state.candidate;
  if (!candidate) {
    return {
      ...state,
      candidate: { startedAt: point.timestamp, lastAt: point.timestamp, latTotal: point.lat, lngTotal: point.lng, count: 1, accuracyTotal: point.accuracy },
    };
  }

  const center = centerOf(candidate);
  const radiusMeters = Math.max(40, Math.min(100, (candidate.accuracyTotal / candidate.count + point.accuracy) / 2));
  const fromCenterMeters = haversineKm(center.lat, center.lng, point.lat, point.lng) * 1000;
  if (fromCenterMeters > radiusMeters) {
    const finalized = finishDwell(state);
    return {
      ...finalized,
      candidate: { startedAt: point.timestamp, lastAt: point.timestamp, latTotal: point.lat, lngTotal: point.lng, count: 1, accuracyTotal: point.accuracy },
    };
  }
  return {
    ...state,
    candidate: {
      ...candidate,
      lastAt: point.timestamp,
      latTotal: candidate.latTotal + point.lat,
      lngTotal: candidate.lngTotal + point.lng,
      count: candidate.count + 1,
      accuracyTotal: candidate.accuracyTotal + point.accuracy,
    },
  };
}

export function finishDwellDetection(state: DwellState): DwellState {
  return finishDwell(state);
}

function segmentDistanceMeters(point: [number, number], start: [number, number], end: [number, number]): number {
  const meanLatitude = ((point[1] + start[1] + end[1]) / 3) * Math.PI / 180;
  const xScale = 111_320 * Math.cos(meanLatitude);
  const yScale = 111_320;
  const px = point[0] * xScale;
  const py = point[1] * yScale;
  const sx = start[0] * xScale;
  const sy = start[1] * yScale;
  const ex = end[0] * xScale;
  const ey = end[1] * yScale;
  const dx = ex - sx;
  const dy = ey - sy;
  if (dx === 0 && dy === 0) return Math.hypot(px - sx, py - sy);
  const projection = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (sx + projection * dx), py - (sy + projection * dy));
}

/** Douglas–Peucker sadeleştirmesi; aralık metre cinsinden ve uç noktalar korunur. */
export function simplifyTrack(points: TrackPoint[], toleranceMeters = 7): [number, number][] {
  if (points.length <= 2) return points.map((point): [number, number] => [point.lng, point.lat]);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const segment = stack.pop();
    if (!segment) continue;
    const [startIndex, endIndex] = segment;
    const start: [number, number] = [points[startIndex].lng, points[startIndex].lat];
    const end: [number, number] = [points[endIndex].lng, points[endIndex].lat];
    let maxDistance = toleranceMeters;
    let farthest = -1;
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const point = [points[index].lng, points[index].lat] as [number, number];
      const distance = segmentDistanceMeters(point, start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthest = index;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1;
      stack.push([startIndex, farthest], [farthest, endIndex]);
    }
  }
  return points.flatMap((point, index) => keep[index] ? [[point.lng, point.lat] as [number, number]] : []);
}

export function simplifiedDistanceKm(coords: [number, number][]): number {
  let distance = 0;
  for (let index = 1; index < coords.length; index += 1) {
    const [lng1, lat1] = coords[index - 1];
    const [lng2, lat2] = coords[index];
    distance += haversineKm(lat1, lng1, lat2, lng2);
  }
  return Math.round(distance * 100) / 100;
}
