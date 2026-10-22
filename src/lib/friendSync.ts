/**
 * Atlasia — arkadaşlık indeksi uzlaştırması
 *
 * Neden gerekli: `friendships` belgesini ve arkadaş indeksini yalnız kabul eden
 * (alıcı) yazabilir. Kural `users/{uid}/friends/*` için `uid == request.auth.uid`
 * ister. Yani isteği gönderen kişinin listesi, karşı taraf kabul ettiğinde
 * kendiliğinden oluşmaz; gönderen kendi indeksini `friend_accepted` bildirimini
 * gördüğünde yazar. Bu modül o uzlaştırmayı yapar ve KANITSIZ yazmaz:
 * `ensureFriendIndex` yalnız gerçek `status: "accepted"` friendships varsa yazar.
 */
import { ensureFriendIndex } from "./friendships";
import type { AppNotification } from "./notifications";
import { fetchUserProfile } from "./userProfiles";

export interface FriendIndexCandidate {
  /** Kabul eden kullanıcının kimliği */
  friendUid: string;
  /** Görünen ad; profilden çözülemezse "Gezgin" */
  friendName: string;
}

/**
 * `friend_accepted` bildirimlerinden indeks adaylarını çıkarır.
 * - Yalnız `friend_accepted` tipi sayılır (istek/kabul karışmasın).
 * - `targetId` kabul edenin kimliğidir; yoksa atlanır.
 * - Kendi kimliği ve tekrarlar ayıklanır.
 */
export function friendIndexCandidates(
  notifications: readonly AppNotification[],
  selfUid: string,
): FriendIndexCandidate[] {
  const me = selfUid.trim();
  if (!me) return [];
  const seen = new Set<string>();
  const out: FriendIndexCandidate[] = [];
  for (const notification of notifications) {
    if (notification.type !== "friend_accepted") continue;
    const friendUid = (notification.targetId ?? "").trim();
    if (!friendUid || friendUid === me || seen.has(friendUid)) continue;
    seen.add(friendUid);
    out.push({ friendUid, friendName: "Gezgin" });
  }
  return out;
}

export interface SyncFriendIndexesResult {
  /** İndeksi gerçekten yazılan arkadaş kimlikleri */
  created: string[];
  /** Zaten indeksi olan ya da kanıt bulunamayan (yazılmayan) kimlikler */
  skipped: string[];
  /** Yazılamayanlar: kimlik → hata */
  failed: { friendUid: string; error: unknown }[];
}

/**
 * Bildirimlerden türeyen adaylar için kendi indeksini tamamlar.
 * Ad çözümü başarısız olursa "Gezgin" ile devam eder; tek bir hata tüm
 * uzlaştırmayı durdurmaz ama sessizce yutulmaz (sonuçta raporlanır).
 */
export async function syncFriendIndexes(input: {
  uid: string;
  notifications: readonly AppNotification[];
  ensure?: (uid: string, friendUid: string, friendName: string) => Promise<boolean>;
  resolveName?: (uid: string) => Promise<string | null>;
  onError?: (error: unknown, friendUid: string) => void;
}): Promise<SyncFriendIndexesResult> {
  const ensure = input.ensure ?? ensureFriendIndex;
  const resolveName = input.resolveName ?? (async (friendUid: string) => {
    const profile = await fetchUserProfile(friendUid);
    return profile?.displayName ?? null;
  });

  const result: SyncFriendIndexesResult = { created: [], skipped: [], failed: [] };
  for (const candidate of friendIndexCandidates(input.notifications, input.uid)) {
    let resolved: string | null = null;
    try {
      resolved = await resolveName(candidate.friendUid);
    } catch (error) {
      input.onError?.(error, candidate.friendUid);
    }
    const name = resolved?.trim() || candidate.friendName;
    try {
      const written = await ensure(input.uid, candidate.friendUid, name);
      (written ? result.created : result.skipped).push(candidate.friendUid);
    } catch (error) {
      result.failed.push({ friendUid: candidate.friendUid, error });
      input.onError?.(error, candidate.friendUid);
    }
  }
  return result;
}
