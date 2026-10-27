/**
 * Atlasia — Tipli ürün olayları (P0-3)
 *
 * Plandaki 6 pilot metriğini üretmek için gereken en küçük olay seti. Her olay
 * `telemetry` üzerinden gider; rıza yoksa ağa çıkmaz (bkz. `telemetry.ts` §1).
 *
 * Kural: burada serbest metin, kullanıcı kimliği, konum veya içerik TAŞINMAZ.
 * Yalnız sayı, sabit enum ve boolean. Yeni olay eklerken bu sınırı koru.
 */
import { getTelemetry, type Telemetry } from "./telemetry";

export const ANALYTICS_EVENTS = [
  "app_open",
  "session_start",
  "sign_up",
  "sign_in",
  "place_created",
  "route_published",
  "post_created",
  "share",
  "offline_pack",
  "report_created",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Oturumda en fazla bir kez gönderilen olaylar (sayfa yenilemesi sayılmasın). */
const ONCE_PER_SESSION = new Set<AnalyticsEvent>(["app_open", "session_start"]);
const fired = new Set<AnalyticsEvent>();

/** Uygulama açılışı: ilk görünür kare sonrası, panoyu bloke etmeden. */
export type AccountKind = "cloud" | "device";

export interface Analytics {
  appOpen: (props?: { standalone?: boolean }) => void;
  sessionStart: (props?: { account: AccountKind | null }) => void;
  signUp: (props: { account: AccountKind }) => void;
  signIn: (props: { account: AccountKind }) => void;
  placeCreated: (props: { account: AccountKind; category: string; hasPhoto: boolean }) => void;
  routePublished: (props: { account: AccountKind; visibility: "private" | "public"; stops: number }) => void;
  postCreated: (props: { hasPhoto: boolean; kind: "post" | "story" }) => void;
  share: (props: { channel: "native" | "clipboard" | "link"; target: string; ok: boolean }) => void;
  offlinePack: (props: { action: "download" | "delete"; ok: boolean }) => void;
  reportCreated: (props: { targetType: string }) => void;
}

/**
 * Olay göndericisi. `telemetry` verilmezse uygulama genelindeki örnek kullanılır.
 * `resetSession` yalnız testlerde "bir kez" kilidini açar.
 */
export function createAnalytics(telemetry?: Telemetry): Analytics {
  // Örnek, `telemetry` verilmediyse çağrı anında çözülür: modül yüklenirken
  // `setTelemetry()` henüz çalışmamış olabilir (main.tsx sırası).
  const resolve = () => telemetry ?? getTelemetry();
  const track = (name: AnalyticsEvent, props?: Record<string, unknown>) => {
    if (ONCE_PER_SESSION.has(name)) {
      if (fired.has(name)) return;
      fired.add(name);
    }
    resolve().track(name, props);
  };

  return {
    appOpen: (props) => track("app_open", { ...props, screen: props?.standalone ? "standalone" : "browser" }),
    sessionStart: (props) => track("session_start", { account: props?.account ?? "anonymous" }),
    signUp: (props) => track("sign_up", { account: props.account }),
    signIn: (props) => track("sign_in", { account: props.account }),
    placeCreated: (props) => track("place_created", { ...props }),
    routePublished: (props) => track("route_published", { ...props }),
    postCreated: (props) => track("post_created", { ...props }),
    share: (props) => track("share", { ...props }),
    offlinePack: (props) => track("offline_pack", { ...props }),
    reportCreated: (props) => track("report_created", { ...props }),
  };
}

/** Testlerde "bir kez" kilidini sıfırlar. */
export function resetAnalyticsSessionForTests(): void {
  fired.clear();
}

/** Uygulama geneli tek örnek. */
export const analytics: Analytics = createAnalytics();

/** PWA olarak mı (ana ekrana eklenmiş) açıldı? */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
  return Boolean(standalone || iosStandalone);
}
