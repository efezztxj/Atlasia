// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initAccessibilityPrefs,
  resetAccessibilityPrefs,
  updateAccessibilityPrefs,
  useAccessibilityPrefs,
} from "./useAccessibilityPrefs";

const STORAGE_KEY = "atlasia.accessibility.v1";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  resetAccessibilityPrefs();
  delete document.documentElement.dataset.motion;
  delete document.documentElement.dataset.contrast;
  delete document.documentElement.dataset.textScale;
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("erişilebilirlik tercihleri", () => {
  it("varsayılan olarak hareket açık, standart kontrast ve normal yazı boyutu uygular", () => {
    initAccessibilityPrefs();

    expect(document.documentElement.dataset.motion).toBe("full");
    expect(document.documentElement.dataset.contrast).toBe("normal");
    expect(document.documentElement.dataset.textScale).toBe("normal");
  });

  it("kayıtlı tercihleri ilk boyamadan önce okur ve uygular", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ reducedMotion: true, highContrast: true, textScale: "large" }),
    );

    initAccessibilityPrefs();

    expect(document.documentElement.dataset.motion).toBe("reduced");
    expect(document.documentElement.dataset.contrast).toBe("high");
    expect(document.documentElement.dataset.textScale).toBe("large");
  });

  it("bozuk kayıt olduğunda varsayılanlara döner", () => {
    window.localStorage.setItem(STORAGE_KEY, "{bozuk");

    expect(initAccessibilityPrefs()).toEqual({ reducedMotion: false, highContrast: false, textScale: "normal" });
  });

  it("güncelleme hem <html> özniteliğini hem cihaz kaydını yeniler", () => {
    initAccessibilityPrefs();

    updateAccessibilityPrefs({ reducedMotion: true, textScale: "large" });

    expect(document.documentElement.dataset.motion).toBe("reduced");
    expect(document.documentElement.dataset.textScale).toBe("large");
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
      reducedMotion: true,
      highContrast: false,
      textScale: "large",
    });
  });

  it("hook, tercih değiştiğinde aboneyi güncel değerle yeniden çizer", () => {
    initAccessibilityPrefs();
    const { result } = renderHook(() => useAccessibilityPrefs());

    expect(result.current.highContrast).toBe(false);

    act(() => result.current.setHighContrast(true));

    expect(result.current.highContrast).toBe(true);
    expect(document.documentElement.dataset.contrast).toBe("high");
  });
});
