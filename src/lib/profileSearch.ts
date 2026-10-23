/**
 * Atlasia — Profil arama yardımcıları ("Instagram benzeri" arama davranışı)
 *
 * #61 p15/p17'den taşındı ve güncel sözleşmeye uyarlandı. #61 dalında arama,
 * `displayName` üzerinde ilk-harfin büyük/küçük varyantlarını tarayıp yerel
 * sıralamada KELİME İÇİ eşleşmeye de izin veriyordu. Güncel kural farklı:
 * arama anahtarı `displayNameLower` (Türkçe küçük harf) ve yalnız ÖNEK
 * eşleşmesi var. Taşınmayan parçalar (son aramalar listesi, canlı abonelikli
 * arama) FriendsPanel arayüzüne bağlıydı; main'deki tek seferlik arama
 * (FriendsTab → searchUserProfiles) bu çekirdeği kullanır.
 *
 * Kurallar:
 * - Küçük harfe çevirme tek kaynaktan: `toLocaleLowerCase("tr")` (İ→i, I→ı).
 *   Dilsiz `toLowerCase()` "İ"yi "i̇" (i + birleştirici nokta) yapar ve
 *   kuraldaki biçim denetiminden geçemez.
 * - En az 2 harf: tek harfli arama ücretsiz kotada gereksiz okuma üretir.
 * - Adsız/yer tutucu ("Gezgin") profiller sonuçta "kişi" olarak görünmez.
 * - Kendi profilin hiçbir zaman sonuçlarda görünmez.
 */
import type { UserProfile } from "./userProfiles";

export const PROFILE_SEARCH_MIN_CHARS = 2;
export const PROFILE_SEARCH_LIMIT = 20;
/** Adsız kayıtların arama sonucunda görünmesini engelleyen yer tutucu ad. */
export const PLACEHOLDER_DISPLAY_NAME = "Gezgin";

/** Türkçe küçük harfe tek doğru çevirim: İ→i, I→ı, Ş→ş ... */
export function turkishLower(text: string): string {
  return text.toLocaleLowerCase("tr");
}

/** Boşlukları tekile indirger; baştaki/sondaki boşluğu atar. Görünen metin değişmez. */
export function normalizeProfileQuery(input: string): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

export function isSearchableQuery(input: string): boolean {
  return Array.from(normalizeProfileQuery(input)).length >= PROFILE_SEARCH_MIN_CHARS;
}

/** Adı olmayan ya da yer tutucu adla kaydedilmiş profil aramada "kişi" sayılmaz. */
export function isSearchableProfile(profile: { displayName?: string | null }): boolean {
  const name = normalizeProfileQuery(profile.displayName ?? "");
  if (Array.from(name).length < PROFILE_SEARCH_MIN_CHARS) return false;
  return turkishLower(name) !== turkishLower(PLACEHOLDER_DISPLAY_NAME);
}

/**
 * Bir profilin arama anahtarı. Eski belgelerde `displayNameLower` alanı
 * olmayabilir; anahtar o zaman `displayName`den türetilir (güvenli geri
 * dönüş — belge, sahibi bir sonraki girişte alanı kalıcı yazana kadar
 * türetilmiş anahtarla eşleşir).
 */
export function profileSearchKey(profile: { displayName?: string | null; displayNameLower?: string | null }): string {
  if (typeof profile.displayNameLower === "string" && profile.displayNameLower) return profile.displayNameLower;
  return turkishLower(profile.displayName ?? "");
}

/**
 * `displayNameLower` aralık sorgusu için tek önek: sorgunun Türkçe küçük
 * harfli hâli. 2 harften kısa sorgu önek üretmez (sorgu yapılmaz).
 */
export function profileQueryPrefixes(input: string): string[] {
  if (!isSearchableQuery(input)) return [];
  return [turkishLower(normalizeProfileQuery(input))];
}

/**
 * Eski (alanı olmayan) belgeler için `displayName` aralık sorgusu önekleri.
 * Firestore aralığı harfe duyarlıdır; yazıldığı gibi hâli ve Türkçe baş-harf
 * büyük hâli denenir. Gelen her aday yine de `profileSearchKey` ile önek
 * doğrulamasından geçer; bu liste yalnız aday kümesini sınırlar.
 */
export function legacyDisplayNamePrefixes(input: string): string[] {
  if (!isSearchableQuery(input)) return [];
  const normalized = normalizeProfileQuery(input);
  const chars = Array.from(normalized);
  const titleCased = (chars[0] ?? "").toLocaleUpperCase("tr") + turkishLower(chars.slice(1).join(""));
  return [...new Set([normalized, titleCased].filter(Boolean))];
}

export interface RankOptions {
  excludeUid?: string;
  limit?: number;
}

/**
 * Adayları arama sonucuna çevirir: yalnız ÖNEK eşleşmesi (kelime içi arama
 * yok), adsızlar ve kişinin kendisi elenir, ada göre (tr) sıralanır.
 * Eşleşme yoksa boş dizi döner (yanlış "sonuç var" izlenimi verilmez).
 */
export function rankProfiles(profiles: UserProfile[], query: string, options: RankOptions = {}): UserProfile[] {
  const needle = profileQueryPrefixes(query)[0];
  if (!needle) return [];
  const excludeUid = options.excludeUid ?? "";
  const limit = options.limit ?? PROFILE_SEARCH_LIMIT;
  const seen = new Set<string>();
  const matches: { profile: UserProfile; key: string }[] = [];

  for (const profile of profiles) {
    if (!profile || typeof profile.uid !== "string" || !profile.uid) continue;
    if (profile.uid === excludeUid || seen.has(profile.uid)) continue;
    if (!isSearchableProfile(profile)) continue;
    const key = profileSearchKey(profile);
    if (!key.startsWith(needle)) continue;
    seen.add(profile.uid);
    matches.push({ profile, key });
  }

  matches.sort((a, b) => {
    const byName = a.key.localeCompare(b.key, "tr");
    if (byName !== 0) return byName;
    return a.profile.uid.localeCompare(b.profile.uid);
  });

  return matches.slice(0, limit).map((match) => match.profile);
}
