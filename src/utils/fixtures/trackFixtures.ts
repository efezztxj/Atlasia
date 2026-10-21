/**
 * P17 sentetik fixture'ları — masaüstünde, ağ olmadan, deterministik.
 *
 * Her senaryo gerçek bir saha durumunu taklit eder: sabit 5 sn örnekleme,
 * gerçekçi yürüme hızı (4–5 km/h), ölçüm gürültüsü. Gürültü `Math.random()`
 * ile değil, kapalı form bir dalgayla üretilir → test her koşuda aynıdır.
 *
 * **Bu fixture'lar saha testinin yerine geçmez.** Sahada 1 km yürüyüşte <10 m
 * sapma ölçüldü; buradaki beklentiler o bütçeyle uyumlu olacak şekilde
 * seçilmiştir, ölçümün kendisi değildir.
 */
import type { TrackPoint } from "../track";

const ORIGIN = { lat: 38.4, lng: 27.1 };
const M_PER_DEG_LAT = 111_320;

function toLatLng(eastM: number, northM: number) {
  const lat = ORIGIN.lat + northM / M_PER_DEG_LAT;
  const lng = ORIGIN.lng + eastM / (M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180));
  return { lat, lng };
}

/** Deterministik "GPS gürültüsü": ±`amplitudeM` sınırında, tekrarsız. */
function noiseM(index: number, amplitudeM: number): number {
  return amplitudeM * Math.sin(index * 1.7) * Math.cos(index * 0.37);
}

interface WalkOptions {
  /** Yürüyüşün başladığı saat (epoch ms). */
  startMs: number;
  /** Yürüyüşün başladığı doğu kaydırma (m). */
  startEastM: number;
  /** Kat edilecek mesafe (m). */
  distanceM: number;
  /** Yürüme hızı (m/s). Varsayılan 1.25 m/s ≈ 4.5 km/h. */
  speedMps?: number;
  /** Ölçüm doğruluğu (m). */
  accuracy?: number;
  /** Gürültü genliği (m). */
  noise?: number;
}

/** Düz bir çizgide yürüyüş; 5 saniyede bir ölçüm. */
export function walkFix(options: WalkOptions): TrackPoint[] {
  const { startMs, startEastM, distanceM } = options;
  const speed = options.speedMps ?? 1.25;
  const accuracy = options.accuracy ?? 8;
  const noise = options.noise ?? 3;
  const stepM = speed * 5;
  const count = Math.max(2, Math.ceil(distanceM / stepM));
  const points: TrackPoint[] = [];
  for (let index = 0; index <= count; index += 1) {
    const alongM = Math.min(distanceM, index * stepM);
    const { lat, lng } = toLatLng(startEastM + alongM + noiseM(index, noise), noiseM(index + 7, noise));
    points.push({ lat, lng, timestamp: startMs + index * 5000, accuracy });
  }
  return points;
}

/** Belirli bir noktada `durationMs` boyunca duruş; 5 saniyede bir ölçüm. */
export function standFix(
  eastM: number,
  northM: number,
  startMs: number,
  durationMs: number,
  accuracy = 8,
): TrackPoint[] {
  const points: TrackPoint[] = [];
  const steps = Math.max(1, Math.round(durationMs / 5000));
  for (let index = 0; index <= steps; index += 1) {
    const { lat, lng } = toLatLng(eastM + noiseM(index, 4), northM + noiseM(index + 13, 4));
    points.push({ lat, lng, timestamp: startMs + index * 5000, accuracy });
  }
  return points;
}

/** Senaryo 1 — 1 km düz yürüyüş, hiç mola yok. Beklenen durak: 0. */
export function straightWalk1km(): TrackPoint[] {
  return walkFix({ startMs: Date.UTC(2026, 9, 3, 6, 0, 0), startEastM: 0, distanceM: 1000, noise: 4 });
}

/** Senaryo 2 — iki gerçek mola (4'er dk). Beklenen durak: 2. */
export function walkWithTwoBreaks(): TrackPoint[] {
  const start = Date.UTC(2026, 9, 3, 6, 0, 0);
  const first = walkFix({ startMs: start, startEastM: 0, distanceM: 400 });
  const restStart = first[first.length - 1].timestamp + 5000;
  const rest = standFix(400, 0, restStart, 4 * 60 * 1000);
  const secondStart = rest[rest.length - 1].timestamp + 5000;
  const second = walkFix({ startMs: secondStart, startEastM: 400, distanceM: 400 });
  const rest2Start = second[second.length - 1].timestamp + 5000;
  const rest2 = standFix(800, 0, rest2Start, 4 * 60 * 1000);
  const thirdStart = rest2[rest2.length - 1].timestamp + 5000;
  const third = walkFix({ startMs: thirdStart, startEastM: 800, distanceM: 300 });
  return [...first, ...rest, ...second, ...rest2, ...third];
}

