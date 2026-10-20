import type { FeedPost } from "../types";

/** Seed tabanı + benzersiz gerçek kullanıcı üyelikleri. */
export function totalLikes(post: Pick<FeedPost, "likes" | "likedBy">): number {
  const seedLikes = Number.isFinite(post.likes) ? Math.max(0, Math.floor(post.likes)) : 0;
  return seedLikes + new Set(post.likedBy ?? []).size;
}
