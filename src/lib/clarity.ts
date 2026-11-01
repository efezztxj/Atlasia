const KEY = "atlasia.clarity-consent.v1";
const EVENT = "atlasia:clarity-consent";
const STATUS_EVENT = "atlasia:clarity-status";
const MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const PROJECT = "z6hdmwcwe6";
const TAG_URL = `https://www.clarity.ms/tag/${PROJECT}`;

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: Clarity;
    /** Destek/hata ayıklama için: rıza, betik ve yükleme durumunu döndürür. */
    atlasiaClarityStatus?: () => ClarityStatusSnapshot;
  }
}

/**
 * Betiğin gerçek durumu. "gözükmüyor" şikâyetinin üç ayrı nedeni olabilir:
 * izin verilmemiş (`off`), istek yolda (`loading`), yüklendi (`ready`) veya
 * tarayıcı/reklam engelleyici betiği düşürdü (`blocked`).
 */
export type ClarityStatus = "off" | "loading" | "ready" | "empty" | "blocked";

export interface ClarityStatusSnapshot {
  consent: boolean;
  status: ClarityStatus;
  scriptPresent: boolean;
  queueLength: number;
  project: string;
}

let status: ClarityStatus = "off";

function setStatus(next: ClarityStatus): void {
  if (status === next) return;
  status = next;
  try {
    window.dispatchEvent(new Event(STATUS_EVENT));
  } catch {
    // Olay gönderilemezse durum yine okunabilir; panel yenilenince görünür.
  }
}

export function clarityConsent(): boolean {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (!value || typeof value !== "object") return false;
    const record = value as { granted?: unknown; at?: unknown };
    return record.granted === true && typeof record.at === "number" && record.at <= Date.now() && Date.now() - record.at < MAX_AGE;
  } catch { return false; }
}

export function setClarityConsent(granted: boolean): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ granted, at: Date.now() }));
  } catch {
    // Without durable storage, never activate tracking.
    if (granted) return;
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clarityStatus(): ClarityStatus {
  return status;
}

/** Durum değişince panelin yeniden çizilmesi için dinlenebilir olay adı. */
export const CLARITY_STATUS_EVENT = STATUS_EVENT;

export function clarityStatusSnapshot(): ClarityStatusSnapshot {
  return {
    consent: clarityConsent(),
    status,
    scriptPresent: Boolean(document.querySelector('script[src^="https://www.clarity.ms/tag/"]')),
    queueLength: window.clarity?.q?.length ?? 0,
    project: PROJECT,
  };
}

/** No third-party request is made until the user separately opts in. */
export function startClarity(): void {
  if (!clarityConsent()) {
    setStatus("off");
    return;
  }
  // Aynı betiği iki kez eklemeyiz. `window.clarity` kontrolü yetmez: geri alma
  // sonrası stub kalabilir, bu yüzden DOM'a bakılır.
  if (document.querySelector('script[src^="https://www.clarity.ms/tag/"]')) return;
  // Mask application text by default; dashboard masking still needs verification.
  document.documentElement.setAttribute("data-clarity-mask", "true");
  const queue: Clarity = (...args: unknown[]) => { (queue.q ??= []).push(args); };
  window.clarity = queue;
  queue("consentv2", { analytics_Storage: "granted", ad_Storage: "denied" });
  const script = document.createElement("script");
  script.async = true;
  script.src = TAG_URL;
  // Microsoft, geçersiz/aktif olmayan proje kimliklerinde **HTTP 204** döndürüyor:
  // tarayıcı bunu başarılı sayar, `load` olayı tetiklenir ama hiç JavaScript gelmez.
  // Yani "yüklendi" demek yanıltıcı olur; yükleyicinin gerçekten çalıştığını ancak
  // `window.clarity` stub'ının değişmesi ya da kuyruğun boşalması gösterir.
  script.addEventListener("load", () => {
    queueMicrotask(() => {
      if (window.clarity !== queue || (window.clarity?.q?.length ?? 0) === 0) {
        setStatus("ready");
        return;
      }
      setTimeout(() => {
        if (window.clarity !== queue || (window.clarity?.q?.length ?? 0) === 0) setStatus("ready");
        else setStatus("empty");
      }, 1500);
    });
  });
  script.addEventListener("error", () => setStatus("blocked"));
  setStatus("loading");
  document.head.appendChild(script);
}

export function initClarity(): void {
  window.atlasiaClarityStatus = clarityStatusSnapshot;
  startClarity();
  const update = () => {
    if (clarityConsent()) startClarity();
    else if (window.clarity) {
      window.clarity("consent", false);
      // Remove the running third-party code from the page on withdrawal.
      window.location.reload();
    }
  };
  window.addEventListener(EVENT, update);
  window.addEventListener("storage", (event) => {
    if (event.key === KEY || event.key === null) update();
  });
}
