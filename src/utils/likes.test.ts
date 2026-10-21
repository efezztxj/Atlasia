import { describe, expect, it } from "vitest";
import { toggleLikedBy, totalLikes } from "./likes";

describe("toplam beğeni sözleşmesi", () => {
  it("seed tabanına benzersiz kullanıcı üyeliklerini ekler", () => {
    expect(totalLikes({ likes: 12, likedBy: ["u1", "u2", "u1"] })).toBe(14);
  });

  it("boş kullanıcı listesinde seed tabanını korur", () => {
    expect(totalLikes({ likes: 5, likedBy: [] })).toBe(5);
  });
});

describe("toggleLikedBy · üyelik tekilleştirme (P16 #2)", () => {
  it("üye değilse ekler, üyeyse çıkarır", () => {
    expect(toggleLikedBy([], "u1")).toEqual(["u1"]);
    expect(toggleLikedBy(["u1"], "u1")).toEqual([]);
    expect(toggleLikedBy(["u2"], "u1")).toEqual(["u2", "u1"]);
  });

  it("bozuk/tekrarlı üyelikleri temizler, sayaç şişmez", () => {
    expect(toggleLikedBy(["u2", "u2", "u2"], "u9")).toEqual(["u2", "u9"]);
    expect(toggleLikedBy(["u2", "u2"], "u2")).toEqual([]);
    expect(toggleLikedBy(undefined, "u1")).toEqual(["u1"]);
  });

  it("boş kimlik yeni üyelik üretmez", () => {
    expect(toggleLikedBy(["u1"], "   ")).toEqual(["u1"]);
  });

  it("toplam sayaç yalnız bir artar (çift sayım yok)", () => {
    const before = { likes: 5, likedBy: ["u2"] };
    const after = { ...before, likedBy: toggleLikedBy(before.likedBy, "u1") };
    expect(totalLikes(after) - totalLikes(before)).toBe(1);
  });
});
