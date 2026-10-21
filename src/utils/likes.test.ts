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

/**
 * #35 denetim maddesi: “bulutta `likes` beğenenleri zaten içeriyorsa sayı iki
 * kat görünür.” Kanıt zinciri (kod + kural):
 * - `firestore.rules` posts/create: `likes == 0 && likedBy.size() == 0` zorunlu.
 * - `validPostInteraction`: güncelleme yalnız `likedBy` alanını, ±1 kendi
 *   kimliğiyle değiştirebilir → `likes` bulutta **ömür boyu 0** kalır.
 * - İstemci bulut yolu (`togglePostLikeInFirestore`): yalnız
 *   `arrayUnion/arrayRemove(likedBy)`; `likes`'a hiç dokunmaz.
 * - Yerel yol (`useAtlasData.addPost/toggleLike`): `likes: 0` ile açar, geçişte
 *   yalnız `likedBy`'yi değiştirir; tohum (seed) gönderiler yüklemede elenir.
 * Sonuç: çift sayım hiçbir yazma yolundan üretilemez. Aşağıdaki iki blok bu
 * sözleşmeyi mod bazında kilitler.
 */
describe("bulut modu şekli · çift sayım yok (#35 denetimi)", () => {
  it("kural `likes`ı 0'da tuttuğu için toplam = benzersiz likedBy", () => {
    // Firestore'dan dönen belge şekli: likes her zaman 0.
    expect(totalLikes({ likes: 0, likedBy: ["u1", "u2"] })).toBe(2);
    expect(totalLikes({ likes: 0, likedBy: [] })).toBe(0);
  });

  it("beğeni geçişi toplamı tam 1 değiştirir (ekleme ve geri alma)", () => {
    const cloud = { likes: 0, likedBy: ["u2", "u3"] };
    const liked = { ...cloud, likedBy: toggleLikedBy(cloud.likedBy, "u1") };
    expect(totalLikes(liked) - totalLikes(cloud)).toBe(1);
    const unliked = { ...liked, likedBy: toggleLikedBy(liked.likedBy, "u1") };
    expect(totalLikes(unliked)).toBe(totalLikes(cloud));
  });
});

describe("yerel mod · taban korunur, çift sayım yok (#35 denetimi)", () => {
  it("eski kayıttaki tekrarlı üyelik toplamı şişirmez; taban aynen sayılır", () => {
    // Yerel depodaki eski şekil: içerik tabanı 5 + tekrarlı tek üye.
    expect(totalLikes({ likes: 5, likedBy: ["c-1", "c-1", "c-1"] })).toBe(6);
  });

  it("ardışık geçişler `likes` tabanını hiç değiştirmez (useAtlasData aynası)", () => {
    let post = { likes: 5, likedBy: ["c-eski"] as string[] };
    const toggle = () => {
      post = { ...post, likedBy: toggleLikedBy(post.likedBy, "c-ben") };
    };
    toggle();
    expect(post.likes).toBe(5);
    expect(totalLikes(post)).toBe(7);
    toggle();
    expect(post.likes).toBe(5);
    expect(totalLikes(post)).toBe(6);
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
