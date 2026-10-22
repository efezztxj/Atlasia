// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedPost, FeedReply, Place, Story } from "../types";
import { totalLikes } from "../utils/likes";

const h = vi.hoisted(() => ({
  compressCalls: [] as Array<{ file: File; maxSize: number; quality: number }>,
}));

vi.mock("../utils/image", () => ({
  compressImage: async (file: File, maxSize: number, quality: number) => {
    h.compressCalls.push({ file, maxSize, quality });
    return { dataUrl: "data:image/jpeg;base64,ATLASIA" };
  },
}));

const DAY = 24 * 60 * 60 * 1000;
const key = (kind: "places" | "posts" | "stories", uid: string) => `atlasia.${kind}.v2.${uid}`;

const place = (id: string): Place => ({
  id,
  title: `Yer ${id}`,
  region: "İzmir",
  category: "history",
  lng: 27.14,
  lat: 38.42,
  note: "ğşıİ notu",
  author: "efe",
  authorUid: "u1",
  kind: "user",
  createdAt: 1,
});

const reply = (id: string, kind: FeedReply["kind"] = "user"): FeedReply => ({
  id,
  author: "efe",
  authorUid: "u1",
  text: `Yanıt ${id}`,
  createdAt: 2,
  likes: 0,
  kind,
});

const post = (id: string, kind: FeedPost["kind"] = "user"): FeedPost => ({
  id,
  author: "efe",
  authorUid: "u1",
  text: `Gönderi ${id}`,
  createdAt: 3,
  likes: 5,
  likedBy: [],
  replies: [],
  kind,
});

const story = (id: string, createdAt: number, kind: Story["kind"] = "user"): Story => ({
  id,
  author: "efe",
  authorUid: "u1",
  text: `Story ${id}`,
  accent: "sun",
  createdAt,
  kind,
});

