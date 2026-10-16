import type { ActionCodeSettings, Auth, User } from "firebase/auth";
import { AccountError, normalizeEmail, type AtlasAccount, type SignupDetails } from "./accountTypes";
import { firebaseApp, isCloudReady } from "./firebase";

/** Auth ve Firestore her zaman aynı Firebase uygulamasını kullanır. */
export const authConfigured = isCloudReady && firebaseApp !== null;
export const authBackend = authConfigured ? "firebase" : "device";

const EMAIL_ACTION_SETTINGS: ActionCodeSettings = {
  url: "https://atlasia.pages.dev/",
  handleCodeInApp: false,
};

let authPromise: Promise<Auth> | null = null;

/** Firebase Authentication SDK'sını yalnız gerçekten gerektiğinde yükler. */
export function getAtlasAuth(): Promise<Auth> {
  const app = firebaseApp;
  if (!authConfigured || !app) return Promise.reject(new Error("auth/not-configured"));
  authPromise ??= import("firebase/auth").then(({ getAuth }) => {
    const auth = getAuth(app);
    auth.languageCode = "tr";
    return auth;
  });
  return authPromise;
}

export async function sendAtlasVerificationEmail(user: User) {
  const { sendEmailVerification } = await import("firebase/auth");
  return sendEmailVerification(user, EMAIL_ACTION_SETTINGS);
}

export function isVerifiedMember(user: User | null): user is User {
  if (!user || user.isAnonymous) return false;
  return user.providerData.some((provider) =>
    provider.providerId === "phone"
      ? !!user.phoneNumber
      : ["google.com", "apple.com", "password"].includes(provider.providerId) && user.emailVerified,
  );
}

export function isSupportedAccount(user: User | null): user is User {
  return !!user && !user.isAnonymous && user.providerData.some((provider) => ["google.com", "apple.com", "phone", "password"].includes(provider.providerId));
}

export function toFirebaseAccount(user: User): AtlasAccount {
  // Doğrulanmamış e-posta keşfi kilitlemez; gerçek durum profil panelinde açıkça
  // gösterilir ve kullanıcı oradan bağlantı gönderip oturumu yenileyebilir.
  return { uid: user.uid, email: user.email, displayName: user.displayName, phoneNumber: user.phoneNumber, photoURL: user.photoURL, backend: "firebase", emailVerified: user.emailVerified, requiresEmailVerification: false };
}

export async function signInEmail(email: string, password: string) {
  const [{ signInWithEmailAndPassword }, auth] = await Promise.all([
    import("firebase/auth"),
    getAtlasAuth(),
  ]);
  return signInWithEmailAndPassword(auth, normalizeEmail(email), password);
}

export async function registerEmail(details: SignupDetails) {
  const [{ createUserWithEmailAndPassword, updateProfile }, auth] = await Promise.all([
    import("firebase/auth"),
    getAtlasAuth(),
  ]);
  const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(details.email), details.password);
  // Keep the created account pending verification if delivery fails; do not
  // discard a valid account or grant a verified session on an email error.
  await updateProfile(credential.user, { displayName: details.displayName.trim().slice(0, 40) });
  try { await sendAtlasVerificationEmail(credential.user); } catch { /* A pending member can request another email. */ }
  return credential;
}

export async function requestPasswordReset(email: string) {
  if (!authConfigured) throw new AccountError("device/recovery-required");
  const [{ sendPasswordResetEmail }, auth] = await Promise.all([
    import("firebase/auth"),
    getAtlasAuth(),
  ]);
  try { await sendPasswordResetEmail(auth, normalizeEmail(email), EMAIL_ACTION_SETTINGS); }
  catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; }
}

