/**
 * T1-AUTH — Üretim build kapısı
 * Yalnız Cloudflare Pages üretim build'inde (CF_PAGES === "1" && CF_PAGES_BRANCH === "main")
 * üç zorunlu Firebase değişkeninden biri eksik/boşluksa build'i kırar.
 * Diğer ortamlarda (yerel, CI, preview) hiçbir şey yapmaz.
 * Hata mesajı yalnız değişken ADINI yazar, değeri asla yazmaz.
 */

const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
];

export function shouldEnforce(env = process.env) {
  return env.CF_PAGES === "1" && env.CF_PAGES_BRANCH === "main";
}

export function missingVars(env = process.env) {
  return REQUIRED.filter((name) => {
    const value = env[name];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{ exit?: boolean, log?: (msg: string) => void }} options
 * @returns {{ enforced: boolean, missing: string[] }}
 */
export function verify(env = process.env, { exit = true, log = console.error } = {}) {
  if (!shouldEnforce(env)) {
    return { enforced: false, missing: [] };
  }
  const missing = missingVars(env);
  if (missing.length) {
    for (const name of missing) {
      log(`Missing required environment variable: ${name}`);
    }
    log("Production build requires all Firebase variables. Check Cloudflare Pages → Settings → Variables and secrets (Production).");
    if (exit) {
      process.exit(1);
    }
  }
  return { enforced: true, missing };
}

// CLI olarak çalıştırıldığında
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  verify();
}
