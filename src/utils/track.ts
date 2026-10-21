/**
 * Yürüyüş izi işleme — P17 boru hattının saf (React'siz, ağsız) çekirdeği.
 *
 * Sözleşme (ROADMAP §5.6): **durak tespiti polyline'dan SONRA yapılamaz** —
 * `encodePolyline` yalnız `[lng, lat]` kodlar, zaman taşımaz. Tespit kayıt
 * sırasında, tam çözünürlüklü akışta yapılır; bu dosya o akışın karar
 * fonksiyonlarını ve kayıt sonundaki taslak üretimini tutar.
 *
 * Tüm eşikler `TRACK_DETECTION` içinde **isimli** durur; sihirli sayı yok.
 */
import type { AtlasRoute, AtlasTrack, AtlasTrackStop, RouteLeg, RouteStop } from "../types";
import { haversineKm } from "./geo";
import { encodePolyline } from "./polyline";

export interface TrackPoint {
  lng: number;
  lat: number;
  timestamp: number;
  accuracy: number;
}

export interface DwellCandidate {
  startedAt: number;
  lastAt: number;
  /**
   * Adayın **ilk** ölçümü. Yarıçap bu sabit çapaya göre ölçülür: yürüyen bir
   * kullanıcının ortalaması kaydıkça aday "yanında taşınıp" sahte durak
   * üretmesin (sürüklenen merkez hatası).
   */
  anchorLat: number;
  anchorLng: number;
  latTotal: number;
  lngTotal: number;
  count: number;
  accuracyTotal: number;
}

export interface DwellState {
  candidate: DwellCandidate | null;
  stops: AtlasTrackStop[];
  /**
   * Sıçrama denetiminde referans alınan son **kabul edilmiş** ölçüm.
   * Opsiyonel: eski çağıranlar `{ candidate: null, stops: [] }` ile başlatabilir.
   */
  lastAccepted?: TrackPoint | null;
  /** Art arda reddedilen sıçrama sayısı (ısrarcı sıçramada referansı tazelemek için). */
  spikeStreak?: number;
}

/**
 * Durak tespiti ve sadeleştirme eşikleri — tek konfigürasyon.
 *
 * Gerekçeler:
 * - `dwellMinMs = 3 dk`: kısa molalar (fotoğraf, trafik ışığı) durak değildir;
 *   3 dk, "burada gerçekten durdum" eşiğidir (P2 saha deneyimi + ROADMAP Adım 4).
 * - `dwellMaxAccuracyM = 50`: ±50 m'den kötü ölçüm "duruyorum" sinyali sayılmaz;
 *   kentsel yansıma ve tünel çıkışı sahte durak üretirdi.
 * - `dwellRadiusM = 40…100`: yarıçap ortalama doğrulukla ölçeklenir (kötü doğruluk
 *   daha geniş yarıçap hak eder); alt sınır 40 m GPS gürültüsünü yutar, üst sınır
 *   100 m "aynı noktada durma" anlamını korur.
 * - `spike.*`: yürüyüşte 25 km/h üstü hız ve 60 m üstü tek atlama GPS sıçramasıdır.
 *   Sıçrama, süren bir durağı **bölmemeli** ve yeni sahte durak **açmamalı**.
 * - `maxFixGapMs = 5 dk`: iki ölçüm arasındaki boşluk bundan uzunsa "sürekli
 *   buradaydım" kanıtı yoktur. Boşluk boyunca durak süresi **sayılmaz**; aksi
 *   hâlde tünel/çekim boşluğu sahte durak üretir (sinyal kaybı fixture'ı).
 * - `simplifyToleranceM = 7`: 1 km'lik yürüyüşte geometri sapması sahada <10 m
 *   ölçüldü; 7 m tolerans bu bütçenin içinde kalır ve jitter'ı eler.
 */
export const TRACK_DETECTION = {
  dwellMinMs: 3 * 60 * 1000,
  dwellMaxAccuracyM: 50,
  dwellRadiusM: { min: 40, max: 100 },
  spike: { minJumpM: 60, maxSpeedKmh: 25, streakResync: 2 },
  maxFixGapMs: 5 * 60 * 1000,
  simplifyToleranceM: 7,
} as const;

/** Geriye uyumluluk: eski ad (P2 sözleşmesi). */
export const TRACK_DWELL_MAX_ACCURACY_M = TRACK_DETECTION.dwellMaxAccuracyM;

