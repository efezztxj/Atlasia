import { describe, expect, it } from "vitest";
import type { Story } from "../types";
import {
  activeStories,
  applyPostLikedBy,
  FIRESTORE_LIMITS,
  FIRESTORE_QUERY_LIMITS,
  mergeRecordsById,
  nextLikedBy,
  PLACE_VIEWPORT_MIN_ZOOM,
  preserveDisplacedPageItems,
  STORY_TTL_MS,
  togglePostLike,
  viewportQueryWindows,
} from "./firestoreData";
import type { FeedPost } from "../types";

function feedPost(id: string, likedBy: string[] = []): FeedPost {
  return { id, author: "Gezgin", text: id, createdAt: 1, likes: 0, likedBy, replies: [], kind: "user" };
}

function story(id: string, createdAt: number): Story {
  return {
    id,
    author: "Gezgin",
    text: id,
    accent: "leaf",
    createdAt,
    kind: "user",
  };
}

describe("Firestore veri bütünlüğü yardımcıları", () => {
  it("yalnız son 24 saatteki story'leri aynı sırayla döndürür", () => {
    const now = 2_000_000_000_000;
    const stories = [
      story("new", now),
      story("edge", now - STORY_TTL_MS),
      story("expired", now - STORY_TTL_MS - 1),
      story("future", now + 1),
    ];

    expect(activeStories(stories, now).map((item) => item.id)).toEqual(["new", "edge"]);
    expect(stories).toHaveLength(4);
  });

  it("beğeni üyeliğini yalnız hedef UID için ekler ve kaldırır", () => {
    expect(nextLikedBy(["member-a"], " member-b ")).toEqual(["member-a", "member-b"]);
    expect(nextLikedBy(["member-a", "member-b"], "member-a")).toEqual(["member-b"]);
    expect(nextLikedBy(undefined, "member-a")).toEqual(["member-a"]);
  });

  it("bozuk veya tekrarlı beğeni verisini reddeder", () => {
    expect(() => nextLikedBy("member-a", "member-b")).toThrowError(
      expect.objectContaining({ code: "post/likes-invalid" }),
    );
    expect(() => nextLikedBy(["member-a", "member-a"], "member-b")).toThrowError(
      expect.objectContaining({ code: "post/likes-invalid" }),
    );
    expect(() => nextLikedBy(["member-a", 42], "member-b")).toThrowError(
      expect.objectContaining({ code: "post/likes-invalid" }),
    );
    expect(() => nextLikedBy([], "  ")).toThrowError(
      expect.objectContaining({ code: "auth/required" }),
    );
  });

  it("beğeni üst sınırında yeni kullanıcıyı reddeder ama mevcut üyeyi kaldırır", () => {
    const full = Array.from(
      { length: FIRESTORE_LIMITS.likesPerPost },
      (_, index) => `member-${index}`,
    );

    expect(() => nextLikedBy(full, "new-member")).toThrowError(
      expect.objectContaining({ code: "post/likes-limit" }),
    );
    expect(nextLikedBy(full, "member-0")).toHaveLength(FIRESTORE_LIMITS.likesPerPost - 1);
  });

  it("sorgu boyutlarını toplam görünürlükten ayrı, küçük sayfalar olarak tanımlar", () => {
    expect(FIRESTORE_QUERY_LIMITS).toEqual({
      placeOverview: 40,
      placeViewportPage: 50,
      ownedPlacesPage: 50,
      postsPage: 50,
      storiesPage: 50,
    });
    expect(FIRESTORE_LIMITS).not.toHaveProperty("places");
    expect(FIRESTORE_LIMITS).not.toHaveProperty("posts");
    expect(FIRESTORE_LIMITS).not.toHaveProperty("stories");
  });

  it("dar viewport'u tek bölgeye, tarih çizgisi geçişini iki bölgeye ayırır", () => {
    expect(viewportQueryWindows({
      zoom: PLACE_VIEWPORT_MIN_ZOOM,
      bounds: { west: 26, south: 37, east: 29, north: 40 },
    })).toEqual([{ west: 26, south: 37, east: 29, north: 40 }]);

    expect(viewportQueryWindows({
      zoom: PLACE_VIEWPORT_MIN_ZOOM + 1,
      bounds: { west: 170, south: -10, east: 190, north: 10 },
    })).toEqual([
      { west: 170, south: -10, east: 180, north: 10 },
      { west: -180, south: -10, east: -170, north: 10 },
    ]);
  });

  it("düşük zoom, aşırı geniş, ters veya sonlu olmayan viewport'u fail-closed reddeder", () => {
    expect(viewportQueryWindows({
      zoom: PLACE_VIEWPORT_MIN_ZOOM - 0.1,
      bounds: { west: 26, south: 37, east: 29, north: 40 },
    })).toBeNull();
    expect(viewportQueryWindows({
      zoom: 8,
      bounds: { west: -80, south: -10, east: 80, north: 10 },
    })).toBeNull();
    expect(viewportQueryWindows({
      zoom: 8,
      bounds: { west: 26, south: 40, east: 29, north: 37 },
    })).toBeNull();
    expect(viewportQueryWindows({
      zoom: 8,
      bounds: { west: Number.NaN, south: 37, east: 29, north: 40 },
    })).toBeNull();
  });

  it("viewport ve sahip sonuçlarını kimliğe göre birleştirip son grubu korur", () => {
    const viewport = [story("shared", 1), story("viewport", 2)];
    const owned = [story("shared", 3), story("owned", 4)];

    expect(mergeRecordsById(viewport, owned)).toEqual([
      story("shared", 3),
      story("viewport", 2),
      story("owned", 4),
    ]);
  });

  it("canlı ilk sayfa kaydığında daha önce yüklenen sınır kaydını korur", () => {
    const previousHead = [story("p-3", 3), story("p-2", 2)];
    const nextHead = [story("p-4", 4), story("p-3", 3)];
    const loadedTail = [story("p-1", 1)];

    expect(preserveDisplacedPageItems(previousHead, nextHead, loadedTail)).toEqual([
      story("p-1", 1),
      story("p-2", 2),
    ]);
    expect(preserveDisplacedPageItems(previousHead, nextHead, [])).toEqual([]);
  });
});

describe("KOD-02 beğeni yardımcıları", () => {
  it("applyPostLikedBy yalnız hedef gönderiyi günceller, diğerlerini aynı referansta tutar", () => {
    const a = feedPost("a", ["x"]);
    const b = feedPost("b");
    const next = applyPostLikedBy([a, b], "b", ["member-a"]);
    expect(next[0]).toBe(a);
    expect(next[1].likedBy).toEqual(["member-a"]);
    expect(next).not.toBe([a, b]);
  });

  it("applyPostLikedBy eşleşme yoksa aynı diziyi döndürür", () => {
    const posts = [feedPost("a")];
    expect(applyPostLikedBy(posts, "missing", ["member-a"])).toBe(posts);
  });

  it("applyPostLikedBy girdi gönderilerini değiştirmez", () => {
    const original = feedPost("a", ["x"]);
    const posts = [original];
    applyPostLikedBy(posts, "a", ["x", "member-a"]);
    expect(original.likedBy).toEqual(["x"]);
    expect(posts[0]).toBe(original);
  });

  it("togglePostLike Firestore hazır değilken reddeder ve sahte sonuç döndürmez", async () => {
    await expect(togglePostLike("post-1", "member-a")).rejects.toThrow();
  });
});
