/**
 * Atlasia — profil dizini eşitlemesi
 *
 * `userProfiles` koleksiyonu arkadaş arama için tek kaynaktır. Bu modül,
 * oturum açmış bulut kullanıcısının profilini bir kez (ad değişince yeniden)
 * eşitler. Cihaz hesabı buluta yazmadığı için hiç çağrılmaz.
 *
 * Kurallar: `userProfiles/{uid}` create/update yalnız kendi uid'sine yazılır,
 * createdAt oluşturmada sunucu zamanı, güncellemede DEĞİŞMEZ.
 */
import { syncUserProfile } from "./userProfiles";

export interface ProfileSyncUser {
  uid?: string | null;
  displayName?: string | null;
  backend?: "firebase" | "device";
}

/** Profil eşitlemesi gerekiyor mu? (bulut hesabı + geçerli görünen ad) */
export function needsProfileSync(user: ProfileSyncUser | null | undefined): boolean {
  if (!user || user.backend !== "firebase") return false;
  const uid = (user.uid ?? "").trim();
  const name = (user.displayName ?? "").trim();
  // Kural displayName için 2–40 karakter ister; kısa/boş adla yazmak reddedilir.
  return uid.length > 0 && name.length >= 2 && name.length <= 40;
}

/**
 * Profili eşitler. Eşitleme gerekmiyorsa `false` döner (hiç yazmaz).
 * Hata yutulmaz: çağıran loglar; oturum akışını kilitlemez.
 */
export async function syncProfileForUser(
  user: ProfileSyncUser | null | undefined,
  sync: (input: { uid: string; displayName: string }) => Promise<void> = syncUserProfile,
): Promise<boolean> {
  if (!needsProfileSync(user)) return false;
  const uid = (user!.uid ?? "").trim();
  const displayName = (user!.displayName ?? "").trim();
  await sync({ uid, displayName });
  return true;
}
