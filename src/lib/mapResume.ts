/**
 * Atlasia — mobil tarayıcı arka plandan dönünce haritayı tazele.
 *
 * Sınır: yalnız `resize` + `triggerRepaint`. Çizim mantığı, stil, pin/rota
 * katmanları DEĞİŞMEZ. Beş olay (visibilitychange, pageshow, focus,
 * visualViewport resize, webglcontextrestored) tek bir requestAnimationFrame'e
 * indirgenir; dispose tüm dinleyicileri ve bekleyen frame'i temizler.
 */

export interface MapResumeMap {
  resize: () => void;
  triggerRepaint: () => void;
}

/** Test edilebilirlik için DOM'un yalnız kullanılan yüzeyi. */
export interface ResumeDocument extends EventTarget {
  readonly hidden?: boolean;
}

export interface ResumeWindow extends EventTarget {
  readonly visualViewport?: EventTarget | null;
}

export interface MapResumeOptions {
  map: MapResumeMap;
  document?: ResumeDocument | null;
  window?: ResumeWindow | null;
  schedule?: (callback: () => void) => number;
  cancel?: (handle: number) => void;
}

export interface MapResumeHandle {
  dispose: () => void;
}

interface RegisteredListener {
  target: EventTarget;
  type: string;
  handler: EventListener;
  capture: boolean;
}

export function attachMapResume(options: MapResumeOptions): MapResumeHandle {
  const doc = options.document ?? (typeof document === "undefined" ? null : document);
  const win = options.window ?? (typeof window === "undefined" ? null : window);
  const schedule = options.schedule ?? ((callback: () => void) => requestAnimationFrame(callback));
  const cancel = options.cancel ?? ((handle: number) => cancelAnimationFrame(handle));

  let pending: number | null = null;
  let disposed = false;
  const listeners: RegisteredListener[] = [];

  const flush = () => {
    pending = null;
    if (disposed) return;
    options.map.resize();
    options.map.triggerRepaint();
  };

  const scheduleFrame = () => {
    if (disposed || pending !== null) return;
    // Gizli sekmede boyama isteği açma; görünür olunca visibilitychange gelir.
    if (doc?.hidden) return;
    pending = schedule(flush);
  };

  const listen = (target: EventTarget | null | undefined, type: string, capture = false) => {
    if (!target) return;
    const handler: EventListener = () => scheduleFrame();
    target.addEventListener(type, handler, capture);
    listeners.push({ target, type, handler, capture });
  };

  listen(doc, "visibilitychange");
  listen(win, "pageshow");
  listen(win, "focus");
  listen(win?.visualViewport, "resize");
  // WebGL bağlamı canvas üzerinde geri gelir; olay document'a capture ile ulaşır.
  listen(doc, "webglcontextrestored", true);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const item of listeners) item.target.removeEventListener(item.type, item.handler, item.capture);
      listeners.length = 0;
      if (pending !== null) {
        cancel(pending);
        pending = null;
      }
    },
  };
}
