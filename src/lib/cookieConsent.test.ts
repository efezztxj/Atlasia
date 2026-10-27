// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storageRemove } from "../utils/storage";
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_MAX_AGE_SECONDS, COOKIE_CONSENT_NAME, COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_VERSION, COOKIE_PREFERENCES_EVENT, expireCookie, formatConsentDate, formatCookieHeader, hasCookieConsent, openCookiePreferences, parseCookieConsent, readCookieConsent, readRawCookie, saveCookieConsent, saveEssentialCookieConsent } from "./cookieConsent";

function clearTestConsent() {
  expireCookie(COOKIE_CONSENT_NAME, false);
  storageRemove(COOKIE_CONSENT_STORAGE_KEY);
}

beforeEach(clearTestConsent);
afterEach(() => {
  vi.restoreAllMocks();
  clearTestConsent();
});

describe("cookieConsent sabitleri ve çerez başlığı", () => {
  it("12 aylık SameSite=Lax ve HTTPS'de Secure başlığı üretir", () => {
    expect(COOKIE_CONSENT_NAME).toBe("atlasia_consent");
    expect(COOKIE_CONSENT_STORAGE_KEY).toBe("atlasia.cookieConsent.v1");
    expect(COOKIE_CONSENT_VERSION).toBe(1);
    expect(COOKIE_CONSENT_MAX_AGE_SECONDS).toBe(31_536_000);

    const record = {
      version: 1,
      analytics: false,
      marketing: false,
      updatedAt: "2026-10-25T10:00:00.000Z",
    };

    const httpHeader = formatCookieHeader(record, false);
    expect(httpHeader).toContain("atlasia_consent=");
    expect(httpHeader).toContain("Path=/");
    expect(httpHeader).toContain("Max-Age=31536000");
    expect(httpHeader).toContain("SameSite=Lax");
    expect(httpHeader).not.toContain("Secure");

    const httpsHeader = formatCookieHeader(record, true);
    expect(httpsHeader).toContain("; Secure");
  });

  it("çerez değerini ayrıştırır; bozuk veri veya eski sürümde null döner", () => {
    const valid = JSON.stringify({
      version: COOKIE_CONSENT_VERSION,
      analytics: false,
      marketing: false,
      updatedAt: "2026-10-25T12:30:00.000Z",
    });

    expect(parseCookieConsent(encodeURIComponent(valid))).toEqual({
      version: COOKIE_CONSENT_VERSION,
      analytics: false,
      marketing: false,
      updatedAt: "2026-10-25T12:30:00.000Z",
    });

    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent("bozuk-json")).toBeNull();
    expect(parseCookieConsent("%E0%A4%A")).toBeNull();
    expect(
      parseCookieConsent(
        JSON.stringify({ version: 0, analytics: false, marketing: false, updatedAt: "2026-10-25T12:30:00.000Z" }),
      ),
    ).toBeNull();
    expect(
      parseCookieConsent(
        JSON.stringify({ version: 1, analytics: "false", marketing: false, updatedAt: "2026-10-25T12:30:00.000Z" }),
      ),
    ).toBeNull();
    expect(
      parseCookieConsent(
        JSON.stringify({ version: 1, analytics: false, marketing: false, updatedAt: "gecersiz-tarih" }),
      ),
    ).toBeNull();
  });
});

