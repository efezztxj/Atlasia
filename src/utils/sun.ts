import SunCalc from "suncalc";
import tzLookup from "tz-lookup";

export function solarElevation(lat: number, lng: number, date = new Date()) {
  return SunCalc.getPosition(date, lat, lng).altitude * 180 / Math.PI;
}

export function goldenHourWindow(lat: number, lng: number, date = new Date()) {
  let timeZone = "UTC";
  try { timeZone = tzLookup(lat, lng); } catch { /* Invalid coordinates retain UTC. */ }
  const times = SunCalc.getTimes(date, lat, lng);
  const format = (value: Date) => Number.isFinite(value?.getTime()) ? new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(value) : null;
  const range = (start: Date, end: Date) => {
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
