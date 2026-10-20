import { describe, expect, it } from "vitest";
import { totalLikes } from "../utils/likes";

describe("gönderi beğeni toplamı", () => {
  it("seed tabanını koruyup likedBy üyeliklerini ekler", () => {
    expect(totalLikes({ likes: 17, likedBy: ["member-a", "member-b"] })).toBe(19);
  });

  it("likedBy tekrarlarını tek kişi sayar", () => {
    expect(totalLikes({ likes: 17, likedBy: ["member-a", "member-a", "member-b"] })).toBe(19);
  });

  it("üyelik listesi yoksa seed tabanını değiştirmez", () => {
    expect(totalLikes({ likes: 7 })).toBe(7);
  });
});