describe("saveEssentialCookieConsent ve yedek okuma akışı", () => {
  it("hem HTTP çerezine hem yerel depolamaya yazar ve olayı tetikler", () => {
    const events: unknown[] = [];
    const onConsent = (event: Event) => events.push((event as CustomEvent).detail);
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);

    const fixedDate = new Date("2026-10-25T09:15:00.000Z");
    const { record, cookieWritten } = saveEssentialCookieConsent(fixedDate);
    window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);

    expect(cookieWritten).toBe(true);
    expect(record).toEqual({
      version: 1,
      analytics: false,
      marketing: false,
      updatedAt: "2026-10-25T09:15:00.000Z",
    });
    expect(readRawCookie()).toBeTruthy();
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe(JSON.stringify(record));
    expect(readCookieConsent()).toEqual(record);
    expect(events).toEqual([record]);
  });

  it("HTTP çerezi silinse bile yerel yedekten okumaya devam eder", () => {
    const fixedDate = new Date("2026-10-25T11:00:00.000Z");
    const { record } = saveEssentialCookieConsent(fixedDate);

    expireCookie(COOKIE_CONSENT_NAME, false);
    expect(readRawCookie()).toBeFalsy();
    expect(readCookieConsent()).toEqual(record);
  });

  it("tarayıcı çerezleri ve localStorage erişimini engellese bile çökmez, bellek yedeğini kullanır", () => {
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new DOMException("Cookies blocked", "SecurityError");
    });
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new DOMException("Cookies blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    const fixedDate = new Date("2026-10-25T14:00:00.000Z");
    const result = saveEssentialCookieConsent(fixedDate);
    expect(result.cookieWritten).toBe(false);
    expect(readCookieConsent()).toEqual(result.record);
    expect(() => expireCookie("opsiyonel_cerez", true)).not.toThrow();
  });
});

describe("hasCookieConsent kapısı ve yardımcı olaylar", () => {
  it("zorunlu kategoriyi her zaman açık tutar; isteğe bağlı kategorileri yalnız geçerli sürüm ve açık izinde açar", () => {
    expect(hasCookieConsent(null, "essential")).toBe(true);
    expect(hasCookieConsent(null, "analytics")).toBe(false);
    expect(hasCookieConsent(null, "marketing")).toBe(false);

    const essentialOnly = {
      version: COOKIE_CONSENT_VERSION,
      analytics: false,
      marketing: false,
      updatedAt: "2026-10-25T10:00:00.000Z",
    };
    expect(hasCookieConsent(essentialOnly, "essential")).toBe(true);
    expect(hasCookieConsent(essentialOnly, "analytics")).toBe(false);
    expect(hasCookieConsent(essentialOnly, "marketing")).toBe(false);

    const futureOptIn = { ...essentialOnly, analytics: true };
    expect(hasCookieConsent(futureOptIn, "analytics")).toBe(true);
    expect(hasCookieConsent({ ...futureOptIn, version: 0 }, "analytics")).toBe(false);
  });

  it("tercih açma olayını yayınlar ve tarihi Türkçe biçimler", () => {
    const listener = vi.fn();
    window.addEventListener(COOKIE_PREFERENCES_EVENT, listener);
    openCookiePreferences();
    window.removeEventListener(COOKIE_PREFERENCES_EVENT, listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(formatConsentDate("2026-10-25T10:00:00.000Z")).toContain("2026");
    expect(formatConsentDate("bozuk")).toBe("");
  });
});

describe("saveCookieConsent · açık rıza", () => {
  it("varsayılan yalnız zorunlu: analitik ve pazarlama kapalı", () => {
    const { record } = saveCookieConsent({}, new Date("2026-10-27T10:00:00.000Z"));
    expect(record.analytics).toBe(false);
    expect(record.marketing).toBe(false);
    expect(record.updatedAt).toBe("2026-10-27T10:00:00.000Z");
  });

  it("analitik tercihi kalıcılaşır ve kapıyı açar", () => {
    const { record } = saveCookieConsent({ analytics: true }, new Date("2026-10-27T10:00:00.000Z"));
    expect(record.analytics).toBe(true);
    expect(hasCookieConsent(record, "analytics")).toBe(true);
    expect(hasCookieConsent(record, "marketing")).toBe(false);
  });

  it("pazarlama analitikten bağımsız", () => {
    const { record } = saveCookieConsent({ analytics: false, marketing: true });
    expect(hasCookieConsent(record, "analytics")).toBe(false);
    expect(hasCookieConsent(record, "marketing")).toBe(true);
  });

  it("saveEssentialCookieConsent hâlâ yalnız zorunlu yazar (geriye uyum)", () => {
    const { record } = saveEssentialCookieConsent();
    expect(record.analytics).toBe(false);
    expect(record.marketing).toBe(false);
  });
});
