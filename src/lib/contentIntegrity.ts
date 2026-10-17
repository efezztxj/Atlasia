import type { FeedPost, Story } from "../types";

interface LegacySeedContent {
  kind: "seed" | "user";
}

/**
 * Eski demo kayıtları yalnız göç girdisi olarak tanınır; kullanıcıya hiçbir veri
 * yolunda gösterilmez. Fonksiyon girdiyi değiştirmez, böylece depolama ve
 * Firestore sayfalama katmanları aynı dürüstlük kuralını güvenle paylaşır.
 */
export function withoutSeedItems<T extends LegacySeedContent>(items: readonly T[]): T[] {
  return items.filter((item) => item.kind !== "seed");
}

/** Kullanıcı gönderisini korur, eski demo yanıtlarını da görünümden çıkarır. */
export function withoutSeedPosts(posts: readonly FeedPost[]): FeedPost[] {
  return withoutSeedItems(posts).map((post) => {
    const replies = withoutSeedItems(post.replies);
    return replies.length === post.replies.length ? post : { ...post, replies };
  });
}

export function withoutSeedStories(stories: readonly Story[]): Story[] {
  return withoutSeedItems(stories);
}
