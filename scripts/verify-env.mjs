/**
 * T1-AUTH & Üretim Güvenlik Kilidi — Cloudflare Pages build kapısı
 *
 * 1) Tüm Cloudflare Pages build'lerinde (CF_PAGES === "1", hem main hem preview):
 *    - VITE_APPCHECK_DEBUG_TOKEN doluysa build'i kırar (yalnız yerel .env.local içindir).
 * 2) Yalnız Cloudflare Pages üretim build'inde (CF_PAGES === "1" && CF_PAGES_BRANCH === "main"):
 *    - Üç zorunlu Firebase değişkeninden biri eksik/boşluksa build'i kırar.
 *    - VITE_FIREBASE_PROJECT_ID değeri geliştirme projesi ("atlasia-dev") ise build'i kırar.
 *    - VITE_PHONE_AUTH_ENABLED === "true" ise build'i kırar (Spark/SMS güvenlik kilidi).
 *
 * Hata mesajları yalnız değişken ADINI ve kural nedenini yazar, gizli değeri asla yazmaz.
 */

const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
];

const DEV_PROJECT_ALIASES = new Set(["atlasia-dev"]);

export function isCloudflarePages(env = process.env) {
  return env.CF_PAGES === "1";
}

export function shouldEnforce(env = process.env) {
  return isCloudflarePages(env) && env.CF_PAGES_BRANCH === "main";
}

function hasNonEmptyValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function missingVars(env = process.env) {
  return REQUIRED.filter((name) => !hasNonEmptyValue(env[name]));
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ name: string, code: string, message: string }[]}
 */
export function policyViolations(env = process.env) {
  const violations = [];

  if (!isCloudflarePages(env)) {
    return violations;
  }

  if (hasNonEmptyValue(env.VITE_APPCHECK_DEBUG_TOKEN)) {
    violations.push({
      name: "VITE_APPCHECK_DEBUG_TOKEN",
      code: "forbidden_debug_token",
      message:
        "Forbidden environment variable in Cloudflare Pages: VITE_APPCHECK_DEBUG_TOKEN (keep debug tokens in local .env.local only)",
    });
  }

  if (shouldEnforce(env)) {
    const projectId = typeof env.VITE_FIREBASE_PROJECT_ID === "string"
      ? env.VITE_FIREBASE_PROJECT_ID.trim().toLowerCase()
      : "";
    if (projectId && DEV_PROJECT_ALIASES.has(projectId)) {
      violations.push({
        name: "VITE_FIREBASE_PROJECT_ID",
        code: "dev_project_in_production",
        message:
          "Invalid production environment variable: VITE_FIREBASE_PROJECT_ID must not target the development Firebase project",
      });
    }

    const phoneAuth = typeof env.VITE_PHONE_AUTH_ENABLED === "string"
      ? env.VITE_PHONE_AUTH_ENABLED.trim().toLowerCase()
      : "";
    if (phoneAuth === "true") {
      violations.push({
        name: "VITE_PHONE_AUTH_ENABLED",
        code: "phone_auth_forbidden_in_production",
        message:
          "Forbidden production environment variable: VITE_PHONE_AUTH_ENABLED must remain disabled in production",
      });
    }
  }

  return violations;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{ exit?: boolean, log?: (msg: string) => void }} options
 * @returns {{ enforced: boolean, missing: string[], violations: { name: string, code: string, message: string }[] }}
 */
export function verify(env = process.env, { exit = true, log = console.error } = {}) {
  const enforced = shouldEnforce(env);
  const missing = enforced ? missingVars(env) : [];
  const violations = policyViolations(env);

  if (missing.length || violations.length) {
    for (const name of missing) {
      log(`Missing required environment variable: ${name}`);
    }
    for (const violation of violations) {
      log(violation.message);
    }
    if (missing.length) {
      log(
        "Production build requires all Firebase variables. Check Cloudflare Pages → Settings → Variables and secrets (Production).",
      );
    }
    if (exit) {
      process.exit(1);
    }
  }

  return { enforced, missing, violations };
}

// CLI olarak çalıştırıldığında
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  verify();
}
