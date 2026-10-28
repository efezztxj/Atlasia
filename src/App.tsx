/**
 * Atlasia — giriş kapısı (tanıtım yüzeyi).
 *
 * NEDEN İKİ DOSYA: `Explorer` (harita, paneller, Firestore veri katmanı) tek
 * başına ~1.470 satır ve firebase-vendor'ı (149 KB gzip) çeker. Tanıtım
 * sayfasını gören ziyaretçi bu kodu hiç çalıştırmıyor; bu yüzden `Explorer`
 * yalnız girişten sonra lazy yüklenir (M-03b).
 *
 *   tanıtım yolculuğu  349.939 B gzip  (Firestore ilk boyada yok)
 *   uygulama kabuğu    749.821 B gzip  (girişten sonra, bekleme ekranıyla)
 *
 * Giriş yapmış kullanıcı için algı değişmez: oturum çözülürken zaten yükleme
 * ekranı gösterilir, `Explorer` parçası o sırada iner.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import AccountAccess, { EmailVerification, ProfileSetup } from "./components/AccountAccess";
import LandingPage from "./components/LandingPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useInstallApp, type InstallAppController } from "./hooks/useInstallApp";

const Explorer = lazy(() => import("./Explorer"));

/** Giriş sonrası ilk kare: Explorer parçası inene kadar gösterilir. */
function ExplorerBootScreen() {
  return (
    <div className="grid h-dvh place-items-center bg-ink" role="status" aria-live="polite">
      <p className="font-display text-3xl font-semibold text-mint">atlasia<span className="text-sun">.</span></p>
      <span className="sr-only">Uygulama yükleniyor</span>
    </div>
  );
}

function AuthGate({ installApp }: { installApp: InstallAppController }) {
  const { user, checking } = useAuth();
  const [accessOpen, setAccessOpen] = useState(false);
  const previousUser = useRef(user);

  useEffect(() => {
    if (previousUser.current && !user) setAccessOpen(false);
    previousUser.current = user;
  }, [user]);

  if (checking) {
    return <div className="grid h-dvh place-items-center bg-ink"><p className="font-display text-3xl font-semibold text-mint">atlasia<span className="text-sun">.</span></p></div>;
  }
  if (!user) return accessOpen ? <AccountAccess /> : <LandingPage onStart={() => setAccessOpen(true)} />;
  if (user.requiresEmailVerification) return <EmailVerification />;
  if (!user.displayName?.trim()) return <ProfileSetup />;
  return <Suspense fallback={<ExplorerBootScreen />}><Explorer installApp={installApp} /></Suspense>;
}

export default function App() {
  const installApp = useInstallApp();
  return <AuthProvider><AuthGate installApp={installApp} /></AuthProvider>;
}
