// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Story } from "../types";
import StoryViewer from "./StoryViewer";

/**
 * Denetim K-02 kilidi.
 *
 * Önceki kodda geçen süre efektin yerel değişkenindeydi ve efekt
 * `[index, paused, next]` bağımlılıklarıyla yeniden kuruluyordu; dokunmatikte
 * "basılı tut → duraklat" ilerleme çubuğunu sıfıra döndürüyordu. Bu test
 * duraklatmanın süreyi koruduğunu, bırakınca kaldığı yerden devam ettiğini
 * ve hikâyenin normal sürede ilerlediğini doğrular.
 */
const DURATION = 6000;

const story = (id: string): Story => ({
  id,
  author: "Deneme",
  authorUid: "u1",
  text: `${id} metni`,
  accent: "sun",
  createdAt: Date.now(),
  kind: "user",
});

let frames: Array<FrameRequestCallback> = [];
let now = 0;

const drive = (ms: number, step = 250) => {
  const end = now + ms;
  while (now < end) {
    now = Math.min(end, now + step);
    const pending = frames;
    frames = [];
    act(() => {
      for (const callback of pending) callback(now);
    });
  }
};

/** İstenen hikâyenin ilerleme çubuğu genişliği (%). */
const width = (barIndex = 0) => {
  const bars = screen.getByRole("dialog", { name: "Hikâye" }).querySelectorAll<HTMLElement>("div.relative.z-10 > span > span");
  return Number.parseFloat(bars[barIndex]?.style.width ?? "0");
};

describe("StoryViewer ilerleme çubuğu", () => {
  beforeEach(() => {
    now = 0;
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("duraklatma süreyi korur; bırakınca kaldığı yerden devam eder", () => {
    render(createElement(StoryViewer, {
      stories: [story("a"), story("b")],
      startIndex: 0,
      onClose: () => {},
      onSeen: () => {},
      onGoTo: () => {},
      canDelete: () => false,
      onDelete: () => {},
    }));

    drive(3000);
    const beforePause = width();
    expect(beforePause).toBeGreaterThan(40);
    expect(beforePause).toBeLessThan(60);

    const dialog = screen.getByRole("dialog", { name: "Hikâye" });
    fireEvent.mouseDown(dialog);
    drive(2000);

    // Duraklatma sırasında çubuk ilerlememeli ve sıfıra dönmemeli.
    const whilePaused = width();
    expect(whilePaused).toBeGreaterThan(beforePause - 2);
    expect(whilePaused).toBeLessThan(beforePause + 2);

    fireEvent.mouseUp(dialog);
    drive(2000);

    // Bırakınca kaldığı yerden devam eder (baştan başlamaz).
    expect(width()).toBeGreaterThan(whilePaused + 20);
  });

  it("süre dolunca sonraki hikâyeye geçer", () => {
    const onSeen = vi.fn();
    render(createElement(StoryViewer, {
      stories: [story("a"), story("b")],
      startIndex: 0,
      onClose: () => {},
      onSeen,
      onGoTo: () => {},
      canDelete: () => false,
      onDelete: () => {},
    }));

    expect(onSeen).toHaveBeenCalledWith("a");
    drive(DURATION + 500);
    expect(onSeen).toHaveBeenCalledWith("b");
    // İlk hikâye tamamlandı, ikincisi yeni başladı.
    expect(width(0)).toBe(100);
    expect(width(1)).toBeLessThan(20);
  });
});
