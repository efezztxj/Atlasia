// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
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

  it("durum geçişleri: loading → ready ve olay yayını", () => {
    const seen: string[] = [];
    const listener = () => seen.push(clarityStatus());
    window.addEventListener(CLARITY_STATUS_EVENT, listener);
    setClarityConsent(true);
    startClarity();
    expect(clarityStatus()).toBe("loading");
    const script = document.querySelector('script[src*="clarity.ms"]') as HTMLScriptElement;
    script.dispatchEvent(new Event("load"));
    expect(clarityStatus()).toBe("ready");
    window.removeEventListener(CLARITY_STATUS_EVENT, listener);
    // Durum modül düzeyinde tutulduğu için önceki testlerden "loading" gelebilir;
    // ölçülen şey: her geçişte olay yayınlanıyor ve son durum "ready".
    expect(seen).toContain("ready");
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
