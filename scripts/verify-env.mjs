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

import { readFileSync } from "node:fs";

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
 * Ölçüm/hata izleme görünürlüğü uyarıları (build'i **kırmaz**).
 *
 * NEDEN: `VITE_TELEMETRY_ENDPOINT` tanımlı değilse `captureError` sessizce
 * hiçbir şey göndermez (src/lib/telemetry.ts). Yani üretimde kullanıcı çökse de
 * kimsenin haberi olmaz. Ayrıca uç nokta `*.workers.dev` gibi CSP'de izinli
 * olmayan bir host'a bakıyorsa istekler tarayıcıda bloklanır (connect-src).
 * İkisi de deploy'u durdurmaz — nedeni 2026-10-25 kesintisiyle aynı: yalnız
 * Cloudflare panelinde görülebilen bir değer yüzünden teşhis edilemeyen kilit
 * oluşturmuyoruz. Uyarı, CI log'unda ve deploy çıktısında görünür.
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {string} headersSource public/_headers içeriği
 * @returns {{ name: string, code: string, message: string }[]}
 */
export function measurementWarnings(env = process.env, headersSource = "") {
  if (!shouldEnforce(env)) return [];

  const warnings = [];
  const raw = typeof env.VITE_TELEMETRY_ENDPOINT === "string" ? env.VITE_TELEMETRY_ENDPOINT.trim() : "";

  if (!raw) {
    warnings.push({
      name: "VITE_TELEMETRY_ENDPOINT",
      code: "telemetry_endpoint_missing",
      message:
        "Error monitoring is OFF: VITE_TELEMETRY_ENDPOINT is not set, so crash and unhandled-rejection records stay in the browser " +
        "(check the live state with window.atlasiaErrorLog()). See docs/olcum-ve-hata-izleme.md",
    });
    return warnings;
  }

  // Göreli adres (ör. /api/telemetry) aynı origin demektir: 'self' yeterli.
  if (raw.startsWith("/")) return warnings;

  try {
    new URL(raw);
  } catch {
    warnings.push({
      name: "VITE_TELEMETRY_ENDPOINT",
      code: "telemetry_endpoint_invalid",
      message: "VITE_TELEMETRY_ENDPOINT is not a valid absolute URL; the browser will not be able to send records",
    });
    return warnings;
  }

  const host = new URL(raw).host;
  const cspLine = headersSource
    .split("\n")
    .find((line) => line.trim().toLowerCase().startsWith("content-security-policy:")) ?? "";
  const connectSrc = /connect-src([^;]*)/i.exec(cspLine)?.[1] ?? "";
  // `connect-src 'self'` dağıtımın kendi host'unu kapsar; Cloudflare deploy
  // adresini CF_PAGES_URL verir.
  let selfHost = null;
  if (env.CF_PAGES_URL) {
    try {
      selfHost = new URL(env.CF_PAGES_URL).host;
    } catch {
      selfHost = null;
    }
  }
  const allowedBySelf = connectSrc.includes("'self'") && selfHost !== null && host === selfHost;
  if (connectSrc && !connectSrc.includes(host) && !allowedBySelf) {
    warnings.push({
      name: "VITE_TELEMETRY_ENDPOINT",
      code: "telemetry_endpoint_blocked_by_csp",
      message:
        `Telemetry endpoint host (${host}) is NOT allowed by Content-Security-Policy connect-src: requests will be blocked in the browser. ` +
        "Either proxy it on the same origin (e.g. /api/telemetry with public/_redirects) or add the host to connect-src in public/_headers",
    });
  }

  return warnings;
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

  // Ölçüm görünürlüğü uyarıları: her zaman loglanır, asla fatal değil.
  let headersSource = "";
  try {
    headersSource = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
  } catch {
    // _headers yoksa CSP kontrolü atlanır (uyarı yine üretilmez, sessiz kalır).
  }
  const warnings = measurementWarnings(env, headersSource);
  for (const warning of warnings) log(`ADVISORY (measurement): ${warning.message}`);

  if (failed && exit) {
    process.exit(1);
  }

  return { enforced, mode, missing, violations, warnings, failed };
}

// CLI olarak çalıştırıldığında
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  verify();
}
