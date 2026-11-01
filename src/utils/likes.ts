import type { FeedPost } from "../types";

/**
 * Seed tabanı + benzersiz gerçek kullanıcı üyelikleri.
 *
 * `likes` kimliksiz bir **tabandır** (güncel istemciler hep 0 yazar; eski
 * kayıtlar sayı taşıyabilir). Kimliği bilinen beğeniler yalnız `likedBy`'dan
 * gelir ve her kullanıcı en çok bir kez sayılır; taban ile üyelik aynı kişiyi
 * iki kez sayamaz çünkü taban kişi içermez. Bozuk üyelik kayıtları (boş
 * metin, metin olmayan değer) `toggleLikedBy` ile aynı kural ile elenir —
 * sayım yolu yazma yolundan daha gevşek olamaz.
 */
export function totalLikes(post: Pick<FeedPost, "likes" | "likedBy" | "likeCount">): number {
  // F2-1: sayaç varsa tek doğru kaynak odur (alt koleksiyon + batch ±1).
  if (typeof post.likeCount === "number" && Number.isFinite(post.likeCount)) {
    return Math.max(0, Math.floor(post.likeCount));
  }
  const seedLikes = Number.isFinite(post.likes) ? Math.max(0, Math.floor(post.likes)) : 0;
  const members = (post.likedBy ?? []).filter((item) => typeof item === "string" && item.trim() !== "");
  return seedLikes + new Set(members).size;
}

/**
 * Tek kullanıcının beğeni üyeliğini değiştirir; `likedBy` **benzersiz** kalır.
 *
 * Sayı alanı (`likes`) burada değiştirilmez: o alan içerikle gelen **taban**
 * sayıdır, gerçek kullanıcı üyelikleri `likedBy`'dan gelir ve toplam
 * `totalLikes` ile türetilir. Böylece sayaç iki kez sayılmaz.
 */
/**
 * F2-1: sayaç ve üyelik ayrı yerlerde tutulur. `liked` = "benim belgem var mı".
 * Dönen nesne yerel görünümü sunucudaki batch sonucuyla aynı yere getirir.
 */
export function likedByWith(
  likedBy: readonly string[] | undefined,
  uid: string,
  liked: boolean,
): string[] {
  const clean = uid.trim();
  const base = Array.from(
    new Set((likedBy ?? []).filter((item) => typeof item === "string" && item.trim() !== "" && item !== clean)),
  );
  if (!clean) return base;
  return liked ? [...base, clean] : base;
}

export function toggleLikedBy(likedBy: readonly string[] | undefined, uid: string): string[] {
  const clean = uid.trim();
  const unique = Array.from(new Set((likedBy ?? []).filter((item) => typeof item === "string" && item.trim() !== "")));
  if (!clean) return unique;
  return unique.includes(clean) ? unique.filter((item) => item !== clean) : [...unique, clean];
}
