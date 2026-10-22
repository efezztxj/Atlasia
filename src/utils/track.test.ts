import { describe, expect, it } from "vitest";
import {
  TRACK_DETECTION,
  TRACK_MAX_STOPS,
  buildStopLegs,
  buildTrackDraft,
  capTrackStops,
  finishDwellDetection,
  recordDwellPoint,
  removeGpsSpikes,
  simplifiedDistanceKm,
  simplifyTrack,
  simplifyTrackWithStats,
  trackRuleViolation,
  trackWindow,
  vertexRangeForStop,
  type DwellState,
  type TrackPoint,
} from "./track";
import { decodePolyline, encodePolyline } from "./polyline";
import {
  TRACK_FIXTURES,
  breakWithSpike,
  straightWalk1km,
  urbanDrift,
  standWithSignalLoss,
  walkWithSignalLoss,
  walkWithTwoBreaks,
} from "./fixtures/trackFixtures";

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
    // Gerçekçi çıkış: 60 sn'de ~66 m yürüme (4 km/h) — yarıçapı aşar, sıçrama değildir.
    dwell = recordDwellPoint(dwell, point(27.1005, 38.4005, 260_000));
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

describe("kural sınırlarına uyum (firestore.rules tracks)", () => {
  it("durak sayısı 100 ile sınırlanır; sınır aşılırsa kural reddederdi", () => {
    const stops = Array.from({ length: TRACK_MAX_STOPS + 25 }, (_, index) => ({
      startedAt: index * 1000,
      endedAt: index * 1000 + 180_000,
      lat: 38.4,
      lng: 27.1,
      pointCount: 3,
    }));
    const capped = capTrackStops(stops);
    expect(capped).toHaveLength(TRACK_MAX_STOPS);
    expect(capped[0]).toBe(stops[0]);
    expect(capped[TRACK_MAX_STOPS - 1]).toBe(stops[TRACK_MAX_STOPS - 1]);
    // Sınır altındaki liste aynı referansla döner (gereksiz kopya yok).
    expect(capTrackStops(stops.slice(0, 3))).toHaveLength(3);
  });

  it("kayıt sırasında 100'den fazla durak birikmez", () => {
    let dwell = freshDwell();
    let timestamp = 0;
    for (let index = 0; index < TRACK_MAX_STOPS + 5; index += 1) {
      // Aynı noktada 3 dakika bekle, sonra 200 m yürü → her turda yeni durak.
      dwell = recordDwellPoint(dwell, point(27.1, 38.4, timestamp));
      dwell = recordDwellPoint(dwell, point(27.1, 38.4, timestamp + 180_000));
      timestamp += 200_000;
      dwell = recordDwellPoint(dwell, point(27.103, 38.4, timestamp));
    }
    dwell = finishDwellDetection(dwell);
    expect(dwell.stops.length).toBeLessThanOrEqual(TRACK_MAX_STOPS);
  });

  it("GPS saati geri sıçrasa da iz penceresi geçerli kalır (endedAt >= startedAt)", () => {
    const window = trackWindow([
      { timestamp: 900_000 },
      { timestamp: 100_000 },
      { timestamp: 500_000 },
    ]);
    expect(window.startedAt).toBe(100_000);
    expect(window.endedAt).toBe(900_000);
    expect(window.endedAt).toBeGreaterThanOrEqual(window.startedAt);
  });

  it("boş kayıtta pencere sıfır döner (bölme/NaN yok)", () => {
    expect(trackWindow([])).toEqual({ startedAt: 0, endedAt: 0 });
  });
});