/**
 * Bir izde saklanabilecek en fazla durak sayısı. `firestore.rules`
 * (`validTrackDocument`) `stops.size() <= 100` ister; kayıt sırasında sınır
 * uygulanmazsa uzun bir yürüyüşün izi **yazma anında reddedilir** ve kullanıcı
 * kaydını kaybeder. Bu yüzden sınır istemcide de uygulanır (ilk 100 durak).
 */
export const TRACK_MAX_STOPS = 100;

/** Kurala göre bir izin polyline alanı en fazla bu kadar karakter olabilir. */
export const TRACK_MAX_POLYLINE_CHARS = 250_000;

export function capTrackStops(stops: AtlasTrackStop[], max = TRACK_MAX_STOPS): AtlasTrackStop[] {
  return stops.length <= max ? stops : stops.slice(0, max);
}

function newCandidate(point: TrackPoint): DwellCandidate {
  return {
    startedAt: point.timestamp,
    lastAt: point.timestamp,
    anchorLat: point.lat,
    anchorLng: point.lng,
    latTotal: point.lat,
    lngTotal: point.lng,
    count: 1,
    accuracyTotal: point.accuracy,
  };
}

function centerOf(candidate: DwellCandidate) {
  return { lat: candidate.latTotal / candidate.count, lng: candidate.lngTotal / candidate.count };
}

/**
 * GPS sıçraması mı? Aynı ölçüm serisi içinde iki nokta arasındaki mesafe
 * `minJumpM`'yi aşıyor **ve** bu mesafeyi kat etmek `maxSpeedKmh`'den hızlı
 * gerekiyorsa nokta gerçek bir hareket değil, sıçramadır.
 *
 * Zaman farkı ≤ 0 ise (saat geri sıçraması) hız hesaplanamaz: nokta sıçrama
 * sayılmaz, yalnız referans güncellenir.
 */
export function isGpsSpike(previous: TrackPoint | null | undefined, next: TrackPoint): boolean {
  if (!previous) return false;
  const jumpMeters = haversineKm(previous.lat, previous.lng, next.lat, next.lng) * 1000;
  if (jumpMeters < TRACK_DETECTION.spike.minJumpM) return false;
  const elapsedMs = next.timestamp - previous.timestamp;
  if (elapsedMs <= 0) return false;
  const speedKmh = (jumpMeters / 1000) / (elapsedMs / 3_600_000);
  return speedKmh > TRACK_DETECTION.spike.maxSpeedKmh;
}

/**
 * Geometri tarafındaki sıçrama filtresi. Durak tespiti sıçramayı zaten yok
 * sayar; **çizgi** de aynı korumayı hak eder: 400 m'lik tek bir aykırı ölçüm
 * aksi hâlde sadeleştirilmiş izi ve dolayısıyla mesafeyi şişirir.
 *
 * Israrcı sıçrama (`streakResync` kez üst üste) gerçek yer değiştirme sayılır
 * ve referans tazelenir — kullanıcı gerçekten taşınmış olabilir.
 */
export function removeGpsSpikes(points: TrackPoint[]): TrackPoint[] {
  if (points.length <= 2) return [...points];
  const kept: TrackPoint[] = [points[0]];
  let streak = 0;
  for (let index = 1; index < points.length; index += 1) {
    const last = kept[kept.length - 1];
    if (isGpsSpike(last, points[index])) {
      streak += 1;
      if (streak < TRACK_DETECTION.spike.streakResync) continue;
      streak = 0;
    } else {
      streak = 0;
    }
    kept.push(points[index]);
  }
  return kept;
}

function finishDwell(state: DwellState): DwellState {
  const candidate = state.candidate;
  if (!candidate || candidate.lastAt - candidate.startedAt < TRACK_DETECTION.dwellMinMs) {
    return { ...state, candidate: null };
  }
  const center = centerOf(candidate);
  return {
    ...state,
    candidate: null,
    stops: capTrackStops([...state.stops, {
      // `firestore.rules` `is int` ister: GPS zaman damgası kesirli gelebilir.
      startedAt: Math.round(candidate.startedAt),
      endedAt: Math.round(candidate.lastAt),
      lat: center.lat,
      lng: center.lng,
      pointCount: candidate.count,
    }]),
  };
}

/**
 * İzin başlangıç/bitiş zamanı. GPS saati geri sıçrayabilir (`position.timestamp`
 * monoton değil); ham ilk/son nokta kullanılırsa `endedAt < startedAt` olur ve
 * kural (`endedAt >= startedAt`) belgeyi reddeder. Bu yüzden min/max kullanılır.
 */
