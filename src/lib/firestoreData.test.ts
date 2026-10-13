import { describe, expect, it } from "vitest";
import type { Story } from "../types";
import {
  activeStories,
  FIRESTORE_LIMITS,
  nextLikedBy,
  STORY_TTL_MS,
} from "./firestoreData";

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
});
