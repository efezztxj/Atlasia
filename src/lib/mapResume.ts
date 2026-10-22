/**
 * Atlasia — mobil/arka plandan haritaya dönüşte yeniden çizim.
 *
 * SORUN (bu dalda kanıtlandı): `MapView.tsx` içinde `visibilitychange`,
 * `pageshow` veya dönüş benzeri hiçbir dinleyici YOKTU. Repodaki tek eşleşme
 * `document.hidden` idi ve o da yalnızca otomatik dönüş (spin) animasyonunu
 * durdurmak için kullanılıyordu. Yani sekme/uygulama arka plana alınıp geri
 * gelindiğinde harita yeniden ölçülmüyor ve yeniden çizilmiyordu.
 *
 * Mobil tarayıcıda haritanın bozuk/boş dönmesinin bilinen nedenleri:
 *   1. Arka planda WebGL bağlamı işletim sistemi tarafından geri alınır
 *      (Android/iOS bellek baskısı). Dönüşte `webglcontextrestored` gelir ama
 *      canvas ölçüsü bayat kalabilir.
 *   2. Adres çubuğu/klavye açılıp kapanınca görsel viewport yüksekliği değişir;
 *      `window.resize` her tarayıcıda güvenilir tetiklenmez.
 *   3. bfcache'den geri gelindiğinde (`pageshow` + `persisted`) React effect'i
 *      yeniden ÇALIŞMAZ; harita örneği donmuş hâlde geri yüklenir.
 *   4. Render döngüsü arka planda kısılır; dönüşte tek kare tetiklenmezse
 *      harita son hâliyle donuk görünür.
 *
 * Çözüm: dönüşte `resize()` + `triggerRepaint()`, ve mobil yerleşim henüz
 * oturmamış olabileceği için bir sonraki animasyon karesinde ikinci bir
 * `resize()`. Harita STİLİNE veya görünümüne dokunulmaz — bu bir ölçüm/çizim
 * düzeltmesidir, tasarım değişikliği değildir.
 *
 * Bu modül saf ve enjekte edilebilirdir: repo test ortamı `node`'dur ve jsdom
 * ya da testing-library kurulu değildir, bu yüzden `document`/`window`/`rAF`
 * dışarıdan verilir. Böylece dinleyici kaydı, `resize()`/`triggerRepaint()`
 * çağrıları ve temizlik otomatik testle sınanabilir.
 */

/** MapLibre haritasının bu modülün ihtiyaç duyduğu alt kümesi. */
export interface ResumableMap {
  resize(): void;
  triggerRepaint(): void;
}

export interface ResumeEventHost {
  addEventListener(type: string, handler: (event?: unknown) => void): void;
  removeEventListener(type: string, handler: (event?: unknown) => void): void;
}

export type PageVisibilityState = "visible" | "hidden" | "prerender" | "unloaded";

export interface ResumeDocument extends ResumeEventHost {
  visibilityState: PageVisibilityState;
  hidden: boolean;
}

export interface MapResumeOptions {
  map: ResumableMap;
  /** Varsayılan: globalThis.document */
  doc?: ResumeDocument | null;
  /** Varsayılan: globalThis.window */
  win?: ResumeEventHost | null;
  /** WebGL bağlam olayları için canvas; verilmezse bu dinleyici atlanır. */
  canvas?: ResumeEventHost | null;
  /** Varsayılan: globalThis.requestAnimationFrame */
  scheduleFrame?: (callback: () => void) => number;
  /** Varsayılan: globalThis.cancelAnimationFrame */
  cancelFrame?: (handle: number) => void;
  /**
   * Aynı dönüş için birden çok olay tetiklenebilir (visibilitychange + focus +
   * pageshow). Bu pencere içindeki tekrarlar tek yenilemeye indirgenir.
   * Varsayılan 400 ms.
   */
  coalesceWindowMs?: number;
  /** Testlerde deterministik saat. Varsayılan Date.now. */
  now?: () => number;
}

export interface MapResumeHandle {
  /** Kaç kez yenileme tetiklendi (regresyon testi ve teşhis için). */
  refreshCount(): number;
  /** Kayıtlı dinleyici sayısı; dispose sonrası 0 olmalı. */
  listenerCount(): number;
  /** Bekleyen ertelenmiş kare var mı? */
  hasPendingFrame(): boolean;
  dispose(): void;
}

const DEFAULT_COALESCE_WINDOW_MS = 400;

