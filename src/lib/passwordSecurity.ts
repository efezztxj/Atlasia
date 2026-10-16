const PWNED_PASSWORDS_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const DEFAULT_TIMEOUT_MS = 5_000;

export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: PasswordStrengthScore;
  label: "Çok zayıf" | "Zayıf" | "Orta" | "İyi" | "Güçlü";
  percent: number;
}

export type PasswordExposure =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "safe" }
  | { status: "exposed"; count: number }
  | { status: "unavailable" };

export type PasswordExposureResult = Exclude<PasswordExposure, { status: "idle" | "checking" }>;

interface PwnedPasswordOptions {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const STRENGTH_LABELS: PasswordStrength["label"][] = [
  "Çok zayıf",
  "Zayıf",
  "Orta",
  "İyi",
  "Güçlü",
];

const PREDICTABLE_PATTERNS = [
  "password",
  "p@ssw0rd",
  "şifre",
  "sifre",
  "atlasia",
  "qwerty",
  "1234",
  "abcd",
];

/**
 * Bu değer yalnızca kullanıcıya tahmini geri bildirim verir. Kimlik doğrulama
 * politikasının veya bir güvenlik garantisinin yerine geçmez.
 */
export function estimatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: STRENGTH_LABELS[0], percent: 0 };

  const normalized = password.normalize("NFKC").toLocaleLowerCase("tr-TR");
  const categoryCount = [
    /\p{Ll}/u.test(password),
    /\p{Lu}/u.test(password),
    /\d/u.test(password),
    /[^\p{L}\d\s]/u.test(password),
    /\s/u.test(password),
  ].filter(Boolean).length;

  let score: PasswordStrengthScore = 0;
  if (password.length >= 8) score = 1;
  if (password.length >= 10 && categoryCount >= 2) score = 2;
  if (password.length >= 12 && categoryCount >= 3) score = 3;
  if ((password.length >= 16 && categoryCount >= 3) || (password.length >= 20 && categoryCount >= 2)) score = 4;

  const hasPredictablePattern = PREDICTABLE_PATTERNS.some((pattern) => normalized.includes(pattern));
  const hasRepeatedPattern = /(.)\1{2,}/u.test(normalized) || /(.{2,6})\1{1,}/u.test(normalized);
  if (hasPredictablePattern || hasRepeatedPattern) score = Math.min(score, 2) as PasswordStrengthScore;

  return { score, label: STRENGTH_LABELS[score], percent: score * 25 };
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** SHA-1 burada yalnızca HIBP k-anonim araması için, cihaz üzerinde kullanılır. */
export async function passwordRangeParts(password: string) {
  if (!globalThis.crypto?.subtle) throw new Error("password-security/web-crypto-unavailable");
  const digest = await globalThis.crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  const hash = hex(digest);
  return { prefix: hash.slice(0, 5), suffix: hash.slice(5) };
}

/**
 * Range yanıtında hedef son eki arar. En az bir geçerli satır yoksa null
 * döndürerek bozuk bir yanıtın yanlışlıkla "safe" sayılmasını engeller.
 */
export function parsePwnedRangeResponse(body: string, targetSuffix: string): number | null {
  const expected = targetSuffix.toUpperCase();
  if (!/^[A-F0-9]{35}$/.test(expected)) return null;

  let validRows = 0;
  let matchedCount = 0;
  for (const rawLine of body.split(/\r?\n/)) {
    const match = rawLine.trim().match(/^([A-F0-9]{35}):(\d+)$/i);
    if (!match) continue;
    validRows += 1;
    if (match[1].toUpperCase() === expected) matchedCount = Math.max(matchedCount, Number(match[2]));
  }

  return validRows ? matchedCount : null;
}

/**
 * Pwned Passwords range API'yi k-anonim biçimde sorgular. Ağa ham parola ya
 * da tam özet değil, yalnızca SHA-1 özetinin ilk beş karakteri gider.
 */
export async function checkPwnedPassword(
  password: string,
  { fetcher = globalThis.fetch, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: PwnedPasswordOptions = {},
): Promise<PasswordExposureResult> {
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", relayAbort, { once: true });

  try {
    if (!password || typeof fetcher !== "function") return { status: "unavailable" };
    if (signal?.aborted) controller.abort();

    const { prefix, suffix } = await passwordRangeParts(password);
    const response = await fetcher(`${PWNED_PASSWORDS_RANGE_URL}${prefix}`, {
      method: "GET",
      headers: {
        Accept: "text/plain",
        "Add-Padding": "true",
      },
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      mode: "cors",
      signal: controller.signal,
    });
    if (!response.ok) return { status: "unavailable" };

    const count = parsePwnedRangeResponse(await response.text(), suffix);
    if (count === null) return { status: "unavailable" };
    return count > 0 ? { status: "exposed", count } : { status: "safe" };
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", relayAbort);
  }
}
