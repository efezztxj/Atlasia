/**
 * Atlasia — mobil/arka plandan dönüşte harita yenileme regresyon testi.
 *
 * Bu dalda `MapView.tsx` içinde dönüş olayları için HİÇBİR dinleyici yoktu
 * (kanıt: repodaki tek `document.hidden` kullanımı spin animasyonunu durdurmak
 * içindi). Bu test, dinleyicilerin doğru olaylara kaydolduğunu, dönüşte
 * `resize()` + `triggerRepaint()` çağrıldığını, çoklu olayların tek yenilemeye
 * indirgendiğini ve `dispose()` sonrası hiçbir dinleyicinin sızmadığını sınar.
 *
 * NOT: Gerçek mobil tarayıcı/WebGL doğrulaması DEĞİLDİR. Bu sandbox'ta cihaz
 * veya tarayıcı yoktur; kabul adımları teslim raporundadır.
 */
import { describe, expect, it, vi } from "vitest";
import { attachMapResume, type ResumeDocument, type ResumeEventHost } from "./mapResume";

interface FakeHost extends ResumeEventHost {
  emit(type: string, event?: unknown): void;
  types(): string[];
  count(type: string): number;
}

function fakeHost(): FakeHost & { listeners: Map<string, Set<(event?: unknown) => void>> } {
  const listeners = new Map<string, Set<(event?: unknown) => void>>();
  return {
    listeners,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
      if (listeners.get(type)?.size === 0) listeners.delete(type);
    },
    emit(type, event) {
      for (const handler of [...(listeners.get(type) ?? [])]) handler(event);
    },
    types: () => [...listeners.keys()],
    count: (type) => listeners.get(type)?.size ?? 0,
  };
}

function fakeDocument(visibilityState: ResumeDocument["visibilityState"] = "visible") {
  const host = fakeHost();
  return Object.assign(host, {
    visibilityState,
    hidden: visibilityState !== "visible",
    setVisibility(next: ResumeDocument["visibilityState"]) {
      this.visibilityState = next;
      this.hidden = next !== "visible";
    },
  }) as FakeHost & ResumeDocument & {
    setVisibility(next: ResumeDocument["visibilityState"]): void;
  };
}

function fakeMap() {
  return {
    resize: vi.fn(),
    triggerRepaint: vi.fn(),
  };
}

/**
 * rAF'i elle sürülen bir kuyruğa çevirir; test "kare çalıştı" diyebilsin.
 *
 * `cancelFrame` callback'i KUYRUKTAN ÇIKARMALIDIR — gerçek
 * `cancelAnimationFrame` böyle davranır. Yalnızca handle'ı kaydeden bir sahte,
 * iptal edilmiş kareyi hâlâ "bekliyor" gösterir ve test yanlış nedenle patlar.
 */
function fakeFrames() {
  const queue = new Map<number, () => void>();
  let nextHandle = 0;
  const cancelled: number[] = [];
  return {
    scheduleFrame: (callback: () => void) => { nextHandle += 1; queue.set(nextHandle, callback); return nextHandle; },
    cancelFrame: (handle: number) => { cancelled.push(handle); queue.delete(handle); },
    /** Bekleyen kareleri çalıştırır (ertelenmiş ikinci resize buradadır). */
    runPending() {
      const pending = [...queue.values()];
      queue.clear();
      pending.forEach((callback) => callback());
    },
    pendingCount: () => queue.size,
    cancelled,
  };
}

/** Deterministik saat: birleştirme penceresini test etmek için. */
function fakeClock(start = 1000) {
  let value = start;
  return {
    now: () => value,
    advance(ms: number) { value += ms; },
  };
}

