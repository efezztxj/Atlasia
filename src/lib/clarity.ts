const KEY = "atlasia.clarity-consent.v1";
const EVENT = "atlasia:clarity-consent";
const MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const PROJECT = "z6hdmwcwe6";

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window { clarity?: Clarity }
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

/** No third-party request is made until the user separately opts in. */
export function startClarity(): void {
  if (!clarityConsent() || window.clarity) return;
  // Mask application text by default; dashboard masking still needs verification.
  document.documentElement.setAttribute("data-clarity-mask", "true");
  const queue: Clarity = (...args: unknown[]) => { (queue.q ??= []).push(args); };
  window.clarity = queue;
  queue("consentv2", { analytics_Storage: "granted", ad_Storage: "denied" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${PROJECT}`;
  document.head.appendChild(script);
}

export function initClarity(): void {
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
