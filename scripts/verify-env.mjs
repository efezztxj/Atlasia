/**
 * T1-AUTH & Üretim Güvenlik Kilidi — Cloudflare Pages build kapısı
 *
 * 1) Tüm Cloudflare Pages build'lerinde (CF_PAGES === "1", hem main hem preview):
 *    - VITE_APPCHECK_DEBUG_TOKEN doluysa build'i kırar (yalnız yerel .env.local içindir).
 * 2) Yalnız Cloudflare Pages üretim build'inde (CF_PAGES === "1" && CF_PAGES_BRANCH === "main"):
 *    - Üç zorunlu Firebase değişkeninden biri eksik/boşluksa build'i kırar.
 *    - VITE_PHONE_AUTH_ENABLED === "true" ise ihlal (Spark/SMS güvenlik kilidi).
 *    - VITE_FIREBASE_PROJECT_ID, operatörün `ATLASIA_URETIM_PROJESI` ile BİLDİRDİĞİ
 *      üretim projesinden farklıysa ihlal. Bildirim yoksa "proje beyan edilmemiş"
 *      uyarısı verilir (2026-10-25: depoda tek proje var, `atlasia-dev`; kapının
 *      "ayrı üretim projesi olmalı" varsayımı yanlıştı ve deploy'u kırıyordu).
 *
 * Kural şiddeti iki kademelidir (`policyMode`):
 *    - "eksik değişken" her zaman build'i kırar (uygulama onsuz çalışmaz).
 *    - politika ihlalleri (debug token / dev proje / phone auth) varsayılan "warn"
 *      modunda YALNIZ uyarır ve build devam eder; Cloudflare'de
 *      `ATLASIA_PROD_ENV_POLICY=enforce` tanımlanınca build'i kırar.
 *      Gerekçe: değerler yalnız Cloudflare panelinde görülebildiği için sert çıkış
 *      teşhis edilemeyen bir dağıtım kilidine dönüşüyordu (2026-10-25 kesintisi).
 *
 * Hata mesajları yalnız değişken ADINI ve kural nedenini yazar, gizli değeri asla yazmaz.
 */

const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
];

/** Operatörün "üretim budur" beyanı. İstemciye gitmez (VITE_ öneki yok). */
export const PRODUCTION_PROJECT_VAR = "ATLASIA_URETIM_PROJESI";

export function declaredProductionProject(env = process.env) {
  const raw = env[PRODUCTION_PROJECT_VAR];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function isCloudflarePages(env = process.env) {
  return env.CF_PAGES === "1";
}

export function shouldEnforce(env = process.env) {
  return isCloudflarePages(env) && env.CF_PAGES_BRANCH === "main";
}

/** Politika ihlallerinin build'i kırıp kırmayacağı. Varsayılan: yalnız uyar. */
export const POLICY_MODES = ["warn", "enforce"];

export function policyMode(env = process.env) {
  const raw = typeof env.ATLASIA_PROD_ENV_POLICY === "string"
    ? env.ATLASIA_PROD_ENV_POLICY.trim().toLowerCase()
    : "";
  return POLICY_MODES.includes(raw) ? raw : "warn";
}

/** Eksik zorunlu değişken her modda ölümcül; politika ihlali yalnız "enforce" modunda. */
export function shouldFail({ missing = [], violations = [], mode = "warn" } = {}) {
  if (missing.length) return true;
  return mode === "enforce" && violations.length > 0;
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
      ? env.VITE_FIREBASE_PROJECT_ID.trim()
      : "";
    const declared = declaredProductionProject(env);
    if (projectId && declared && projectId !== declared) {
      violations.push({
        name: "VITE_FIREBASE_PROJECT_ID",
        code: "production_project_mismatch",
        // Değer yazılmaz: teşhis için canlı paketi okuyan `dogrula:canli` var.
        message:
          `Production project mismatch: VITE_FIREBASE_PROJECT_ID does not match ${PRODUCTION_PROJECT_VAR}`,
      });
    } else if (projectId && !declared) {
      violations.push({
        name: PRODUCTION_PROJECT_VAR,
        code: "production_project_undeclared",
        message:
          `Production Firebase project is not declared: set ${PRODUCTION_PROJECT_VAR} to the project ` +
          `production must use (check the live value with npm run dogrula:canli)`,
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
 * @returns {{ enforced: boolean, mode: string, missing: string[], violations: { name: string, code: string, message: string }[], failed: boolean }}
 */
export function verify(env = process.env, { exit = true, log = console.error } = {}) {
  const enforced = shouldEnforce(env);
  const mode = policyMode(env);
  const missing = enforced ? missingVars(env) : [];
  const violations = policyViolations(env);
  const failed = shouldFail({ missing, violations, mode });

  if (missing.length || violations.length) {
    for (const name of missing) {
      log(`Missing required environment variable: ${name}`);
    }
    // Uyarı modunda ihlal deploy'u durdurmaz; adı yine de logda görünür ki
    // Cloudflare panelindeki yanlış değer teşhis edilebilsin.
    for (const violation of violations) {
      log(mode === "enforce" ? violation.message : `ADVISORY (deploy continues): ${violation.message}`);
    }
    if (missing.length) {
      log(
        "Production build requires all Firebase variables. Check Cloudflare Pages \u2192 Settings \u2192 Variables and secrets (Production).",
      );
    }
    if (!failed && violations.length) {
      const names = violations.map((violation) => violation.name).join(", ");
      log(
        `${violations.length} environment policy advisory item(s) for Cloudflare Pages: ${names}. ` +
          "Set ATLASIA_PROD_ENV_POLICY=enforce to make these fatal.",
      );
    }
  }

  if (failed && exit) {
    process.exit(1);
  }

  return { enforced, mode, missing, violations, failed };
}

// CLI olarak çalıştırıldığında
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  verify();
}
