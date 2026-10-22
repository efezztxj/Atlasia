import { describe, expect, it, vi } from "vitest";
import { attachMapResume, type ResumeDocument, type ResumeWindow } from "./mapResume";

class FakeDocument extends EventTarget implements ResumeDocument {
  hidden = false;
}

class FakeWindow extends EventTarget implements ResumeWindow {
  visualViewport: EventTarget | null = new EventTarget();
}

function setup(options: { visualViewport?: boolean } = {}) {
  const doc = new FakeDocument();
  const win = new FakeWindow();
  if (options.visualViewport === false) win.visualViewport = null;
  const queue: Array<() => void> = [];
  let nextHandle = 1;
  const schedule = vi.fn((callback: () => void) => {
    queue.push(callback);
    return nextHandle++;
  });
  const cancel = vi.fn();
  const map = { resize: vi.fn(), triggerRepaint: vi.fn() };
  const handle = attachMapResume({ map, document: doc, window: win, schedule, cancel });
  return {
    doc,
    win,
    map,
    handle,
    schedule,
    cancel,
    flushNext() {
      const callback = queue.shift();
      callback?.();
    },
  };
}

describe("attachMapResume", () => {
  it("beş olayı tek requestAnimationFrame'e indirger", () => {
    const { doc, win, map, schedule, flushNext } = setup();

    doc.dispatchEvent(new Event("visibilitychange"));
    win.dispatchEvent(new Event("pageshow"));
    win.dispatchEvent(new Event("focus"));
    win.visualViewport?.dispatchEvent(new Event("resize"));
    doc.dispatchEvent(new Event("webglcontextrestored"));

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(map.resize).not.toHaveBeenCalled();
    flushNext();
    expect(map.resize).toHaveBeenCalledTimes(1);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
  });

  it("gizliyken frame açmaz, görünür olunca tekrar açar", () => {
    const { doc, schedule, map, flushNext } = setup();

    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(schedule).not.toHaveBeenCalled();

    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(schedule).toHaveBeenCalledTimes(1);
    flushNext();
    expect(map.resize).toHaveBeenCalledTimes(1);
  });

  it("dispose bekleyen frame'i iptal eder ve geç callback'i çalıştırmaz", () => {
    const { doc, handle, schedule, cancel, map, flushNext } = setup();

    doc.dispatchEvent(new Event("visibilitychange"));
    expect(schedule).toHaveBeenCalledTimes(1);
    handle.dispose();
    expect(cancel).toHaveBeenCalledTimes(1);

    flushNext();
    expect(map.resize).not.toHaveBeenCalled();
    expect(map.triggerRepaint).not.toHaveBeenCalled();
  });

  it("dispose tüm dinleyicileri kaldırır", () => {
    const { doc, win, handle, schedule } = setup();

    handle.dispose();
    doc.dispatchEvent(new Event("visibilitychange"));
    win.dispatchEvent(new Event("pageshow"));
    win.dispatchEvent(new Event("focus"));
    win.visualViewport?.dispatchEvent(new Event("resize"));
    doc.dispatchEvent(new Event("webglcontextrestored"));

    expect(schedule).not.toHaveBeenCalled();
  });

  it("visualViewport yoksa çökmez ve diğer olaylar çalışır", () => {
    const { doc, win, schedule, map, flushNext } = setup({ visualViewport: false });

    expect(() => win.dispatchEvent(new Event("focus"))).not.toThrow();
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(schedule).toHaveBeenCalledTimes(1);
    flushNext();
    expect(map.resize).toHaveBeenCalledTimes(1);
  });

  it("çift dispose güvenlidir; iptal bir kez yapılır", () => {
    const { doc, handle, cancel } = setup();

    doc.dispatchEvent(new Event("visibilitychange"));
    handle.dispose();
    expect(() => handle.dispose()).not.toThrow();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("frame tamamlandıktan sonra yeni olay yeni frame açar", () => {
    const { doc, schedule, map, flushNext } = setup();

    doc.dispatchEvent(new Event("visibilitychange"));
    flushNext();
    expect(map.resize).toHaveBeenCalledTimes(1);

    doc.dispatchEvent(new Event("visibilitychange"));
    expect(schedule).toHaveBeenCalledTimes(2);
    flushNext();
    expect(map.resize).toHaveBeenCalledTimes(2);
  });
});
