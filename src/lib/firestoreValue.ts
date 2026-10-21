/**
 * Firestore'a yazılacak değerler ve Firestore hataları için küçük yardımcılar.
 *
 * Firestore `undefined` alan değerlerini reddeder ("Unsupported field value:
 * undefined"). İstemci tipleri ise isteğe bağlı alanları (ör. `Place.image`,
 * `AtlasRoute.origin`) çoğu zaman `undefined` olarak taşır. Yazmadan önce bu
 * alanlar düz nesne ve dizilerden ayıklanır; `serverTimestamp()` gibi sınıf
 * örnekleri (sentinel'ler, Timestamp) olduğu gibi bırakılır.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** `undefined` alanları ve dizi öğelerini derinlemesine ayıklar; girdiyi değiştirmez. */
export function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map((item) => withoutUndefined(item)) as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) result[key] = withoutUndefined(item);
    }
    return result as T;
  }
  return value;
}

/** Firestore Rules reddi mi? (`permission-denied` kodu) */
export function isPermissionDenied(failure: unknown): boolean {
  return Boolean(
    failure
      && typeof failure === "object"
      && "code" in failure
      && (failure as { code?: unknown }).code === "permission-denied",
  );
}
