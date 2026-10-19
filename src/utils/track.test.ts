import { describe, expect, it } from "vitest";
import { finishDwellDetection, recordDwellPoint, simplifiedDistanceKm, simplifyTrack, type DwellState, type TrackPoint } from "./track";

const point = (lng: number, lat: number, timestamp: number, accuracy = 8): TrackPoint => ({ lng, lat, timestamp, accuracy });
const freshDwell = (): DwellState => ({ candidate: null, stops: [] });

describe("walking track processing", () => {
  it("records a dwell from full-resolution fixes and closes it when movement resumes", () => {
    let dwell = freshDwell();
    dwell = recordDwellPoint(dwell, point(27.1, 38.4, 10_000));
    dwell = recordDwellPoint(dwell, point(27.10005, 38.40002, 100_000));
    dwell = recordDwellPoint(dwell, point(27.09997, 38.40001, 200_000));
    dwell = recordDwellPoint(dwell, point(27.1, 38.4, 200_001));
    expect(dwell.stops).toHaveLength(0);
    dwell = recordDwellPoint(dwell, point(27.11, 38.41, 210_000));
    expect(dwell.stops).toHaveLength(1);
    expect(dwell.stops[0].startedAt).toBe(10_000);
    expect(dwell.stops[0].endedAt).toBe(200_001);
    expect(dwell.stops[0].pointCount).toBe(4);
  });

  it("does not count short halts as stops", () => {
    let dwell = freshDwell();
    dwell = recordDwellPoint(dwell, point(27.1, 38.4, 10_000));
    dwell = recordDwellPoint(dwell, point(27.1, 38.4, 100_000));
    dwell = recordDwellPoint(dwell, point(27.11, 38.41, 110_000));
    expect(dwell.stops).toHaveLength(0);
  });

  it("simplifies small GPS jitter and measures the simplified path", () => {
    const points = Array.from({ length: 51 }, (_, index) => point(27 + index * 0.0001, 38.4 + (index % 3) * 0.000002, index * 3_000));
    const simplified = simplifyTrack(points, 7);
    expect(simplified.length).toBeLessThan(points.length);
    expect(simplified.length).toBeGreaterThanOrEqual(2);
    expect(simplifiedDistanceKm(simplified)).toBeGreaterThan(0.4);
    expect(simplifiedDistanceKm(simplified)).toBeLessThan(0.6);
  });

  it("flushes a completed stop when the user ends the recording without moving away", () => {
    let dwell = freshDwell();
    dwell = recordDwellPoint(dwell, point(27.1, 38.4, 0));
    dwell = recordDwellPoint(dwell, point(27.1, 38.4, 180_000));
    expect(finishDwellDetection(dwell).stops).toHaveLength(1);
  });
});
