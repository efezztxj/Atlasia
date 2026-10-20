export const DEFAULT_APP_CHECK_SITE_KEY = "6LeGMuwtAAAAACwVaaPrm8KzCa7Sw0nFdl-TMcQr";

export interface AppCheckConfig {
  siteKey: string;
  isTokenAutoRefreshEnabled: true;
}

export function appCheckConfig(siteKey = DEFAULT_APP_CHECK_SITE_KEY): AppCheckConfig {
  const normalizedSiteKey = siteKey.trim();
  return {
    siteKey: normalizedSiteKey || DEFAULT_APP_CHECK_SITE_KEY,
    isTokenAutoRefreshEnabled: true,
  };
}
