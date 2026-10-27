/**
 * Atlasia — Windy benzeri hava katmanı (harita üstünde rüzgâr akışı + hız ısı haritası).
 *
 * Neden yeniden yazıldı: eski katman yalnız 3×3 sıcaklık etiketi çiziyordu. Yeni
 * katman, Open-Meteo rüzgâr alanını (`windField.ts`) iki tuval üzerinde gösterir:
 *   1) `heat`  — ızgara noktalarında yumuşak renk lekeleri (hız → renk),
 *   2) `parçacık` — vektör alanı boyunca akan, iz bırakan çizgiler.
 * Isı haritası yalnız hareket bitince/ölçülü aralıkla yeniden çizilir; parçacık
 * tuvali her karede soluklaştırılıp üzerine çizgi eklenir (klasik akış tekniği).
 *
 * Sınırlar:
 * - Yeni CSS sınıfı eklenmedi; tuval konumu satır içi stille verilir.
 * - Pinler tuvalin üstünde kalır (`z-index`), böylece hava katmanı pinleri örtmez.
 * - `prefers-reduced-motion` açıksa animasyon çalışmaz: sabit oklar çizilir.
 * - Veri gelmezse uydurma vektör çizilmez; `atlasia:weather-status` ile
 *   "empty"/"error" bildirilir (arayüz dürüst mesaj gösterir).
 */
import type { Map as MapLibreMap } from "maplibre-gl";
import { debounce } from "./geoGrid";
import {
  fetchWindField,
  precipitationAt,
  sampleWind,
  type WindField,
  type WindPoint,
  type WindSample,
} from "./windField";

/** Hava katmanının gösterdiği ölçüm. Tek tuval, üç anlam. */
export type WeatherMode = "wind" | "rain" | "temp";

/** Rotada yağmur riski taşıyan durak (rota + yağış bağlantısı). */
export interface WeatherStopMark {
  lat: number;
  lng: number;
  rainy: boolean;
}

export interface WeatherLayerHandle {
  setEnabled(enabled: boolean): void;
  setMode(mode: WeatherMode): void;
  /** Saatlik yağış dilimi: 0 = şimdi, 12 = 12 saat sonra. */
  setHour(offset: number): void;
  setStops(stops: WeatherStopMark[]): void;
  destroy(): void;
}

export type WeatherStatus = "loading" | "ready" | "empty" | "error";
export const WEATHER_STATUS_EVENT = "atlasia:weather-status";

/** Hız (m/s) → renk. Windy paletine yakın: sakin mor-mavi, fırtına mor. */
const PALETTE: Array<{ maxKmh: number; color: string }> = [
  { maxKmh: 10, color: "#5b6fd6" },
  { maxKmh: 20, color: "#3fa0d9" },
  { maxKmh: 30, color: "#35c98a" },
  { maxKmh: 45, color: "#d8d24a" },
  { maxKmh: 60, color: "#e69a3c" },
  { maxKmh: 80, color: "#d1567f" },
  { maxKmh: Number.POSITIVE_INFINITY, color: "#8b3fa8" },
];

export function windColor(speedMs: number): string {
  const speed = Number.isFinite(speedMs) ? Math.max(0, speedMs) * 3.6 : 0;
  return (PALETTE.find((entry) => speed < entry.maxKmh) ?? PALETTE[PALETTE.length - 1]).color;
}

/** Yağış şiddeti (mm/saat) → renk. 0.15 altı "kuru" sayılır, çizilmez. */
export const RAIN_PALETTE: Array<{ maxMm: number; color: string }> = [
  { maxMm: 0.15, color: "transparent" },
  { maxMm: 1, color: "#2f7fd0" },
  { maxMm: 3, color: "#3fa0d9" },
  { maxMm: 8, color: "#35c98a" },
  { maxMm: 15, color: "#d8d24a" },
  { maxMm: Number.POSITIVE_INFINITY, color: "#8b3fa8" },
];

export function rainColor(mmPerHour: number): string {
  const value = Number.isFinite(mmPerHour) ? Math.max(0, mmPerHour) : 0;
  return (RAIN_PALETTE.find((entry) => value < entry.maxMm) ?? RAIN_PALETTE[RAIN_PALETTE.length - 1]).color;
}

/** Sıcaklık (°C) → renk. Veri yoksa null (nokta çizilmez). */
export const TEMP_PALETTE: Array<{ maxC: number; color: string }> = [
  { maxC: -5, color: "#4a63c8" },
  { maxC: 5, color: "#3fa0d9" },
  { maxC: 14, color: "#35c98a" },
  { maxC: 22, color: "#d8d24a" },
  { maxC: 30, color: "#e69a3c" },
  { maxC: Number.POSITIVE_INFINITY, color: "#d1567f" },
];

