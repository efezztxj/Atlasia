/**
 * Atlasia — profil dizini eşitlemesi
 *
 * `userProfiles` koleksiyonu arkadaş arama için tek kaynaktır. Bu modül,
 * oturum açmış bulut kullanıcısının profilini bir kez (ad değişince yeniden)
 * eşitler. Cihaz hesabı buluta yazmadığı için hiç çağrılmaz: cihaz uid'si
 * Firebase Auth'ta karşılığı olmadığından her yazım `permission-denied`
 * üretir (#61'den taşındı; main'de bu kapı yoktu, hata yalnız loglanıyordu).
 *
 * Kurallar: `userProfiles/{uid}` create/update yalnız kendi uid'sine yazılır,
 * createdAt oluşturmada sunucu zamanı, güncellemede DEĞİŞMEZ.
 */
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, syncUserProfile } from "./userProfiles";

export interface ProfileSyncUser {
  uid?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  backend?: "firebase" | "device";
}

/** Profil eşitlemesi gerekiyor mu? (bulut hesabı + geçerli görünen ad) */
export function needsProfileSync(user: ProfileSyncUser | null | undefined): boolean {
  if (!user || user.backend !== "firebase") return false;
  const uid = (user.uid ?? "").trim();
  const name = (user.displayName ?? "").trim();
  // Kural displayName için 2–40 karakter ister; uygun olmayan adla yazmak reddedilir.
  return uid.length > 0 && name.length >= DISPLAY_NAME_MIN && name.length <= DISPLAY_NAME_MAX;
}

/**
 * Profili eşitler. Eşitleme gerekmiyorsa `false` döner (hiç yazmaz).
 * Hata yutulmaz: çağıran loglar; oturum akışını kilitlemez.
 */
export async function syncProfileForUser(
  user: ProfileSyncUser | null | undefined,
  sync: (input: { uid: string; displayName: string; photoURL?: string }) => Promise<unknown> = syncUserProfile,
): Promise<boolean> {
  if (!needsProfileSync(user)) return false;
  const uid = (user!.uid ?? "").trim();
  const displayName = (user!.displayName ?? "").trim();
  const photoURL = user!.photoURL?.trim() || undefined;
  await sync({ uid, displayName, photoURL });
  return true;
}
