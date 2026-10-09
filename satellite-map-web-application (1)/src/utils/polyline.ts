/** Google Encoded Polyline Algorithm */
export function encodePolyline(coords: [number, number][]) {
  let plat = 0;
  let plng = 0;
  let out = "";
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    s += String.fromCharCode(n + 63);
    return s;
  };
  for (const [lng, lat] of coords) {
    const ilat = Math.round(lat * 1e5);
    const ilng = Math.round(lng * 1e5);
    out += enc(ilat - plat) + enc(ilng - plng);
    plat = ilat;
    plng = ilng;
  }
  return out;
}

export function decodePolyline(str: string): [number, number][] {
  const coords: [number, number][] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let r = 0;
    let s = 0;
    let b: number;
    do {
      b = str.charCodeAt(i++) - 63;
      r |= (b & 0x1f) << s;
      s += 5;
    } while (b >= 0x20);
    return r & 1 ? ~(r >> 1) : r >> 1;
  };
  while (i < str.length) {
    lat += next();
    lng += next();
    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}
