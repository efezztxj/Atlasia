/** Paylaşım parametresi adı; fragment'ta (`#r=`) taşınır, eski `?r=` de okunur. */
export const SHARE_LINK_PARAM = "r";

/**
 * Tam paylaşım URL'si: `<origin>/#r=v1.…`
 *
 * Yük fragment'tadır: istek satırına girmez, sunucu/CDN günlüklerine ve
 * `Referer` başlığına düşmez. Yayınlanmış rotanın kalıcı bağlantısı
 * (`?route=`) bundan etkilenmez.
 */
export function buildRouteShareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/#${SHARE_LINK_PARAM}=${token}`;
}

/**
 * Adres çubuğundaki paylaşım simgesini okur: önce fragment (`#r=`), yoksa
 * eski biçim sorgu (`?r=`). İkisi de yoksa ya da adres çözülemiyorsa `null`.
 * Yalnız simgeyi çıkarır; doğrulama `parseRouteShareLink`'indir (shareLink.ts,
 * tembel yüklenir).
 */
export function readShareTokenFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const fromFragment = new URLSearchParams(parsed.hash.replace(/^#/, "")).get(SHARE_LINK_PARAM);
  if (fromFragment) return fromFragment;
  return parsed.searchParams.get(SHARE_LINK_PARAM);
}