describe("P17 fixture tablosu — uçtan uca (tespit → sadeleştirme → taslak rota)", () => {
  const runDwell = (points: TrackPoint[]) => points.reduce(recordDwellPoint, freshDwell());

  it.each(TRACK_FIXTURES.map((fixture) => [fixture.id, fixture] as const))(
    "%s: beklenen durak sayısı bulunur",
    (_id, fixture) => {
      const dwell = finishDwellDetection(runDwell(fixture.points));
      expect(dwell.stops).toHaveLength(fixture.expectedStops);
      // Bulunan her durak eşiği gerçekten aşmalı: 3 dk'dan kısa "durak" yok.
      for (const stop of dwell.stops) {
        expect(stop.endedAt - stop.startedAt).toBeGreaterThanOrEqual(TRACK_DETECTION.dwellMinMs);
      }
    },
  );

  it("sıçrama gerçek molayı ikiye bölmez; sıçrama noktası durağa sayılmaz", () => {
    const points = breakWithSpike();
    const dwell = finishDwellDetection(runDwell(points));
    expect(dwell.stops).toHaveLength(1);
    const [stop] = dwell.stops;
    expect(stop.endedAt - stop.startedAt).toBeGreaterThanOrEqual(5 * 60 * 1000);
    // Durağın zaman aralığında ve yarıçapında kaç gerçek ölçüm var?
    const inside = points.filter((point) => (
      point.timestamp >= stop.startedAt
      && point.timestamp <= stop.endedAt
      && Math.hypot(
        (point.lat - stop.lat) * 111_320,
        (point.lng - stop.lng) * 111_320 * Math.cos((stop.lat * Math.PI) / 180),
      ) <= TRACK_DETECTION.dwellRadiusM.max
    ));
    // 400 m uzaktaki sıçrama sayılmadı: sayaç, yarıçap içindeki ölçümlerle eşleşir.
    expect(stop.pointCount).toBe(inside.length);
  });

  it("sinyal kaybı boşluğu durak süresine eklenmez", () => {
    const points = walkWithSignalLoss();
    const dwell = finishDwellDetection(runDwell(points));
    expect(dwell.stops).toEqual([]);
    // Boşluk gerçekten uzun: fixture niyeti doğrulanır (yanlış fixture sessizce geçmesin).
    const gapMs = Math.max(...points.map((point, index) => (
      index === 0 ? 0 : point.timestamp - points[index - 1].timestamp
    )));
    expect(gapMs).toBeGreaterThan(TRACK_DETECTION.maxFixGapMs);
  });

  it("GPS sıçraması iz geometrisinden de çıkarılır: mesafe şişmez", () => {
    const points = breakWithSpike();
    const filtered = removeGpsSpikes(points);
    expect(filtered.length).toBe(points.length - 1);
    // 400 m uzaktaki tek ölçüm çizgiye girmemeli: iki yürüyüş ≈ 0,4 km.
    const { track, stats } = buildTrackDraft({ points, dwell: freshDwell(), uid: "u", trackId: "track-spike", now: 1 });
    expect(stats.simplifiedLengthKm).toBeLessThan(0.6);
    expect(track.accuracy.sampleCount).toBe(filtered.length);
  });

  it("kanıtsız boşluk (aynı noktada 12 dk sessizlik) durak sayılmaz", () => {
    const points = standWithSignalLoss();
    expect(finishDwellDetection(runDwell(points)).stops).toHaveLength(0);
    // Aynı konumda olsa bile süre kanıtlanamaz: boşluk eşiği aşılır.
    const gapMs = points[points.length - 1].timestamp - points[points.length - 2].timestamp;
    expect(gapMs).toBeGreaterThan(TRACK_DETECTION.maxFixGapMs);
  });

  it("kentsel sürüklenmede hiçbir ölçüm durak adayı açmaz (doğruluk > 50 m)", () => {
    const points = urbanDrift();
    expect(points.every((point) => point.accuracy > TRACK_DETECTION.dwellMaxAccuracyM)).toBe(true);
    expect(finishDwellDetection(runDwell(points)).stops).toHaveLength(0);
  });

  it("düz 1 km yürüyüşte sadeleştirme sapması 7 m toleransın içinde kalır", () => {
    const stats = simplifyTrackWithStats(straightWalk1km());
    expect(stats.maxDeviationM).toBeLessThanOrEqual(TRACK_DETECTION.simplifyToleranceM);
    expect(stats.removedCount).toBeGreaterThan(0);
    expect(stats.simplifiedLengthKm).toBeGreaterThan(0.95);
    expect(stats.simplifiedLengthKm).toBeLessThan(1.05);
  });

  it("taslak rota: duraklar + bacak mevcut rota modeline dönüşür", () => {
    const points = walkWithTwoBreaks();
    const dwell = runDwell(points);
    const { track, route, stats } = buildTrackDraft({
      points,
      dwell,
      uid: "uid-test",
      trackId: "track-fixture-1",
      stopNames: ["Çeşme başı", null],
      now: 1_760_000_000_000,
    });

    // İz: kural sınırlarında, polyline zaman taşımaz.
    expect(trackRuleViolation(track)).toBeNull();
    expect(track.stops).toHaveLength(2);
    expect(track.distanceKm).toBe(stats.simplifiedLengthKm);
    expect(track.accuracy.sampleCount).toBe(points.length);
    expect(track.accuracy.maxMeters).toBeGreaterThanOrEqual(track.accuracy.meanMeters);

    // Rota: bacaklar aynı geometrinin bölünmüş hâli, duraklar sıralı ve dürüst metinli.
    // Bu fixture düz çizgide yürür; DP yalnız uç köşeleri tutar, bölme tek
    // bacağa iner — asıl bölme davranışı dönüşlü senaryoda ayrıca sınanır.
    const day = route.days[0];
    const legs = day.legs ?? [];
    expect(legs.length).toBeGreaterThanOrEqual(1);
    expect(legs.every((leg) => leg.mode === "walking")).toBe(true);
    // Bacaklar sınır köşesini paylaşır: birleştirirken yinelenen köşe atılır.
    const joined = legs.flatMap((leg, index) => (index === 0 ? leg.coords : leg.coords.slice(1)));
    const decoded = decodePolyline(track.polyline);
    expect(joined).toHaveLength(decoded.length);
    decoded.forEach(([lng, lat], index) => {
      expect(joined[index][0]).toBeCloseTo(lng, 5);
      expect(joined[index][1]).toBeCloseTo(lat, 5);
    });
    // Bacak mesafeleri toplamı iz mesafesine eşittir (yuvarlama payı içinde).
    const legTotal = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
    expect(Math.abs(legTotal - track.distanceKm)).toBeLessThanOrEqual(0.02 * legs.length);
    // Duraklar köşe aralığı taşır; aralıklar sıralı ve çizgi sınırları içinde.
    for (const stop of track.stops) {
      expect(stop.startPointIndex).toBeGreaterThanOrEqual(0);
      expect(stop.endPointIndex).toBeGreaterThanOrEqual(stop.startPointIndex ?? 0);
      expect(stop.endPointIndex).toBeLessThan(decoded.length);
    }
    expect(day.stops.map((stop) => stop.name)).toEqual(["Çeşme başı", "Durak 2"]);
    expect(day.stops.map((stop) => stop.order)).toEqual([1, 2]);
    expect(day.stops.every((stop) => stop.durationMinutes >= 3)).toBe(true);
    expect(day.stops[0].aiReason).toContain("kaydından");
    expect(route.totalDistanceKm).toBe(track.distanceKm);
    expect(route.createdAt).toBe(1_760_000_000_000);
  });

  it("taslak üretimi deterministiktir (aynı girdi → aynı çıktı)", () => {
    const points = straightWalk1km();
    const dwell = runDwell(points);
    const first = buildTrackDraft({ points, dwell, uid: "u", trackId: "track-x", now: 1 });
    const second = buildTrackDraft({ points, dwell, uid: "u", trackId: "track-x", now: 1 });
    expect(second.track).toEqual(first.track);
    expect(second.route).toEqual(first.route);
  });

  it("zaman kodlamayan polyline'a durak tespiti yaptırılamaz", () => {
    const points = urbanDrift();
    const polyline = encodePolyline(simplifyTrack(points));
    const decoded = decodePolyline(polyline);
    // Sözleşme: kodlama yalnız [lng, lat] taşır → zaman yok, durak tespiti imkânsız.
    expect(decoded.length).toBeGreaterThan(2);
    expect(decoded.every((pair) => pair.length === 2)).toBe(true);
    expect(points.some((point) => "timestamp" in point)).toBe(true);
    // Aynı geometriden tespit yapılmaya çalışılırsa zaman bilgisi uydurulmak zorunda kalır:
    // encode/decode sonrası hiçbir zaman alanı yoktur, bu yüzden API zaman ister.
    expect(decoded.flat().every((value) => typeof value === "number")).toBe(true);
    expect((decoded[0] as unknown as Record<string, unknown>).timestamp).toBeUndefined();
  });

  it("kesirli GPS zaman damgası yuvarlanır (kural `is int` ister)", () => {
    const points = straightWalk1km().map((point, index) => ({
      ...point,
      // Mikrosaniye artığı: tarayıcılar `position.timestamp` için kesir üretebilir.
      timestamp: point.timestamp + (index % 2 === 0 ? 0.5 : 0.25),
    }));
    const dwell = finishDwellDetection(runDwell(points));
    const { track } = buildTrackDraft({ points, dwell, uid: "u", trackId: "track-frac", now: 1 });
    expect(Number.isInteger(track.startedAt)).toBe(true);
    expect(Number.isInteger(track.endedAt)).toBe(true);
    expect(track.stops.every((stop) => Number.isInteger(stop.startedAt) && Number.isInteger(stop.endedAt))).toBe(true);
  });

  it("taslak üretimi boş kayıtta açık hata verir (sessiz boş rota yok)", () => {
    expect(() => buildTrackDraft({ points: [], dwell: freshDwell(), uid: "u", trackId: "track-x" }))
      .toThrow(/ölçüm/i);
  });
});

