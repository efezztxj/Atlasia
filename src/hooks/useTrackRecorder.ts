import { useCallback, useEffect, useRef, useState } from "react";
import type { AtlasRoute, AtlasTrack } from "../types";
import { createTrack } from "../lib/routeData";
import { reverseName } from "../utils/geo";
import {
  TRACK_DETECTION,
  buildTrackDraft,
  recordDwellPoint,
  removeGpsSpikes,
  simplifiedDistanceKm,
  simplifyTrack,
  trackRuleViolation,
  type DwellState,
  type SimplificationStats,
  type TrackPoint,
} from "../utils/track";

/**
 * `finishing`: kayıt kapatılıyor, taslak hesaplanıyor. Buluta yazma **bu
 * durumda olmaz**; yazma yalnız açık `save` eylemiyle yapılır (P17-Tur2).
 */
export type TrackRecorderStatus = "idle" | "recording" | "finishing" | "error";

export interface FinishedTrack {
  track: AtlasTrack;
  route: AtlasRoute;
  /** P17 sadeleştirme teşhisi (maksimum sapma, tutulan nokta). */
  stats: SimplificationStats;
}

/**
 * GPS ölçüm zaman aşımı. Denetim K-12: `watchPosition`'a timeout verilmediğinde
 * hiç sinyal gelmeyen durumda tarayıcı hata üretmez ve kayıt sessizce bekler.
 * 30 sn, açık gökyüzü olmayan kullanıcıya "neden ilerlemiyor" bilgisini verir.
 */
const GPS_TIMEOUT_MS = 30_000;

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `track-${crypto.randomUUID()}`
    : `track-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useTrackRecorder(uid: string, onPreview?: (coords: [number, number][]) => void) {
  const [status, setStatus] = useState<TrackRecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const points = useRef<TrackPoint[]>([]);
  const dwell = useRef<DwellState>({ candidate: null, stops: [] });
  const watchId = useRef<number | null>(null);
  const timerId = useRef<number | null>(null);
  const startedAt = useRef(0);
  const previewRef = useRef(onPreview);
  const generation = useRef(0);
  previewRef.current = onPreview;

  const clearWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timerId.current !== null && typeof window !== "undefined") {
      window.clearInterval(timerId.current);
      timerId.current = null;
    }
  }, []);

  useEffect(() => () => { generation.current += 1; clearWatch(); }, [clearWatch]);

  const start = useCallback(() => {
    if (status === "recording" || status === "finishing") return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("error");
      setError("Bu tarayıcı konum kaydını desteklemiyor.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext && !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
      setStatus("error");
      setError("Güvenli bağlantı gerekli. HTTPS üzerinden açıp tekrar dene.");
      return;
    }

    generation.current += 1;
    const requestId = generation.current;
    points.current = [];
    dwell.current = { candidate: null, stops: [] };
    startedAt.current = Date.now();
    setElapsedSeconds(0);
    setDistanceKm(0);
    setPointCount(0);
    setError(null);
    setStatus("recording");

    watchId.current = navigator.geolocation.watchPosition((position) => {
      if (generation.current !== requestId) return;
      const point: TrackPoint = {
        lng: position.coords.longitude,
        lat: position.coords.latitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      if (![point.lng, point.lat, point.accuracy, point.timestamp].every(Number.isFinite) || point.accuracy < 0 || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return;
      points.current.push(point);
      dwell.current = recordDwellPoint(dwell.current, point);
    }, (positionError) => {
      if (generation.current !== requestId) return;
      const reason = positionError.code === positionError.PERMISSION_DENIED
        ? "Konum izni verilmedi; kaydı başlatmak için izni aç."
        : positionError.code === positionError.TIMEOUT
          ? "Konum ölçümü zaman aşımına uğradı. Kaydı sürdürmek için ekranı açık tut."
          : "Konum şu an alınamıyor. Bağlantını ve cihaz konum ayarlarını kontrol et.";
      setError(reason);
      if (points.current.length === 0) {
        clearWatch();
        setStatus("error");
      }
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_TIMEOUT_MS });

    timerId.current = window.setInterval(() => {
      if (generation.current !== requestId) return;
      const samples = points.current;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000)));
      setPointCount(samples.length);
      // Sıçramalar canlı önizlemeden de çıkarılır (P17).
      const simplified = simplifyTrack(removeGpsSpikes(samples), TRACK_DETECTION.simplifyToleranceM);
      setDistanceKm(simplifiedDistanceKm(simplified));
      previewRef.current?.(simplified);
    }, 1000);
  }, [clearWatch, status]);

  /**
   * "Bitir": kaydı kapatır ve **taslak** üretir. Hiçbir yere yazmaz.
   * Ad çözümlemesi (ağ) burada yapılır; başarısız olursa adlar boş kalır ama
   * taslak yine gösterilir (kullanıcı işini kaybetmez).
   */
  const finish = useCallback(async (): Promise<FinishedTrack> => {
    if (status !== "recording") throw new Error("Etkin bir yürüyüş kaydı yok.");
    generation.current += 1;
    clearWatch();
    setStatus("finishing");
    setError(null);
    const rawPoints = [...points.current];
    if (rawPoints.length === 0) {
      setStatus("error");
      throw new Error("Henüz konum ölçümü alınmadı. Biraz bekleyip tekrar bitir.");
    }
    try {
      const input = { points: rawPoints, dwell: dwell.current, uid, trackId: makeId(), now: Date.now() };
      const { track } = buildTrackDraft(input);
      const violation = trackRuleViolation(track);
      if (violation) throw new Error(violation);
      const stopNames = await Promise.all(track.stops.map(async (stop) => {
        try {
          return await reverseName(stop.lat, stop.lng);
        } catch (failure) {
          // Ad çözümlemesi ağ işidir: başarısızsa ad boş kalır, taslak yine açılır.
          console.warn("[Atlasia] Durak adı çözümlenemedi, ad boş bırakıldı:", failure);
          return null;
        }
      }));
      const { route, stats } = buildTrackDraft({ ...input, stopNames });
      points.current = [];
      dwell.current = { candidate: null, stops: [] };
      setStatus("idle");
      return { track, route, stats };
    } catch (failure) {
      setStatus("error");
      const message = failure instanceof Error ? failure.message : "Taslak hazırlanamadı.";
      setError(message);
      throw failure;
    }
  }, [clearWatch, status, uid]);

  /**
   * Açık kullanıcı eylemi: taslağın ham izini **yalnız sahibi** için yazar.
   * Yayınlama/paylaşım burada yapılmaz; ham iz hiçbir zaman paylaşılmaz.
   */
  const save = useCallback(async (track: AtlasTrack): Promise<void> => {
    const violation = trackRuleViolation(track);
    if (violation) throw new Error(violation);
    await createTrack(uid, track);
  }, [uid]);

  const discard = useCallback(() => {
    generation.current += 1;
    clearWatch();
    points.current = [];
    dwell.current = { candidate: null, stops: [] };
    setStatus("idle");
    setError(null);
    setElapsedSeconds(0);
    setDistanceKm(0);
    setPointCount(0);
    previewRef.current?.([]);
  }, [clearWatch]);

  return { status, elapsedSeconds, distanceKm, pointCount, error, start, finish, save, discard };
}