/** Senaryo 3 — yürüyüş ortasında 10 dk sinyal kaybı. Beklenen durak: 0. */
export function walkWithSignalLoss(): TrackPoint[] {
  const start = Date.UTC(2026, 9, 3, 7, 0, 0);
  const before = walkFix({ startMs: start, startEastM: 0, distanceM: 500 });
  const resumed = before[before.length - 1].timestamp + 10 * 60 * 1000;
  const after = walkFix({ startMs: resumed, startEastM: 500, distanceM: 400 });
  return [...before, ...after];
}

/** Senaryo 4 — kentsel sürüklenme: doğruluk 60–90 m. Beklenen durak: 0. */
export function urbanDrift(): TrackPoint[] {
  const start = Date.UTC(2026, 9, 3, 8, 0, 0);
  const points: TrackPoint[] = [];
  for (let index = 0; index <= 120; index += 1) {
    // Binalar arasında yavaş yürüyüş + büyük konum sıçramaları.
    const { lat, lng } = toLatLng(index * 2 + noiseM(index, 35), noiseM(index + 5, 35));
    points.push({
      lat,
      lng,
      timestamp: start + index * 5000,
      accuracy: 60 + (index % 4) * 10,
    });
  }
  return points;
}

/** Senaryo 5 — 6 dk mola, ortasında tek 400 m'lik GPS sıçraması. Beklenen durak: 1 (bölünmemiş). */
export function breakWithSpike(): TrackPoint[] {
  const start = Date.UTC(2026, 9, 3, 9, 0, 0);
  const walk = walkFix({ startMs: start, startEastM: 0, distanceM: 200 });
  const restStart = walk[walk.length - 1].timestamp + 5000;
  const rest = standFix(200, 0, restStart, 6 * 60 * 1000);
  // Molanın 2. dakikasında tek bir aykırı ölçüm (400 m kuzey, 1 sn sonra).
  const spikeAt = restStart + 2 * 60 * 1000;
  const spike = toLatLng(200, 400);
  const withSpike: TrackPoint[] = [
    ...rest.filter((point) => point.timestamp < spikeAt),
    { lat: spike.lat, lng: spike.lng, timestamp: spikeAt, accuracy: 9 },
    ...rest.filter((point) => point.timestamp >= spikeAt),
  ];
  const afterStart = rest[rest.length - 1].timestamp + 5000;
  const after = walkFix({ startMs: afterStart, startEastM: 200, distanceM: 200 });
  return [...walk, ...withSpike, ...after];
}

/**
 * Senaryo 6 — aynı noktada 12 dk sinyal kaybı: iki ölçüm arası boşluk kanıt
 * değildir. Beklenen durak: 0 (muhafazakâr: süre uydurulmaz).
 */
export function standWithSignalLoss(): TrackPoint[] {
  const start = Date.UTC(2026, 9, 3, 9, 30, 0);
  const walk = walkFix({ startMs: start, startEastM: 0, distanceM: 150 });
  const arrival = walk[walk.length - 1];
  return [
    ...walk,
    // 1 sn sonra son ölçüm, ardından 12 dk sessizlik, aynı noktada tek ölçüm.
    { ...arrival, timestamp: arrival.timestamp + 1000 },
    { ...arrival, timestamp: arrival.timestamp + 12 * 60 * 1000 },
  ];
}

/** Senaryo 7 — yalnız 2 dk duruş (eşik altı). Beklenen durak: 0. */
export function shortBreak(): TrackPoint[] {
  const start = Date.UTC(2026, 9, 3, 10, 0, 0);
  const walk = walkFix({ startMs: start, startEastM: 0, distanceM: 300 });
  const restStart = walk[walk.length - 1].timestamp + 5000;
  const rest = standFix(300, 0, restStart, 2 * 60 * 1000);
  const afterStart = rest[rest.length - 1].timestamp + 5000;
  const after = walkFix({ startMs: afterStart, startEastM: 300, distanceM: 300 });
  return [...walk, ...rest, ...after];
}

export interface TrackFixture {
  id: string;
  name: string;
  expectedStops: number;
  points: TrackPoint[];
}

export const TRACK_FIXTURES: TrackFixture[] = [
  { id: "duz-yuruyus", name: "1 km düz yürüyüş, mola yok", expectedStops: 0, points: straightWalk1km() },
  { id: "molali", name: "İki gerçek mola (4'er dk)", expectedStops: 2, points: walkWithTwoBreaks() },
  { id: "sinyal-kaybi", name: "Ortada 10 dk sinyal kaybı", expectedStops: 0, points: walkWithSignalLoss() },
  { id: "kentsel-suruklenme", name: "Kentsel sürüklenme (±60–90 m)", expectedStops: 0, points: urbanDrift() },
  { id: "gps-sicramasi", name: "6 dk mola + ortada 400 m sıçrama", expectedStops: 1, points: breakWithSpike() },
  { id: "sinyal-kaybi-durus", name: "Aynı noktada 12 dk sinyal kaybı", expectedStops: 0, points: standWithSignalLoss() },
  { id: "kisa-durus", name: "2 dk duruş (eşik altı)", expectedStops: 0, points: shortBreak() },
];
