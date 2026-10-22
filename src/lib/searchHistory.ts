/**
 * Son aramalar (Instagram tarzı) — kişi başına, cihazda.
 *
 * Neden cihazda: arama geçmişi kişisel veridir; Firestore'a yazmak kota,
 * gizlilik ve kural yüzeyi ekler. Hesap değişiminde karışmaması için anahtar
 * uid içerir (koleksiyon izolasyonuyla aynı ilke).
 */
import { storageGet, storageRemove, storageSet } from "../utils/storage";

export const RECENT_SEARCHES_LIMIT = 5;

export function recentSearchesKey(uid: string): string {
  return `atlasia.recentSearches.${uid}`;
}

export function readRecentSearches(uid: string): string[] {
  const clean = uid.trim();
  if (!clean) return [];
  try {
    const parsed: unknown = JSON.parse(storageGet(recentSearchesKey(clean)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .slice(0, RECENT_SEARCHES_LIMIT);
  } catch {
    return [];
  }
}

/** Aramayı başa alır; büyük/küçük harf ve Türkçe İ/ı farkı tekilleştirilir. */
export function pushRecentSearch(uid: string, term: string): string[] {
  const clean = uid.trim();
  const value = term.trim();
  if (!clean || value.length < 2) return readRecentSearches(clean);
  const key = value.toLocaleLowerCase("tr");
  const next = [value, ...readRecentSearches(clean).filter((item) => item.toLocaleLowerCase("tr") !== key)]
    .slice(0, RECENT_SEARCHES_LIMIT);
  storageSet(recentSearchesKey(clean), JSON.stringify(next));
  return next;
}

export function clearRecentSearches(uid: string): string[] {
  const clean = uid.trim();
  if (clean) storageRemove(recentSearchesKey(clean));
  return [];
}