export async function signInSocial(method: "google" | "apple") {
  const [{ GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect }, auth] = await Promise.all([
    import("firebase/auth"),
    getAtlasAuth(),
  ]);
  const provider = method === "google"
    ? new GoogleAuthProvider()
    : new OAuthProvider("apple.com");
  if (method === "google") provider.setCustomParameters({ prompt: "select_account" });
  else {
    provider.addScope("email");
    provider.addScope("name");
    provider.setCustomParameters({ locale: "tr" });
  }
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if ((error as { code?: string }).code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export function authErrorMessage(error: unknown) {
  const code = (error as { code?: string; message?: string })?.code ?? (error as Error)?.message;
  const messages: Record<string, string> = {
    "auth/not-configured": "Google, Apple ve SMS girişi için sağlayıcı bağlantısı henüz kurulmamış. E-posta ve şifreyle bu cihaza özel hesabını kullanabilirsin.",
    "auth/invalid-email": "Geçerli bir e-posta adresi yaz.",
    "auth/email-already-in-use": "Bu e-posta adresiyle bir hesap var. Giriş yap veya şifreni sıfırla.",
    "auth/invalid-credential": "E-posta veya şifre doğru değil. Bilgilerini kontrol et.",
    "auth/wrong-password": "E-posta veya şifre doğru değil. Bilgilerini kontrol et.",
    "auth/user-not-found": "E-posta veya şifre doğru değil. Bilgilerini kontrol et.",
    "auth/weak-password": "Şifren 8–128 karakter olmalı ve en az bir harf ile bir rakam içermeli.",
    "auth/password-exposed": "Bu şifre bilinen veri sızıntılarında görülmüş. Hesabını korumak için başka hiçbir yerde kullanmadığın farklı bir şifre seç.",
    "auth/password-does-not-meet-requirements": "Şifren hesabın güvenlik kurallarını karşılamıyor. Daha uzun bir şifre, harf ve rakam kullan.",
    "auth/invalid-profile-name": "Profil adın en az 2 karakter olmalı.",
    "auth/missing-password": "Şifreni yaz.",
    "device/secure-context-required": "Bu cihazda hesap oluşturmak için HTTPS veya localhost üzerinden açmalısın.",
    "device/storage-unavailable": "Tarayıcının hesap deposuna erişilemiyor. Özel mod veya depolama engelini kontrol edip tekrar dene.",
    "device/storage-blocked": "Başka bir Atlasia sekmesi hesap deposunu kullanıyor. Diğer sekmeyi kapatıp yeniden dene.",
    "device/storage-invalid": "Bu cihazdaki hesap kaydı okunamadı. Tarayıcı verilerini kontrol et.",
    "device/invalid-recovery-code": "E-posta veya kurtarma anahtarı doğru değil. Anahtarı oluşturulduğu cihazda kullan.",
    "device/recovery-required": "Bu cihazdaki hesabın şifresini kurtarma anahtarınla yenileyebilirsin. Bu modda e-posta gönderilmez.",
    "auth/popup-closed-by-user": "Giriş penceresi kapandı. Hazır olduğunda tekrar deneyebilirsin.",
    "auth/cancelled-popup-request": "Başka bir giriş işlemi açık. O pencereyi tamamla veya tekrar dene.",
    "auth/unauthorized-domain": "Bu site adresi giriş için yetkilendirilmemiş. Yayın alanının Firebase'e eklenmesi gerekiyor.",
    "auth/operation-not-allowed": "Bu giriş yöntemi henüz etkin değil. Başka bir yöntem seçebilir veya daha sonra deneyebilirsin.",
    "auth/billing-not-enabled": "SMS ile giriş için Firebase projesinde Blaze faturalandırma planının etkinleştirilmesi gerekiyor. Şimdilik başka bir giriş yöntemi kullanabilirsin.",
    "auth/invalid-api-key": "Giriş yapılandırması geçerli değil. Uygulamanın kimlik doğrulama ayarları kontrol edilmeli.",
    "auth/network-request-failed": "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.",
    "auth/invalid-phone-number": "Telefon numaranı ülke koduyla birlikte kontrol et.",
    "auth/invalid-verification-code": "Doğrulama kodu doğru değil. SMS'teki 6 haneli kodu tekrar yaz.",
    "auth/code-expired": "Kodun süresi doldu. Yeni bir doğrulama kodu iste.",
    "auth/session-expired": "Doğrulama süresi doldu. Yeni bir kod iste.",
    "auth/too-many-requests": "Hesabını ve hizmeti koruyan geçici güvenlik sınırına ulaşıldı. Biraz bekleyip tekrar dene; bu sırada yeni istek gönderme.",
    "auth/quota-exceeded": "SMS gönderim sınırına ulaşıldı. Google ile giriş yapmayı deneyebilirsin.",
    "auth/captcha-check-failed": "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar dene.",
    "auth/account-exists-with-different-credential": "Bu hesap başka bir giriş yöntemiyle kayıtlı. Daha önce kullandığın yöntemi seç.",
    "auth/user-disabled": "Bu hesap devre dışı bırakılmış.",
  };
  return messages[code ?? ""] ?? "Giriş tamamlanamadı. Biraz sonra tekrar dene; oturumun açılmadı.";
}