export function temperatureColor(celsius: number | null): string | null {
  if (celsius === null || !Number.isFinite(celsius)) return null;
  return (TEMP_PALETTE.find((entry) => celsius < entry.maxC) ?? TEMP_PALETTE[TEMP_PALETTE.length - 1]).color;
}

/** Yağış yoksa leke çizilmesin: eşik `RAIN_PALETTE[0].maxMm` ile aynı. */
export function isWet(mmPerHour: number): boolean {
  return Number.isFinite(mmPerHour) && mmPerHour >= RAIN_PALETTE[0].maxMm;
}

export function paletteIndex(speedMs: number): number {
  const speed = Math.max(0, Number.isFinite(speedMs) ? speedMs : 0) * 3.6;
  const index = PALETTE.findIndex((entry) => speed < entry.maxKmh);
  return index < 0 ? PALETTE.length - 1 : index;
}

/** Parçacık bütçesi: alan büyüdükçe artar, üst sınır telefonları korur. */
export function particleBudget(width: number, height: number): number {
  const area = Math.max(1, width * height);
  return Math.max(350, Math.min(1500, Math.round(area / 900)));
}

/**
 * Parçacığı vektör alanı boyunca ilerletir.
 *
 * Ekran hızı zoom'dan bağımsız görünsün diye metre/saniye → piksel/saniye
 * çevrimi kullanılır (`speed * 1.8`, en az 6 px/s), sonra piksel adımı
 * coğrafi koordinata çevrilir. Böylece yakınlaştırınca akış "hızlanmaz".
 */
export function advanceLngLat(
  lng: number,
  lat: number,
  sample: WindSample,
  zoom: number,
  dtSeconds: number,
): { lng: number; lat: number } {
  if (!Number.isFinite(sample.speed) || sample.speed <= 0.01) return { lng, lat };
  const cosLat = Math.max(0.15, Math.cos((lat * Math.PI) / 180));
  const metersPerPixel = (156543.03392 * cosLat) / Math.pow(2, zoom);
  const pxPerSecond = Math.max(6, sample.speed * 1.8);
  const meters = pxPerSecond * Math.max(0, Math.min(dtSeconds, 0.1)) * metersPerPixel;
  const ux = sample.u / sample.speed;
  const vy = sample.v / sample.speed;
  return {
    lng: lng + (ux * meters) / (111320 * cosLat),
    lat: Math.max(-85, Math.min(85, lat + (vy * meters) / 110540)),
  };
}

interface Particle {
  lng: number;
  lat: number;
  age: number;
  maxAge: number;
}

const HEAT_ALPHA = 0.5;
const FADE_ALPHA = 0.88;
const HEAT_REDRAW_MS = 150;
const REFRESH_DEBOUNCE_MS = 480;

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function createCanvas(host: HTMLElement, zIndex: number, background: string): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.className = "atl-wind-canvas";
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: String(zIndex),
    background,
    mixBlendMode: "screen",
  });
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Hava katmanı tuvali açılamadı.");
  return { canvas, ctx };
}

