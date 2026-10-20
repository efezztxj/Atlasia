import { describe, expect, it } from "vitest";
import { totalLikes } from "./likes";

describe("toplam beğeni sözleşmesi", () => {
  it("seed tabanına benzersiz kullanıcı üyeliklerini ekler", () => {
    expect(totalLikes({ likes: 12, likedBy: ["u1", "u2", "u1"] })).toBe(14);
  });

  it("boş kullanıcı listesinde seed tabanını korur", () => {
    expect(totalLikes({ likes: 5, likedBy: [] })).toBe(5);
  });
});