export function trackWindow(points: Array<{ timestamp: number }>): { startedAt: number; endedAt: number } {
  let startedAt = Number.POSITIVE_INFINITY;
  let endedAt = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    if (point.timestamp < startedAt) startedAt = point.timestamp;
    if (point.timestamp > endedAt) endedAt = point.timestamp;
  }
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return { startedAt: 0, endedAt: 0 };
  return { startedAt, endedAt };
}

/**
 * Her `watchPosition` callback'inde çağrılır; dwell polyline sadeleştirmesinden
 * **önce** saptanır.
 *
 * Sıçrama koruması: tek bir aykırı ölçüm ne süren adayı kapatır ne de yeni aday
 * açar — böylece 6 dakikalık gerçek mola, ortasındaki sıçrama yüzünden iki kısa
 * molaya bölünmez. Art arda `streakResync` sıçrama gelirse (dünya gerçekten
 * değişmiş olabilir) referans tazelenir.
 */
export function recordDwellPoint(state: DwellState, point: TrackPoint): DwellState {
  if (!Number.isFinite(point.accuracy) || point.accuracy > TRACK_DETECTION.dwellMaxAccuracyM) return state;

  const previous = state.lastAccepted ?? null;
  if (isGpsSpike(previous, point)) {
    const streak = (state.spikeStreak ?? 0) + 1;
    if (streak < TRACK_DETECTION.spike.streakResync) {
      // Aday korunur, referans korunur: sıçrama tamamen yok sayılır.
      return { ...state, spikeStreak: streak };
    }
    // Israrcı sıçrama: referansı tazele, süren adayı bozma.
    return { ...state, lastAccepted: point, spikeStreak: 0 };
  }

  // Kanıtsız aralık: iki kabul edilmiş ölçüm arasında `maxFixGapMs`'den uzun
  // boşluk varsa süren aday bu boşluk boyunca uzatılamaz. Boşluktan önceki
  // (kanıtlı) kısım kapatılır, yeni aday bu ölçümle başlar.
  if (state.candidate && previous && point.timestamp - previous.timestamp > TRACK_DETECTION.maxFixGapMs) {
    const finalized = finishDwell(state);
    return {
      ...finalized,
      candidate: newCandidate(point),
      lastAccepted: point,
      spikeStreak: 0,
    };
  }

  const candidate = state.candidate;
  if (!candidate) {
    return {
      ...state,
      candidate: newCandidate(point),
      lastAccepted: point,
      spikeStreak: 0,
    };
  }

  const meanAccuracy = candidate.accuracyTotal / candidate.count;
  // Yarıçap sabit çapaya göre: ortalama doğrulukla ölçeklenir, 40–100 m arasında.
  const radiusMeters = Math.max(
    TRACK_DETECTION.dwellRadiusM.min,
    Math.min(TRACK_DETECTION.dwellRadiusM.max, (meanAccuracy + point.accuracy) / 2),
  );
  const fromCenterMeters = haversineKm(candidate.anchorLat, candidate.anchorLng, point.lat, point.lng) * 1000;
  if (fromCenterMeters > radiusMeters) {
    const finalized = finishDwell(state);
    return {
      ...finalized,
      candidate: newCandidate(point),
      lastAccepted: point,
      spikeStreak: 0,
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
    lastAccepted: point,
    spikeStreak: 0,
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
export function simplifyTrack(points: TrackPoint[], toleranceMeters: number = TRACK_DETECTION.simplifyToleranceM): [number, number][] {
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

/** Sadeleştirmenin ölçülebilir sözleşmesi: kaç nokta atıldı, sapma ne kadar? */
export interface SimplificationStats {
  coords: [number, number][];
  keptCount: number;
  removedCount: number;
  /** Atılan noktaların sadeleşmiş çizgiye en büyük dik uzaklığı (m). */
  maxDeviationM: number;
  /** Ham (jitter'lı) toplam uzunluk — yalnız teşhis; mesafe iddiası değildir. */
  rawLengthKm: number;
  simplifiedLengthKm: number;
}

/** Atılan noktanın çoklu çizgiye en kısa mesafesi (m). */
function distanceToPolylineM(point: [number, number], coords: [number, number][]): number {
  if (coords.length === 0) return Number.POSITIVE_INFINITY;
  if (coords.length === 1) {
    return haversineKm(coords[0][1], coords[0][0], point[1], point[0]) * 1000;
  }
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < coords.length; index += 1) {
    const distance = segmentDistanceMeters(point, coords[index - 1], coords[index]);
    if (distance < best) best = distance;
  }
  return best;
}

/**
 * Dolu sadeleştirme: DP çıktısı + politika ölçümleri.
 *
 * Epsilon politikası: `maxDeviationM <= toleranceM` **sözleşmedir** (DP'nin
 * tanımı) ve testle sabitlenir. Uzunluk tarafında ham jitter'lı toplam
 * karşılaştırma anlamlı değildir (ROADMAP §7-D: jitter mesafeyi %20–100 şişirir);
 * bu yüzden `simplifiedLengthKm` gerçek mesafe iddiasıdır, `rawLengthKm` yalnız
 * teşhis alanıdır.
 */
export function simplifyTrackWithStats(
  points: TrackPoint[],
  toleranceMeters: number = TRACK_DETECTION.simplifyToleranceM,
): SimplificationStats {
  const coords = simplifyTrack(points, toleranceMeters);
  const kept = new Set(coords.map((coord) => `${coord[0].toFixed(7)},${coord[1].toFixed(7)}`));
  let maxDeviationM = 0;
  let removedCount = 0;
  for (const point of points) {
    const key = `${point.lng.toFixed(7)},${point.lat.toFixed(7)}`;
    if (kept.has(key)) continue;
    removedCount += 1;
    const deviation = distanceToPolylineM([point.lng, point.lat], coords);
    if (deviation > maxDeviationM) maxDeviationM = deviation;
  }
  const rawLengthKm = Math.round(points.reduce((total, point, index) => (
    index === 0 ? 0 : total + haversineKm(points[index - 1].lat, points[index - 1].lng, point.lat, point.lng)
  ), 0) * 100) / 100;
  return {
    coords,
    keptCount: coords.length,
    removedCount,
    maxDeviationM: Math.round(maxDeviationM * 10) / 10,
    rawLengthKm,
    simplifiedLengthKm: simplifiedDistanceKm(coords),
  };
}

/* ─────────────────── Taslak rota üretimi (saf) ─────────────────── */

function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function stopToRouteStop(stop: AtlasTrackStop, index: number, name: string | null): RouteStop {
  const durationMinutes = Math.max(0, Math.round((stop.endedAt - stop.startedAt) / 60_000));
  return {
    order: index + 1,
    name: name?.trim() || `Durak ${index + 1}`,
    type: "other",
    lat: stop.lat,
    lng: stop.lng,
    startTime: formatClock(stop.startedAt),
    endTime: formatClock(stop.endedAt),
    durationMinutes,
    description: `Kayıt sırasında yaklaşık ${durationMinutes} dakika burada durdun.`,
    // Dürüst gerekçe: uydurma "öneri" yok, yalnız kayıttan ölçülen süre.
    aiReason: `Senin kaydından: burada ${durationMinutes} dakika durdun.`,
    tips: [],
    isCommunityPin: false,
    pinId: null,
    category: "Kayıtlı iz",
    imageUrl: null,
    source: "atlasia",
  };
}

export interface TrackDraftInput {
  /** Kayıt sırasında toplanan tam çözünürlüklü noktalar (zaman damgalı). */
  points: TrackPoint[];
  /** Kayıt sırasında her callback'te işlenmiş dwell durumu. */
  dwell: DwellState;
  uid: string;
  /** İz dokümanı kimliği; taslak rota kimliği bundan türetilir. */
  trackId: string;
  /** Durakların ters coğrafi adları (ağ çağrısı çağıranda kalır). */
  stopNames?: Array<string | null>;
  /** Testler için sabit zaman. */
  now?: number;
}

export interface TrackDraftResult {
  track: AtlasTrack;
  route: AtlasRoute;
  stats: SimplificationStats;
}

/**
 * Kayıt sonu: özel `tracks` belgesi + dürüst metinli taslak rota.
 *
 * Not (P17): duraklar ve **bacak** aynı rota modeline dönüşür; bacak, sadeleşmiş
 * geometrinin tamamını taşıyan tek `walking` bacağıdır. Durak bazlı bacak bölmek
 * `AtlasTrackStop`'a indeks aralığı alanı eklemeyi gerektirir (`types.ts` bu
 * görevin dosya listesinde yok) — açık nokta olarak teslimata yazıldı.
 */
export function buildTrackDraft(input: TrackDraftInput): TrackDraftResult {
  const { points, uid, trackId } = input;
  if (points.length === 0) throw new Error("Henüz konum ölçümü alınmadı; taslak üretilemez.");
  const dwell = finishDwellDetection(input.dwell);
  // Geometri ve doğruluk istatistikleri sıçramalardan arındırılmış seriden:
  // tek bir aykırı ölçüm mesafeyi/çizgiyi şişirmemeli.
  const geometryPoints = removeGpsSpikes(points);
  const usedPoints = geometryPoints.length >= 2 ? geometryPoints : points;
  const stats = simplifyTrackWithStats(usedPoints);
  const window = trackWindow(usedPoints);
  // Kural `startedAt`/`endedAt` için `int` ister; kesirli zaman damgası yuvarlanır.
  const startedAt = Math.round(window.startedAt);
  const endedAt = Math.round(window.endedAt);
  const polyline = encodePolyline(stats.coords);
  if (polyline.length > TRACK_MAX_POLYLINE_CHARS) {
    throw new Error("İz çok uzun; sadeleştirilmiş çizgi kayıt sınırını aşıyor.");
  }
  const stops = capTrackStops(dwell.stops);
  const meanMeters = Math.round((usedPoints.reduce((sum, point) => sum + point.accuracy, 0) / usedPoints.length) * 10) / 10;
  const maxMeters = Math.round(usedPoints.reduce((max, point) => Math.max(max, point.accuracy), 0) * 10) / 10;
  const durationMinutes = Math.max(1, Math.round((endedAt - startedAt) / 60_000));

  const track: AtlasTrack = {
    id: trackId,
    authorUid: uid,
    startedAt,
    endedAt,
    distanceKm: stats.simplifiedLengthKm,
    polyline,
    stops,
    accuracy: { sampleCount: usedPoints.length, meanMeters, maxMeters },
  };

  const leg: RouteLeg = {
    id: `leg-${trackId}`,
    coords: stats.coords,
    mode: "walking",
    distanceKm: stats.simplifiedLengthKm,
    durationMinutes,
  };

  const routeStops = stops.map((stop, index) => stopToRouteStop(stop, index, input.stopNames?.[index] ?? null));
  const route: AtlasRoute = {
    id: `route-${trackId.replace(/^track-/, "")}`,
    routeTitle: "Kayıtlı yürüyüş",
    routeSummary: `Yürüyüş kaydından oluşturulan özel taslak. Yaklaşık ${stats.simplifiedLengthKm} km; süre, çizgi ve duraklar cihaz kaydından türetildi.`,
    totalDurationHours: Math.round((endedAt - startedAt) / 360_000) / 10,
    totalDistanceKm: stats.simplifiedLengthKm,
    transport: "walking",
    vibe: "Yürüyüş kaydı",
    days: [{
      dayNumber: 1,
      title: "Yürüyüş",
      summary: "Kayıt sırasında tespit edilen duraklar.",
      stops: routeStops,
      polyline,
      legs: [leg],
    }],
    weatherNote: null,
    alternatives: [],
    createdAt: input.now ?? Date.now(),
    origin: stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: points[0].lat, lng: points[0].lng },
  };

  return { track, route, stats };
}

/** Firestore kurallarının iz sınırlarını önceden denetler (yazmadan önce net hata). */
export function trackRuleViolation(track: AtlasTrack): string | null {
  if (!track.id.trim()) return "İz kimliği boş.";
  if (!track.authorUid.trim()) return "İz sahibi belirsiz.";
  if (track.endedAt < track.startedAt) return "İz bitişi başlangıcından önce.";
  if (!Number.isFinite(track.distanceKm) || track.distanceKm < 0 || track.distanceKm > 100_000) return "İz mesafesi geçersiz.";
  if (track.polyline.length > TRACK_MAX_POLYLINE_CHARS) return "İz çizgisi kayıt sınırını aşıyor.";
  if (track.stops.length > TRACK_MAX_STOPS) return "İzde çok fazla durak var.";
  if (!Number.isFinite(track.accuracy.meanMeters) || track.accuracy.meanMeters < 0) return "Doğruluk ortalaması geçersiz.";
  if (track.accuracy.maxMeters < track.accuracy.meanMeters) return "En kötü doğruluk ortalamadan küçük olamaz.";
  return null;
}
