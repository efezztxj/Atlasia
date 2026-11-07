/**
 * Atlasia — Resend e-posta hattı istemci yardımcıları.
 *
 * NEDEN AYRI DOSYA: `lib/auth.ts` Firebase SDK'sını tembel yükler ve bu yüzden
 * birim testinde taklit edilmesi zordur. Hattın **sözleşmesi** (hangi gövde
 * gidiyor, başarısızlıkta ne oluyor) SDK'dan bağımsız burada durur; böylece
 * ağa ve Firebase'e çıkmadan test edilir.
 *
 * GÜVENLİK: `VITE_MAIL_ENDPOINT` yalnız bir URL'dir. Resend API anahtarı ve
 * Firebase servis hesabı Worker secret'ıdır; buraya asla girmez.
 */

/**
 * Ortam değişkenlerinden hat yapılandırmasını çözer. Saf fonksiyon: test
 * enjeksiyonu ve modül yüklenme sırası sorunları burada bitiyor.
 */
export function resolveMailConfig(env: Record<string, unknown> = {}): {
  endpoint: string;
  appOrigin: string;
  enabled: boolean;
} {
  const read = (name: string) => (typeof env[name] === "string" ? (env[name] as string).trim() : "");
  const endpoint = read("VITE_MAIL_ENDPOINT");
  return {
    endpoint,
    appOrigin: read("VITE_APP_ORIGIN") || "https://atlasia.pages.dev/",
    enabled: endpoint.length > 0,
  };
}

const CONFIG = resolveMailConfig(import.meta.env as Record<string, unknown>);

/** Worker uç noktası; boşsa hat kapalıdır ve istemci Firebase gönderimini kullanır. */
export const MAIL_ENDPOINT = CONFIG.endpoint;

/** Bağlantıların döneceği adres (kendi alan adına geçince değişir). */
export const APP_ORIGIN = CONFIG.appOrigin;

export const mailRelayConfigured = CONFIG.enabled;

export type RelayKind = "verification" | "reset";

export interface RelayRequest {
  kind: RelayKind;
  /** Firebase ID token'ı. Alıcı adresi gönderilmez; sunucu token'dan çözer. */
  idToken: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Hat üzerinden e-posta ister.
 * @returns `true` yalnız 2xx yanıtında. Ağ/CORS/HTTP hatası `false`'tur:
 * çağıran Firebase gönderimine düşer, kullanıcı e-postasız kalmaz.
 */
export async function postRelay({ kind, idToken, endpoint = MAIL_ENDPOINT, fetchImpl }: RelayRequest): Promise<boolean> {
  if (!endpoint || !idToken) return false;
  const send = fetchImpl ?? (typeof fetch === "function" ? fetch : null);
  if (!send) return false;
  try {
    const response = await send(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ kind }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