/** Tarayıcı dışı ortamlarda (test/SSR) güvenli varsayılan çözümü. */
function resolveHost<T>(explicit: T | null | undefined, globalKey: string): T | null {
  if (explicit !== undefined && explicit !== null) return explicit;
  const candidate = (globalThis as unknown as Record<string, unknown>)[globalKey];
  return (candidate as T) ?? null;
}

/**
 * Dönüş dinleyicilerini kurar. Dönen `dispose()` tüm dinleyicileri kaldırır ve
 * bekleyen animasyon karesini iptal eder — React effect temizliği için zorunlu,
 * aksi hâlde harita `map.remove()` edildikten sonra dinleyiciler sızar.
 */
export function attachMapResume(options: MapResumeOptions): MapResumeHandle {
  const { map, canvas } = options;
  const doc = resolveHost<ResumeDocument>(options.doc, "document");
  const win = resolveHost<ResumeEventHost>(options.win, "window");
  const coalesceWindowMs = options.coalesceWindowMs ?? DEFAULT_COALESCE_WINDOW_MS;
  const now = options.now ?? (() => Date.now());

  const globalScope = globalThis as unknown as {
    requestAnimationFrame?: (callback: () => void) => number;
    cancelAnimationFrame?: (handle: number) => void;
  };
  const scheduleFrame = options.scheduleFrame ?? globalScope.requestAnimationFrame?.bind(globalScope) ?? null;
  const cancelFrame = options.cancelFrame ?? globalScope.cancelAnimationFrame?.bind(globalScope) ?? null;

  let refreshes = 0;
  let pendingFrame: number | null = null;
  let lastRefreshAt = Number.NEGATIVE_INFINITY;
  const registered: Array<{ host: ResumeEventHost; type: string; handler: (event?: unknown) => void }> = [];

  const runResize = () => {
    try {
      map.resize();
    } catch (failure) {
      // Harita bu arada kaldırılmış olabilir; dönüş yenilemesi hatayı yutmamalı
      // ama uygulamayı da çökertmemeli.
      console.warn("[Atlasia] Harita yeniden ölçülemedi:", failure);
    }
  };

  const runRepaint = () => {
    try {
      map.triggerRepaint();
    } catch (failure) {
      console.warn("[Atlasia] Harita yeniden çizilemedi:", failure);
    }
  };

  /**
   * Ölç + çiz. Mobil tarayıcı `visibilitychange` anında yerleşimi henüz
   * tamamlamamış olabileceği için bir sonraki animasyon karesinde ikinci bir
   * ölçüm yapılır; bu, adres çubuğu geri geldiğinde canvas'ın kısa kalmasını
   * önler.
   */
  const refresh = () => {
    const timestamp = now();
    if (timestamp - lastRefreshAt < coalesceWindowMs) return;
    lastRefreshAt = timestamp;
    refreshes += 1;

    runResize();
    runRepaint();

    if (scheduleFrame) {
      if (pendingFrame !== null && cancelFrame) cancelFrame(pendingFrame);
      pendingFrame = scheduleFrame(() => {
        pendingFrame = null;
        runResize();
        runRepaint();
      });
    }
  };

  const listen = (host: ResumeEventHost | null | undefined, type: string, handler: (event?: unknown) => void) => {
    if (!host) return;
    host.addEventListener(type, handler);
    registered.push({ host, type, handler });
  };

  // (3) bfcache'den dönüş: React effect'i yeniden çalışmaz, bu olay şart.
  listen(win, "pageshow", () => refresh());

  // (4) Bazı mobil webview/PWA kabuklarında visibilitychange tetiklenmez;
  // pencere odağı güvenilir bir yedek sinyaldır.
  listen(win, "focus", () => refresh());

  // (1)(2) Sekme/uygulama ön plana geldiğinde ölç ve çiz.
  listen(doc, "visibilitychange", () => {
    if (!doc || doc.visibilityState !== "visible") return;
    refresh();
  });

  // Yön değişimi: iOS'ta resize'dan önce gelebilir, yerleşim oturunca ölç.
  listen(win, "orientationchange", () => refresh());

  // (1) GPU bağlamı geri alındıktan sonra yeniden çizim zorunlu.
  listen(canvas, "webglcontextrestored", () => refresh());

  return {
    refreshCount: () => refreshes,
    listenerCount: () => registered.length,
    hasPendingFrame: () => pendingFrame !== null,
    dispose() {
      for (const entry of registered) entry.host.removeEventListener(entry.type, entry.handler);
      registered.length = 0;
      if (pendingFrame !== null && cancelFrame) cancelFrame(pendingFrame);
      pendingFrame = null;
    },
  };
}