describe("durak köşe aralığı (vertexRangeForStop)", () => {
  it("pencereye düşen ilk ve son köşeyi seçer", () => {
    expect(vertexRangeForStop({ startedAt: 12, endedAt: 28 }, [0, 10, 20, 30]))
      .toEqual({ startPointIndex: 2, endPointIndex: 2 });
    expect(vertexRangeForStop({ startedAt: 10, endedAt: 20 }, [0, 10, 20, 30]))
      .toEqual({ startPointIndex: 1, endPointIndex: 2 });
    expect(vertexRangeForStop({ startedAt: 0, endedAt: 30 }, [0, 10, 20, 30]))
      .toEqual({ startPointIndex: 0, endPointIndex: 3 });
  });

  it("pencereye köşe düşmüyorsa zamanca en yakın köşeye iner", () => {
    // Durak bütün kayıttan sonra: en yakın köşe son köşe.
    expect(vertexRangeForStop({ startedAt: 100, endedAt: 200 }, [0, 10, 20, 30]))
      .toEqual({ startPointIndex: 3, endPointIndex: 3 });
    // Durak iki köşe arasında sıkışmış (sadeleştirme iç köşeleri atmış).
    expect(vertexRangeForStop({ startedAt: 13, endedAt: 17 }, [0, 10, 20, 30]))
      .toEqual({ startPointIndex: 1, endPointIndex: 1 });
  });

  it("köşe yoksa null döner", () => {
    expect(vertexRangeForStop({ startedAt: 0, endedAt: 10 }, [])).toBeNull();
  });
});

