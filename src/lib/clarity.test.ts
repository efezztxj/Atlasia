// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clarityConsent, setClarityConsent, startClarity } from "./clarity";

afterEach(() => {
  localStorage.removeItem("atlasia.clarity-consent.v1");
  document.querySelectorAll('script[src^="https://www.clarity.ms/"]').forEach((el) => el.remove());
  document.documentElement.removeAttribute("data-clarity-mask");
  delete window.clarity;
});

describe("Clarity consent", () => {
  it("does not load without separate consent", () => {
    startClarity();
    expect(document.querySelector('script[src*="clarity.ms"]')).toBeNull();
    expect(clarityConsent()).toBe(false);
  });
  it("loads after explicit permission and passes consent without advertising", () => {
    setClarityConsent(true);
    startClarity();
    startClarity();
    expect(document.querySelectorAll('script[src*="clarity.ms"]')).toHaveLength(1);
    expect(window.clarity?.q?.[0]).toEqual(["consentv2", { analytics_Storage: "granted", ad_Storage: "denied" }]);
    expect(document.documentElement.getAttribute("data-clarity-mask")).toBe("true");
    setClarityConsent(false);
    expect(clarityConsent()).toBe(false);
  });
});
