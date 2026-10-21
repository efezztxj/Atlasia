import { useCallback, useEffect, useRef, useState } from "react";

export type GeoStatus =
  | "idle"
  | "locating"
  | "refining"
  | "ready"
  | "denied"
  | "unavailable"
  | "timeout";

export interface GeoFix {
  lng: number;
  lat: number;
  /** Metre cinsinden yatay doğruluk */
  accuracy: number;
  timestamp: number;
}

/** Hassaslaştırma penceresi: bu süre boyunca konum izlenip en iyi ölçüm alınır */
const REFINE_MS = 18_000;
/** Bu doğruluğa ulaşınca izlemeyi erken bitir */
const GOOD_ENOUGH_M = 20;

export function useGeolocation() {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const secure =
    typeof window === "undefined" ||
    window.isSecureContext ||
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

  const [status, setStatus] = useState<GeoStatus>("idle");
  const [permission, setPermission] = useState<PermissionState | "unknown">("unknown");
  const [fix, setFix] = useState<GeoFix | null>(null);

  const watchId = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const bestAccuracy = useRef(Infinity);
  const generation = useRef(0);
  const fixRef = useRef<GeoFix | null>(null);
  const permissionRef = useRef<PermissionState | "unknown">("unknown");

  const dispose = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Tarayıcının izin durumunu oku ve değişimleri dinle
  useEffect(() => {
    let cancelled = false;
    let handle: PermissionStatus | null = null;
    const sync = (state: PermissionState) => {
      if (cancelled) return;
      const previous = permissionRef.current;
      permissionRef.current = state;
      setPermission(state);
      if (state === "denied" || (previous === "granted" && state !== "granted")) {
        generation.current += 1;
        dispose();
        fixRef.current = null;
        setFix(null);
        setStatus(state === "denied" ? "denied" : "idle");
      } else if (state === "granted") {
        setStatus((current) => current === "denied" ? "idle" : current);
      }
    };
    const onChange = () => handle && sync(handle.state);
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((res) => {
        if (cancelled) return;
        handle = res;
        sync(res.state);
        res.addEventListener("change", onChange);
      })
      .catch(() => {
        /* Permissions API yoksa sessizce geç */
      });
    return () => {
      cancelled = true;
      handle?.removeEventListener("change", onChange);
    };
  }, [dispose]);

  const stop = useCallback(() => {
    generation.current += 1;
    dispose();
    setStatus((current) => current === "locating" || current === "refining" ? (fixRef.current ? "ready" : "idle") : current);
  }, [dispose]);

  useEffect(() => () => { generation.current += 1; dispose(); }, [dispose]);

  /** Tarayıcı iznini ister, ardından konumu hassaslaştırır */
  const request = useCallback(() => {
    if (!supported || !secure) return;
    generation.current += 1;
    const requestId = generation.current;
    dispose();
    bestAccuracy.current = Infinity;
    setStatus("locating");

    const onFix = (pos: GeolocationPosition) => {
      if (requestId !== generation.current) return;
      const next: GeoFix = {
        lng: pos.coords.longitude,
        lat: pos.coords.latitude,
        accuracy: pos.coords.accuracy ?? 0,
        timestamp: pos.timestamp,
      };
      if (![next.lng, next.lat, next.accuracy].every(Number.isFinite) || next.accuracy < 0) return;
      permissionRef.current = "granted";
      setPermission("granted");
      // Daha kötü bir ölçüm gelirse mevcut konumu bozma
      if (next.accuracy <= bestAccuracy.current || bestAccuracy.current === Infinity) {
        bestAccuracy.current = next.accuracy;
        fixRef.current = next;
        setFix(next);
      }
      if (next.accuracy <= GOOD_ENOUGH_M) {
        dispose();
        setStatus("ready");
      }
    };

    const onError = (err: GeolocationPositionError) => {
      if (requestId !== generation.current) return;
      generation.current += 1;
      dispose();
      if (err.code === err.PERMISSION_DENIED) {
        permissionRef.current = "denied";
        fixRef.current = null;
        setFix(null);
        setPermission("denied");
        setStatus("denied");
      } else if (bestAccuracy.current !== Infinity) {
        setStatus("ready");
      } else if (err.code === err.TIMEOUT) {
        setStatus("timeout");
      } else {
        setStatus("unavailable");
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (requestId !== generation.current) return;
        onFix(pos);
        if (bestAccuracy.current <= GOOD_ENOUGH_M) return;
        // Konumu daha da keskinleştirmek için kısa süre izle
        setStatus("refining");
        watchId.current = navigator.geolocation.watchPosition(onFix, onError, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: REFINE_MS,
        });
        timer.current = window.setTimeout(() => {
          if (requestId !== generation.current) return;
          generation.current += 1;
          dispose();
          // ready ⇒ fix var sözleşmesi: pencere hiç geçerli ölçüm görmeden
          // dolarsa (geçersiz ilk ölçüm akışı) durum "unavailable" olur (P16 #5).
          setStatus(fixRef.current ? "ready" : "unavailable");
        }, REFINE_MS);
      },
      onError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  }, [supported, secure, dispose]);

  const clear = useCallback(() => {
    stop();
    fixRef.current = null;
    setFix(null);
    setStatus(permissionRef.current === "denied" ? "denied" : "idle");
    bestAccuracy.current = Infinity;
  }, [stop]);

  return { supported, secure, status, permission, fix, request, clear, stop };
}

/** "±12 m" / "±1,4 km" */
export function formatAccuracy(m: number) {
  if (!Number.isFinite(m)) return "";
  if (m < 1000) return `±${Math.round(m)} m`;
  return `±${(m / 1000).toFixed(1).replace(".", ",")} km`;
}
