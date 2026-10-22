/**
 * Atlasia — Profil arama yardımcıları ("Instagram benzeri" arama davranışı)
 *
 * Neden ayrı modül: arama davranışının tamamı saf fonksiyonlarda tutulur; böylece
 * Firestore'a bağlanmadan test edilebilir. Bileşen yalnız bu fonksiyonları çağırır.
 *
 * Kurallar:
 * - Arama yalnız giriş yapmış üyeler için anlamlıdır (üyelik kapısı FriendsPanel'de).
 * - Firestore aralık sorgusu harfe duyarlıdır; bu yüzden ilk harfin yazıldığı,
 *   büyük ve küçük hâlleri ayrı ayrı denenir, sonuçlar tek listede birleştirilir.
 * - Sıralama: adı aranan metinle BAŞLAYANLAR önce, sonra içinde geçenler.
 * - Kendi profilin hiçbir zaman sonuçlarda görünmez.
 */
import type { UserProfile } from "./userProfiles";

export const PROFILE_SEARCH_MIN_CHARS = 2;
export const PROFILE_SEARCH_DEBOUNCE_MS = 250;
export const PROFILE_SEARCH_LIMIT = 20;
export const RECENT_SEARCH_LIMIT = 5;
/** Adsız/anonim kayıtların arama sonucunda görünmesini engelleyen yer tutucu ad. */
export const PLACEHOLDER_DISPLAY_NAME = "Gezgin";

/** Adı olmayan ya da yer tutucu adla kaydedilmiş profil aramada "kişi" sayılmaz. */
export function isSearchableProfile(profile: { displayName?: string | null }): boolean {
  const name = normalizeProfileQuery(profile.displayName ?? "");
  if (name.length < 2) return false;
  return name.toLocaleLowerCase("tr") !== PLACEHOLDER_DISPLAY_NAME.toLocaleLowerCase("tr");
}

const STORAGE_PREFIX = "atlasia:profil-arama:";

/** Boşlukları tekile indirger; baştaki/sondaki boşluğu atar. Görünen metin değişmez. */
export function normalizeProfileQuery(input: string): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

export function isSearchableQuery(input: string): boolean {
  return Array.from(normalizeProfileQuery(input)).length >= PROFILE_SEARCH_MIN_CHARS;
}

/**
 * Firestore `where("displayName", ">=", prefix)` sorgusu için denenecek önekler.
 * Aynı harfin farklı büyüklük yazımları tekilleştirilir; 2 harften kısa aramada
 * sorgu yapılmaz (ücretsiz kotada gereksiz okuma üretmemek için).
 */
export function profileQueryPrefixes(input: string): string[] {
  if (!isSearchableQuery(input)) return [];
  const first = Array.from(normalizeProfileQuery(input))[0] ?? "";
  if (!first) return [];
  const variants = [first, first.toLocaleUpperCase("tr"), first.toLocaleLowerCase("tr")];
  return [...new Set(variants.filter(Boolean))];
}

/** Avatar yerine gösterilecek baş harfler: "Ada Nur" → "AN", "Ada" → "A". */
export function profileInitials(name: string): string {
  const parts = normalizeProfileQuery(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "?";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return `${first}${last}`.toLocaleUpperCase("tr") || "?";
}

export interface RankOptions {
  excludeUid?: string;
  limit?: number;
}

/**
 * Dizin gecikmeli olabildiği için yerel sıralama her zaman uygulanır.
 * Eşleşme yoksa boş dizi döner (yanlış "sonuç var" izlenimi verilmez).
 */
export function rankProfiles(profiles: UserProfile[], query: string, options: RankOptions = {}): UserProfile[] {
  const needle = normalizeProfileQuery(query).toLocaleLowerCase("tr");
  if (!needle) return [];
  const excludeUid = options.excludeUid ?? "";
  const limit = options.limit ?? PROFILE_SEARCH_LIMIT;
  const seen = new Set<string>();
  const matches: { profile: UserProfile; startsWith: boolean; name: string }[] = [];

  for (const profile of profiles) {
    if (!profile || typeof profile.uid !== "string" || !profile.uid) continue;
    if (profile.uid === excludeUid || seen.has(profile.uid)) continue;
    if (!isSearchableProfile(profile)) continue;
    const name = (profile.displayName ?? "").toLocaleLowerCase("tr");
    const index = name.indexOf(needle);
    if (index < 0) continue;
    seen.add(profile.uid);
    matches.push({ profile, startsWith: index === 0, name });
  }

  matches.sort((a, b) => {
    if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
    const byName = a.name.localeCompare(b.name, "tr");
    if (byName !== 0) return byName;
    return a.profile.uid.localeCompare(b.profile.uid);
  });

  return matches.slice(0, limit).map((match) => match.profile);
}

export interface RecentProfileSearch {
  uid: string;
  displayName: string;
  at: number;
}

/** Son aramalar: aynı kişi tekrar arandığında en başa taşınır, liste kısa tutulur. */
export function pushRecentSearch(
  list: RecentProfileSearch[],
  entry: { uid: string; displayName: string },
  now = Date.now(),
  limit = RECENT_SEARCH_LIMIT,
): RecentProfileSearch[] {
  const uid = (entry.uid ?? "").trim();
  const displayName = normalizeProfileQuery(entry.displayName ?? "");
  if (!uid || !displayName) return list.slice(0, limit);
  const rest = list.filter((item) => item.uid !== uid);
  return [{ uid, displayName, at: now }, ...rest].slice(0, limit);
}

export function recentSearchStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid.trim()}`;
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

function parseRecent(raw: string | null, limit: number): RecentProfileSearch[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentProfileSearch => !!item && typeof item === "object" && typeof (item as RecentProfileSearch).uid === "string" && typeof (item as RecentProfileSearch).displayName === "string")
      .filter((item) => item.uid.trim() && normalizeProfileQuery(item.displayName))
      .map((item) => ({ uid: item.uid.trim(), displayName: normalizeProfileQuery(item.displayName), at: typeof item.at === "number" ? item.at : 0 }))
      .slice(0, limit);
  } catch {
    return [];
  }
}

/** Bozuk/eski kayıt aramayı kilitlemez: okunamazsa boş liste döner. */
export function readRecentSearches(storage: ReadableStorage | null, uid: string, limit = RECENT_SEARCH_LIMIT): RecentProfileSearch[] {
  if (!storage || !uid.trim()) return [];
  try {
    return parseRecent(storage.getItem(recentSearchStorageKey(uid)), limit);
  } catch {
    return [];
  }
}

export function writeRecentSearches(storage: WritableStorage | null, uid: string, list: RecentProfileSearch[]): void {
  if (!storage || !uid.trim()) return;
  try {
    const key = recentSearchStorageKey(uid);
    if (list.length === 0) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(list));
  } catch {
    // Depolama kapalı (özel mod) — arama çalışmaya devam eder, geçmiş tutulmaz.
  }
}

export function clearRecentSearches(storage: WritableStorage | null, uid: string): void {
  if (!storage || !uid.trim()) return;
  try {
    storage.removeItem(recentSearchStorageKey(uid));
  } catch {
    // yoksayılır
  }
}