describe("durak-durak bacak bölme (buildStopLegs)", () => {
  const line: [number, number][] = [
    [27.1, 38.4], [27.101, 38.4], [27.102, 38.4], [27.103, 38.4], [27.104, 38.4], [27.105, 38.4],
  ];
  const stopAt = (endPointIndex: number, startedAt: number, endedAt: number) => ({
    startedAt, endedAt, lat: 38.4, lng: 27.1, pointCount: 10, startPointIndex: endPointIndex, endPointIndex,
  });

  it("durak bitiş köşelerinden böler; bacaklar sınır köşesini paylaşır", () => {
    const legs = buildStopLegs(line, [stopAt(2, 60_000, 240_000), stopAt(4, 360_000, 540_000)], { startedAt: 0, endedAt: 600_000 }, "track-t");
    expect(legs.map((leg) => leg.coords)).toEqual([
      line.slice(0, 3),
      line.slice(2, 5),
      line.slice(4, 6),
    ]);
    expect(legs.map((leg) => leg.id)).toEqual(["leg-track-t-1", "leg-track-t-2", "leg-track-t-3"]);
    // Süreler ölçülen zamanlardan: duruş süreleri bacaklara yazılmaz.
    expect(legs.map((leg) => leg.durationMinutes)).toEqual([1, 2, 1]);
    // Mesafe toplamı bütün çizgiye eşittir (paylaşılan köşe çift sayılmaz).
    const total = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
    expect(Math.abs(total - simplifiedDistanceKm(line))).toBeLessThanOrEqual(0.03);
  });

  it("indeks taşımayan eski duraklar bölme üretmez: tek bacak, eski kimlik", () => {
    const legacy = [{ startedAt: 60_000, endedAt: 240_000, lat: 38.4, lng: 27.1, pointCount: 10 }];
    const legs = buildStopLegs(line, legacy, { startedAt: 0, endedAt: 600_000 }, "track-eski");
    expect(legs).toHaveLength(1);
    expect(legs[0].id).toBe("leg-track-eski");
    expect(legs[0].coords).toEqual(line);
  });

  it("son köşede biten durak boş kuyruk bacağı üretmez; aynı sınır tekillenir", () => {
    const legs = buildStopLegs(
      line,
      [stopAt(5, 500_000, 600_000), stopAt(2, 60_000, 120_000), stopAt(2, 130_000, 200_000)],
      { startedAt: 0, endedAt: 600_000 },
      "track-uc",
    );
    expect(legs).toHaveLength(2);
    expect(legs[1].coords).toEqual(line.slice(2));
  });

  it("boş geometri bacak üretmez", () => {
    expect(buildStopLegs([], [], { startedAt: 0, endedAt: 0 }, "track-bos")).toEqual([]);
  });
});