describe("haritaya dönüş yenilemesi — dinleyici kaydı", () => {
  it("visibilitychange, pageshow, focus, orientationchange ve webglcontextrestored dinlenir", () => {
    const map = fakeMap();
    const win = fakeHost();
    const doc = fakeDocument();
    const canvas = fakeHost();
    const handle = attachMapResume({ map, win, doc, canvas, scheduleFrame: () => 1, cancelFrame: () => {} });

    expect(win.count("pageshow")).toBe(1);
    expect(win.count("focus")).toBe(1);
    expect(win.count("orientationchange")).toBe(1);
    expect(doc.count("visibilitychange")).toBe(1);
    expect(canvas.count("webglcontextrestored")).toBe(1);
    expect(handle.listenerCount()).toBe(5);
    handle.dispose();
  });

  it("canvas verilmemişse WebGL dinleyicisi atlanır ama diğerleri kurulur", () => {
    const handle = attachMapResume({
      map: fakeMap(), win: fakeHost(), doc: fakeDocument(), canvas: null,
      scheduleFrame: () => 1, cancelFrame: () => {},
    });
    expect(handle.listenerCount()).toBe(4);
    handle.dispose();
  });

  it("document/window yoksa (node ortamı) patlamaz, dinleyici kurmaz", () => {
    const handle = attachMapResume({
      map: fakeMap(), win: null, doc: null, canvas: null,
      scheduleFrame: () => 1, cancelFrame: () => {},
    });
    expect(handle.listenerCount()).toBe(0);
    handle.dispose();
  });
});

