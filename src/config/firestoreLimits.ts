/**
 * Atlasia — Firestore sorgu limitleri tek kaynak (P9/P17/P18 + T1)
 *
 * Ücretsiz kota için tüm liste sorguları küçük, cursor’lı sayfalarla okunur.
 * Bu dosya tek kaynaktır; kurallar (`firestore.rules` boundedList) ve istemci
 * limitleri burada eşleşmelidir.
 *
 * C2 gerekçe (tek sabit): JOIN_CODE_MIN=6 → 10^6 kombinasyon, 4 haneye göre
 * 100× daha zor brute-force; 5 hatalı denemede 15dk kilit — OWASP 5 deneme
 * eşiği, 15dk kullanıcı dostu ama kaba kuvveti yavaşlatır. Değerler tek
 * yerde tanımlı, rules ve istemci aynı sabiti kullanır.
 */

export const FIRESTORE_LIMITS = {
  likesPerPost: 500,
  postRepliesPage: 100,
} as const;

export const FIRESTORE_QUERY_LIMITS = {
  placeOverview: 40,
  placeViewportPage: 50,
  ownedPlacesPage: 50,
  postsPage: 50,
  storiesPage: 50,
} as const;

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
export const STORY_EXPIRY_REFRESH_MS = 60 * 1000;
export const PLACE_VIEWPORT_MIN_ZOOM = 5;
export const PLACE_VIEWPORT_MAX_LAT_SPAN = 50;
export const PLACE_VIEWPORT_MAX_LNG_SPAN = 100;

export const GROUPS_LIMIT = 20;
export const GROUP_MEMBERS_MAX = 20;
export const MESSAGES_LIMIT = 50;
export const MESSAGE_TEXT_MAX = 1000;

export const JOIN_CODE_MIN = 6;
export const JOIN_CODE_MAX = 8;
export const JOIN_ATTEMPTS_LIMIT = 5;
export const JOIN_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000;
export const JOIN_ATTEMPTS_LOCK_MS = 15 * 60 * 1000;

export const FRIEND_REQUESTS_LIMIT = 50;
export const FRIENDS_LIMIT = 100;
export const USER_PROFILES_LIMIT = 20;

/**
 * Hesap silme / veri indirme sayfa boyutu. Silinen her koleksiyonun rules
 * `boundedList` sınırının EN KÜÇÜĞÜNDEN büyük olamaz: routes 40,
 * users/{uid}/groups 20. Büyük olursa sorgu permission-denied alır ve hesap
 * silme hiç tamamlanmaz (emülatör testi: "hesap silme sorguları kural sınırı içinde").
 */
export const ACCOUNT_DATA_PAGE_SIZE = 20;
