// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLARITY_STATUS_EVENT,
  clarityConsent,
  clarityStatus,
  clarityStatusSnapshot,
  setClarityConsent,
  startClarity,
} from "./clarity";

function cleanDom() {
  localStorage.removeItem("atlasia.clarity-consent.v1");
  document.querySelectorAll('script[src^="https://www.clarity.ms/"]').forEach((el) => el.remove());
  document.documentElement.removeAttribute("data-clarity-mask");
  delete window.clarity;
}

afterEach(cleanDom);

describe("Clarity consent", () => {
  it("ayrı izin olmadan yüklemez", () => {
    startClarity();
    expect(document.querySelector('script[src*="clarity.ms"]')).toBeNull();
    expect(clarityConsent()).toBe(false);
    expect(clarityStatus()).toBe("off");
  });

  it("açık izinden sonra yükler, reklam iznini kapalı tutar", () => {
    setClarityConsent(true);
    startClarity();
    startClarity();
    expect(document.querySelectorAll('script[src*="clarity.ms"]')).toHaveLength(1);
    expect(window.clarity?.q?.[0]).toEqual(["consentv2", { analytics_Storage: "granted", ad_Storage: "denied" }]);
    expect(document.documentElement.getAttribute("data-clarity-mask")).toBe("true");
    setClarityConsent(false);
    expect(clarityConsent()).toBe(false);
  });

  it("aynı betiği iki kez eklemez (stub silinse bile)", () => {
    setClarityConsent(true);
    startClarity();
    delete window.clarity;
    startClarity();
    expect(document.querySelectorAll('script[src*="clarity.ms"]')).toHaveLength(1);
  });

  it("yükleyici çalışınca 'ready': window.clarity vendor tarafından değiştirilir", async () => {
    const seen: string[] = [];
    const listener = () => seen.push(clarityStatus());
    window.addEventListener(CLARITY_STATUS_EVENT, listener);
    setClarityConsent(true);
    startClarity();
    expect(clarityStatus()).toBe("loading");
    // Vendor davranışı: kuyruğu devralır ve window.clarity'yi kendi fonksiyonuyla değiştirir.
    window.clarity = (() => {}) as typeof window.clarity;
    const script = document.querySelector('script[src*="clarity.ms"]') as HTMLScriptElement;
    script.dispatchEvent(new Event("load"));
    await Promise.resolve();
    expect(clarityStatus()).toBe("ready");
    window.removeEventListener(CLARITY_STATUS_EVENT, listener);
    expect(seen).toContain("ready");
  });

  it("Microsoft 204 dönerse 'empty' olur — sessizce 'yüklendi' denmez", async () => {
    vi.useFakeTimers();
    setClarityConsent(true);
    startClarity();
    const script = document.querySelector('script[src*="clarity.ms"]') as HTMLScriptElement;
    // 204'te tarayıcı yine de load tetikler; stub yerinde kalır.
    script.dispatchEvent(new Event("load"));
    await Promise.resolve();
    vi.advanceTimersByTime(1600);
    expect(clarityStatus()).toBe("empty");
    vi.useRealTimers();
  });

  it("betik engellenirse 'blocked' olur (reklam engelleyici görünür olsun)", () => {
    setClarityConsent(true);
    startClarity();
    const script = document.querySelector('script[src*="clarity.ms"]') as HTMLScriptElement;
    script.dispatchEvent(new Event("error"));
    expect(clarityStatus()).toBe("blocked");
  });

  it("snapshot destek için gerçek durumu raporlar", () => {
    setClarityConsent(true);
    startClarity();
    const snapshot = clarityStatusSnapshot();
    expect(snapshot).toMatchObject({
      consent: true,
      status: "loading",
      scriptPresent: true,
      project: "z6hdmwcwe6",
    });
    cleanDom();
    expect(clarityStatusSnapshot()).toMatchObject({ consent: false, scriptPresent: false });
  });
});
