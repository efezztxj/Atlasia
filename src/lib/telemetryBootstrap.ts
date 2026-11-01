/**
 * Atlasia — Ölçüm katmanının açılışı (P0-2 / P0-3)
 *
 * `main.tsx` tek satırla çağırır. Buradaki iş:
 *  1. `telemetry` örneğini kurar (uç nokta yoksa ağ kapalı),
 *  2. `canSend` kapısını çerez onayına bağlar,
 *  3. yakalanmamış hata dinleyicilerini kurar,
 *  4. `app_open` / `session_start` olaylarını bir kez gönderir.
 *
 * KVKK sınırı: rıza verilmeden hiçbir istek çıkmaz. Rıza sonradan verilirse
 * geçmiş kayıtlar **gönderilmez** (o an rıza yoktu); yalnız sonraki olaylar
 * akar. Bu bilinçli bir tercih: "geriye dönük toplama" yapmıyoruz.
 */
import { hasCookieConsent, readCookieConsent, COOKIE_CONSENT_EVENT } from "./cookieConsent";
import { analytics, isStandaloneDisplay } from "./analytics";
import { createTelemetry, installGlobalErrorHandlers, setTelemetry, type Telemetry } from "./telemetry";

declare global {
  interface Window {
    /** Destek/hata ayıklama için: rıza, uç nokta ve bellek içi son kayıtlar. */
    atlasiaErrorLog?: () => TelemetryDiagnostics;
  }
}

/** Teşhis kaydı: PII temizliğinden geçmiş, yalnız bellekteki son kayıtlar. */
export interface TelemetryDiagnosticRecord {
  name: string;
  level: string;
  at: number;
  props: Record<string, string | number | boolean>;
}

export interface TelemetryDiagnostics {
  /**
   * `ready` — rıza var, uç nokta tanımlı: kayıtlar toplayıcıya gidiyor.
   * `consent-off` — uç nokta var ama kullanıcı analitik izni vermedi.
   * `endpoint-missing` — toplayıcı adresi yok: **hiçbir şey cihazdan çıkmıyor**.
   */
  status: "ready" | "consent-off" | "endpoint-missing";
  hint: string;
  endpointConfigured: boolean;
  consent: boolean;
  sessionId: string;
  records: TelemetryDiagnosticRecord[];
}

/**
 * Kullanıcının tarayıcısında çalıştırılabilir teşhis.
 *
 * Neden gerekli: toplayıcı uç noktası tanımlı değilse `captureError` sessizce
 * hiçbir şey göndermez. "Kullanıcı çöktü ama bize hiçbir şey gelmedi" durumunda
 * tek kanıt bu pencere olur (`window.atlasiaErrorLog()`), tıpkı Clarity için
 * `window.atlasiaClarityStatus()` gibi.
 */
export function telemetryDiagnostics(
  telemetry: Telemetry,
  endpoint: string | null,
  consent: boolean = analyticsConsentGranted(),
): TelemetryDiagnostics {
  const endpointConfigured = Boolean(endpoint && endpoint.trim());
  const status: TelemetryDiagnostics["status"] = !endpointConfigured
    ? "endpoint-missing"
    : consent
      ? "ready"
      : "consent-off";
  const hint =
    status === "ready"
      ? "Kayıtlar toplayıcıya gönderiliyor."
      : status === "consent-off"
        ? "Analitik izni yok: kayıtlar yalnız bu sekmede tutuluyor, gönderilmiyor."
        : "Toplayıcı adresi tanımlı değil (VITE_TELEMETRY_ENDPOINT): hiçbir kayıt cihazdan çıkmıyor.";
  return {
    status,
    hint,
    endpointConfigured,
    consent,
    sessionId: telemetry.sessionId,
    records: telemetry.drainBuffer().slice(-20).map((entry) => ({
      name: entry.name,
      level: entry.level,
      at: entry.at,
      props: entry.props,
    })),
  };
}

export interface StartTelemetryOptions {
  /** Cloudflare ortamından gelen toplayıcı adresi. Boşsa ağ kapalı. */
  endpoint?: string | null;
  /** Test enjeksiyonu. */
  telemetry?: Telemetry;
  /** Test enjeksiyonu; varsayılan `window`. */
  target?: Pick<Window, "addEventListener" | "removeEventListener"> | null;
  /** Oturum açılışını say (test için kapatılabilir). */
  sendOpenEvents?: boolean;
}

/** Teşhis fonksiyonunu taşıyabilen pencere (test sahteleri dahil). */
type DiagnosticHost = { atlasiaErrorLog?: () => TelemetryDiagnostics };

export interface TelemetryHandle {
  telemetry: Telemetry;
  /** Dinleyicileri ve zamanlayıcıyı temizler (HMR/test). */
  stop: () => void;
}

/** Kullanıcı analitiğe izin verdi mi? Rıza yoksa `false`. */
export function analyticsConsentGranted(): boolean {
  return hasCookieConsent(readCookieConsent(), "analytics");
}

export function startTelemetry(options: StartTelemetryOptions = {}): TelemetryHandle {
  // Enjekte edilen örnek de uygulama geneli örnek olur: `analytics` tek
  // `getTelemetry()` üzerinden çalışır, ayrı bir kopya olay üretmez.
  const telemetry = setTelemetry(
    options.telemetry ??
      createTelemetry({
        endpoint: options.endpoint ?? null,
        canSend: analyticsConsentGranted,
      }),
  );

  const target = options.target === undefined ? (typeof window === "undefined" ? null : window) : options.target;
  const stopErrors = installGlobalErrorHandlers(telemetry, target);

  // Teşhis penceresi: destek ekibi kullanıcının tarayıcısında tek satırla
  // "kayıt gidiyor mu, nereye" sorusunu yanıtlayabilir.
  const endpoint = options.endpoint ?? null;
  const host = (options.target === undefined
    ? (typeof window === "undefined" ? null : window)
    : options.target) as DiagnosticHost | null;
  if (host) host.atlasiaErrorLog = () => telemetryDiagnostics(telemetry, endpoint);

  if (options.sendOpenEvents !== false) {
    analytics.appOpen({ standalone: isStandaloneDisplay() });
    analytics.sessionStart({ account: null });
  }

  // Sayfa gizlenirken bekleyen kayıtları gönder: mobilde sekme kapanması sık.
  let stopVisibility: () => void = () => {};
  if (target && typeof document !== "undefined" && typeof document.addEventListener === "function") {
    const onHidden = () => {
      if (document.visibilityState === "hidden") telemetry.flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    stopVisibility = () => document.removeEventListener("visibilitychange", onHidden);
  }

  // Rıza sonradan verilirse yalnız bundan sonraki olaylar akar.
  let stopConsent: () => void = () => {};
  if (target && typeof window !== "undefined" && typeof window.addEventListener === "function") {
    const onConsent = () => {
      if (analyticsConsentGranted()) telemetry.flush();
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    stopConsent = () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }

  return {
    telemetry,
    stop: () => {
      stopErrors();
      stopVisibility();
      stopConsent();
    },
  };
}
