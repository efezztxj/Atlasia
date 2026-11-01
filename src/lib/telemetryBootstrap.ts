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
    /**
     * Destek/hata ayıklama: uç nokta + rıza durumu ve bellek içi son kayıtlar.
     * Tembel yüklenir (`await window.atlasiaErrorLog()`), entry bütçesini
     * şişirmemek için teşhis kodu ayrı parçada durur.
     */
    atlasiaErrorLog?: () => Promise<import("./telemetryDiagnostics").TelemetryDiagnostics>;
  }
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
type DiagnosticHost = { atlasiaErrorLog?: () => Promise<import("./telemetryDiagnostics").TelemetryDiagnostics> };

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
  // "kayıt gidiyor mu, nereye" sorusunu yanıtlayabilir. Uç nokta ve rıza tembel
  // parçada çözülür (entry bütçesi); burada yalnız kanca kurulur.
  const host = (options.target === undefined
    ? (typeof window === "undefined" ? null : window)
    : options.target) as DiagnosticHost | null;
  if (host) host.atlasiaErrorLog = () => import("./telemetryDiagnostics").then((m) => m.showErrorLog());

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
