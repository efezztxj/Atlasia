/**
 * Hata izleme teşhisi (destek penceresi).
 *
 * NEDEN AYRI MODÜL: bu kod tanıtımın **ilk grafiğine** girmemeli (entry bütçesi
 * 17 kB'ın altında ve `AGENTS.md` "eşiği büyütmek yerine kodu dışarı al"
 * diyor). `window.atlasiaErrorLog()` çağrıldığında tembel yüklenir, yani
 * normal kullanıcı hiçbir bayt ödemez.
 */
import { hasCookieConsent, readCookieConsent } from "./cookieConsent";
import { getTelemetry, type Telemetry } from "./telemetry";

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
 * tek kanıt bu pencere olur, tıpkı Clarity için `window.atlasiaClarityStatus()`
 * gibi.
 */
export function telemetryDiagnostics(
  telemetry: Telemetry,
  endpoint: string | null,
  consent: boolean,
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

/**
 * `window.atlasiaErrorLog()` için ince sarmalayıcı: pencereyi kuran taraf yalnız
 * bunu çağırır (entry'de en az bayt), uç nokta ve rıza burada çözülür.
 */
export function showErrorLog(): TelemetryDiagnostics {
  const endpoint = (import.meta.env?.VITE_TELEMETRY_ENDPOINT as string | undefined) ?? null;
  // Rıza kuralı bootstrap'taki `analyticsConsentGranted` ile aynı kaynaktan
  // gelir; bootstrap'ı import etmek döngüsel bağımlılık yaratırdı.
  const consent = hasCookieConsent(readCookieConsent(), "analytics");
  return telemetryDiagnostics(getTelemetry(), endpoint, consent);
}
