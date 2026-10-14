import { describe, expect, it } from "vitest";
import { totalLikes } from "./feedMetrics";

describe("gönderi beğeni toplamı", () => {
  it("seed tabanını koruyup likedBy üyeliklerini ekler", () => {
    expect(totalLikes({ likes: 17, likedBy: ["member-a", "member-b"] })).toBe(19);
  });

  it("üyelik listesi yoksa seed tabanını değiştirmez", () => {
    expect(totalLikes({ likes: 7 })).toBe(7);
  });
});
