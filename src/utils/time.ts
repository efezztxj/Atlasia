const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "az önce", "12 dk", "3 sa", "2 g" */
export function relativeTime(ts: number, now = Date.now()) {
  const diff = Math.max(0, now - ts);
  if (diff < MIN) return "az önce";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} dk`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} sa`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} g`;
  return new Date(ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

/** Story'nin dolmasına kalan süre (24 saat) */
export function storyRemaining(ts: number, now = Date.now()) {
  const left = ts + DAY - now;
  if (left <= 0) return null;
  if (left < HOUR) return `${Math.max(1, Math.floor(left / MIN))} dk kaldı`;
  return `${Math.floor(left / HOUR)} sa kaldı`;
}

export const isStoryAlive = (ts: number, now = Date.now()) => now - ts < DAY;

export const minutesAgo = (m: number) => Date.now() - m * MIN;
export const hoursAgo = (h: number) => Date.now() - h * HOUR;
