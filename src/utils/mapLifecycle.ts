export const SPIN_FRAME_INTERVAL_MS = 1000 / 15;

export function shouldAdvanceSpin(
  now: number,
  lastFrameAt: number,
  enabled: boolean,
  hidden: boolean,
  reducedMotion: boolean,
  zoom: number,
  maxZoom: number,
  moving: boolean,
): boolean {
  return enabled && !hidden && !reducedMotion && !moving && zoom < maxZoom &&
    Number.isFinite(now) && now - lastFrameAt >= SPIN_FRAME_INTERVAL_MS;
}
