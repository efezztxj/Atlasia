import { getPosition, getTimes } from "suncalc";
import tzLookup from "tz-lookup";

// suncalc 2.x: getPosition açıları DERECE döner (1.x radyandı) ve named export
// kullanır. Burada birim dönüşümü yapılmaz; çifte dönüşüm güneş açısını ~57 kat
// şişirir (bkz. sun.test.ts "derece birimi" kilidi).
export function solarElevation(lat: number, lng: number, date = new Date()) {
  return getPosition(date, lat, lng).altitude;
}

export function goldenHourWindow(lat: number, lng: number, date = new Date()) {
  let timeZone = "UTC";
  try { timeZone = tzLookup(lat, lng); } catch { /* Invalid coordinates retain UTC. */ }
  const times = getTimes(date, lat, lng);
  const format = (value: Date | null | undefined) => Number.isFinite(value?.getTime()) ? new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(value as Date) : null;
  const range = (start: Date | null | undefined, end: Date | null | undefined) => {
    const a = format(start);
    const b = format(end);
    return a && b ? `${a} - ${b}` : null;
  };
  return {
    morning: range(times.sunrise, times.goldenHourEnd),
    evening: range(times.goldenHour, times.sunset),
    sunset: format(times.sunset),
    timeZone,
  };
}