export function createWeatherLayer(map: MapLibreMap): WeatherLayerHandle {
  let enabled = false;
  let disposed = false;
  let field: WindField | null = null;
  let heat: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
  let particles: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
  let list: Particle[] = [];
  let frame = 0;
  let lastFrameAt = 0;
  let lastHeatAt = 0;
  let needsHeat = true;
  let run = 0;
  let controller: AbortController | null = null;
  let status: WeatherStatus = "empty";
  let mode: WeatherMode = "wind";
  let hourOffset = 0;
  let stops: WeatherStopMark[] = [];

  const reducedMotion = () => typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const emit = (next: WeatherStatus) => {
    if (status === next) return;
    status = next;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(WEATHER_STATUS_EVENT, { detail: next }));
    }
  };

  let sizedWidth = 0;
  let sizedHeight = 0;

  /**
   * Tuval boyutunu eşitler. Boyut değişmediyse **dokunmaz**: `canvas.width`
   * ataması tuvali temizler, yani her ısı yenilemesinde parçacık izlerini
   * silmemesi gerekir.
   */
  const size = () => {
    const host = map.getCanvasContainer();
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    if (width === sizedWidth && height === sizedHeight) return { width, height };
    sizedWidth = width;
    sizedHeight = height;
    for (const layer of [heat, particles]) {
      if (!layer) continue;
      layer.canvas.width = Math.round(width * dpr);
      layer.canvas.height = Math.round(height * dpr);
      layer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layer.ctx.lineCap = "round";
      layer.ctx.lineJoin = "round";
    }
    return { width, height };
  };

  /** Seçili moda göre nokta rengi; çizilmeyecekse null. */
  const pointColor = (point: WindPoint): string | null => {
    if (mode === "rain") {
      const mm = precipitationAt(point, hourOffset);
      return isWet(mm) ? rainColor(mm) : null;
    }
    if (mode === "temp") return temperatureColor(point.temperature);
    return windColor(point.speed);
  };

  /** Yağış modunda yoğunluk arttıkça leke koyulaşır. */
  const pointAlpha = (point: WindPoint): number => {
    if (mode !== "rain") return HEAT_ALPHA;
    const mm = precipitationAt(point, hourOffset);
    return Math.min(0.85, 0.2 + mm * 0.06);
  };

  const drawHeat = () => {
    if (!heat || !field) return;
    const { width, height } = size();
    const ctx = heat.ctx;
    ctx.clearRect(0, 0, width, height);
    const projected = field.points.map((point) => ({ ...point, screen: map.project([point.lng, point.lat]) }));
    // Komşu ızgara noktaları arasındaki tipik ekran mesafesi → leke yarıçapı.
    let spacing = Number.POSITIVE_INFINITY;
    for (const point of projected) {
      for (const other of projected) {
        if (other === point) continue;
        const d = Math.hypot(other.screen.x - point.screen.x, other.screen.y - point.screen.y);
        if (d > 1 && d < spacing) spacing = d;
      }
    }
    const radius = Math.max(70, Math.min(420, Number.isFinite(spacing) ? spacing * 1.25 : Math.max(width, height) / 4));
    ctx.globalCompositeOperation = "lighter";
    for (const point of projected) {
      const { x, y } = point.screen;
      if (x < -radius || y < -radius || x > width + radius || y > height + radius) continue;
      // Ölçüm seçimi tek yerde: mod değişince yalnız `needsHeat` işaretlenir.
      const color = pointColor(point);
      if (!color) continue;
      const alpha = pointAlpha(point);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, hexToRgba(color, alpha));
      gradient.addColorStop(0.55, hexToRgba(color, alpha * 0.55));
      gradient.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    // Rota + yağış: rotadaki yağmurlu duraklar halkayla işaretlenir (yalnız yağış modunda).
    if (mode === "rain") {
      for (const stop of stops) {
        if (!stop.rainy) continue;
        const { x, y } = map.project([stop.lng, stop.lat]);
        if (x < -40 || y < -40 || x > width + 40 || y > height + 40) continue;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(243,200,112,0.95)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(243,200,112,0.95)";
        ctx.fill();
      }
    }
    needsHeat = false;
    lastHeatAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  };

  const spawn = (width: number, height: number): Particle | null => {
    const center = map.unproject([Math.random() * width, Math.random() * height]);
    if (!Number.isFinite(center.lng) || !Number.isFinite(center.lat)) return null;
    return { lng: center.lng, lat: center.lat, age: 0, maxAge: 60 + Math.random() * 80 };
  };

  const drawArrows = (width: number, height: number) => {
    if (!particles || !field) return;
    const ctx = particles.ctx;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.4;
    for (const point of field.points) {
      const { x, y } = map.project([point.lng, point.lat]);
      if (x < 0 || y < 0 || x > width || y > height) continue;
      const length = 12 + Math.min(16, point.speed * 1.4);
      const ux = point.speed > 0.01 ? point.u / point.speed : 1;
      const vy = point.speed > 0.01 ? point.v / point.speed : 0;
      ctx.strokeStyle = windColor(point.speed);
      ctx.beginPath();
      ctx.moveTo(x - (ux * length) / 2, y + (vy * length) / 2);
      ctx.lineTo(x + (ux * length) / 2, y - (vy * length) / 2);
      ctx.stroke();
    }
  };

  const step = (now: number, width: number, height: number) => {
    if (!particles || !field) return;
    const dt = lastFrameAt ? Math.min(0.1, (now - lastFrameAt) / 1000) : 0.016;
    lastFrameAt = now;
    const ctx = particles.ctx;

    // İz soluklaştırma: önceki kareyi yarı saydam tut, üzerine yeni çizgiler ekle.
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = `rgba(0,0,0,${FADE_ALPHA})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    const target = particleBudget(width, height);
    while (list.length < target) {
      const particle = spawn(width, height);
      if (!particle) break;
      list.push(particle);
    }
    if (list.length > target) list.length = target;

    const zoom = map.getZoom();
    const segments: Array<Array<[number, number, number, number]>> = PALETTE.map(() => []);
    for (let i = 0; i < list.length; i += 1) {
      const particle = list[i];
      const sample = sampleWind(field, particle.lat, particle.lng);
      if (!sample || sample.speed < 0.05) {
        const next = spawn(width, height);
        if (next) list[i] = next;
        continue;
      }
      const from = map.project([particle.lng, particle.lat]);
      const next = advanceLngLat(particle.lng, particle.lat, sample, zoom, dt);
      const to = map.project([next.lng, next.lat]);
      particle.lng = next.lng;
      particle.lat = next.lat;
      particle.age += 1;
      const outside = to.x < -40 || to.y < -40 || to.x > width + 40 || to.y > height + 40;
      if (particle.age > particle.maxAge || outside) {
        const fresh = spawn(width, height);
        if (fresh) list[i] = fresh;
        continue;
      }
      segments[paletteIndex(sample.speed)].push([from.x, from.y, to.x, to.y]);
    }

    ctx.lineWidth = 1.15;
    PALETTE.forEach((entry, index) => {
      const bucket = segments[index];
      if (!bucket.length) return;
      ctx.strokeStyle = entry.color;
      ctx.beginPath();
      for (const [x1, y1, x2, y2] of bucket) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    });

    if (needsHeat && now - lastHeatAt > HEAT_REDRAW_MS) drawHeat();
  };

  const loop = (now: number) => {
    if (!enabled || disposed) return;
    const host = map.getCanvasContainer();
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    // Parçacık animasyonu yalnız rüzgâr modunda anlamlı: yağış/sıcaklıkta
    // gereksiz kare harcamamak için döngü çizim yapmadan devam eder.
    if (!document.hidden && mode === "wind") {
      if (reducedMotion()) drawArrows(width, height);
      else step(now, width, height);
    }
    frame = requestAnimationFrame(loop);
  };

  const refresh = debounce(async () => {
    if (!enabled || disposed) return;
    const current = ++run;
    controller?.abort();
    controller = new AbortController();
    emit("loading");
    try {
      const bounds = map.getBounds();
      const next = await fetchWindField(
        { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() },
        fetch,
        Date.now(),
        controller.signal,
      );
      if (current !== run || !enabled || disposed) return;
      if (!next) {
        field = null;
        if (heat) heat.ctx.clearRect(0, 0, heat.canvas.width, heat.canvas.height);
        if (particles) particles.ctx.clearRect(0, 0, particles.canvas.width, particles.canvas.height);
        emit("empty");
        return;
      }
      field = next;
      list = [];
      needsHeat = true;
      lastFrameAt = 0;
      drawHeat();
      emit("ready");
    } catch (error) {
      if (current !== run || !enabled || disposed) return;
      if ((error as { name?: string })?.name === "AbortError") return;
      field = null;
      emit("error");
    }
  }, REFRESH_DEBOUNCE_MS);

  /** Moda göre hangi tuvalin görüneceğini ayarlar; ikisi de hep takılı kalır. */
  const applyMode = () => {
    if (particles) {
      particles.canvas.style.display = mode === "wind" ? "block" : "none";
      if (mode !== "wind") particles.ctx.clearRect(0, 0, particles.canvas.width, particles.canvas.height);
    }
    list = [];
    needsHeat = true;
    if (enabled) drawHeat();
  };

  const onMove = () => { needsHeat = true; };
  const onResize = () => { needsHeat = true; sizedWidth = 0; sizedHeight = 0; size(); };
  const onMoveEnd = () => { needsHeat = true; void refresh(); };

  const attach = () => {
    const host = map.getCanvasContainer();
    heat = createCanvas(host, 1, "transparent");
    particles = createCanvas(host, 2, "transparent");
    size();
    map.on("move", onMove);
    map.on("moveend", onMoveEnd);
    map.on("resize", onResize);
    lastFrameAt = 0;
    applyMode();
    frame = requestAnimationFrame(loop);
  };

  const detach = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    map.off("move", onMove);
    map.off("moveend", onMoveEnd);
    map.off("resize", onResize);
    heat?.canvas.remove();
    particles?.canvas.remove();
    heat = null;
    particles = null;
    list = [];
    field = null;
    controller?.abort();
    controller = null;
    refresh.cancel();
    run += 1;
  };

  return {
    setEnabled(next) {
      if (disposed || enabled === next) return;
      enabled = next;
      if (enabled) {
        attach();
        void refresh();
      } else {
        detach();
        status = "empty";
      }
    },
    setMode(next) {
      if (disposed || mode === next) return;
      mode = next;
      applyMode();
    },
    setHour(offset) {
      if (disposed) return;
      const next = Math.max(0, Math.min(12, Math.round(offset)));
      if (hourOffset === next) return;
      hourOffset = next;
      needsHeat = true;
      if (enabled) drawHeat();
    },
    setStops(next) {
      if (disposed) return;
      stops = next;
      needsHeat = true;
      if (enabled) drawHeat();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      detach();
    },
  };
}