function seed(storageKey: string, value: unknown): void {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function stored<T>(storageKey: string): T {
  return JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as T;
}

async function renderData(uid: string) {
  const { useAtlasData } = await import("./useAtlasData");
  return renderHook(() => useAtlasData(uid));
}

beforeEach(() => {
  vi.resetModules();
  h.compressCalls.length = 0;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("useAtlasData", () => {
  it("uid'ye özel kayıtları yükler; seed ve süresi geçmiş story'leri eleyip temiz hâli yazar", async () => {
    const now = Date.now();
    seed(key("places", "u1"), [place("p1")]);
    seed(key("places", "u2"), [place("baskasi")]);
    seed(key("posts", "u1"), [
      { ...post("seed-post", "seed"), replies: [reply("r-seed", "seed")] },
      { ...post("user-post"), replies: [reply("r-seed", "seed"), reply("r-user")] },
    ]);
    seed(key("stories", "u1"), [
      story("seed-story", now, "seed"),
      story("eski", now - DAY - 1),
      story("taze", now - 60_000),
    ]);

    const { result } = await renderData("u1");

    expect(result.current.places.map((item) => item.id)).toEqual(["p1"]);
    expect(result.current.posts.map((item) => item.id)).toEqual(["user-post"]);
    expect(result.current.posts[0].replies.map((item) => item.id)).toEqual(["r-user"]);
    expect(result.current.stories.map((item) => item.id)).toEqual(["taze"]);
    expect(stored<FeedPost[]>(key("posts", "u1")).map((item) => item.id)).toEqual(["user-post"]);
    expect(stored<Story[]>(key("stories", "u1")).map((item) => item.id)).toEqual(["taze"]);
    expect(result.current.clientId).toMatch(/^c-/);
    expect(window.localStorage.getItem("atlasia.clientId")).toBe(result.current.clientId);
  });

  it("bozuk JSON kayıtlarında boş listeye düşer ve anahtarı onarır", async () => {
    window.localStorage.setItem(key("places", "u1"), "{bozuk");

    const { result } = await renderData("u1");

    expect(result.current.places).toEqual([]);
    expect(stored<Place[]>(key("places", "u1"))).toEqual([]);
  });

  it("yer ekleme/silme kimlik ve sahipliği üretir, değişimi kalıcılaştırır", async () => {
    const { result } = await renderData("u1");
    const input = { ...place("taslak"), id: undefined, kind: undefined, createdAt: undefined };
    delete input.id;
    delete input.kind;
    delete input.createdAt;

    let created: Place | undefined;
    await act(async () => {
      created = await result.current.addPlace(input);
    });

    expect(created?.id).toMatch(/^u-/);
    expect(created).toMatchObject({ authorUid: "u1", kind: "user", title: "Yer taslak" });
    expect(created?.createdAt).toBeGreaterThan(0);
    expect(result.current.places.map((item) => item.id)).toEqual([created?.id]);
    expect(stored<Place[]>(key("places", "u1")).map((item) => item.id)).toEqual([created?.id]);

    await act(async () => {
      await result.current.removePlace(created!.id);
    });
    expect(result.current.places).toEqual([]);
    expect(stored<Place[]>(key("places", "u1"))).toEqual([]);
  });

  it("gönderi, yanıt ve beğeni akışı clientId ile yerelde tutulur", async () => {
    window.localStorage.setItem("atlasia.clientId", "c-test");
    const { result } = await renderData("u1");

    await act(async () => {
      await result.current.addPost({
        author: "İrem",
        text: "Şelale bugün çok sakin",
        placeLabel: "Şelale",
        lng: 27.1,
        lat: 38.4,
        photo: "data:image/jpeg;base64,AA",
      });
    });

    const createdPost = result.current.posts[0];
    expect(createdPost).toMatchObject({
      author: "İrem",
      authorUid: "u1",
      text: "Şelale bugün çok sakin",
      likes: 0,
      likedBy: [],
      replies: [],
      kind: "user",
      placeLabel: "Şelale",
      lng: 27.1,
      lat: 38.4,
    });
    expect(createdPost.id).toMatch(/^fp-/);

    await act(async () => {
      await result.current.addReply(createdPost.id, "Bora", "güzel");
    });
    expect(result.current.posts[0].replies).toHaveLength(1);
    expect(result.current.posts[0].replies[0]).toMatchObject({
      author: "Bora",
      authorUid: "u1",
      text: "güzel",
      likes: 0,
      kind: "user",
    });
    await expect(result.current.loadPostReplies(createdPost.id)).resolves.toHaveLength(1);
    await expect(result.current.loadPostReplies("yok")).resolves.toEqual([]);

    await act(async () => {
      await result.current.toggleLike(createdPost.id);
    });
    expect(result.current.posts[0].likedBy).toEqual(["c-test"]);
    // P16 #2: sayaç UI'da `totalLikes` ile türetilir (taban `likes` + likedBy).
    // Bu yüzden `likes` burada artmaz; artırmak aynı beğeniyi iki kez sayardı.
    expect(result.current.posts[0].likes).toBe(0);
    expect(totalLikes(result.current.posts[0])).toBe(1);

    await act(async () => {
      await result.current.toggleLike(createdPost.id);
    });
    expect(result.current.posts[0].likedBy).toEqual([]);
    expect(result.current.posts[0].likes).toBe(0);
    expect(totalLikes(result.current.posts[0])).toBe(0);

    await act(async () => {
      await result.current.removePost(createdPost.id);
    });
    expect(result.current.posts).toEqual([]);
    expect(stored<FeedPost[]>(key("posts", "u1"))).toEqual([]);
  });

  it("P16 #2: beğeni sayacı likedBy ile tutarlı kalır (seed taban + benzersiz üyelik, çift sayım yok)", async () => {
    // Taban 5 beğeni taşıyan, bozuk/tekrarlı likedBy içeren bir gönderi.
    seed(key("posts", "u1"), [
      { ...post("p-eski"), likes: 5, likedBy: ["c-eski", "c-eski"] },
    ]);
    const { result } = await renderData("u1");

    expect(totalLikes(result.current.posts[0])).toBe(6); // 5 taban + 1 benzersiz üye

    await act(async () => {
      await result.current.toggleLike("p-eski");
    });
    const afterFirst = result.current.posts[0];
    expect(afterFirst.likes).toBe(5); // taban değişmez
    expect(afterFirst.likedBy).toEqual(["c-eski", result.current.clientId]); // tekilleştirildi
    expect(totalLikes(afterFirst)).toBe(7);

    await act(async () => {
      await result.current.toggleLike("p-eski");
    });
    const afterSecond = result.current.posts[0];
    expect(afterSecond.likedBy).toEqual(["c-eski"]);
    expect(totalLikes(afterSecond)).toBe(6);
    expect(stored<FeedPost[]>(key("posts", "u1"))[0].likes).toBe(5);
  });

  it("story ekleme varsayılanlarıyla çalışır, silme kalıcıdır", async () => {
    const { result } = await renderData("u1");

    await act(async () => {
      await result.current.addStory({ text: "Gün batımı İğneada" });
    });

    const created = result.current.stories[0];
    expect(created).toMatchObject({
      author: "Gezgin",
      authorUid: "u1",
      text: "Gün batımı İğneada",
      accent: "leaf",
      kind: "user",
    });
    expect(created.id).toMatch(/^st-/);

    await act(async () => {
      await result.current.removeStory(created.id);
    });
    expect(result.current.stories).toEqual([]);
    expect(stored<Story[]>(key("stories", "u1"))).toEqual([]);
  });

  it("uploadPhoto resmi 860px/0.7 kaliteyle sıkıştırıp data URL döndürür", async () => {
    const { result } = await renderData("u1");
    const file = new File(["gorsel"], "şelale.jpg", { type: "image/jpeg" });

    await expect(result.current.uploadPhoto(file, "place")).resolves.toBe(
      "data:image/jpeg;base64,ATLASIA",
    );
    expect(h.compressCalls).toEqual([{ file, maxSize: 860, quality: 0.7 }]);
  });
});