describe("haritaya dönüş yenilemesi — resize ve yeniden çizim", () => {
  it("sekme görünür olunca resize + triggerRepaint çağrılır", () => {
    const map = fakeMap();
    const doc = fakeDocument("hidden");
    const frames = fakeFrames();
    const handle = attachMapResume({ map, win: fakeHost(), doc, canvas: null, ...frames });

    doc.setVisibility("visible");
    doc.emit("visibilitychange");

    expect(map.resize).toHaveBeenCalledTimes(1);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
    expect(handle.refreshCount()).toBe(1);
    // Ertelenmiş ikinci ölçüm karede bekler.
    expect(frames.pendingCount()).toBe(1);
    expect(handle.hasPendingFrame()).toBe(true);

    frames.runPending();
    expect(map.resize).toHaveBeenCalledTimes(2);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(2);
    expect(handle.hasPendingFrame()).toBe(false);
    handle.dispose();
  });

  it("sekme GİZLİ durumdayken yenileme tetiklenmez (boşuna çizim yok)", () => {
    const map = fakeMap();
    const doc = fakeDocument("visible");
    const handle = attachMapResume({ map, win: fakeHost(), doc, canvas: null, scheduleFrame: () => 1, cancelFrame: () => {} });

    doc.setVisibility("hidden");
    doc.emit("visibilitychange");

    expect(map.resize).not.toHaveBeenCalled();
    expect(map.triggerRepaint).not.toHaveBeenCalled();
    expect(handle.refreshCount()).toBe(0);
    handle.dispose();
  });

  it("bfcache'den dönüş (pageshow) React effect'i çalışmadan haritayı yeniler", () => {
    const map = fakeMap();
    const win = fakeHost();
    const handle = attachMapResume({ map, win, doc: fakeDocument(), canvas: null, scheduleFrame: () => 1, cancelFrame: () => {} });

    win.emit("pageshow", { persisted: true });
    expect(map.resize).toHaveBeenCalledTimes(1);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it("WebGL bağlamı geri geldiğinde yeniden çizilir", () => {
    const map = fakeMap();
    const canvas = fakeHost();
    const handle = attachMapResume({ map, win: fakeHost(), doc: fakeDocument(), canvas, scheduleFrame: () => 1, cancelFrame: () => {} });

    canvas.emit("webglcontextrestored");
    expect(map.resize).toHaveBeenCalledTimes(1);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it("orientationchange yerleşim değişimini yeniler", () => {
    const map = fakeMap();
    const win = fakeHost();
    const handle = attachMapResume({ map, win, doc: fakeDocument(), canvas: null, scheduleFrame: () => 1, cancelFrame: () => {} });

    win.emit("orientationchange");
    expect(map.resize).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it("aynı dönüş için patlayan üç olay tek yenilemeye indirgenir", () => {
    // Gerçek mobilde visibilitychange + focus + pageshow birlikte gelir; üç kez
    // resize/repaint gereksiz iş ve titreme üretir.
    const map = fakeMap();
    const win = fakeHost();
    const doc = fakeDocument("hidden");
    const clock = fakeClock();
    const frames = fakeFrames();
    const handle = attachMapResume({ map, win, doc, canvas: null, ...frames, now: clock.now, coalesceWindowMs: 400 });

    doc.setVisibility("visible");
    doc.emit("visibilitychange");
    win.emit("focus");
    win.emit("pageshow", { persisted: true });

    expect(handle.refreshCount()).toBe(1);
    expect(map.resize).toHaveBeenCalledTimes(1);

    // Pencere geçince yeni bir dönüş yeniden yeniler.
    clock.advance(500);
    win.emit("focus");
    expect(handle.refreshCount()).toBe(2);
    expect(map.resize).toHaveBeenCalledTimes(2);
    handle.dispose();
  });

  it("yeni yenileme bekleyen kareyi iptal eder; kareler üst üste birikmez", () => {
    const map = fakeMap();
    const win = fakeHost();
    const clock = fakeClock();
    const frames = fakeFrames();
    const handle = attachMapResume({ map, win, doc: fakeDocument(), canvas: null, ...frames, now: clock.now, coalesceWindowMs: 100 });

    win.emit("focus");
    expect(frames.pendingCount()).toBe(1);
    clock.advance(200);
    win.emit("focus");
    // Eski kare iptal edildi, yalnız yenisi bekliyor.
    expect(frames.cancelled).toHaveLength(1);
    expect(frames.pendingCount()).toBe(1);
    handle.dispose();
  });

  it("map.resize() patlarsa (harita kaldırılmış) hata yutulur, akış sürer", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const map = { resize: vi.fn(() => { throw new Error("map removed"); }), triggerRepaint: vi.fn() };
    const win = fakeHost();
    const handle = attachMapResume({ map, win, doc: fakeDocument(), canvas: null, scheduleFrame: () => 1, cancelFrame: () => {} });

    expect(() => win.emit("focus")).not.toThrow();
    expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    handle.dispose();
  });
});

describe("haritaya dönüş yenilemesi — temizlik", () => {
  it("dispose() tüm dinleyicileri kaldırır ve bekleyen kareyi iptal eder", () => {
    const map = fakeMap();
    const win = fakeHost();
    const doc = fakeDocument();
    const canvas = fakeHost();
    const frames = fakeFrames();
    const handle = attachMapResume({ map, win, doc, canvas, ...frames });

    expect(handle.listenerCount()).toBe(5);
    win.emit("focus");
    expect(frames.pendingCount()).toBe(1);

    handle.dispose();

    expect(handle.listenerCount()).toBe(0);
    expect(win.types()).toEqual([]);
    expect(doc.types()).toEqual([]);
    expect(canvas.types()).toEqual([]);
    expect(handle.hasPendingFrame()).toBe(false);
    expect(frames.cancelled).toHaveLength(1);

    // Dinleyici kalmadığı için olay artık yenileme üretmez.
    const before = handle.refreshCount();
    win.emit("focus");
    doc.emit("visibilitychange");
    canvas.emit("webglcontextrestored");
    expect(handle.refreshCount()).toBe(before);
    expect(map.resize).toHaveBeenCalledTimes(1);
  });

  it("dispose() iki kez çağrılabilir (React StrictMode çift temizliği)", () => {
    const handle = attachMapResume({
      map: fakeMap(), win: fakeHost(), doc: fakeDocument(), canvas: null,
      scheduleFrame: () => 1, cancelFrame: () => {},
    });
    handle.dispose();
    expect(() => handle.dispose()).not.toThrow();
    expect(handle.listenerCount()).toBe(0);
  });

  it("rAF yoksa (desteklemeyen ortam) ertelenmiş ölçüm atlanır, anlık ölçüm yapılır", () => {
    const map = fakeMap();
    const win = fakeHost();
    const handle = attachMapResume({ map, win, doc: fakeDocument(), canvas: null, scheduleFrame: undefined, cancelFrame: undefined });

    // globalThis'te rAF tanımlı değilse hiçbir kare planlanmaz.
    win.emit("focus");
    expect(map.resize).toHaveBeenCalledTimes(1);
    expect(handle.hasPendingFrame()).toBe(false);
    handle.dispose();
  });
});
