/**
 * App Check debug token bağlantısı — yalnız geliştirme/CI içindir.
 *
 * Firebase konsolunda kayıtlı bir debug token, App Check doğrulamasını atlatır;
 * bu yüzden değer yalnız `.env.local` içinde tutulur ve üretim derlemesine girmez.
 * SDK, `initializeAppCheck` çağrısından önce global'e yazılan
 * `FIREBASE_APPCHECK_DEBUG_TOKEN` alanını okur.
 */
export type DebugTokenTarget = { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean };

/** Kayıtlı debug token'ını hedefe yazar; boş/eksik değerlerde dokunmaz. */
export function installAppCheckDebugToken(
  token: string | undefined,
  target: DebugTokenTarget = globalThis as DebugTokenTarget,
): boolean {
  const clean = token?.trim();
  if (!clean) return false;
  target.FIREBASE_APPCHECK_DEBUG_TOKEN = clean;
  return true;
}
