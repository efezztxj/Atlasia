import type { FeedPost } from "../types";

/** Seed tabanı + benzersiz gerçek kullanıcı üyelikleri. */
export function totalLikes(post: Pick<FeedPost, "likes" | "likedBy">): number {
  const seedLikes = Number.isFinite(post.likes) ? Math.max(0, Math.floor(post.likes)) : 0;
  return seedLikes + new Set(post.likedBy ?? []).size;
}

/**
 * Tek kullanıcının beğeni üyeliğini değiştirir; `likedBy` **benzersiz** kalır.
 *
 * Sayı alanı (`likes`) burada değiştirilmez: o alan içerikle gelen **taban**
 * sayıdır, gerçek kullanıcı üyelikleri `likedBy`'dan gelir ve toplam
 * `totalLikes` ile türetilir. Böylece sayaç iki kez sayılmaz.
 */
export function toggleLikedBy(likedBy: readonly string[] | undefined, uid: string): string[] {
  const clean = uid.trim();
  const unique = Array.from(new Set((likedBy ?? []).filter((item) => typeof item === "string" && item.trim() !== "")));
  if (!clean) return unique;
  return unique.includes(clean) ? unique.filter((item) => item !== clean) : [...unique, clean];
}
