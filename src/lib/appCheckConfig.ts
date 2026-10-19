/**
 * Selects the public reCAPTCHA Enterprise site key used by Firebase App Check.
 * The existing Atlasia key remains the safe default for builds that do not set
 * an override; this is a public site key, never a secret or debug token.
 */
export const DEFAULT_APP_CHECK_SITE_KEY =
  "6LeGMuwtAAAAACwVaaPrm8KzCa7Sw0nFdl-TMcQr";

export function resolveAppCheckSiteKey(configuredKey: string | undefined): string {
  const trimmedKey = configuredKey?.trim();
  return trimmedKey || DEFAULT_APP_CHECK_SITE_KEY;
}
