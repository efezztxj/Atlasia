import type { FeedPost } from "../types";

/**
 * Seed tabanı + benzersiz gerçek kullanıcı üyelikleri.
 *
 * `likes` kimliksiz bir **tabandır** (güncel istemciler hep 0 yazar; eski
 * kayıtlar sayı taşıyabilir). Kimliği bilinen beğeniler yalnız `likedBy`'dan
 * gelir ve her kullanıcı en çok bir kez sayılır; taban ile üyelik aynı kişiyi
 * iki kez sayamaz çünkü taban kişi içermez. Bozuk üyelik kayıtları (boş
 * metin, metin olmayan değer) `toggleLikedBy` ile aynı kural ile elenir —
 * sayım yolu yazma yolundan daha gevşek olamaz.
 */
export function totalLikes(post: Pick<FeedPost, "likes" | "likedBy">): number {
  const seedLikes = Number.isFinite(post.likes) ? Math.max(0, Math.floor(post.likes)) : 0;
  const members = (post.likedBy ?? []).filter((item) => typeof item === "string" && item.trim() !== "");
  return seedLikes + new Set(members).size;
}

/**
 * Tek kullanıcının beğeni üyeliğini değiştirir; `likedBy` **benzersiz** kalır.
 *
 * Sayı alanı (`likes`) burada değiştirilmez: o alan içerikle gelen **taban**
 * sayıdır, gerçek kullanıcı üyelikleri `likedBy`'dan gelir ve toplam
 * `totalLikes` ile türetilir. Böylece sayaç iki kez sayılmaz.
 */
export function toggleLikedBy(likedBy: readonly string[] | undefined, uid: string): string[] {
  const clean = uid.trim();
  const unique = Array.from(new Set((likedBy ?? []).filter((item) => typeof item === "string" && item.trim() !== "")));
  if (!clean) return unique;
  return unique.includes(clean) ? unique.filter((item) => item !== clean) : [...unique, clean];
}

/**
 * F2-1 (sayısız beğeni): oturumda tek `collectionGroup` sorgusundan gelen
 * "beğendiğim gönderiler" kimliklerini akışa uygular.
 *
 * `likedBy` **türetilmiş** kalır: sunucudaki tek doğru kaynak
 * `posts/{id}/likes/{uid}` belgeleridir. Bu yüzden birleştirme yalnız kimlik
 * kümesini değiştirir; sayı hiçbir yerde tutulmaz. Liste dışındaki gönderiler
 * `likedBy`'ı boşaltılmış olarak döner (kullanıcı onları beğenmemiş demektir).
 */
export function mergeMyLikes<T extends { id: string; likedBy?: string[] }>(
  posts: T[],
  myPostIds: readonly string[],
  uid: string,
): T[] {
  const who = uid.trim();
  if (!who) return posts;
  const liked = new Set(myPostIds);
  return posts.map((post) =>
    liked.has(post.id) ? { ...post, likedBy: [who] } : { ...post, likedBy: [] },
  );
}
