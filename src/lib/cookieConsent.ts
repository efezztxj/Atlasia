import { storageGet, storageSet } from "../utils/storage";

export const COOKIE_CONSENT_NAME = "atlasia_consent";
export const COOKIE_CONSENT_STORAGE_KEY = "atlasia.cookieConsent.v1";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 31_536_000;
export const COOKIE_PREFERENCES_EVENT = "atlasia:cookie-preferences";
export const COOKIE_CONSENT_EVENT = "atlasia:cookie-consent";

export type CookieCategory = "essential" | "analytics" | "marketing";

export interface CookieConsentRecord {
  version: number;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

function isHttpsOrigin(): boolean {
  return typeof window !== "undefined" && window.location?.protocol === "https:";
}

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    // Bozuk yüzde kodlaması uygulamayı düşürmemeli; ham dizge JSON ayrıştırıcıya bırakılır.
    return raw;
  }
}

export function parseCookieConsent(raw: string | null | undefined): CookieConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeCookieValue(raw));
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== COOKIE_CONSENT_VERSION ||
      typeof candidate.analytics !== "boolean" ||
      typeof candidate.marketing !== "boolean" ||
      typeof candidate.updatedAt !== "string" ||
      Number.isNaN(Date.parse(candidate.updatedAt))
    ) {
      return null;
    }
    return {
      version: candidate.version,
      analytics: candidate.analytics,
      marketing: candidate.marketing,
      updatedAt: candidate.updatedAt,
    };
  } catch {
    // El ile değiştirilmiş veya bozulmuş çerez/depolama verisi yok sayılır ve yeniden sorulur.
    return null;
  }
}

export function readRawCookie(name = COOKIE_CONSENT_NAME, cookieSource?: string): string | null {
  let source = cookieSource;
  if (source === undefined) {
    if (typeof document === "undefined") return null;
    try {
      source = document.cookie;
    } catch {
      // Kısıtlı iframe veya sıkı tarayıcı gizlilik ayarları document.cookie erişimini engelleyebilir.
      return null;
    }
  }
  const prefix = `${name}=`;
  for (const part of source.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return null;
}

export function formatCookieHeader(record: CookieConsentRecord, isSecure = isHttpsOrigin()): string {
  const encoded = encodeURIComponent(JSON.stringify(record));
  return `${COOKIE_CONSENT_NAME}=${encoded}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

export function readCookieConsent(): CookieConsentRecord | null {
  const fromCookie = parseCookieConsent(readRawCookie());
  if (fromCookie) return fromCookie;
  return parseCookieConsent(storageGet(COOKIE_CONSENT_STORAGE_KEY));
}

export function hasCookieConsent(
  record: CookieConsentRecord | null | undefined,
  category: CookieCategory,
): boolean {
  if (category === "essential") return true;
  if (!record || record.version !== COOKIE_CONSENT_VERSION) return false;
  return record[category] === true;
}

export function expireCookie(name: string, isSecure = isHttpsOrigin()): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  } catch {
    // Çerez yazımı tarayıcı tarafından engellenmişse sessizce geçilir.
  }
}

/**
 * Tercihleri yazar. Varsayılan "yalnız zorunlu"dur: analitik ve pazarlama
 * **açık rıza** olmadan asla `true` olmaz (KVKK). Onay kaydı hem çereze hem
 * yerel depoya yazılır; çerez engelliyse yerel yedek devreye girer.
 */
export function saveCookieConsent(
  preferences: { analytics?: boolean; marketing?: boolean } = {},
  now = new Date(),
): {
  record: CookieConsentRecord;
  cookieWritten: boolean;
} {
  const record: CookieConsentRecord = {
    version: COOKIE_CONSENT_VERSION,
    analytics: preferences.analytics === true,
    marketing: preferences.marketing === true,
    updatedAt: now.toISOString(),
  };

  storageSet(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));

  let cookieWritten = false;
  if (typeof document !== "undefined") {
    try {
      document.cookie = formatCookieHeader(record);
      cookieWritten = parseCookieConsent(readRawCookie()) !== null;
    } catch {
      // Tarayıcı çerezleri tamamen kapattıysa yerel/bellek yedeği çalışmaya devam eder.
      cookieWritten = false;
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<CookieConsentRecord>(COOKIE_CONSENT_EVENT, { detail: record }));
  }

  return { record, cookieWritten };
}

/** Geriye dönük uyumluluk: yalnız zorunlu çerezlerle kaydetme. */
export function saveEssentialCookieConsent(now = new Date()) {
  return saveCookieConsent({}, now);
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_EVENT));
}

export function formatConsentDate(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}
