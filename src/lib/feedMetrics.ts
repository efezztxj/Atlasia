import type { FeedPost } from "../types";

/** Seed tabanı ile gerçek kullanıcı beğenilerini tek sözleşmeyle toplar. */
export function totalLikes(post: Pick<FeedPost, "likes" | "likedBy">): number {
  return post.likes + (post.likedBy?.length ?? 0);
}
