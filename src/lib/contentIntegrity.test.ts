import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { FeedPost, FeedReply, Story } from "../types";
import { withoutSeedItems, withoutSeedPosts, withoutSeedStories } from "./contentIntegrity";

function reply(id: string, kind: FeedReply["kind"]): FeedReply {
  return { id, author: "Gezgin", text: id, createdAt: 1, likes: 0, kind };
}

function post(id: string, kind: FeedPost["kind"], replies: FeedReply[] = []): FeedPost {
  return { id, author: "Gezgin", text: id, createdAt: 1, likes: 0, replies, kind };
}

function story(id: string, kind: Story["kind"]): Story {
  return { id, author: "Gezgin", text: id, accent: "leaf", createdAt: 1, kind };
}

describe("TASK-017 seed içerik temizliği", () => {
  it("eski seed kayıtlarını kaldırıp gerçek kullanıcı sırasını korur", () => {
    const first = post("user-1", "user");
    const second = post("user-2", "user");
    const input = [post("seed-1", "seed"), first, post("seed-2", "seed"), second];

    expect(withoutSeedItems(input)).toEqual([first, second]);
    expect(input).toHaveLength(4);
  });

  it("kullanıcı gönderisini korurken içindeki eski seed yanıtlarını da temizler", () => {
    const userReply = reply("user-reply", "user");
    const input = post("user-post", "user", [reply("seed-reply", "seed"), userReply]);

    const [clean] = withoutSeedPosts([post("seed-post", "seed"), input]);

    expect(clean).toEqual({ ...input, replies: [userReply] });
    expect(input.replies).toHaveLength(2);
  });

  it("yerel ve Firestore story yüklemelerinde yalnız kullanıcı içeriğini bırakır", () => {
    const userStory = story("user-story", "user");

    expect(withoutSeedStories([story("seed-story", "seed"), userStory])).toEqual([userStory]);
  });

  it("taze paket içinde demo post veya story fallback'i bırakmaz", () => {
    const feedSource = readFileSync("src/data/feed.ts", "utf8");
    const localSource = readFileSync("src/hooks/useAtlasData.ts", "utf8");
    const cloudSource = readFileSync("src/lib/firestoreData.ts", "utf8");

    expect(feedSource).not.toContain("SEED_POSTS");
    expect(feedSource).not.toContain("SEED_STORIES");
    expect(feedSource).not.toContain('kind: "seed"');
    expect(localSource).toContain("withoutSeedPosts(load(postsKey");
    expect(localSource).toContain("withoutSeedStories(load(storiesKey");
    expect(cloudSource).toContain("withoutSeedPosts(page.items)");
    expect(cloudSource).toContain("withoutSeedStories(page.items)");
  });
});