describe("dönüşlü yürüyüşte uçtan uca bacak bölme", () => {
  const M_PER_DEG = 111_320;
  const at = (eastM: number, northM: number, timestamp: number): TrackPoint => ({
    lng: 27.1 + eastM / (M_PER_DEG * Math.cos((38.4 * Math.PI) / 180)),
    lat: 38.4 + northM / M_PER_DEG,
    timestamp,
    accuracy: 8,
  });

  /** Doğu → mola → kuzey → mola → doğu: köşeler DP'de durur, bölme gerçek olur. */
  function turningWalk(): TrackPoint[] {
    const points: TrackPoint[] = [];
    let t = Date.UTC(2026, 9, 3, 6, 0, 0);
    const step = 6.25; // 1.25 m/s × 5 sn
    const walk = (fromE: number, fromN: number, toE: number, toN: number) => {
      const length = Math.hypot(toE - fromE, toN - fromN);
      const count = Math.round(length / step);
      for (let i = 0; i <= count; i += 1) {
        points.push(at(fromE + ((toE - fromE) * i) / count, fromN + ((toN - fromN) * i) / count, t));
        t += 5000;
      }
    };
    const stand = (eastM: number, northM: number, minutes: number) => {
      const count = (minutes * 60) / 5;
      for (let i = 0; i <= count; i += 1) {
        points.push(at(eastM, northM, t));
        t += 5000;
      }
    };
    walk(0, 0, 240, 0);
    stand(240, 0, 4);
    walk(240, 0, 240, 240);
    stand(240, 240, 4);
    walk(240, 240, 480, 240);
    return points;
  }

  it("iki mola üç bacak üretir; aralıklar iç köşeleri gösterir", () => {
    const points = turningWalk();
    const dwell = points.reduce(recordDwellPoint, freshDwell());
    const { track, route } = buildTrackDraft({ points, dwell, uid: "u", trackId: "track-donus", now: 1 });

    expect(track.stops).toHaveLength(2);
    const vertexCount = decodePolyline(track.polyline).length;
    // Başlangıç + iki köşe (durak noktaları) + bitiş: dönüşler köşe olarak kalır.
    expect(vertexCount).toBe(4);
    const [first, second] = track.stops;
    // Aralıklar çizginin İÇİNDE: ilk durak başlangıç köşesinde değil,
    // ikinci durak bitiş köşesinde değil ve aralıklar sıralı.
    expect(first.startPointIndex).toBeGreaterThan(0);
    expect(second.endPointIndex).toBeLessThan(vertexCount - 1);
    expect(second.startPointIndex).toBeGreaterThanOrEqual(first.endPointIndex ?? 0);

    const legs = route.days[0].legs ?? [];
    expect(legs).toHaveLength(3);
    expect(legs.map((leg) => leg.id)).toEqual(["leg-track-donus-1", "leg-track-donus-2", "leg-track-donus-3"]);
    // Her bacak bir sonrakiyle sınır köşesini birebir paylaşır.
    expect(legs[0].coords[legs[0].coords.length - 1]).toEqual(legs[1].coords[0]);
    expect(legs[1].coords[legs[1].coords.length - 1]).toEqual(legs[2].coords[0]);
    // Toplam: 3 × 240 m ≈ 0,72 km; bacak toplamı iz toplamıyla uyumlu.
    const total = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
    expect(track.distanceKm).toBeGreaterThan(0.65);
    expect(track.distanceKm).toBeLessThan(0.8);
    expect(Math.abs(total - track.distanceKm)).toBeLessThanOrEqual(0.03);
    // Bacak süreleri yürüyüş süresidir (≈3'er dk); 4'er dk'lık molalar içinde değil.
    for (const leg of legs) {
      expect(leg.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(leg.durationMinutes).toBeLessThanOrEqual(5);
    }
    expect(trackRuleViolation(track)).toBeNull();
  });
});
